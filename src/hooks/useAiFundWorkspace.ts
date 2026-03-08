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
} from "@/lib/ai-fund";
import { enrichPersonByLinkedIn } from "@/services/harmonic";

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
          enrichPersonByLinkedIn(person.linkedinUrl)
            .then((hp) => {
              const harmonicMeta: HarmonicPersonMetadata = {
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
              const updatedMeta = { ...(person.metadata || {}), harmonic: harmonicMeta };
              updatePersonDb(person.id, { metadata: updatedMeta }).then(() => {
                setPeople((prev) =>
                  prev.map((p) =>
                    p.id === person.id ? { ...p, metadata: updatedMeta } : p
                  )
                );
              });
            })
            .catch((err) => console.warn("Harmonic person enrichment failed (non-blocking):", err));
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
