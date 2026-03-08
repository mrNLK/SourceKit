/**
 * AI Fund Supabase Query Library
 *
 * All database operations for the 11 aifund_* tables.
 * No mock data. Requires authenticated Supabase session.
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
import {
  type AiFundConcept,
  type AiFundPerson,
  type AiFundEvaluationScore,
  type AiFundAssignment,
  type AiFundEngagement,
  type AiFundResidency,
  type AiFundDecisionMemo,
  type AiFundActivityEvent,
  type AiFundIntelligenceRun,
  type AiFundEvidence,
  type AiFundExternalProfile,
  type AiFundDashboardStats,
  type PersonWithScores,
  type ConceptWithAssignments,
  conceptFromRow,
  personFromRow,
  scoreFromRow,
  assignmentFromRow,
  engagementFromRow,
  residencyFromRow,
  decisionMemoFromRow,
  activityEventFromRow,
  intelligenceRunFromRow,
  evidenceFromRow,
} from "@/types/ai-fund";
import { computeCompositeScore } from "@/lib/aifund-scoring";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export async function fetchConcepts(): Promise<AiFundConcept[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("aifund_concepts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(conceptFromRow);
}

export async function createConcept(
  fields: Partial<AiFundConcept>
): Promise<AiFundConcept> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("aifund_concepts")
    .insert({
      user_id: userId,
      name: fields.name || "Untitled Concept",
      thesis: fields.thesis || null,
      sector: fields.sector || null,
      stage: fields.stage || "ideation",
      lp_source: fields.lpSource || null,
      notes: fields.notes || null,
      metadata: fields.metadata || null,
    })
    .select()
    .single();

  if (error) throw error;
  return conceptFromRow(data);
}

export async function updateConcept(
  id: string,
  updates: Partial<AiFundConcept>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.thesis !== undefined) payload.thesis = updates.thesis;
  if (updates.sector !== undefined) payload.sector = updates.sector;
  if (updates.stage !== undefined) payload.stage = updates.stage;
  if (updates.lpSource !== undefined) payload.lp_source = updates.lpSource;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.metadata !== undefined) payload.metadata = updates.metadata;

  const { error } = await supabase
    .from("aifund_concepts")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteConcept(id: string): Promise<void> {
  const { error } = await supabase
    .from("aifund_concepts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function fetchPeople(): Promise<AiFundPerson[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("aifund_people")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(personFromRow);
}

export async function createPerson(
  fields: Partial<AiFundPerson>
): Promise<AiFundPerson> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("aifund_people")
    .insert({
      user_id: userId,
      full_name: fields.fullName || "Unknown",
      email: fields.email || null,
      linkedin_url: fields.linkedinUrl || null,
      github_url: fields.githubUrl || null,
      twitter_url: fields.twitterUrl || null,
      website_url: fields.websiteUrl || null,
      current_role: fields.currentRole || null,
      current_company: fields.currentCompany || null,
      location: fields.location || null,
      bio: fields.bio || null,
      person_type: fields.personType || "fir",
      process_stage: fields.processStage || "identified",
      source_channel: fields.sourceChannel || null,
      tags: fields.tags || [],
      metadata: fields.metadata || null,
    })
    .select()
    .single();

  if (error) throw error;
  return personFromRow(data);
}

export async function updatePerson(
  id: string,
  updates: Partial<AiFundPerson>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.linkedinUrl !== undefined) payload.linkedin_url = updates.linkedinUrl;
  if (updates.githubUrl !== undefined) payload.github_url = updates.githubUrl;
  if (updates.twitterUrl !== undefined) payload.twitter_url = updates.twitterUrl;
  if (updates.websiteUrl !== undefined) payload.website_url = updates.websiteUrl;
  if (updates.currentRole !== undefined) payload.current_role = updates.currentRole;
  if (updates.currentCompany !== undefined) payload.current_company = updates.currentCompany;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.bio !== undefined) payload.bio = updates.bio;
  if (updates.personType !== undefined) payload.person_type = updates.personType;
  if (updates.processStage !== undefined) payload.process_stage = updates.processStage;
  if (updates.sourceChannel !== undefined) payload.source_channel = updates.sourceChannel;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  if (updates.metadata !== undefined) payload.metadata = updates.metadata;

  const { error } = await supabase
    .from("aifund_people")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase
    .from("aifund_people")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Evaluation Scores
// ---------------------------------------------------------------------------

export async function fetchScoresForPerson(
  personId: string
): Promise<AiFundEvaluationScore[]> {
  const { data, error } = await supabase
    .from("aifund_evaluation_scores")
    .select("*")
    .eq("person_id", personId)
    .order("scored_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(scoreFromRow);
}

export async function createScore(
  fields: Partial<AiFundEvaluationScore>
): Promise<AiFundEvaluationScore> {
  const composite = computeCompositeScore({
    aiExcellence: fields.aiExcellence ?? null,
    technicalAbility: fields.technicalAbility ?? null,
    productInstinct: fields.productInstinct ?? null,
    leadershipPotential: fields.leadershipPotential ?? null,
  });

  const { data, error } = await supabase
    .from("aifund_evaluation_scores")
    .insert({
      person_id: fields.personId,
      evaluator_id: fields.evaluatorId || null,
      ai_excellence: fields.aiExcellence ?? null,
      technical_ability: fields.technicalAbility ?? null,
      product_instinct: fields.productInstinct ?? null,
      leadership_potential: fields.leadershipPotential ?? null,
      composite_score: composite,
      notes: fields.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return scoreFromRow(data);
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function fetchAssignments(): Promise<AiFundAssignment[]> {
  const { data, error } = await supabase
    .from("aifund_assignments")
    .select("*")
    .order("assigned_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(assignmentFromRow);
}

export async function createAssignment(
  fields: Partial<AiFundAssignment>
): Promise<AiFundAssignment> {
  const { data, error } = await supabase
    .from("aifund_assignments")
    .insert({
      concept_id: fields.conceptId,
      person_id: fields.personId,
      role: fields.role || "fir",
      status: fields.status || "proposed",
      notes: fields.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return assignmentFromRow(data);
}

export async function updateAssignment(
  id: string,
  updates: Partial<AiFundAssignment>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.role !== undefined) payload.role = updates.role;

  const { error } = await supabase
    .from("aifund_assignments")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Engagements
// ---------------------------------------------------------------------------

export async function fetchEngagements(
  personId: string
): Promise<AiFundEngagement[]> {
  const { data, error } = await supabase
    .from("aifund_engagements")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(engagementFromRow);
}

export async function createEngagement(
  fields: Partial<AiFundEngagement>
): Promise<AiFundEngagement> {
  const { data, error } = await supabase
    .from("aifund_engagements")
    .insert({
      person_id: fields.personId,
      channel: fields.channel || "email",
      direction: fields.direction || "outbound",
      subject: fields.subject || null,
      body: fields.body || null,
      sent_at: fields.sentAt || null,
      responded_at: fields.respondedAt || null,
      metadata: fields.metadata || null,
    })
    .select()
    .single();

  if (error) throw error;
  return engagementFromRow(data);
}

// ---------------------------------------------------------------------------
// Residencies
// ---------------------------------------------------------------------------

export async function fetchResidencies(): Promise<AiFundResidency[]> {
  const { data, error } = await supabase
    .from("aifund_residencies")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data || []).map(residencyFromRow);
}

export async function createResidency(
  fields: Partial<AiFundResidency>
): Promise<AiFundResidency> {
  const { data, error } = await supabase
    .from("aifund_residencies")
    .insert({
      assignment_id: fields.assignmentId,
      start_date: fields.startDate,
      end_date: fields.endDate || null,
      stipend_monthly: fields.stipendMonthly || 10000,
      status: fields.status || "active",
      weekly_check_ins: fields.weeklyCheckIns || [],
      milestones: fields.milestones || [],
    })
    .select()
    .single();

  if (error) throw error;
  return residencyFromRow(data);
}

// ---------------------------------------------------------------------------
// Decision Memos
// ---------------------------------------------------------------------------

export async function fetchDecisionMemos(
  conceptId: string
): Promise<AiFundDecisionMemo[]> {
  const { data, error } = await supabase
    .from("aifund_decision_memos")
    .select("*")
    .eq("concept_id", conceptId)
    .order("decided_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(decisionMemoFromRow);
}

export async function createDecisionMemo(
  fields: Partial<AiFundDecisionMemo>
): Promise<AiFundDecisionMemo> {
  const { data, error } = await supabase
    .from("aifund_decision_memos")
    .insert({
      concept_id: fields.conceptId,
      author_id: fields.authorId || null,
      outcome: fields.outcome || "defer",
      investment_amount: fields.investmentAmount || null,
      valuation: fields.valuation || null,
      rationale: fields.rationale || null,
      conditions: fields.conditions || null,
    })
    .select()
    .single();

  if (error) throw error;
  return decisionMemoFromRow(data);
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export async function fetchEvidence(
  personId: string
): Promise<AiFundEvidence[]> {
  const { data, error } = await supabase
    .from("aifund_evidence")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(evidenceFromRow);
}

export async function createEvidence(
  fields: Partial<AiFundEvidence>
): Promise<AiFundEvidence> {
  const { data, error } = await supabase
    .from("aifund_evidence")
    .insert({
      person_id: fields.personId,
      evidence_type: fields.evidenceType || "other",
      title: fields.title || "Untitled",
      url: fields.url || null,
      description: fields.description || null,
      signal_strength: fields.signalStrength || null,
      metadata: fields.metadata || null,
    })
    .select()
    .single();

  if (error) throw error;
  return evidenceFromRow(data);
}

// ---------------------------------------------------------------------------
// Activity Events
// ---------------------------------------------------------------------------

export async function fetchRecentActivity(
  limit = 20
): Promise<AiFundActivityEvent[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("aifund_activity_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(activityEventFromRow);
}

export async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from("aifund_activity_events").insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    details: details || null,
  });
  if (error) console.error("Failed to log activity:", error);
}

// ---------------------------------------------------------------------------
// Intelligence Runs
// ---------------------------------------------------------------------------

export async function fetchIntelligenceRuns(): Promise<AiFundIntelligenceRun[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("aifund_intelligence_runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(intelligenceRunFromRow);
}

export async function createIntelligenceRun(
  fields: Partial<AiFundIntelligenceRun>
): Promise<AiFundIntelligenceRun> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("aifund_intelligence_runs")
    .insert({
      user_id: userId,
      provider: fields.provider || "manual",
      query_params: fields.queryParams || {},
      status: "pending",
      results_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return intelligenceRunFromRow(data);
}

export async function dispatchHarmonicIntelligence(
  runId: string,
  query: string,
  conceptId?: string | null,
  limit?: number,
): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/harmonic-intelligence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      runId,
      query,
      ...(conceptId ? { conceptId } : {}),
      ...(limit ? { limit } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Request failed" } }));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function updateIntelligenceRun(
  id: string,
  updates: Partial<AiFundIntelligenceRun>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.resultsCount !== undefined) payload.results_count = updates.resultsCount;
  if (updates.resultsSummary !== undefined) payload.results_summary = updates.resultsSummary;
  if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;

  const { error } = await supabase
    .from("aifund_intelligence_runs")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Dashboard Stats (aggregated)
// ---------------------------------------------------------------------------

export async function fetchDashboardStats(): Promise<AiFundDashboardStats> {
  const userId = await getUserId();

  const [conceptsRes, peopleRes, residenciesRes, decisionsRes, activityRes] =
    await Promise.all([
      supabase
        .from("aifund_concepts")
        .select("id, stage")
        .eq("user_id", userId),
      supabase
        .from("aifund_people")
        .select("id, process_stage")
        .eq("user_id", userId),
      supabase
        .from("aifund_residencies")
        .select("id, status"),
      supabase
        .from("aifund_decision_memos")
        .select("id, outcome"),
      supabase
        .from("aifund_activity_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const concepts = conceptsRes.data || [];
  const people = peopleRes.data || [];
  const residencies = residenciesRes.data || [];
  const activity = activityRes.data || [];

  const activeStages = new Set([
    "validation",
    "prototyping",
    "recruiting",
    "residency",
    "investment_review",
  ]);
  const pipelineStages = new Set([
    "contacted",
    "engaged",
    "applied",
    "interviewing",
    "offered",
    "residency",
  ]);

  const pending = (decisionsRes.data || []).filter(
    (d: { outcome: string }) => d.outcome === "defer"
  );

  return {
    totalConcepts: concepts.length,
    activeConcepts: concepts.filter((c: { stage: string }) => activeStages.has(c.stage)).length,
    totalPeople: people.length,
    activePipeline: people.filter((p: { process_stage: string }) =>
      pipelineStages.has(p.process_stage)
    ).length,
    activeResidencies: residencies.filter(
      (r: { status: string }) => r.status === "active"
    ).length,
    pendingDecisions: pending.length,
    recentActivity: activity.map(activityEventFromRow),
  };
}

// ---------------------------------------------------------------------------
// Composite Queries
// ---------------------------------------------------------------------------

export async function fetchPeopleWithScores(): Promise<PersonWithScores[]> {
  const people = await fetchPeople();
  const assignments = await fetchAssignments();

  const results: PersonWithScores[] = [];

  for (const person of people) {
    const scores = await fetchScoresForPerson(person.id);
    const evidence = await fetchEvidence(person.id);
    const personAssignments = assignments.filter(
      (a) => a.personId === person.id
    );

    results.push({
      ...person,
      latestScore: scores.length > 0 ? scores[0] : null,
      evidenceCount: evidence.length,
      assignments: personAssignments,
    });
  }

  return results;
}

export async function fetchConceptWithDetails(
  conceptId: string
): Promise<ConceptWithAssignments | null> {
  const userId = await getUserId();
  const { data: conceptRow, error } = await supabase
    .from("aifund_concepts")
    .select("*")
    .eq("id", conceptId)
    .eq("user_id", userId)
    .single();

  if (error || !conceptRow) return null;

  const concept = conceptFromRow(conceptRow);

  const { data: assignmentRows } = await supabase
    .from("aifund_assignments")
    .select("*")
    .eq("concept_id", conceptId);

  const decisionMemos = await fetchDecisionMemos(conceptId);

  const assignmentsWithPeople = [];
  for (const aRow of assignmentRows || []) {
    const { data: personRow } = await supabase
      .from("aifund_people")
      .select("*")
      .eq("id", aRow.person_id)
      .single();

    if (personRow) {
      assignmentsWithPeople.push({
        ...assignmentFromRow(aRow),
        person: personFromRow(personRow),
      });
    }
  }

  return {
    ...concept,
    assignments: assignmentsWithPeople,
    decisionMemos,
  };
}
