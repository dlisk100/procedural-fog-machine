import cacheData from "./sampleCache.json";
import type { CannonOutline, CannonRequest, GeneratedSection } from "./types";

export const DEFAULT_SAMPLE_INPUT =
  "You are in violation of your lease due to an unauthorized pet. Remove the pet within 48 hours or face penalties.";

type SampleCacheEntry = {
  request: CannonRequest;
  outline: CannonOutline;
  sections: GeneratedSection[];
};

type SampleCacheData = Record<string, SampleCacheEntry>;

const SAMPLE_CACHE = cacheData as SampleCacheData;

function normalizeText(input: string | undefined): string {
  return (input ?? "").trim().replace(/\s+/g, " ");
}

export function getSampleCacheHit(request: CannonRequest): SampleCacheEntry | null {
  const density = String(request.slopDensity);
  const cacheEntry = SAMPLE_CACHE[density];

  if (!cacheEntry) {
    return null;
  }

  if (
    normalizeText(request.threatText) !== normalizeText(DEFAULT_SAMPLE_INPUT) ||
    request.domain !== cacheEntry.request.domain ||
    request.stance !== cacheEntry.request.stance ||
    request.slopDensity !== cacheEntry.request.slopDensity ||
    normalizeText(request.governingDocumentText) ||
    normalizeText(request.governingDocumentName)
  ) {
    return null;
  }

  return cacheEntry;
}
