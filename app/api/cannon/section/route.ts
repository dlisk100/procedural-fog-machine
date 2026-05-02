import { NextResponse } from "next/server";
import { JAMMED_SECTION_CONTENT, validateCannonRequest } from "@/lib/cannon";
import { callOpenRouter, OPENROUTER_SECTION_MODEL } from "@/lib/openrouter";
import { buildSectionPrompt } from "@/lib/prompts";
import type { OutlineSection } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

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
    console.info(
      `[cannon:section] start shell=${sectionNumber}/${totalSections} model=${OPENROUTER_SECTION_MODEL} promptChars=${prompt.length} targetWords=${section.targetWords}`,
    );

    try {
      const startedAt = Date.now();
      const content = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You write safe, polite, non-admitting comedy bureaucracy. Do not give legal advice, invent citations, threaten, fabricate facts, or impersonate an attorney.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: OPENROUTER_SECTION_MODEL,
          temperature: 0.84,
          maxTokens: 2400,
          timeoutMs: 80_000,
        },
      );
      console.info(
        `[cannon:section] complete shell=${sectionNumber}/${totalSections} model=${OPENROUTER_SECTION_MODEL} durationMs=${
          Date.now() - startedAt
        } contentChars=${content.length}`,
      );

      return NextResponse.json({
        ok: true,
        section: {
          title: section.title,
          content,
        },
        shell: sectionNumber,
        total: totalSections,
        placeholder: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown section error.";
      console.error(
        `[cannon:section] placeholder shell=${sectionNumber}/${totalSections} reason=${message}`,
      );
      return NextResponse.json({
        ok: true,
        section: {
          title: section.title,
          content: JAMMED_SECTION_CONTENT,
        },
        shell: sectionNumber,
        total: totalSections,
        placeholder: true,
        warning: message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid section request.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
