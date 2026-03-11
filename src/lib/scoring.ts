/**
 * Shared scoring utilities for AI Fund matching.
 *
 * Extracted from MatchingBoardTab so tests and other modules can import directly.
 */

import type { AiFundPerson, AiFundConcept, HarmonicPersonMetadata } from "@/types/ai-fund";

export interface ScoredCandidate {
  person: AiFundPerson;
  fitScore: number;
  reasons: string[];
}

/**
 * Score how well a person fits a concept based on:
 * - Sector overlap with Harmonic experience
 * - Current role relevance
 * - Harmonic highlights count
 */
export function scoreFit(person: AiFundPerson, concept: AiFundConcept): ScoredCandidate {
  const reasons: string[] = [];
  let fitScore = 0;

  const harmonic = (person.metadata as Record<string, unknown> | null)?.harmonic as
    | HarmonicPersonMetadata
    | undefined;

  const sectorLower = (concept.sector || "").toLowerCase();
  const thesisLower = (concept.thesis || "").toLowerCase();
  const conceptTerms = `${sectorLower} ${thesisLower}`.split(/\s+/).filter((t) => t.length > 3);

  // Current role/company match
  const roleLower = `${person.currentRole || ""} ${person.currentCompany || ""}`.toLowerCase();
  for (const term of conceptTerms) {
    if (roleLower.includes(term)) {
      fitScore += 20;
      reasons.push(`Current role matches "${term}"`);
      break;
    }
  }

  if (harmonic) {
    // Experience at relevant companies/roles
    for (const exp of harmonic.experience) {
      const expText = `${exp.title} ${exp.company}`.toLowerCase();
      for (const term of conceptTerms) {
        if (expText.includes(term)) {
          fitScore += 15;
          reasons.push(`Past experience: ${exp.title} @ ${exp.company}`);
          break;
        }
      }
      if (reasons.length >= 3) break;
    }

    // Highlights boost
    if (harmonic.highlights.length > 0) {
      fitScore += Math.min(harmonic.highlights.length * 5, 15);
      reasons.push(`${harmonic.highlights.length} notable highlight${harmonic.highlights.length > 1 ? "s" : ""}`);
    }

    // Awards boost
    if (harmonic.awards.length > 0) {
      fitScore += Math.min(harmonic.awards.length * 10, 20);
      reasons.push(`${harmonic.awards.length} award${harmonic.awards.length > 1 ? "s" : ""}`);
    }

    // Education depth
    if (harmonic.education.length > 0) {
      fitScore += 5;
    }
  }

  // Person type match
  if (person.personType === "both") {
    fitScore += 5;
    reasons.push("Flexible role (FIR or VE)");
  }

  return { person, fitScore: Math.min(fitScore, 100), reasons };
}
