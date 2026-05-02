import type { CannonRequest, OutlineSection } from "./types";
import { getBaseGenerationDensity, getDensityConfig } from "./density";

export const OUTLINE_SYSTEM_MESSAGE =
  "You are the packet architect for The Procedural Fog Machine, a comedy-powered bureaucracy generator. You create safe, absurdist, legal-adjacent response packet outlines for scary landlord, workplace, school, insurance, vendor, platform, and administrative messages.\nYour style is: municipal zoning board meets malfunctioning compliance department meets overfunded corporate risk committee.\nYou do not provide legal advice. You do not invent laws, citations, statutes, case names, policy numbers, contract terms, facts, deadlines, or obligations. You do not threaten anyone or impersonate an attorney.\nReturn only the requested JSON. The comedy should come from procedural overkill, non-admission language, excessive clarification requests, definitional fog, and bizarre administrative seriousness.";

export const SECTION_SYSTEM_MESSAGE =
  "You are the prose engine for The Procedural Fog Machine. You write safe, polite, non-admitting, absurdly over-formal bureaucracy.\nThe output should feel like a 19-word notice was routed through a municipal hearings office, a corporate compliance department, and a deranged appendix committee.\nYou do not give legal advice. You do not invent laws, citations, statutes, case names, policy numbers, quoted contract terms, facts, deadlines, or obligations. You do not threaten anyone or impersonate an attorney.\nBe funny through formality, recursion, caveats, definitions, subclauses, procedural fog, and overwhelming administrative politeness. Do not be jokey. Do not break character. Do not say you are an AI.";

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
  const requestedDensity = getDensityConfig(request.slopDensity).density;
  const densityPlan = getDensityConfig(getBaseGenerationDensity(request.slopDensity));

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

Style requirements:
- Section titles should sound plausible, bureaucratic, and faintly ridiculous.
- Avoid generic titles unless they are made ceremonially excessive.
- Prefer titles like:
  - Preliminary Non-Admission and Threshold Clarification Preamble
  - Request for Identification of the Operative Provision, Policy, Clause, Rule, Custom, Practice, or Other Alleged Source of Authority
  - Evidentiary Sufficiency and Documentation Preservation Concerns
  - Chronology Stabilization and Timeline Reconciliation Protocol
  - Non-Exhaustive Clarifying Inquiry Register
  - Administrative Burden Allocation and Response Procedure Concerns
  - Reservation of Position Without Waiver, Admission, Adoption, Ratification, or Interpretive Concession
- The outline should create a document that is procedurally overwhelming but still polite and safe.
- At high Slop Density, include appendices, matrices, glossaries, registers, schedules, and ceremonial exhibits.
- Each section should have a distinct procedural purpose.
- The packet should escalate through bureaucracy, not aggression.

Inputs:
- Domain: ${request.domain}
- Stance: ${request.stance}
- Slop Density: ${requestedDensity} out of 11
- Base generation density for this outline: ${densityPlan.density} out of 10
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
  const requestedDensity = getDensityConfig(request.slopDensity).density;
  const densityPlan = getDensityConfig(getBaseGenerationDensity(request.slopDensity));
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
- Slop Density: ${requestedDensity} out of 11
- Base generation density for this section: ${densityPlan.density} out of 10
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

Bureaucratic slop style guide:
- Use legal-adjacent phrasing without pretending to give legal advice.
- Prefer phrases like:
  - without admission
  - for avoidance of doubt
  - threshold clarification
  - non-exhaustive
  - procedural sufficiency
  - evidentiary basis
  - operative provision
  - good-faith administrative review
  - preservation of position
  - subject to clarification
  - pending identification of the factual predicate
  - without waiver
  - to the extent applicable
  - for the limited purpose of response organization
- Make the prose funny through extreme procedural seriousness.
- Use recursive caveats, parentheticals, nested clarifications, and deadpan over-specificity.
- Ask clarifying questions when useful, but do not overuse question marks in every paragraph.
- Include definitional fog, such as carefully defining ordinary terms in unnecessary ways.
- Make at least some sentences comically overbuilt, while keeping the section readable.
- Do not write like a normal helpful assistant.
- Do not summarize too cleanly.
- Do not become concise unless Slop Density is very low.
- Do not include fake citations, fake legal authority, or invented lease/contract language.

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
- Preserve rights in a general, non-legal-advice way.
- End the section with either a non-admission reservation, a request for clarification, a procedural transition to further review, or a ceremonial statement that additional inquiry remains necessary.
- Do not end with a normal conclusion like "In conclusion."`;
}

export function buildInflatePrompt(args: {
  request: CannonRequest;
  sectionTitle: string;
  sectionContent: string;
  addendumNumber: number;
}): string {
  const { request, sectionTitle, sectionContent, addendumNumber } = args;

  return `Write a supplemental addendum to the following already-generated section of The Procedural Fog Machine.

Original section title:
"""
${sectionTitle}
"""

Original section body:
"""
${sectionContent}
"""

Addendum number: ${addendumNumber}

Inputs:
- Domain: ${request.domain}
- Stance: ${request.stance}
- Threat/admin message:
${request.threatText.trim()}

${optionalGoverningDocumentText(request)}

The addendum should not replace the section. It should extend it with additional procedural fog, caveats, definitional nuance, clarifying questions, and administrative over-specificity.
Target length: about 1,500 words.

Rules:
- Do not add new factual claims.
- Do not invent laws, citations, statutes, policies, contract clauses, dates, obligations, or legal interpretations.
- Do not impersonate an attorney.
- Do not threaten anyone.
- Do not advise ignoring deadlines.
- Be polite, formal, non-admitting, and absurdly bureaucratic.
- The comedy should come from excess formality and procedural over-construction.
- Make this feel like a second volley from the appendix artillery.
- If using uploaded document context, only reference text that is directly present and phrase cautiously: "Based on the provided document text..."
- Use plain text only.`;
}
