/**
 * useAiFundWorkspace Hook
 *
 * Central state management for the AI Fund module.
 * Connects to Supabase. No mock data.
 */

import { useState, useEffect, useCallback } from "react";
import {
  type AiFundConcept,
  type AiFundPerson,
  type AiFundAssignment,
  type AiFundEvaluationScore,
  type AiFundDashboardStats,
  type AiFundWorkspace,
  type HarmonicPersonMetadata,
} from "@/types/ai-fund";
import {
  fetchConcepts,
  createConcept,
  updateConcept as updateConceptDb,
  fetchPeople,
  createPerson,
  updatePerson as updatePersonDb,
  fetchAssignments,
  createAssignment,
  createScore,
  fetchDashboardStats,
  createEvidence,
} from "@/lib/ai-fund";
import { enrichPersonByLinkedIn, checkEnrichmentStatus, getPersonById } from "@/services/harmonic";
import { toast } from "@/hooks/use-toast";

/** Convert raw HarmonicPerson to our metadata shape. */
function toHarmonicMeta(hp: Awaited<ReturnType<typeof enrichPersonByLinkedIn>>): HarmonicPersonMetadata {
  return {
    entityUrn: hp.entity_urn,
    profilePictureUrl: hp.profile_picture_url,
    headline: hp.linkedin_headline,
    education: (hp.education || []).map((e) => ({
      school: e.school || "Unknown",
      degree: e.degree,
      field: e.field_of_study,
    })),
    experience: (hp.experience || []).map((e) => ({
      title: e.title || "Unknown",
      company: e.company_name || "Unknown",
      companyUrn: e.company,
      startDate: e.start_date,
      endDate: e.end_date,
      isCurrent: e.is_current_position,
    })),
    highlights: (hp.highlights || []).map((h) => h.text),
    awards: (hp.awards__beta || []).map((a) => ({
      title: a.title,
      description: a.description,
    })),
    languages: hp.languages,
    enrichedAt: new Date().toISOString(),
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Max number of poll attempts for async enrichment. */
const MAX_POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 5000;

export function useAiFundWorkspace(): AiFundWorkspace {
  const [concepts, setConcepts] = useState<AiFundConcept[]>([]);
  const [people, setPeople] = useState<AiFundPerson[]>([]);
  const [assignments, setAssignments] = useState<AiFundAssignment[]>([]);
  const [stats, setStats] = useState<AiFundDashboardStats>({
    totalConcepts: 0,
    activeConcepts: 0,
    totalPeople: 0,
    activePipeline: 0,
    activeResidencies: 0,
    pendingDecisions: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Enrich a person via Harmonic. Handles 202 (pending) responses by polling
   * enrichment_status until complete, then fetching the full person record.
   */
  const applyHarmonicEnrichment = useCallback(
    async (person: AiFundPerson) => {
      if (!person.linkedinUrl) return;

      let hp: Awaited<ReturnType<typeof enrichPersonByLinkedIn>>;
      try {
        const result = await enrichPersonByLinkedIn(person.linkedinUrl);

        // Handle 202 async enrichment pending
        if (result.enrichment_pending && result.enrichment_id) {
          toast({ title: "Enrichment queued", description: `${person.fullName} — Harmonic is processing, will update automatically.` });

          // Poll until complete
          for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
            await delay(POLL_INTERVAL_MS);
            const statuses = await checkEnrichmentStatus([result.enrichment_id]);
            const status = Array.isArray(statuses) ? statuses[0] : statuses;
            if (status?.status === "COMPLETE" && status.enriched_entity_urn) {
              hp = await getPersonById(status.enriched_entity_urn);
              break;
            }
            if (status?.status === "FAILED" || status?.status === "NOT_FOUND") {
              toast({ title: "Enrichment failed", description: `${person.fullName} — ${status.message || "Person not found in Harmonic"}`, variant: "destructive" });
              return;
            }
          }
          if (!hp!) {
            toast({ title: "Enrichment timeout", description: `${person.fullName} — still processing. Try refreshing later.`, variant: "destructive" });
            return;
          }
        } else {
          hp = result;
        }
      } catch (err) {
        toast({ title: "Enrichment failed", description: `${person.fullName} — ${err instanceof Error ? err.message : "Unknown error"}`, variant: "destructive" });
        return;
      }

      const harmonicMeta = toHarmonicMeta(hp);
      const updatedMeta = { ...(person.metadata || {}), harmonic: harmonicMeta };
      await updatePersonDb(person.id, { metadata: updatedMeta });
      setPeople((prev) =>
        prev.map((p) => (p.id === person.id ? { ...p, metadata: updatedMeta } : p))
      );

      // Auto-create evidence records
      const evidencePromises = [];
      for (const highlight of harmonicMeta.highlights.slice(0, 5)) {
        evidencePromises.push(
          createEvidence({
            personId: person.id,
            evidenceType: "media_mention",
            title: highlight.length > 120 ? highlight.slice(0, 117) + "..." : highlight,
            description: highlight,
            signalStrength: 60,
            metadata: { source: "harmonic", type: "highlight" },
          })
        );
      }
      for (const award of harmonicMeta.awards.slice(0, 5)) {
        evidencePromises.push(
          createEvidence({
            personId: person.id,
            evidenceType: "award",
            title: award.title,
            description: award.description || null,
            signalStrength: 80,
            metadata: { source: "harmonic", type: "award" },
          })
        );
      }
      await Promise.allSettled(evidencePromises);
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [c, p, a, s] = await Promise.all([
        fetchConcepts(),
        fetchPeople(),
        fetchAssignments(),
        fetchDashboardStats(),
      ]);
      setConcepts(c);
      setPeople(p);
      setAssignments(a);
      setStats(s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load AI Fund data";
      setError(msg);
      console.error("useAiFundWorkspace refresh error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addConcept = useCallback(
    async (fields: Partial<AiFundConcept>): Promise<AiFundConcept | null> => {
      try {
        const concept = await createConcept(fields);
        setConcepts((prev) => [concept, ...prev]);
        return concept;
      } catch (err) {
        console.error("addConcept error:", err);
        return null;
      }
    },
    []
  );

  const updateConceptHandler = useCallback(
    async (id: string, updates: Partial<AiFundConcept>): Promise<void> => {
      await updateConceptDb(id, updates);
      setConcepts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const addPerson = useCallback(
    async (fields: Partial<AiFundPerson>): Promise<AiFundPerson | null> => {
      try {
        const person = await createPerson(fields);
        setPeople((prev) => [person, ...prev]);

        // Fire-and-forget Harmonic enrichment if LinkedIn URL is provided
        if (person.linkedinUrl) {
          applyHarmonicEnrichment(person).catch((err) =>
            console.warn("Harmonic person enrichment failed (non-blocking):", err)
          );
        }

        return person;
      } catch (err) {
        console.error("addPerson error:", err);
        return null;
      }
    },
    []
  );

  const updatePersonHandler = useCallback(
    async (id: string, updates: Partial<AiFundPerson>): Promise<void> => {
      await updatePersonDb(id, updates);
      setPeople((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const addAssignmentHandler = useCallback(
    async (fields: Partial<AiFundAssignment>): Promise<void> => {
      const assignment = await createAssignment(fields);
      setAssignments((prev) => [assignment, ...prev]);
    },
    []
  );

  const scoreCandidateHandler = useCallback(
    async (fields: Partial<AiFundEvaluationScore>): Promise<void> => {
      await createScore(fields);
    },
    []
  );

  return {
    concepts,
    people,
    assignments,
    stats,
    loading,
    error,
    refresh,
    addConcept,
    updateConcept: updateConceptHandler,
    addPerson,
    updatePerson: updatePersonHandler,
    addAssignment: addAssignmentHandler,
    scoreCandidate: scoreCandidateHandler,
  };
}
