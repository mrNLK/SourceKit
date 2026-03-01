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
      candidates: {
        Row: {
          about: string | null
          avatar_url: string | null
          bio: string | null
          company: string
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
      outreach_history: {
        Row: {
          candidate_id: string | null
          created_at: string
          id: string
          message: string
          pipeline_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          message: string
          pipeline_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          message?: string
          pipeline_id?: string | null
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
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          query: string
          result_count?: number | null
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          query?: string
          result_count?: number | null
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
      watchlist_items: {
        Row: {
          candidate_avatar_url: string | null
          candidate_name: string | null
          candidate_username: string
          created_at: string
          id: string
          list_name: string
          notes: string | null
        }
        Insert: {
          candidate_avatar_url?: string | null
          candidate_name?: string | null
          candidate_username: string
          created_at?: string
          id?: string
          list_name?: string
          notes?: string | null
        }
        Update: {
          candidate_avatar_url?: string | null
          candidate_name?: string | null
          candidate_username?: string
          created_at?: string
          id?: string
          list_name?: string
          notes?: string | null
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
      increment_searches_used: {
        Args: { p_user_id: string }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
