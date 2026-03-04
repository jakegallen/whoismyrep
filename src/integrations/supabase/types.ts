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
      newsletter_subscriptions: {
        Row: {
          bill_updates: boolean
          breaking_news: boolean
          created_at: string
          email_enabled: boolean
          id: string
          key_votes: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_updates?: boolean
          breaking_news?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          key_votes?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_updates?: boolean
          breaking_news?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          key_votes?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          home_state: string | null
          home_district: string | null
          xp: number
          level: number
          current_streak: number
          longest_streak: number
          last_active_date: string | null
          total_active_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          home_state?: string | null
          home_district?: string | null
          xp?: number
          level?: number
          current_streak?: number
          longest_streak?: number
          last_active_date?: string | null
          total_active_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          home_state?: string | null
          home_district?: string | null
          xp?: number
          level?: number
          current_streak?: number
          longest_streak?: number
          last_active_date?: string | null
          total_active_days?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          id: number
          user_id: string
          action: string
          xp_earned: number
          metadata: Json
          created_at: string
        }
        Insert: {
          user_id: string
          action: string
          xp_earned: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          user_id?: string
          action?: string
          xp_earned?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          id: number
          user_id: string
          achievement_key: string
          unlocked_at: string
        }
        Insert: {
          user_id: string
          achievement_key: string
          unlocked_at?: string
        }
        Update: {
          user_id?: string
          achievement_key?: string
          unlocked_at?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          id: number
          challenge_date: string
          challenge_type: string
          title: string
          description: string
          target_count: number
          xp_reward: number
          created_at: string
        }
        Insert: {
          challenge_date: string
          challenge_type: string
          title: string
          description: string
          target_count?: number
          xp_reward?: number
          created_at?: string
        }
        Update: {
          challenge_date?: string
          challenge_type?: string
          title?: string
          description?: string
          target_count?: number
          xp_reward?: number
          created_at?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          id: number
          user_id: string
          challenge_id: number
          progress: number
          completed: boolean
          completed_at: string | null
        }
        Insert: {
          user_id: string
          challenge_id: number
          progress?: number
          completed?: boolean
          completed_at?: string | null
        }
        Update: {
          user_id?: string
          challenge_id?: number
          progress?: number
          completed?: boolean
          completed_at?: string | null
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
