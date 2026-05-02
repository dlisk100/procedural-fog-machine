import { NextResponse } from "next/server";
import { fallbackOutline, parseOutlineJson, validateCannonRequest } from "@/lib/cannon";
import { callOpenRouter, OPENROUTER_OUTLINE_MODEL } from "@/lib/openrouter";
import { buildOutlinePrompt } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const cannonRequest = validateCannonRequest(await request.json());

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

    const prompt = buildOutlinePrompt(cannonRequest);
    console.info(
      `[cannon:outline] start model=${OPENROUTER_OUTLINE_MODEL} promptChars=${prompt.length}`,
    );

    try {
      const startedAt = Date.now();
      const content = await callOpenRouter(
        [
          {
            role: "system",
            content:
              "You generate safe comedy bureaucracy. Return exactly what the user asks for, without legal advice, fake citations, threats, or attorney impersonation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: OPENROUTER_OUTLINE_MODEL,
          temperature: 0.72,
          maxTokens: 4500,
          timeoutMs: 50_000,
        },
      );
      console.info(
        `[cannon:outline] complete model=${OPENROUTER_OUTLINE_MODEL} durationMs=${
          Date.now() - startedAt
        } contentChars=${content.length}`,
      );

      return NextResponse.json({
        ok: true,
        outline: parseOutlineJson(content, cannonRequest),
        fallback: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown outline error.";
      console.error(`[cannon:outline] fallback reason=${message}`);
      return NextResponse.json({
        ok: true,
        outline: fallbackOutline(cannonRequest),
        fallback: true,
        warning: `Outline generator failed; using fallback outline. ${message}`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid outline request.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
