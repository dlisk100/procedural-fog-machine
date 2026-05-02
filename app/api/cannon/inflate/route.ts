import { NextResponse } from "next/server";
import { JAMMED_SECTION_CONTENT, validateCannonRequest } from "@/lib/cannon";
import { callOpenRouter, OPENROUTER_SECTION_MODEL } from "@/lib/openrouter";
import { buildInflatePrompt, SECTION_SYSTEM_MESSAGE } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_SECTION_CONTENT_LENGTH = 24_000;

function readString(input: unknown, fieldName: string, maxLength: number): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return input.trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const cannonRequest = validateCannonRequest({
      ...body,
      threatText: body.threatText,
      domain: body.domain,
      stance: body.stance,
      slopDensity: 11,
    });
    const sectionTitle = readString(body.sectionTitle, "sectionTitle", 300);
    const sectionContent = readString(
      body.sectionContent,
      "sectionContent",
      MAX_SECTION_CONTENT_LENGTH,
    );
    const addendumNumber =
      typeof body.addendumNumber === "number" && Number.isFinite(body.addendumNumber)
        ? Math.max(1, Math.round(body.addendumNumber))
        : 1;

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

    const prompt = buildInflatePrompt({
      request: cannonRequest,
      sectionTitle,
      sectionContent,
      addendumNumber,
    });
    console.info(
      `[cannon:inflate] start addendum=${addendumNumber} model=${OPENROUTER_SECTION_MODEL} promptChars=${prompt.length}`,
    );

    try {
      const startedAt = Date.now();
      const content = await callOpenRouter(
        [
          {
            role: "system",
            content: SECTION_SYSTEM_MESSAGE,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: OPENROUTER_SECTION_MODEL,
          temperature: 0.88,
          maxTokens: 4200,
          timeoutMs: 260_000,
        },
      );
      console.info(
        `[cannon:inflate] complete addendum=${addendumNumber} model=${OPENROUTER_SECTION_MODEL} durationMs=${
          Date.now() - startedAt
        } contentChars=${content.length}`,
      );

      return NextResponse.json({
        ok: true,
        addendum: {
          title: `Supplemental Addendum ${addendumNumber}: Additional Procedural Fog for ${sectionTitle}`,
          content,
        },
        placeholder: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown inflation error.";
      console.error(`[cannon:inflate] placeholder addendum=${addendumNumber} reason=${message}`);
      return NextResponse.json({
        ok: true,
        addendum: {
          title: `Supplemental Addendum ${addendumNumber}: Additional Procedural Fog for ${sectionTitle}`,
          content: JAMMED_SECTION_CONTENT,
        },
        placeholder: true,
        warning: message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid inflation request.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
