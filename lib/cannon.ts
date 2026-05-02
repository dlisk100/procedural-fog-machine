import type {
  CannonMetricEvent,
  CannonOutline,
  CannonRequest,
  Domain,
  OutlineSection,
  Stance,
} from "./types";
import { clampSlopDensity, getBaseGenerationDensity, getDensityConfig } from "./density";

export const MAX_INPUT_LENGTH = 20_000;
export const MAX_GOVERNING_DOCUMENT_LENGTH = 30_000;
export const MAX_SECTIONS = 24;
export const JAMMED_SECTION_CONTENT =
  "This shell jammed briefly, but the procedural fog remains intact. Please regard this section as a courteous placeholder preserving the packet's ceremonial continuity without adding facts, admissions, threats, citations, or unnecessary confidence.";

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

function isDomain(value: unknown): value is Domain {
  return typeof value === "string" && VALID_DOMAINS.includes(value as Domain);
}

function isStance(value: unknown): value is Stance {
  return typeof value === "string" && VALID_STANCES.includes(value as Stance);
}

export function validateCannonRequest(value: unknown): CannonRequest {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const input = value as Record<string, unknown>;
  const threatText = typeof input.threatText === "string" ? input.threatText.trim() : "";
  const rawSlopDensity =
    typeof input.slopDensity === "number" ? input.slopDensity : Number(input.slopDensity);

  if (threatText.length < 5) {
    throw new Error("threatText is required and must be at least 5 characters.");
  }

  if (threatText.length > MAX_INPUT_LENGTH) {
    throw new Error(`threatText must be ${MAX_INPUT_LENGTH.toLocaleString()} characters or fewer.`);
  }

  if (!isDomain(input.domain)) {
    throw new Error("domain must be one of the supported Procedural Fog Machine domains.");
  }

  if (!isStance(input.stance)) {
    throw new Error("stance must be one of the supported cannon stances.");
  }

  if (!Number.isFinite(rawSlopDensity)) {
    throw new Error("slopDensity must be a number.");
  }

  const slopDensity = clampSlopDensity(rawSlopDensity);
  const governingDocumentText =
    typeof input.governingDocumentText === "string" &&
    input.governingDocumentText.trim().length > 0
      ? input.governingDocumentText
          .trim()
          .slice(0, MAX_GOVERNING_DOCUMENT_LENGTH)
      : undefined;
  const governingDocumentName =
    typeof input.governingDocumentName === "string" &&
    input.governingDocumentName.trim().length > 0
      ? input.governingDocumentName.trim().slice(0, 200)
      : undefined;

  return {
    threatText,
    domain: input.domain,
    stance: input.stance,
    slopDensity,
    governingDocumentText,
    governingDocumentName,
  };
}

function extractFirstJsonObject(input: string): string | null {
  const fencedMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fencedMatch?.[1] ?? input;
  const start = source.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  return null;
}

function safeParseJsonObject(input: string): unknown {
  const extracted = extractFirstJsonObject(input);

  if (!extracted) {
    throw new Error("No JSON object was found in the model response.");
  }

  return JSON.parse(extracted) as unknown;
}

export function densityTargetWords(slopDensity: number): number {
  return getDensityConfig(getBaseGenerationDensity(slopDensity)).targetWords;
}

export function fallbackOutline(request: CannonRequest): CannonOutline {
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

export function parseOutlineJson(content: string, request: CannonRequest): CannonOutline {
  const parsed = safeParseJsonObject(content) as Partial<CannonOutline>;

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
    .slice(0, MAX_SECTIONS)
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
    sections: sections.slice(0, MAX_SECTIONS),
    appendixIdeas: parsed.appendixIdeas.filter((item): item is string => typeof item === "string"),
  };
}

export function calculateMetrics(content: string, progress: number): CannonMetricEvent {
  const pages = Math.ceil(content.length / 2600);
  const questions = content.match(/\?/g)?.length ?? 0;
  const fogIndex = Math.min(99, Math.round(65 + progress * 34));
  const reviewHours = pages * 0.12;

  return {
    pages,
    questions,
    fogIndex,
    reviewBurden: `${reviewHours.toFixed(1)} hours`,
  };
}
