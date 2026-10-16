export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aifund_activity_events: {
        Row: {
          action: string
          actor: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string
          actor?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      aifund_allowed_users: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      aifund_assignments: {
        Row: {
          assigned_at: string | null
          concept_id: string
          confidence: string
          created_at: string
          fit_rationale: string
          id: string
          owner: string
          person_id: string
          priority: string
          role_intent: string
          status: string
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          concept_id: string
          confidence?: string
          created_at?: string
          fit_rationale?: string
          id?: string
          owner?: string
          person_id: string
          priority?: string
          role_intent: string
          status?: string
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          concept_id?: string
          confidence?: string
          created_at?: string
          fit_rationale?: string
          id?: string
          owner?: string
          person_id?: string
          priority?: string
          role_intent?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aifund_assignments_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "aifund_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aifund_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_build_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          id: string
          markdown_body: string
          project_id: string
          source_stage: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artifact_type: string
          created_at?: string
          id?: string
          markdown_body?: string
          project_id: string
          source_stage: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artifact_type?: string
          created_at?: string
          id?: string
          markdown_body?: string
          project_id?: string
          source_stage?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aifund_build_artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "aifund_build_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_build_projects: {
        Row: {
          concept_id: string | null
          created_at: string
          current_stage: string
          deploy_url: string | null
          id: string
          metadata: Json
          problem_statement: string | null
          repo_url: string | null
          status: string
          target_user: string | null
          template_version: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_id?: string | null
          created_at?: string
          current_stage?: string
          deploy_url?: string | null
          id?: string
          metadata?: Json
          problem_statement?: string | null
          repo_url?: string | null
          status?: string
          target_user?: string | null
          template_version?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concept_id?: string | null
          created_at?: string
          current_stage?: string
          deploy_url?: string | null
          id?: string
          metadata?: Json
          problem_statement?: string | null
          repo_url?: string | null
          status?: string
          target_user?: string | null
          template_version?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aifund_build_projects_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "aifund_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_build_stage_runs: {
        Row: {
          checklist_state: Json
          completed_at: string | null
          created_at: string
          id: string
          project_id: string
          stage: string
          started_at: string | null
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_state?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id: string
          stage: string
          started_at?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_state?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          project_id?: string
          stage?: string
          started_at?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aifund_build_stage_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "aifund_build_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_concept_sources: {
        Row: {
          comments: string | null
          concept_id: string
          created_at: string
          dedupe_hint: string | null
          english_summary: string | null
          extracted_fields: Json
          id: string
          import_batch_id: string | null
          original_language: string | null
          raw_text: string | null
          sector_raw: string | null
          source_file: string | null
          source_section: string | null
          source_type: string
          status_raw: string | null
          storage_path: string | null
          submitter: string | null
          thesis_raw: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: string | null
          concept_id: string
          created_at?: string
          dedupe_hint?: string | null
          english_summary?: string | null
          extracted_fields?: Json
          id?: string
          import_batch_id?: string | null
          original_language?: string | null
          raw_text?: string | null
          sector_raw?: string | null
          source_file?: string | null
          source_section?: string | null
          source_type: string
          status_raw?: string | null
          storage_path?: string | null
          submitter?: string | null
          thesis_raw?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: string | null
          concept_id?: string
          created_at?: string
          dedupe_hint?: string | null
          english_summary?: string | null
          extracted_fields?: Json
          id?: string
          import_batch_id?: string | null
          original_language?: string | null
          raw_text?: string | null
          sector_raw?: string | null
          source_file?: string | null
          source_section?: string | null
          source_type?: string
          status_raw?: string | null
          storage_path?: string | null
          submitter?: string | null
          thesis_raw?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aifund_concept_sources_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "aifund_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aifund_concept_sources_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "aifund_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_concepts: {
        Row: {
          brief: string
          builder_validation: string[]
          confidentiality: string
          created_at: string
          decision_status: string
          domain_expert: string | null
          first_customer: boolean
          first_customer_notes: string | null
          id: string
          lp_sponsor: string | null
          market_theme: string
          name: string
          owner: string
          problem_statement: string
          source: string
          stage: string
          target_role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brief?: string
          builder_validation?: string[]
          confidentiality?: string
          created_at?: string
          decision_status?: string
          domain_expert?: string | null
          first_customer?: boolean
          first_customer_notes?: string | null
          id?: string
          lp_sponsor?: string | null
          market_theme?: string
          name: string
          owner?: string
          problem_statement?: string
          source: string
          stage?: string
          target_role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brief?: string
          builder_validation?: string[]
          confidentiality?: string
          created_at?: string
          decision_status?: string
          domain_expert?: string | null
          first_customer?: boolean
          first_customer_notes?: string | null
          id?: string
          lp_sponsor?: string | null
          market_theme?: string
          name?: string
          owner?: string
          problem_statement?: string
          source?: string
          stage?: string
          target_role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      aifund_decision_memos: {
        Row: {
          author: string
          catalysts: string[]
          concept_id: string
          created_at: string
          id: string
          key_risks: string[]
          outcome: string | null
          person_id: string
          recommendation: string
          summary: string
          user_id: string | null
        }
        Insert: {
          author?: string
          catalysts?: string[]
          concept_id: string
          created_at?: string
          id?: string
          key_risks?: string[]
          outcome?: string | null
          person_id: string
          recommendation?: string
          summary?: string
          user_id?: string | null
        }
        Update: {
          author?: string
          catalysts?: string[]
          concept_id?: string
          created_at?: string
          id?: string
          key_risks?: string[]
          outcome?: string | null
          person_id?: string
          recommendation?: string
          summary?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aifund_decision_memos_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "aifund_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aifund_decision_memos_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_engagements: {
        Row: {
          concept_id: string
          counterparty: string | null
          due_at: string | null
          id: string
          kind: string
          last_touch_at: string
          next_step: string
          notes: string
          owner: string
          person_id: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          concept_id: string
          counterparty?: string | null
          due_at?: string | null
          id?: string
          kind: string
          last_touch_at?: string
          next_step?: string
          notes?: string
          owner?: string
          person_id: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Update: {
          concept_id?: string
          counterparty?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          last_touch_at?: string
          next_step?: string
          notes?: string
          owner?: string
          person_id?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aifund_engagements_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "aifund_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aifund_engagements_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_evaluation_scores: {
        Row: {
          ai_excellence: number
          closability_probability_pct: number | null
          closability_reasons: Json | null
          closability_version: string | null
          comp_reachability_score: number | null
          company_mobility_score: number | null
          composite_score: number | null
          evaluator_id: string | null
          expected_value: number | null
          generated_at: string
          generated_summary: string
          id: string
          inbound_intent_score: number | null
          leadership_potential: number
          metadata: Json
          model_name: string | null
          notes: string | null
          outreach_blocked: boolean | null
          override_delta: number
          override_reason: string | null
          person_id: string
          product_instinct: number
          quality_score_10: number | null
          role_target: string | null
          rubric_version: string | null
          score_source: string | null
          score_stage: string | null
          scored_at: string
          technical_ability: number
          user_id: string | null
          ve_model_fit_score: number | null
        }
        Insert: {
          ai_excellence?: number
          closability_probability_pct?: number | null
          closability_reasons?: Json | null
          closability_version?: string | null
          comp_reachability_score?: number | null
          company_mobility_score?: number | null
          composite_score?: number | null
          evaluator_id?: string | null
          expected_value?: number | null
          generated_at?: string
          generated_summary?: string
          id?: string
          inbound_intent_score?: number | null
          leadership_potential?: number
          metadata?: Json
          model_name?: string | null
          notes?: string | null
          outreach_blocked?: boolean | null
          override_delta?: number
          override_reason?: string | null
          person_id: string
          product_instinct?: number
          quality_score_10?: number | null
          role_target?: string | null
          rubric_version?: string | null
          score_source?: string | null
          score_stage?: string | null
          scored_at?: string
          technical_ability?: number
          user_id?: string | null
          ve_model_fit_score?: number | null
        }
        Update: {
          ai_excellence?: number
          closability_probability_pct?: number | null
          closability_reasons?: Json | null
          closability_version?: string | null
          comp_reachability_score?: number | null
          company_mobility_score?: number | null
          composite_score?: number | null
          evaluator_id?: string | null
          expected_value?: number | null
          generated_at?: string
          generated_summary?: string
          id?: string
          inbound_intent_score?: number | null
          leadership_potential?: number
          metadata?: Json
          model_name?: string | null
          notes?: string | null
          outreach_blocked?: boolean | null
          override_delta?: number
          override_reason?: string | null
          person_id?: string
          product_instinct?: number
          quality_score_10?: number | null
          role_target?: string | null
          rubric_version?: string | null
          score_source?: string | null
          score_stage?: string | null
          scored_at?: string
          technical_ability?: number
          user_id?: string | null
          ve_model_fit_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aifund_evaluation_scores_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_evidence: {
        Row: {
          citations: Json
          created_at: string
          id: string
          person_id: string
          provider: string
          source_url: string
          summary: string
          title: string
          type: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          citations?: Json
          created_at?: string
          id?: string
          person_id: string
          provider: string
          source_url?: string
          summary?: string
          title?: string
          type: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          citations?: Json
          created_at?: string
          id?: string
          person_id?: string
          provider?: string
          source_url?: string
          summary?: string
          title?: string
          type?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "aifund_evidence_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_external_profiles: {
        Row: {
          fetched_at: string | null
          handle: string
          id: string
          person_id: string
          platform: string | null
          profile_data: Json | null
          profile_type: string | null
          profile_url: string | null
          provider: string | null
          raw_payload: Json | null
          url: string
          user_id: string | null
        }
        Insert: {
          fetched_at?: string | null
          handle?: string
          id?: string
          person_id: string
          platform?: string | null
          profile_data?: Json | null
          profile_type?: string | null
          profile_url?: string | null
          provider?: string | null
          raw_payload?: Json | null
          url?: string
          user_id?: string | null
        }
        Update: {
          fetched_at?: string | null
          handle?: string
          id?: string
          person_id?: string
          platform?: string | null
          profile_data?: Json | null
          profile_type?: string | null
          profile_url?: string | null
          provider?: string | null
          raw_payload?: Json | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aifund_external_profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_harmonic_companies: {
        Row: {
          created_at: string
          domain: string | null
          fetched_at: string
          founders: Json
          funding_stage: string | null
          funding_total: number | null
          harmonic_company_id: string
          headcount: number | null
          headcount_growth_30d: number | null
          headcount_growth_90d: number | null
          id: string
          last_funding_date: string | null
          last_funding_total: number | null
          linkedin_url: string | null
          location: string | null
          name: string
          raw_payload: Json
          tags: string[]
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          fetched_at?: string
          founders?: Json
          funding_stage?: string | null
          funding_total?: number | null
          harmonic_company_id: string
          headcount?: number | null
          headcount_growth_30d?: number | null
          headcount_growth_90d?: number | null
          id?: string
          last_funding_date?: string | null
          last_funding_total?: number | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          raw_payload?: Json
          tags?: string[]
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          fetched_at?: string
          founders?: Json
          funding_stage?: string | null
          funding_total?: number | null
          harmonic_company_id?: string
          headcount?: number | null
          headcount_growth_30d?: number | null
          headcount_growth_90d?: number | null
          id?: string
          last_funding_date?: string | null
          last_funding_total?: number | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          raw_payload?: Json
          tags?: string[]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      aifund_harmonic_saved_searches: {
        Row: {
          concept_id: string
          created_at: string
          harmonic_saved_search_id: string | null
          id: string
          last_run_id: string | null
          last_synced_at: string | null
          metadata: Json
          query_hash: string
          query_text: string
          result_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          harmonic_saved_search_id?: string | null
          id?: string
          last_run_id?: string | null
          last_synced_at?: string | null
          metadata?: Json
          query_hash: string
          query_text: string
          result_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          harmonic_saved_search_id?: string | null
          id?: string
          last_run_id?: string | null
          last_synced_at?: string | null
          metadata?: Json
          query_hash?: string
          query_text?: string
          result_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aifund_harmonic_saved_searches_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "aifund_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aifund_harmonic_saved_searches_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "aifund_intelligence_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_import_batches: {
        Row: {
          canonical_file_name: string
          canonical_storage_path: string | null
          created_at: string
          id: string
          markdown_file_name: string | null
          markdown_storage_path: string | null
          metadata: Json
          status: string
          summary: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          canonical_file_name: string
          canonical_storage_path?: string | null
          created_at?: string
          id?: string
          markdown_file_name?: string | null
          markdown_storage_path?: string | null
          metadata?: Json
          status?: string
          summary?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          canonical_file_name?: string
          canonical_storage_path?: string | null
          created_at?: string
          id?: string
          markdown_file_name?: string | null
          markdown_storage_path?: string | null
          metadata?: Json
          status?: string
          summary?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aifund_intelligence_runs: {
        Row: {
          action: string | null
          completed_at: string | null
          created_at: string
          id: string
          provider: string
          query_params: Json | null
          results_count: number | null
          results_summary: Json | null
          status: string
          summary: string
          user_id: string | null
        }
        Insert: {
          action?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          provider: string
          query_params?: Json | null
          results_count?: number | null
          results_summary?: Json | null
          status?: string
          summary?: string
          user_id?: string | null
        }
        Update: {
          action?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          provider?: string
          query_params?: Json | null
          results_count?: number | null
          results_summary?: Json | null
          status?: string
          summary?: string
          user_id?: string | null
        }
        Relationships: []
      }
      aifund_lever_feedback: {
        Row: {
          created_at: string
          created_by: string | null
          evidence_tags: string[]
          feedback_label: string
          feedback_score: number
          id: string
          metadata: Json
          notes: string | null
          opportunity_id: string | null
          person_id: string | null
          role_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence_tags?: string[]
          feedback_label?: string
          feedback_score?: number
          id?: string
          metadata?: Json
          notes?: string | null
          opportunity_id?: string | null
          person_id?: string | null
          role_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence_tags?: string[]
          feedback_label?: string
          feedback_score?: number
          id?: string
          metadata?: Json
          notes?: string | null
          opportunity_id?: string | null
          person_id?: string | null
          role_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aifund_lever_feedback_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_lever_screen_candidates: {
        Row: {
          candidate_name: string
          candidate_type: string
          created_at: string
          email: string | null
          id: string
          location: string | null
          opportunity_id: string
          overall_score: number | null
          payload: Json
          person_id: string | null
          rank_position: number | null
          role_composite_score: number | null
          role_fit_score: number | null
          role_key: string
          role_label: string
          run_id: string
          tier: string | null
          user_id: string
        }
        Insert: {
          candidate_name: string
          candidate_type: string
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          opportunity_id: string
          overall_score?: number | null
          payload?: Json
          person_id?: string | null
          rank_position?: number | null
          role_composite_score?: number | null
          role_fit_score?: number | null
          role_key: string
          role_label: string
          run_id: string
          tier?: string | null
          user_id: string
        }
        Update: {
          candidate_name?: string
          candidate_type?: string
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          opportunity_id?: string
          overall_score?: number | null
          payload?: Json
          person_id?: string | null
          rank_position?: number | null
          role_composite_score?: number | null
          role_fit_score?: number | null
          role_key?: string
          role_label?: string
          run_id?: string
          tier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aifund_lever_screen_candidates_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aifund_lever_screen_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "aifund_lever_screen_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_lever_screen_runs: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          dry_run: boolean
          errors: Json
          id: string
          metrics: Json
          notification: Json
          role_rankings: Json
          run_source: string
          started_at: string
          status: string
          strong_fits: Json
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          dry_run?: boolean
          errors?: Json
          id?: string
          metrics?: Json
          notification?: Json
          role_rankings?: Json
          run_source?: string
          started_at?: string
          status?: string
          strong_fits?: Json
          user_id: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          dry_run?: boolean
          errors?: Json
          id?: string
          metrics?: Json
          notification?: Json
          role_rankings?: Json
          run_source?: string
          started_at?: string
          status?: string
          strong_fits?: Json
          user_id?: string
        }
        Relationships: []
      }
      aifund_lever_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          started_at: string
          status: string
          summary: Json
          trigger_source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          status?: string
          summary?: Json
          trigger_source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aifund_lever_sync_state: {
        Row: {
          auto_score: boolean
          created_at: string
          id: string
          last_opportunity_created_at: number
          last_run_id: string | null
          last_synced_at: string | null
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_score?: boolean
          created_at?: string
          id?: string
          last_opportunity_created_at?: number
          last_run_id?: string | null
          last_synced_at?: string | null
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_score?: boolean
          created_at?: string
          id?: string
          last_opportunity_created_at?: number
          last_run_id?: string | null
          last_synced_at?: string | null
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aifund_lever_webhook_receipts: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          lever_event_id: string | null
          opportunity_id: string | null
          payload: Json
          processed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          lever_event_id?: string | null
          opportunity_id?: string | null
          payload?: Json
          processed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          lever_event_id?: string | null
          opportunity_id?: string | null
          payload?: Json
          processed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aifund_people: {
        Row: {
          archetypes: string[]
          availability_note: string | null
          bio: string | null
          created_at: string
          current_company: string | null
          current_role: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          github_username: string | null
          harmonic_enriched_at: string | null
          harmonic_person_id: string | null
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          metadata: Json | null
          person_type: string
          process_stage: string
          providers: string[]
          role_fit: string | null
          source_channel: string | null
          summary: string | null
          tags: string[]
          top_signals: string[] | null
          twitter_url: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          archetypes?: string[]
          availability_note?: string | null
          bio?: string | null
          created_at?: string
          current_company?: string | null
          current_role?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          github_username?: string | null
          harmonic_enriched_at?: string | null
          harmonic_person_id?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          person_type?: string
          process_stage?: string
          providers?: string[]
          role_fit?: string | null
          source_channel?: string | null
          summary?: string | null
          tags?: string[]
          top_signals?: string[] | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          archetypes?: string[]
          availability_note?: string | null
          bio?: string | null
          created_at?: string
          current_company?: string | null
          current_role?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          github_username?: string | null
          harmonic_enriched_at?: string | null
          harmonic_person_id?: string | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          person_type?: string
          process_stage?: string
          providers?: string[]
          role_fit?: string | null
          source_channel?: string | null
          summary?: string | null
          tags?: string[]
          top_signals?: string[] | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      aifund_residencies: {
        Row: {
          builder_partners: string[]
          concept_id: string
          domain_partners: string[]
          end_date: string
          id: string
          person_id: string
          role_intent: string
          start_date: string
          status: string
          stipend_monthly_usd: number
          user_id: string | null
          weekly_updates: Json
        }
        Insert: {
          builder_partners?: string[]
          concept_id: string
          domain_partners?: string[]
          end_date: string
          id?: string
          person_id: string
          role_intent: string
          start_date: string
          status?: string
          stipend_monthly_usd?: number
          user_id?: string | null
          weekly_updates?: Json
        }
        Update: {
          builder_partners?: string[]
          concept_id?: string
          domain_partners?: string[]
          end_date?: string
          id?: string
          person_id?: string
          role_intent?: string
          start_date?: string
          status?: string
          stipend_monthly_usd?: number
          user_id?: string | null
          weekly_updates?: Json
        }
        Relationships: [
          {
            foreignKeyName: "aifund_residencies_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "aifund_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aifund_residencies_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "aifund_people"
            referencedColumns: ["id"]
          },
        ]
      }
      aifund_user_settings: {
        Row: {
          created_at: string
          evaluation_criteria: Json
          id: string
          provider_preferences: Json
          provider_secrets: Json
          sourcing_channels: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evaluation_criteria?: Json
          id?: string
          provider_preferences?: Json
          provider_secrets?: Json
          sourcing_channels?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          evaluation_criteria?: Json
          id?: string
          provider_preferences?: Json
          provider_secrets?: Json
          sourcing_channels?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_memberships: {
        Row: {
          app_slug: string
          created_at: string
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_slug: string
          created_at?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_slug?: string
          created_at?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bd_audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          from_state: string | null
          id: string
          payload: Json
          target_id: string | null
          to_state: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          from_state?: string | null
          id?: string
          payload?: Json
          target_id?: string | null
          to_state?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          from_state?: string | null
          id?: string
          payload?: Json
          target_id?: string | null
          to_state?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_audit_logs_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "bd_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_companies: {
        Row: {
          created_at: string
          domain: string | null
          employee_count: number | null
          funding_stage: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          name: string
          source_payload: Json
          tech_stack: string[]
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          employee_count?: number | null
          funding_stage?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          name: string
          source_payload?: Json
          tech_stack?: string[]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          employee_count?: number | null
          funding_stage?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          name?: string
          source_payload?: Json
          tech_stack?: string[]
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      bd_contacts: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          email_verification_status: string
          first_name: string
          full_name: string
          id: string
          last_name: string
          linkedin_url: string | null
          sales_nav_url: string | null
          seniority: string | null
          source_payload: Json
          title: string
          updated_at: string
          user_id: string
          work_email: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email_verification_status?: string
          first_name: string
          full_name: string
          id?: string
          last_name: string
          linkedin_url?: string | null
          sales_nav_url?: string | null
          seniority?: string | null
          source_payload?: Json
          title: string
          updated_at?: string
          user_id?: string
          work_email?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email_verification_status?: string
          first_name?: string
          full_name?: string
          id?: string
          last_name?: string
          linkedin_url?: string | null
          sales_nav_url?: string | null
          seniority?: string | null
          source_payload?: Json
          title?: string
          updated_at?: string
          user_id?: string
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bd_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "bd_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_conversion_events: {
        Row: {
          channel: string | null
          company_name: string
          contact_name: string
          conversion_area: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          notes: string
          occurred_at: string
          outreach_touch_id: string | null
          signal_external_id: string | null
          signal_id: string | null
          signal_title: string
          signal_type: string
          source: string
          target_external_id: string | null
          target_id: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          company_name: string
          contact_name: string
          conversion_area: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          notes?: string
          occurred_at?: string
          outreach_touch_id?: string | null
          signal_external_id?: string | null
          signal_id?: string | null
          signal_title: string
          signal_type: string
          source?: string
          target_external_id?: string | null
          target_id?: string | null
          user_id?: string
        }
        Update: {
          channel?: string | null
          company_name?: string
          contact_name?: string
          conversion_area?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          notes?: string
          occurred_at?: string
          outreach_touch_id?: string | null
          signal_external_id?: string | null
          signal_id?: string | null
          signal_title?: string
          signal_type?: string
          source?: string
          target_external_id?: string | null
          target_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_conversion_events_outreach_touch_id_fkey"
            columns: ["outreach_touch_id"]
            isOneToOne: false
            referencedRelation: "bd_outreach_touches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_conversion_events_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "bd_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_conversion_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "bd_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_email_messages: {
        Row: {
          created_at: string
          from_email: string
          graph_draft_id: string | null
          graph_sent_id: string | null
          html_body: string
          id: string
          outreach_touch_id: string | null
          physical_address: string
          status: string
          subject: string
          target_id: string
          text_body: string
          to_email: string
          unsubscribe_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_email: string
          graph_draft_id?: string | null
          graph_sent_id?: string | null
          html_body: string
          id?: string
          outreach_touch_id?: string | null
          physical_address: string
          status?: string
          subject: string
          target_id: string
          text_body: string
          to_email: string
          unsubscribe_url: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          from_email?: string
          graph_draft_id?: string | null
          graph_sent_id?: string | null
          html_body?: string
          id?: string
          outreach_touch_id?: string | null
          physical_address?: string
          status?: string
          subject?: string
          target_id?: string
          text_body?: string
          to_email?: string
          unsubscribe_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_email_messages_outreach_touch_id_fkey"
            columns: ["outreach_touch_id"]
            isOneToOne: false
            referencedRelation: "bd_outreach_touches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_email_messages_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "bd_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_outreach_touches: {
        Row: {
          approved_at: string | null
          body: string | null
          channel: string
          created_at: string
          cta_url: string | null
          id: string
          provider_message_id: string | null
          provider_payload: Json
          sent_at: string | null
          status: string
          subject: string | null
          target_id: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          body?: string | null
          channel: string
          created_at?: string
          cta_url?: string | null
          id?: string
          provider_message_id?: string | null
          provider_payload?: Json
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_id: string
          user_id?: string
        }
        Update: {
          approved_at?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          cta_url?: string | null
          id?: string
          provider_message_id?: string | null
          provider_payload?: Json
          sent_at?: string | null
          status?: string
          subject?: string | null
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_outreach_touches_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "bd_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_salesforce_links: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          local_entity_id: string
          local_entity_type: string
          salesforce_id: string
          salesforce_object_type: string
          sync_state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          local_entity_id: string
          local_entity_type: string
          salesforce_id: string
          salesforce_object_type: string
          sync_state?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          local_entity_id?: string
          local_entity_type?: string
          salesforce_id?: string
          salesforce_object_type?: string
          sync_state?: string
          user_id?: string
        }
        Relationships: []
      }
      bd_scores: {
        Row: {
          bucket: string
          company_fit: number
          composite: number
          context_stale: boolean
          context_version: string | null
          created_at: string
          id: string
          person_fit: number
          reachability: number
          reasons: string[]
          signal_freshness: number
          signal_strength: number
          target_id: string
          user_id: string
        }
        Insert: {
          bucket: string
          company_fit: number
          composite: number
          context_stale?: boolean
          context_version?: string | null
          created_at?: string
          id?: string
          person_fit: number
          reachability: number
          reasons?: string[]
          signal_freshness: number
          signal_strength: number
          target_id: string
          user_id?: string
        }
        Update: {
          bucket?: string
          company_fit?: number
          composite?: number
          context_stale?: boolean
          context_version?: string | null
          created_at?: string
          id?: string
          person_fit?: number
          reachability?: number
          reasons?: string[]
          signal_freshness?: number
          signal_strength?: number
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_scores_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: true
            referencedRelation: "bd_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_signal_radar_items: {
        Row: {
          company_domain: string
          company_name: string
          confidence: number
          created_at: string
          detected_at: string
          id: string
          metadata: Json
          provider: string
          signal_summary: string
          signal_title: string
          signal_type: string
          source_url: string
          status: string
          suggested_persona: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_domain?: string
          company_name: string
          confidence?: number
          created_at?: string
          detected_at?: string
          id?: string
          metadata?: Json
          provider?: string
          signal_summary?: string
          signal_title: string
          signal_type: string
          source_url?: string
          status?: string
          suggested_persona?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          company_domain?: string
          company_name?: string
          confidence?: number
          created_at?: string
          detected_at?: string
          id?: string
          metadata?: Json
          provider?: string
          signal_summary?: string
          signal_title?: string
          signal_type?: string
          source_url?: string
          status?: string
          suggested_persona?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bd_signals: {
        Row: {
          company_id: string | null
          detected_at: string
          evidence_payload: Json
          id: string
          provider: string
          signal_type: string
          source_date: string
          source_url: string
          summary: string
          title: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          detected_at?: string
          evidence_payload?: Json
          id?: string
          provider: string
          signal_type: string
          source_date: string
          source_url: string
          summary: string
          title: string
          user_id?: string
        }
        Update: {
          company_id?: string | null
          detected_at?: string
          evidence_payload?: Json
          id?: string
          provider?: string
          signal_type?: string
          source_date?: string
          source_url?: string
          summary?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "bd_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_suppressions: {
        Row: {
          created_at: string
          id: string
          permanent: boolean
          reason: string
          scope: string
          source: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          permanent?: boolean
          reason: string
          scope: string
          source?: string
          user_id?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          permanent?: boolean
          reason?: string
          scope?: string
          source?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      bd_targets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          contact_id: string
          created_at: string
          current_owner: string | null
          id: string
          insufficiency_reason: string | null
          lifecycle_state: string
          local_dedup_key: string
          qualification_bucket: string
          sfdc_exclusion_reason: string | null
          signal_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          current_owner?: string | null
          id?: string
          insufficiency_reason?: string | null
          lifecycle_state?: string
          local_dedup_key: string
          qualification_bucket?: string
          sfdc_exclusion_reason?: string | null
          signal_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          current_owner?: string | null
          id?: string
          insufficiency_reason?: string | null
          lifecycle_state?: string
          local_dedup_key?: string
          qualification_bucket?: string
          sfdc_exclusion_reason?: string | null
          signal_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "bd_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_targets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "bd_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_targets_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "bd_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          about: string | null
          avatar_url: string | null
          bio: string | null
          company: string
          company_enriched_at: string | null
          contributed_repos: Json | null
          created_at: string
          created_by: string | null
          eea_confidence: string | null
          eea_enriched_at: string | null
          eea_enrichment: Json | null
          email: string | null
          enrichment_data: Json | null
          fetched_at: string
          followers: number | null
          github_handle: string | null
          github_profile: Json | null
          github_url: string | null
          github_username: string
          harmonic_company_id: string | null
          highlights: string[] | null
          id: string
          is_hidden_gem: boolean | null
          joined_year: number | null
          linkedin_confidence: string | null
          linkedin_url: string | null
          linkedin_verified: boolean | null
          location: string | null
          name: string | null
          notes: string | null
          org_memberships: string[] | null
          profile_url: string | null
          public_repos: number | null
          readme_snippets: string[] | null
          recent_commits: string[] | null
          role: string | null
          score: number | null
          signals: Json | null
          source: string
          stage: string
          stars: number | null
          summary: string | null
          tags: string[] | null
          title: string | null
          top_languages: Json | null
          twitter_username: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string
          company_enriched_at?: string | null
          contributed_repos?: Json | null
          created_at?: string
          created_by?: string | null
          eea_confidence?: string | null
          eea_enriched_at?: string | null
          eea_enrichment?: Json | null
          email?: string | null
          enrichment_data?: Json | null
          fetched_at?: string
          followers?: number | null
          github_handle?: string | null
          github_profile?: Json | null
          github_url?: string | null
          github_username: string
          harmonic_company_id?: string | null
          highlights?: string[] | null
          id?: string
          is_hidden_gem?: boolean | null
          joined_year?: number | null
          linkedin_confidence?: string | null
          linkedin_url?: string | null
          linkedin_verified?: boolean | null
          location?: string | null
          name?: string | null
          notes?: string | null
          org_memberships?: string[] | null
          profile_url?: string | null
          public_repos?: number | null
          readme_snippets?: string[] | null
          recent_commits?: string[] | null
          role?: string | null
          score?: number | null
          signals?: Json | null
          source?: string
          stage?: string
          stars?: number | null
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          top_languages?: Json | null
          twitter_username?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string
          company_enriched_at?: string | null
          contributed_repos?: Json | null
          created_at?: string
          created_by?: string | null
          eea_confidence?: string | null
          eea_enriched_at?: string | null
          eea_enrichment?: Json | null
          email?: string | null
          enrichment_data?: Json | null
          fetched_at?: string
          followers?: number | null
          github_handle?: string | null
          github_profile?: Json | null
          github_url?: string | null
          github_username?: string
          harmonic_company_id?: string | null
          highlights?: string[] | null
          id?: string
          is_hidden_gem?: boolean | null
          joined_year?: number | null
          linkedin_confidence?: string | null
          linkedin_url?: string | null
          linkedin_verified?: boolean | null
          location?: string | null
          name?: string | null
          notes?: string | null
          org_memberships?: string[] | null
          profile_url?: string | null
          public_repos?: number | null
          readme_snippets?: string[] | null
          recent_commits?: string[] | null
          role?: string | null
          score?: number | null
          signals?: Json | null
          source?: string
          stage?: string
          stars?: number | null
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          top_languages?: Json | null
          twitter_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_cache: {
        Row: {
          company_quality: Json | null
          customer_tags: string[] | null
          domain: string | null
          fetched_at: string
          founders: Json | null
          funding_stage: string | null
          funding_total: number | null
          harmonic_company_id: string | null
          headcount: number | null
          headcount_growth_180d: number | null
          headcount_growth_30d: number | null
          headcount_growth_90d: number | null
          id: string
          industry_tags: string[] | null
          investors: Json | null
          last_funding_date: string | null
          last_funding_total: number | null
          linkedin_url: string | null
          location: string | null
          name: string | null
          raw_payload: Json | null
          technology_tags: string[] | null
          updated_at: string
          web_traffic: Json | null
          website_url: string | null
        }
        Insert: {
          company_quality?: Json | null
          customer_tags?: string[] | null
          domain?: string | null
          fetched_at?: string
          founders?: Json | null
          funding_stage?: string | null
          funding_total?: number | null
          harmonic_company_id?: string | null
          headcount?: number | null
          headcount_growth_180d?: number | null
          headcount_growth_30d?: number | null
          headcount_growth_90d?: number | null
          id?: string
          industry_tags?: string[] | null
          investors?: Json | null
          last_funding_date?: string | null
          last_funding_total?: number | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          raw_payload?: Json | null
          technology_tags?: string[] | null
          updated_at?: string
          web_traffic?: Json | null
          website_url?: string | null
        }
        Update: {
          company_quality?: Json | null
          customer_tags?: string[] | null
          domain?: string | null
          fetched_at?: string
          founders?: Json | null
          funding_stage?: string | null
          funding_total?: number | null
          harmonic_company_id?: string | null
          headcount?: number | null
          headcount_growth_180d?: number | null
          headcount_growth_30d?: number | null
          headcount_growth_90d?: number | null
          id?: string
          industry_tags?: string[] | null
          investors?: Json | null
          last_funding_date?: string | null
          last_funding_total?: number | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          raw_payload?: Json | null
          technology_tags?: string[] | null
          updated_at?: string
          web_traffic?: Json | null
          website_url?: string | null
        }
        Relationships: []
      }
      harmonic_saved_searches: {
        Row: {
          created_at: string
          harmonic_saved_search_id: string | null
          id: string
          last_polled_at: string | null
          last_seen_cursor: string | null
          metadata: Json | null
          name: string
          query: string
          scope: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          harmonic_saved_search_id?: string | null
          id?: string
          last_polled_at?: string | null
          last_seen_cursor?: string | null
          metadata?: Json | null
          name: string
          query: string
          scope?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          harmonic_saved_search_id?: string | null
          id?: string
          last_polled_at?: string | null
          last_seen_cursor?: string | null
          metadata?: Json | null
          name?: string
          query?: string
          scope?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ideas: {
        Row: {
          created_at: string
          id: number
          title: string
        }
        Insert: {
          created_at: string
          id?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: number
          title?: string
        }
        Relationships: []
      }
      onboarding_context_history: {
        Row: {
          created_at: string
          id: string
          source: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source?: string
          text?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_history: {
        Row: {
          candidate_id: string | null
          created_at: string
          id: string
          message: string
          pipeline_id: string | null
          user_id: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          message: string
          pipeline_id?: string | null
          user_id?: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          message?: string
          pipeline_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_history_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline: {
        Row: {
          avatar_url: string | null
          created_at: string
          github_username: string
          id: string
          name: string | null
          notes: string | null
          priority: string | null
          source: string | null
          source_query: string | null
          stage: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          github_username: string
          id?: string
          name?: string | null
          notes?: string | null
          priority?: string | null
          source?: string | null
          source_query?: string | null
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          github_username?: string
          id?: string
          name?: string | null
          notes?: string | null
          priority?: string | null
          source?: string | null
          source_query?: string | null
          stage?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_events: {
        Row: {
          candidate_name: string | null
          created_at: string
          event_type: string
          from_stage: string | null
          github_username: string
          id: string
          pipeline_id: string | null
          to_stage: string
          user_id: string
          webhook_status: string | null
        }
        Insert: {
          candidate_name?: string | null
          created_at?: string
          event_type?: string
          from_stage?: string | null
          github_username: string
          id?: string
          pipeline_id?: string | null
          to_stage: string
          user_id?: string
          webhook_status?: string | null
        }
        Update: {
          candidate_name?: string | null
          created_at?: string
          event_type?: string
          from_stage?: string | null
          github_username?: string
          id?: string
          pipeline_id?: string | null
          to_stage?: string
          user_id?: string
          webhook_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_events_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          expanded_query: string | null
          filters: Json
          id: string
          name: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expanded_query?: string | null
          filters?: Json
          id?: string
          name: string
          query: string
          user_id?: string
        }
        Update: {
          created_at?: string
          expanded_query?: string | null
          filters?: Json
          id?: string
          name?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          query: string
          result_count: number | null
          user_id: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          query: string
          result_count?: number | null
          user_id?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          query?: string
          result_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      search_results: {
        Row: {
          about: string | null
          candidate_id: string
          created_at: string
          id: string
          rank: number
          score: number | null
          search_id: string
          summary: string | null
          user_id: string
        }
        Insert: {
          about?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          rank?: number
          score?: number | null
          search_id: string
          summary?: string | null
          user_id: string
        }
        Update: {
          about?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          rank?: number
          score?: number | null
          search_id?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      sellkit_onboarding_profiles: {
        Row: {
          buyer_titles: string
          buying_signals: string
          completed_at: string | null
          context_source: string
          context_text: string | null
          context_updated_at: string | null
          created_at: string
          email_voice: string
          ideal_company: string
          offer_line: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_titles?: string
          buying_signals?: string
          completed_at?: string | null
          context_source?: string
          context_text?: string | null
          context_updated_at?: string | null
          created_at?: string
          email_voice?: string
          ideal_company?: string
          offer_line?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          buyer_titles?: string
          buying_signals?: string
          completed_at?: string | null
          context_source?: string
          context_text?: string | null
          context_updated_at?: string | null
          created_at?: string
          email_voice?: string
          ideal_company?: string
          offer_line?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          user_id: string
          value?: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      shortlisted_candidates: {
        Row: {
          candidate_data: Json | null
          created_at: string | null
          id: string
          user_id: string
          username: string
        }
        Insert: {
          candidate_data?: Json | null
          created_at?: string | null
          id?: string
          user_id: string
          username: string
        }
        Update: {
          candidate_data?: Json | null
          created_at?: string | null
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      talent_index_jobs: {
        Row: {
          created_at: string
          id: string
          mode: string
          payload: Json
          progress: number
          query: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at: string
          id: string
          mode: string
          payload: Json
          progress: number
          query: string
          status: string
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          payload?: Json
          progress?: number
          query?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_searches: {
        Row: {
          candidate_count: number
          created_at: string
          id: string
          mode: string
          payload: Json
          query: string
          updated_at: string
          user_id: string
        }
        Insert: {
          candidate_count: number
          created_at: string
          id: string
          mode: string
          payload: Json
          query: string
          updated_at: string
          user_id: string
        }
        Update: {
          candidate_count?: number
          created_at?: string
          id?: string
          mode?: string
          payload?: Json
          query?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_watchlist_state: {
        Row: {
          created_at: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          called_at: string | null
          function_name: string
          id: string
          user_id: string
        }
        Insert: {
          called_at?: string | null
          function_name: string
          id?: string
          user_id: string
        }
        Update: {
          called_at?: string | null
          function_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          plan: string | null
          search_limit: number | null
          searches_used: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string | null
          search_limit?: number | null
          searches_used?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string | null
          search_limit?: number | null
          searches_used?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ve_candidates: {
        Row: {
          company: string | null
          created_at: string
          dedup_key: string
          email: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          last_sync_at: string
          linkedin_url: string | null
          location: string | null
          name: string
          raw_sources: Json
          score: number
          sent_status: string | null
          source_lanes: string[]
          stage_label: string | null
          tier: string
          tier_rank: number
          title: string | null
          updated_at: string
          why_flagged: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          dedup_key: string
          email?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string
          linkedin_url?: string | null
          location?: string | null
          name: string
          raw_sources?: Json
          score?: number
          sent_status?: string | null
          source_lanes?: string[]
          stage_label?: string | null
          tier: string
          tier_rank: number
          title?: string | null
          updated_at?: string
          why_flagged?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          dedup_key?: string
          email?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string
          linkedin_url?: string | null
          location?: string | null
          name?: string
          raw_sources?: Json
          score?: number
          sent_status?: string | null
          source_lanes?: string[]
          stage_label?: string | null
          tier?: string
          tier_rank?: number
          title?: string | null
          updated_at?: string
          why_flagged?: string | null
        }
        Relationships: []
      }
      ve_ingestion_runs: {
        Row: {
          created_at: string
          error_count: number
          error_messages: string[]
          finished_at: string | null
          id: string
          merged_count: number
          parsed_count: number
          source_counts: Json
          started_at: string
          status: string
          triggered_by: string
          upserted_count: number
        }
        Insert: {
          created_at?: string
          error_count?: number
          error_messages?: string[]
          finished_at?: string | null
          id?: string
          merged_count?: number
          parsed_count?: number
          source_counts?: Json
          started_at?: string
          status: string
          triggered_by?: string
          upserted_count?: number
        }
        Update: {
          created_at?: string
          error_count?: number
          error_messages?: string[]
          finished_at?: string | null
          id?: string
          merged_count?: number
          parsed_count?: number
          source_counts?: Json
          started_at?: string
          status?: string
          triggered_by?: string
          upserted_count?: number
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          candidate_avatar_url: string | null
          candidate_name: string | null
          candidate_username: string
          created_at: string
          id: string
          list_name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          candidate_avatar_url?: string | null
          candidate_name?: string | null
          candidate_username: string
          created_at?: string
          id?: string
          list_name?: string
          notes?: string | null
          user_id?: string
        }
        Update: {
          candidate_avatar_url?: string | null
          candidate_name?: string | null
          candidate_username?: string
          created_at?: string
          id?: string
          list_name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webset_refs: {
        Row: {
          count: number
          created_at: string
          id: string
          query: string
          status: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id: string
          query: string
          status?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          query?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_app_membership: {
        Args: { target_app_slug: string }
        Returns: boolean
      }
      increment_searches_used: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_aifund_member: { Args: never; Returns: boolean }
      is_founderfinder_member: { Args: never; Returns: boolean }
      sync_founderfinder_membership_from_allowlist: {
        Args: { target_email: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
