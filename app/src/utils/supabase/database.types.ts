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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          date: string | null
          duration: string
          games: number[]
          id: string
          notes: string
          type: string
          user_id: string
          xp: number | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          duration?: string
          games?: number[]
          id?: string
          notes?: string
          type: string
          user_id?: string
          xp?: number | null
        }
        Update: {
          created_at?: string
          date?: string | null
          duration?: string
          games?: number[]
          id?: string
          notes?: string
          type?: string
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          key: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          user_id?: string
          value?: string
        }
        Update: {
          created_at?: string
          key?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      chore_log: {
        Row: {
          chore_id: string | null
          chore_name: string
          completed_by: string
          created_at: string
          date: string
          id: string
          proactive_points: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          chore_id?: string | null
          chore_name?: string
          completed_by?: string
          created_at?: string
          date: string
          id?: string
          proactive_points?: number
          user_id?: string
          xp_earned?: number
        }
        Update: {
          chore_id?: string | null
          chore_name?: string
          completed_by?: string
          created_at?: string
          date?: string
          id?: string
          proactive_points?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "chore_log_chore_id_fkey"
            columns: ["chore_id"]
            isOneToOne: false
            referencedRelation: "chores"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          created_at: string
          id: string
          interval_days: number
          kind: string
          name: string
          user_id: string
          xp_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          interval_days?: number
          kind?: string
          name: string
          user_id?: string
          xp_value?: number
        }
        Update: {
          created_at?: string
          id?: string
          interval_days?: number
          kind?: string
          name?: string
          user_id?: string
          xp_value?: number
        }
        Relationships: []
      }
      contact_log: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string
          person_id: string | null
          person_name: string
          type: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string
          person_id?: string | null
          person_name?: string
          type: string
          user_id?: string
          xp?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string
          person_id?: string | null
          person_name?: string
          type?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_log_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      date_ideas: {
        Row: {
          created_at: string
          date: string | null
          final_rating: number
          id: string
          notes: string
          pre_rating: number
          starred: boolean
          status: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          final_rating?: number
          id?: string
          notes?: string
          pre_rating?: number
          starred?: boolean
          status?: string
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          final_rating?: number
          id?: string
          notes?: string
          pre_rating?: number
          starred?: boolean
          status?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      day_results: {
        Row: {
          created_at: string
          date: string
          notes: string
          result: string | null
          stat1: string
          stat2: string
          stat3: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          notes?: string
          result?: string | null
          stat1?: string
          stat2?: string
          stat3?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          notes?: string
          result?: string | null
          stat1?: string
          stat2?: string
          stat3?: string
          user_id?: string
        }
        Relationships: []
      }
      encyc_notes: {
        Row: {
          cat: string
          completed_note: string
          created_at: string
          done: boolean
          id: string
          sort_order: number
          text: string
          user_id: string
        }
        Insert: {
          cat?: string
          completed_note?: string
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          text: string
          user_id?: string
        }
        Update: {
          cat?: string
          completed_note?: string
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          label: string
          notes: string
          type: string | null
          updated_date: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string
          type?: string | null
          updated_date?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          label?: string
          notes?: string
          type?: string | null
          updated_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      focuses: {
        Row: {
          completed_date: string | null
          created_at: string
          created_date: string | null
          id: string
          notes: string
          reactivated_date: string | null
          sort_order: number
          status: string
          text: string
          user_id: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          created_date?: string | null
          id?: string
          notes?: string
          reactivated_date?: string | null
          sort_order?: number
          status?: string
          text: string
          user_id?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          created_date?: string | null
          id?: string
          notes?: string
          reactivated_date?: string | null
          sort_order?: number
          status?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      health_goal_logs: {
        Row: {
          created_at: string
          date: string
          goal_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          goal_id: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_goal_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "health_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      health_goals: {
        Row: {
          created_at: string
          id: string
          name: string
          target: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          target?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          target?: number
          user_id?: string
        }
        Relationships: []
      }
      important_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          notes: string
          recur: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          notes?: string
          recur?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          notes?: string
          recur?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_log: {
        Row: {
          count: number
          created_at: string
          date: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          date: string
          user_id?: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          mood: string
          text: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mood?: string
          text?: string
          title?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mood?: string
          text?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          added_date: string | null
          created_at: string
          done: boolean
          id: string
          list: string
          sort_order: number
          staple: boolean
          text: string
          user_id: string
        }
        Insert: {
          added_date?: string | null
          created_at?: string
          done?: boolean
          id?: string
          list: string
          sort_order?: number
          staple?: boolean
          text: string
          user_id?: string
        }
        Update: {
          added_date?: string | null
          created_at?: string
          done?: boolean
          id?: string
          list?: string
          sort_order?: number
          staple?: boolean
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      paige_actions: {
        Row: {
          created_at: string
          date: string
          id: string
          kind: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          kind: string
          user_id?: string
          xp?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          kind?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      people: {
        Row: {
          cadence_days: number | null
          created_at: string
          id: string
          last_contact: string | null
          name: string
          sort_order: number
          tier: string
          user_id: string
        }
        Insert: {
          cadence_days?: number | null
          created_at?: string
          id?: string
          last_contact?: string | null
          name: string
          sort_order?: number
          tier: string
          user_id?: string
        }
        Update: {
          cadence_days?: number | null
          created_at?: string
          id?: string
          last_contact?: string | null
          name?: string
          sort_order?: number
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_stats: {
        Row: {
          all_time_activities: number
          all_time_chores_done: number
          all_time_tasks_done: number
          badges: string[]
          best_streak: number
          created_at: string
          id: string
          last_active_date: string | null
          level: number
          proactive_points: number
          streak_days: number
          total_activities: number
          total_chores_done: number
          total_tasks_done: number
          user_id: string
          weekly_badge_history: Json
          weekly_badge_last_earned: Json
          xp: number
        }
        Insert: {
          all_time_activities?: number
          all_time_chores_done?: number
          all_time_tasks_done?: number
          badges?: string[]
          best_streak?: number
          created_at?: string
          id?: string
          last_active_date?: string | null
          level?: number
          proactive_points?: number
          streak_days?: number
          total_activities?: number
          total_chores_done?: number
          total_tasks_done?: number
          user_id?: string
          weekly_badge_history?: Json
          weekly_badge_last_earned?: Json
          xp?: number
        }
        Update: {
          all_time_activities?: number
          all_time_chores_done?: number
          all_time_tasks_done?: number
          badges?: string[]
          best_streak?: number
          created_at?: string
          id?: string
          last_active_date?: string | null
          level?: number
          proactive_points?: number
          streak_days?: number
          total_activities?: number
          total_chores_done?: number
          total_tasks_done?: number
          user_id?: string
          weekly_badge_history?: Json
          weekly_badge_last_earned?: Json
          xp?: number
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          answer: string
          created_at: string
          date: string | null
          id: string
          question: string
          question_id: string | null
          user_id: string
        }
        Insert: {
          answer?: string
          created_at?: string
          date?: string | null
          id?: string
          question?: string
          question_id?: string | null
          user_id?: string
        }
        Update: {
          answer?: string
          created_at?: string
          date?: string | null
          id?: string
          question?: string
          question_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          sort_order: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          sort_order?: number
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          sort_order?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string
          created_at: string
          id: string
          link: string
          name: string
          rating: number
          steps: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          link?: string
          name: string
          rating?: number
          steps?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          link?: string
          name?: string
          rating?: number
          steps?: string
          user_id?: string
        }
        Relationships: []
      }
      rel_acts: {
        Row: {
          created_at: string
          id: string
          interval_days: number
          last_done: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_days?: number
          last_done?: string | null
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_days?: number
          last_done?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_by: string
          completed_date: string | null
          created_at: string
          created_date: string | null
          done: boolean
          due_date: string | null
          id: string
          notes: string
          person_id: string | null
          priority: string | null
          proactive_points: number
          recurrence: string | null
          scheduled_for: string | null
          section: string
          tags: string[]
          text: string
          user_id: string
          xp_value: number
        }
        Insert: {
          completed_by?: string
          completed_date?: string | null
          created_at?: string
          created_date?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          notes?: string
          person_id?: string | null
          priority?: string | null
          proactive_points?: number
          recurrence?: string | null
          scheduled_for?: string | null
          section: string
          tags?: string[]
          text: string
          user_id?: string
          xp_value?: number
        }
        Update: {
          completed_by?: string
          completed_date?: string | null
          created_at?: string
          created_date?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          notes?: string
          person_id?: string | null
          priority?: string | null
          proactive_points?: number
          recurrence?: string | null
          scheduled_for?: string | null
          section?: string
          tags?: string[]
          text?: string
          user_id?: string
          xp_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_stats: {
        Row: {
          activities_logged: number
          chores_done: number
          contacts_logged: number
          created_at: string
          proactive_points: number
          tasks_done: number
          user_id: string
          week_start: string
          xp_earned: number
        }
        Insert: {
          activities_logged?: number
          chores_done?: number
          contacts_logged?: number
          created_at?: string
          proactive_points?: number
          tasks_done?: number
          user_id?: string
          week_start: string
          xp_earned?: number
        }
        Update: {
          activities_logged?: number
          chores_done?: number
          contacts_logged?: number
          created_at?: string
          proactive_points?: number
          tasks_done?: number
          user_id?: string
          week_start?: string
          xp_earned?: number
        }
        Relationships: []
      }
      xp_values: {
        Row: {
          created_at: string
          description: string
          key: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string
          key: string
          user_id?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string
          key?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_push: {
        Args: {
          p_attachment_b64?: string
          p_attachment_type?: string
          p_message: string
          p_priority?: number
          p_title: string
          p_url?: string
        }
        Returns: number
      }
      send_push_card: { Args: { p_payload: Json }; Returns: number }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
