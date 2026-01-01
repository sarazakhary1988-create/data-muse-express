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
      scheduled_research_tasks: {
        Row: {
          country: string | null
          created_at: string
          custom_interval_days: number | null
          custom_websites: string[] | null
          delivery_email: string | null
          delivery_method: string
          description: string
          enhanced_description: string | null
          execution_mode: string
          geographic_focus: string | null
          id: string
          industry: string | null
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          report_format: string
          research_depth: string
          schedule_day_of_month: number | null
          schedule_day_of_week: number | null
          schedule_month: number | null
          schedule_time: string | null
          schedule_type: string
          source_types: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          custom_interval_days?: number | null
          custom_websites?: string[] | null
          delivery_email?: string | null
          delivery_method?: string
          description: string
          enhanced_description?: string | null
          execution_mode?: string
          geographic_focus?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          report_format?: string
          research_depth?: string
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_month?: number | null
          schedule_time?: string | null
          schedule_type?: string
          source_types?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          custom_interval_days?: number | null
          custom_websites?: string[] | null
          delivery_email?: string | null
          delivery_method?: string
          description?: string
          enhanced_description?: string | null
          execution_mode?: string
          geographic_focus?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          report_format?: string
          research_depth?: string
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_month?: number | null
          schedule_time?: string | null
          schedule_type?: string
          source_types?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_task_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          email_sent: boolean | null
          error_message: string | null
          id: string
          report_content: string | null
          report_format: string | null
          started_at: string | null
          status: string
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email_sent?: boolean | null
          error_message?: string | null
          id?: string
          report_content?: string | null
          report_format?: string | null
          started_at?: string | null
          status?: string
          task_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email_sent?: boolean | null
          error_message?: string | null
          id?: string
          report_content?: string | null
          report_format?: string | null
          started_at?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_task_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "scheduled_research_tasks"
            referencedColumns: ["id"]
          },
        ]
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
