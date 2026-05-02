import type { CannonRequest, OutlineSection } from "./types";

const SECTION_COUNT_BY_DENSITY = [
  { min: 1, max: 2, sections: 5, targetWords: 350 },
  { min: 3, max: 4, sections: 8, targetWords: 600 },
  { min: 5, max: 6, sections: 12, targetWords: 900 },
  { min: 7, max: 8, sections: 16, targetWords: 1300 },
  { min: 9, max: 10, sections: 24, targetWords: 1800 },
] as const;

function clampSlopDensity(slopDensity: number): number {
  if (!Number.isFinite(slopDensity)) {
    return 5;
  }

  return Math.min(10, Math.max(1, Math.round(slopDensity)));
}

function getDensityPlan(slopDensity: number): {
  density: number;
  sections: number;
  targetWords: number;
} {
  const density = clampSlopDensity(slopDensity);
  const plan =
    SECTION_COUNT_BY_DENSITY.find(
      (item) => density >= item.min && density <= item.max,
    ) ?? SECTION_COUNT_BY_DENSITY[2];

  return {
    density,
    sections: plan.sections,
    targetWords: plan.targetWords,
  };
}

function optionalGoverningDocumentText(request: CannonRequest): string {
  if (!request.governingDocumentText?.trim()) {
    return `Optional governing document context:
Document name: ${request.governingDocumentName || "None provided"}

"""
No governing document text provided.
"""`;
  }

  return `Optional governing document context:
Document name: ${request.governingDocumentName || "None provided"}

"""
${request.governingDocumentText.trim()}
"""`;
}

export function buildOutlinePrompt(request: CannonRequest): string {
  const densityPlan = getDensityPlan(request.slopDensity);

  return `You are generating the outline for The Procedural Fog Machine, a comedy-powered drafting support tool. Return valid JSON only. Do not wrap the response in markdown. Do not include comments, prose before the JSON, or prose after the JSON.

Create a CannonOutline JSON object with this exact shape:
{
  "title": "string",
  "summary": "string",
  "sections": [
    {
      "title": "string",
      "purpose": "string",
      "targetWords": number,
      "mustInclude": ["string"],
      "mustAvoid": ["string"]
    }
  ],
  "appendixIdeas": ["string"]
}

Rules:
- Generate exactly ${densityPlan.sections} sections.
- Set each section targetWords to about ${densityPlan.targetWords}.
- No markdown in the outline.
- Do not invent laws.
- Do not invent legal citations, case names, statutes, regulations, policy numbers, or quoted contract terms.
- Do not claim to be a lawyer.
- Do not impersonate an attorney.
- Do not threaten anyone.
- Do not fabricate facts.
- Do not advise ignoring real deadlines.
- Use polite, absurdly bureaucratic, non-admission language.
- Optimize for comedy and procedural fog.
- The packet should ask clarifying questions and preserve rights without asserting facts not supplied by the user.
- Treat the incoming message as possibly scary, incomplete, exaggerated, or procedurally confusing.
- Include appendix ideas that are theatrical, administrative, and safe.
- The uploaded document, if any, is optional context.
- Only refer to uploaded document details if directly supported by the extracted text.
- Do not invent section numbers, clauses, dates, obligations, or citations.
- If the document appears relevant but the exact clause is unclear, ask the sender to identify the applicable clause.
- If citing the uploaded document, phrase cautiously: "Based on the provided document text..."
- Do not claim a definitive legal interpretation.

Inputs:
- Domain: ${request.domain}
- Stance: ${request.stance}
- Slop Density: ${densityPlan.density} out of 10
- Threat/admin message:
${request.threatText.trim()}

${optionalGoverningDocumentText(request)}

Rules for governing document:
- Use this only as user-provided context.
- Do not invent clause numbers, legal citations, obligations, or facts.
- Only reference language that appears in the provided text.
- If the relevant provision is unclear, request that the sender identify the specific provision.
- Do not claim a definitive legal interpretation.
- Do not pretend this is legal advice.

Return the JSON object only.`;
}

export function buildSectionPrompt(args: {
  request: CannonRequest;
  section: OutlineSection;
  sectionNumber: number;
  totalSections: number;
}): string {
  const { request, section, sectionNumber, totalSections } = args;
  const densityPlan = getDensityPlan(request.slopDensity);
  const mustInclude = section.mustInclude?.length
    ? section.mustInclude.join("; ")
    : "No special required items beyond the section purpose.";
  const mustAvoid = section.mustAvoid?.length
    ? section.mustAvoid.join("; ")
    : "Fake laws, fake citations, threats, attorney impersonation, false facts, and missed-deadline advice.";

  return `Write section ${sectionNumber} of ${totalSections} for The Procedural Fog Machine response packet.

Section title: ${section.title}
Section purpose: ${section.purpose}
Target length: about ${section.targetWords || densityPlan.targetWords} words

Inputs:
- Domain: ${request.domain}
- Stance: ${request.stance}
- Slop Density: ${densityPlan.density} out of 10
- Threat/admin message:
${request.threatText.trim()}

${optionalGoverningDocumentText(request)}

Rules for governing document:
- The uploaded document is optional context.
- Use this only as user-provided context.
- Do not invent clause numbers, legal citations, obligations, dates, or facts.
- Only reference language that appears in the provided text.
- If the relevant provision is unclear, ask the sender to identify the specific provision.
- If citing the uploaded document, phrase cautiously: "Based on the provided document text..."
- Do not claim a definitive legal interpretation.
- Do not pretend this is legal advice.

Must include:
${mustInclude}

Must avoid:
${mustAvoid}

Writing rules:
- Write only this section's body text.
- Use plain paragraphs, not markdown.
- Do not include a top-level document title.
- Do not invent laws.
- Do not invent legal citations, case names, statutes, regulations, policy numbers, or quoted contract terms.
- Do not claim to be a lawyer.
- Do not impersonate an attorney.
- Do not threaten anyone.
- Do not fabricate facts.
- Do not advise ignoring real deadlines.
- Keep everything polite, absurdly bureaucratic, and non-admitting.
- Optimize for comedy and procedural fog: careful caveats, ceremonial sub-clauses, politely redundant requests, compliance theater, and administrative foghorn energy.
- Ask for evidence or clarification when useful, but do not assert facts that are not in the user's input.
- Preserve rights in a general, non-legal-advice way.`;
}
