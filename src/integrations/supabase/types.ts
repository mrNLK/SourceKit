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
          contributed_repos: Json | null
          created_at: string
          email: string | null
          fetched_at: string
          followers: number | null
          github_url: string | null
          github_username: string
          highlights: string[] | null
          id: string
          is_hidden_gem: boolean | null
          joined_year: number | null
          linkedin_confidence: string | null
          linkedin_url: string | null
          location: string | null
          name: string | null
          public_repos: number | null
          score: number | null
          stars: number | null
          summary: string | null
          top_languages: Json | null
          twitter_username: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          contributed_repos?: Json | null
          created_at?: string
          email?: string | null
          fetched_at?: string
          followers?: number | null
          github_url?: string | null
          github_username: string
          highlights?: string[] | null
          id?: string
          is_hidden_gem?: boolean | null
          joined_year?: number | null
          linkedin_confidence?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          public_repos?: number | null
          score?: number | null
          stars?: number | null
          summary?: string | null
          top_languages?: Json | null
          twitter_username?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          contributed_repos?: Json | null
          created_at?: string
          email?: string | null
          fetched_at?: string
          followers?: number | null
          github_url?: string | null
          github_username?: string
          highlights?: string[] | null
          id?: string
          is_hidden_gem?: boolean | null
          joined_year?: number | null
          linkedin_confidence?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          public_repos?: number | null
          score?: number | null
          stars?: number | null
          summary?: string | null
          top_languages?: Json | null
          twitter_username?: string | null
          updated_at?: string
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
          id: string
          metadata: Json | null
          query: string
          result_count: number | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          query: string
          result_count?: number | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          query?: string
          result_count?: number | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
