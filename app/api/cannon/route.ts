import { assembleHtmlDocument } from "@/lib/assembleDoc";
import {
  callOpenRouter,
  OPENROUTER_OUTLINE_MODEL,
  OPENROUTER_SECTION_MODEL,
} from "@/lib/openrouter";
import { buildOutlinePrompt, buildSectionPrompt } from "@/lib/prompts";
import type {
  CannonOutline,
  CannonRequest,
  Domain,
  GeneratedSection,
  OutlineSection,
  Stance,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const VALID_DOMAINS = [
  "housing",
  "workplace",
  "school",
  "insurance",
  "vendor",
  "customer_support",
  "platform",
  "other",
] as const satisfies readonly Domain[];

const VALID_STANCES = [
  "clarify",
  "deny_without_admitting",
  "negotiate",
  "comply_preserve_rights",
  "request_evidence",
  "maximum_bureaucracy",
] as const satisfies readonly Stance[];

const LOG_MESSAGES = [
  "Loading passive voice artillery...",
  "Consulting the Appendix Goblin...",
  "Deploying clarification shrapnel...",
  "Increasing whereas density...",
  "Ensuring no sentence is under 47 words...",
  "Packing footnote-adjacent material...",
  "Summoning the municipal tone daemon...",
] as const;

const FALLBACK_SECTION_TITLES = [
  "Non-Admission Preamble",
  "Request for Specificity",
  "Request for Evidence",
  "Timeline Clarification",
  "Preservation of Communications",
  "Reservation of Rights",
  "Clarifying Questions",
  "Appendix of Procedural Requests",
] as const;

type CannonEvent =
  | {
      type: "log";
      message: string;
    }
  | {
      type: "metric";
      pages: number;
      admissions: 0;
      fogIndex: number;
      questions: number;
      reviewBurden: string;
    }
  | {
      type: "shell";
      shell: number;
      total: number;
      title: string;
      message: string;
    }
  | {
      type: "section";
      title: string;
      content: string;
    }
  | {
      type: "done";
      html: string;
      message: string;
    }
  | {
      type: "error";
      message: string;
    };

function isDomain(value: unknown): value is Domain {
  return typeof value === "string" && VALID_DOMAINS.includes(value as Domain);
}

function isStance(value: unknown): value is Stance {
  return typeof value === "string" && VALID_STANCES.includes(value as Stance);
}

function validateRequest(value: unknown): CannonRequest {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const input = value as Record<string, unknown>;
  const threatText = typeof input.threatText === "string" ? input.threatText.trim() : "";
  const slopDensity =
    typeof input.slopDensity === "number" ? input.slopDensity : Number(input.slopDensity);

  if (threatText.length < 5) {
    throw new Error("threatText is required and must be at least 5 characters.");
  }

  if (!isDomain(input.domain)) {
    throw new Error("domain must be one of the supported Procedural Fog Machine domains.");
  }

  if (!isStance(input.stance)) {
    throw new Error("stance must be one of the supported cannon stances.");
  }

  if (!Number.isFinite(slopDensity) || slopDensity < 1 || slopDensity > 10) {
    throw new Error("slopDensity must be a number between 1 and 10.");
  }

  const governingDocumentText =
    typeof input.governingDocumentText === "string" &&
    input.governingDocumentText.trim().length > 0
      ? input.governingDocumentText
      : undefined;

  return {
    threatText,
    domain: input.domain,
    stance: input.stance,
    slopDensity,
    governingDocumentText,
  };
}

function densityTargetWords(slopDensity: number): number {
  if (slopDensity <= 2) {
    return 350;
  }

  if (slopDensity <= 4) {
    return 600;
  }

  if (slopDensity <= 6) {
    return 900;
  }

  if (slopDensity <= 8) {
    return 1300;
  }

  return 1800;
}

function fallbackOutline(request: CannonRequest): CannonOutline {
  const targetWords = densityTargetWords(request.slopDensity);
  const sections: OutlineSection[] = FALLBACK_SECTION_TITLES.map((title) => ({
    title,
    purpose:
      "Produce polite, funny, non-admitting bureaucratic language that clarifies process while avoiding legal claims, invented facts, and threats.",
    targetWords,
    mustInclude: ["Non-admission language", "A request for clarity where useful"],
    mustAvoid: ["Fake laws", "Fake citations", "Attorney impersonation", "Threats"],
  }));

  return {
    title: "Procedural Fog Response Packet",
    summary:
      "A deliberately over-careful, polite, non-admitting response packet assembled under fallback administrative conditions.",
    sections,
    appendixIdeas: [
      "Index of unanswered procedural ambiguities",
      "Schedule of requested clarifications",
      "Ceremonial inventory of attachments not yet received",
    ],
  };
}

function parseOutlineJson(content: string, request: CannonRequest): CannonOutline {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonCandidate = fencedMatch?.[1] ?? trimmed;
  const parsed = JSON.parse(jsonCandidate) as Partial<CannonOutline>;

  if (
    typeof parsed.title !== "string" ||
    typeof parsed.summary !== "string" ||
    !Array.isArray(parsed.sections) ||
    !Array.isArray(parsed.appendixIdeas)
  ) {
    throw new Error("Outline JSON did not match the expected shape.");
  }

  const targetWords = densityTargetWords(request.slopDensity);
  const sections = parsed.sections
    .map((section): OutlineSection | null => {
      if (
        !section ||
        typeof section !== "object" ||
        typeof section.title !== "string" ||
        typeof section.purpose !== "string"
      ) {
        return null;
      }

      return {
        title: section.title,
        purpose: section.purpose,
        targetWords:
          typeof section.targetWords === "number" && Number.isFinite(section.targetWords)
            ? section.targetWords
            : targetWords,
        mustInclude: Array.isArray(section.mustInclude)
          ? section.mustInclude.filter((item): item is string => typeof item === "string")
          : undefined,
        mustAvoid: Array.isArray(section.mustAvoid)
          ? section.mustAvoid.filter((item): item is string => typeof item === "string")
          : undefined,
      };
    })
    .filter((section): section is OutlineSection => section !== null);

  if (sections.length === 0) {
    throw new Error("Outline JSON did not include usable sections.");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    sections,
    appendixIdeas: parsed.appendixIdeas.filter((item): item is string => typeof item === "string"),
  };
}

function calculateMetrics(content: string, progress: number): {
  pages: number;
  admissions: 0;
  fogIndex: number;
  questions: number;
  reviewBurden: string;
} {
  const pages = Math.ceil(content.length / 2600);
  const questions = content.match(/\?/g)?.length ?? 0;
  const fogIndex = Math.min(99, Math.round(65 + progress * 34));
  const reviewHours = pages * 0.12;

  return {
    pages,
    admissions: 0,
    fogIndex,
    questions,
    reviewBurden: `${reviewHours.toFixed(1)} hours`,
  };
}

function writeEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: CannonEvent) {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

function createErrorStream(message: string, status: number): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      writeEvent(controller, { type: "error", message });
      controller.close();
    },
  });

  return new Response(stream, {
    status,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export async function POST(request: Request) {
  let cannonRequest: CannonRequest;

  try {
    cannonRequest = validateRequest(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid cannon request.";
    return createErrorStream(message, 400);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const generatedSections: GeneratedSection[] = [];

      try {
        writeEvent(controller, { type: "log", message: LOG_MESSAGES[0] });
        writeEvent(controller, {
          type: "metric",
          pages: 0,
          admissions: 0,
          fogIndex: 71,
          questions: 0,
          reviewBurden: "Initializing...",
        });

        const outlineContent = await callOpenRouter(
          [
            {
              role: "system",
              content:
                "You generate safe comedy bureaucracy. Return exactly what the user asks for, without legal advice, fake citations, threats, or attorney impersonation.",
            },
            {
              role: "user",
              content: buildOutlinePrompt(cannonRequest),
            },
          ],
          {
            model: OPENROUTER_OUTLINE_MODEL,
            temperature: 0.72,
          },
        );

        let outline: CannonOutline;

        try {
          outline = parseOutlineJson(outlineContent, cannonRequest);
        } catch {
          writeEvent(controller, {
            type: "log",
            message: "Outline arrived wearing a novelty mustache. Switching to fallback paperwork.",
          });
          outline = fallbackOutline(cannonRequest);
        }

        for (let index = 0; index < outline.sections.length; index += 1) {
          const section = outline.sections[index];
          const shellNumber = index + 1;

          writeEvent(controller, {
            type: "log",
            message: LOG_MESSAGES[index % LOG_MESSAGES.length],
          });
          writeEvent(controller, {
            type: "shell",
            shell: shellNumber,
            total: outline.sections.length,
            title: section.title,
            message: `Firing Shell ${shellNumber}: ${section.title}`,
          });

          const content = await callOpenRouter(
            [
              {
                role: "system",
                content:
                  "You write safe, polite, non-admitting comedy bureaucracy. Do not give legal advice, invent citations, threaten, fabricate facts, or impersonate an attorney.",
              },
              {
                role: "user",
                content: buildSectionPrompt({
                  request: cannonRequest,
                  section,
                  sectionNumber: shellNumber,
                  totalSections: outline.sections.length,
                }),
              },
            ],
            {
              model: OPENROUTER_SECTION_MODEL,
              temperature: 0.84,
            },
          );

          generatedSections.push({
            title: section.title,
            content,
          });

          writeEvent(controller, {
            type: "section",
            title: section.title,
            content,
          });

          const generatedText = generatedSections
            .map((generatedSection) => generatedSection.content)
            .join("\n\n");

          writeEvent(controller, {
            type: "metric",
            ...calculateMetrics(generatedText, shellNumber / outline.sections.length),
          });
        }

        const finalText = generatedSections
          .map((generatedSection) => generatedSection.content)
          .join("\n\n");
        const metrics = calculateMetrics(finalText, 1);
        const html = assembleHtmlDocument({
          title: outline.title,
          sections: generatedSections,
          metrics: {
            pages: metrics.pages,
            questions: metrics.questions,
            fogIndex: metrics.fogIndex,
            reviewBurden: metrics.reviewBurden,
          },
        });

        writeEvent(controller, {
          type: "done",
          html,
          message: "Cannon discharged. Bureaucracy deployed.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The cannon misfired in an administratively interesting way.";

        writeEvent(controller, {
          type: "error",
          message,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
