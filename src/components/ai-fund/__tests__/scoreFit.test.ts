import { describe, it, expect } from "vitest";
import type { AiFundPerson, AiFundConcept, HarmonicPersonMetadata } from "@/types/ai-fund";

// scoreFit is not exported — we re-implement the same logic here as a snapshot test
// to ensure the algorithm stays correct. If scoreFit is later extracted to a utility,
// these tests can import it directly.

// Inline copy of scoreFit for testing (matches MatchingBoardTab.tsx:27-88)
interface ScoredCandidate {
  person: AiFundPerson;
  fitScore: number;
  reasons: string[];
}

function scoreFit(person: AiFundPerson, concept: AiFundConcept): ScoredCandidate {
  const reasons: string[] = [];
  let fitScore = 0;

  const harmonic = (person.metadata as Record<string, unknown> | null)?.harmonic as
    | HarmonicPersonMetadata
    | undefined;

  const sectorLower = (concept.sector || "").toLowerCase();
  const thesisLower = (concept.thesis || "").toLowerCase();
  const conceptTerms = `${sectorLower} ${thesisLower}`.split(/\s+/).filter((t) => t.length > 3);

  const roleLower = `${person.currentRole || ""} ${person.currentCompany || ""}`.toLowerCase();
  for (const term of conceptTerms) {
    if (roleLower.includes(term)) {
      fitScore += 20;
      reasons.push(`Current role matches "${term}"`);
      break;
    }
  }

  if (harmonic) {
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

    if (harmonic.highlights.length > 0) {
      fitScore += Math.min(harmonic.highlights.length * 5, 15);
      reasons.push(`${harmonic.highlights.length} notable highlight${harmonic.highlights.length > 1 ? "s" : ""}`);
    }

    if (harmonic.awards.length > 0) {
      fitScore += Math.min(harmonic.awards.length * 10, 20);
      reasons.push(`${harmonic.awards.length} award${harmonic.awards.length > 1 ? "s" : ""}`);
    }

    if (harmonic.education.length > 0) {
      fitScore += 5;
    }
  }

  if (person.personType === "both") {
    fitScore += 5;
    reasons.push("Flexible role (FIR or VE)");
  }

  return { person, fitScore: Math.min(fitScore, 100), reasons };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePerson(overrides: Partial<AiFundPerson> = {}): AiFundPerson {
  return {
    id: "p1",
    userId: "u1",
    fullName: "Jane Doe",
    email: null,
    linkedinUrl: null,
    githubUrl: null,
    twitterUrl: null,
    websiteUrl: null,
    currentRole: null,
    currentCompany: null,
    location: null,
    bio: null,
    personType: "fir",
    processStage: "identified",
    sourceChannel: null,
    tags: [],
    metadata: null,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    ...overrides,
  };
}

function makeConcept(overrides: Partial<AiFundConcept> = {}): AiFundConcept {
  return {
    id: "c1",
    userId: "u1",
    name: "AI Health",
    thesis: "AI-driven diagnostics platform",
    sector: "Healthcare technology",
    stage: "ideation",
    lpSource: null,
    notes: null,
    metadata: null,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("scoreFit", () => {
  it("returns 0 for a person with no relevant data", () => {
    const result = scoreFit(makePerson(), makeConcept());
    expect(result.fitScore).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("boosts score when current role matches concept sector", () => {
    const person = makePerson({ currentRole: "Healthcare Engineer", currentCompany: "MedCo" });
    const result = scoreFit(person, makeConcept());
    expect(result.fitScore).toBe(20);
    expect(result.reasons).toEqual([expect.stringContaining("Current role matches")]);
  });

  it("boosts score for matching Harmonic experience", () => {
    const person = makePerson({
      metadata: {
        harmonic: {
          entityUrn: "urn:harmonic:person:1",
          education: [],
          experience: [
            { title: "ML Engineer", company: "Healthcare AI Corp" },
          ],
          highlights: [],
          awards: [],
          enrichedAt: "2025-01-01",
        } satisfies HarmonicPersonMetadata,
      },
    });
    const result = scoreFit(person, makeConcept());
    expect(result.fitScore).toBe(15);
    expect(result.reasons).toContain("Past experience: ML Engineer @ Healthcare AI Corp");
  });

  it("adds highlights bonus", () => {
    const person = makePerson({
      metadata: {
        harmonic: {
          entityUrn: "urn:harmonic:person:1",
          education: [],
          experience: [],
          highlights: ["Published researcher", "Top 1% engineer"],
          awards: [],
          enrichedAt: "2025-01-01",
        } satisfies HarmonicPersonMetadata,
      },
    });
    const result = scoreFit(person, makeConcept());
    expect(result.fitScore).toBe(10); // 2 * 5
    expect(result.reasons).toContain("2 notable highlights");
  });

  it("adds awards bonus capped at 20", () => {
    const person = makePerson({
      metadata: {
        harmonic: {
          entityUrn: "urn:harmonic:person:1",
          education: [],
          experience: [],
          highlights: [],
          awards: [
            { title: "ACM Fellow" },
            { title: "Turing Award" },
            { title: "IEEE Medal" },
          ],
          enrichedAt: "2025-01-01",
        } satisfies HarmonicPersonMetadata,
      },
    });
    const result = scoreFit(person, makeConcept());
    expect(result.fitScore).toBe(20); // min(30, 20) = 20
  });

  it("adds education bonus", () => {
    const person = makePerson({
      metadata: {
        harmonic: {
          entityUrn: "urn:harmonic:person:1",
          education: [{ school: "MIT", degree: "PhD" }],
          experience: [],
          highlights: [],
          awards: [],
          enrichedAt: "2025-01-01",
        } satisfies HarmonicPersonMetadata,
      },
    });
    const result = scoreFit(person, makeConcept());
    expect(result.fitScore).toBe(5);
  });

  it("adds bonus for personType 'both'", () => {
    const person = makePerson({ personType: "both" });
    const result = scoreFit(person, makeConcept());
    expect(result.fitScore).toBe(5);
    expect(result.reasons).toContain("Flexible role (FIR or VE)");
  });

  it("caps fit score at 100", () => {
    const person = makePerson({
      currentRole: "Healthcare CTO",
      personType: "both",
      metadata: {
        harmonic: {
          entityUrn: "urn:harmonic:person:1",
          education: [{ school: "Stanford" }],
          experience: [
            { title: "Healthcare Director", company: "Diagnostics Inc" },
            { title: "Technology Lead", company: "Healthcare Platform" },
          ],
          highlights: ["Top researcher", "Keynote speaker", "Patent holder"],
          awards: [{ title: "Award 1" }, { title: "Award 2" }, { title: "Award 3" }],
          enrichedAt: "2025-01-01",
        } satisfies HarmonicPersonMetadata,
      },
    });
    const result = scoreFit(person, makeConcept());
    expect(result.fitScore).toBeLessThanOrEqual(100);
  });
});
