import { NextResponse } from "next/server";
import { JAMMED_SECTION_CONTENT, validateCannonRequest } from "@/lib/cannon";
import { getBaseGenerationDensity, getDensityConfig } from "@/lib/density";
import { OPENROUTER_SECTION_MODEL } from "@/lib/openrouter";
import { buildSectionPrompt, SECTION_SYSTEM_MESSAGE } from "@/lib/prompts";
import type { OutlineSection } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type StreamDeltaPayload = {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function validateSection(value: unknown): OutlineSection {
  if (!value || typeof value !== "object") {
    throw new Error("section must be an object.");
  }

  const input = value as Record<string, unknown>;

  if (typeof input.title !== "string" || typeof input.purpose !== "string") {
    throw new Error("section must include title and purpose.");
  }

  return {
    title: input.title,
    purpose: input.purpose,
    targetWords:
      typeof input.targetWords === "number" && Number.isFinite(input.targetWords)
        ? input.targetWords
        : 600,
    mustInclude: Array.isArray(input.mustInclude)
      ? input.mustInclude.filter((item): item is string => typeof item === "string")
      : undefined,
    mustAvoid: Array.isArray(input.mustAvoid)
      ? input.mustAvoid.filter((item): item is string => typeof item === "string")
      : undefined,
  };
}

function extractContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }

        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      })
      .join("");
  }

  return "";
}

function encodeEvent(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const cannonRequest = validateCannonRequest(body.request);
    const section = validateSection(body.section);
    const sectionNumber =
      typeof body.sectionNumber === "number" && Number.isFinite(body.sectionNumber)
        ? Math.max(1, Math.round(body.sectionNumber))
        : 1;
    const totalSections =
      typeof body.totalSections === "number" && Number.isFinite(body.totalSections)
        ? Math.max(sectionNumber, Math.round(body.totalSections))
        : sectionNumber;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OPENROUTER_API_KEY is missing. Add it to the Vercel environment and redeploy.",
        },
        { status: 500 },
      );
    }

    const prompt = buildSectionPrompt({
      request: cannonRequest,
      section,
      sectionNumber,
      totalSections,
    });
    const densityConfig = getDensityConfig(getBaseGenerationDensity(cannonRequest.slopDensity));
    const startedAt = Date.now();

    console.info(
      `[cannon:section-stream] start shell=${sectionNumber}/${totalSections} model=${OPENROUTER_SECTION_MODEL} promptChars=${prompt.length} targetWords=${section.targetWords}`,
    );

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_SECTION_MODEL,
        messages: [
          {
            role: "system",
            content: SECTION_SYSTEM_MESSAGE,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.84,
        max_tokens: densityConfig.sectionMaxTokens,
        stream: true,
      }),
      cache: "no-store",
    });

    if (!openRouterResponse.ok || !openRouterResponse.body) {
      const detail = await openRouterResponse.text();
      return NextResponse.json(
        {
          ok: false,
          error: `OpenRouter streaming request failed (${openRouterResponse.status}): ${detail.slice(
            0,
            240,
          )}`,
        },
        { status: 502 },
      );
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = openRouterResponse.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";
        let warning = "";

        if (!reader) {
          controller.enqueue(
            encodeEvent({
              type: "done",
              title: section.title,
              content: JAMMED_SECTION_CONTENT,
              placeholder: true,
              warning: "OpenRouter response body was unavailable.",
            }),
          );
          controller.close();
          return;
        }

        try {
          while (true) {
            const { value, done } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const rawLine of lines) {
              const line = rawLine.trim();

              if (!line.startsWith("data:")) {
                continue;
              }

              const data = line.slice(5).trim();

              if (!data || data === "[DONE]") {
                continue;
              }

              try {
                const payload = JSON.parse(data) as StreamDeltaPayload;

                if (payload.error?.message) {
                  warning = payload.error.message;
                  continue;
                }

                const choice = payload.choices?.[0];
                const delta =
                  extractContent(choice?.delta?.content) ||
                  extractContent(choice?.message?.content);

                if (delta) {
                  content += delta;
                  controller.enqueue(encodeEvent({ type: "chunk", content: delta }));
                }
              } catch {
                warning = "A malformed streaming line was skipped.";
              }
            }
          }

          const finalContent = content.trim() || JAMMED_SECTION_CONTENT;
          const placeholder = !content.trim();

          console.info(
            `[cannon:section-stream] complete shell=${sectionNumber}/${totalSections} model=${OPENROUTER_SECTION_MODEL} durationMs=${
              Date.now() - startedAt
            } contentChars=${finalContent.length} placeholder=${placeholder}`,
          );

          controller.enqueue(
            encodeEvent({
              type: "done",
              title: section.title,
              content: finalContent,
              placeholder,
              warning,
            }),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "The streamed section request failed.";
          console.error(
            `[cannon:section-stream] placeholder shell=${sectionNumber}/${totalSections} reason=${message}`,
          );
          controller.enqueue(
            encodeEvent({
              type: "done",
              title: section.title,
              content: JAMMED_SECTION_CONTENT,
              placeholder: true,
              warning: message,
            }),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid streamed section request.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
