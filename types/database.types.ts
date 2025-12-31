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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assignment_type: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          student_id: string
          study_set_id: string
          target_count: number
          teacher_id: string
        }
        Insert: {
          assignment_type?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          student_id: string
          study_set_id: string
          target_count: number
          teacher_id: string
        }
        Update: {
          assignment_type?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          student_id?: string
          study_set_id?: string
          target_count?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_study_set_id_fkey"
            columns: ["study_set_id"]
            isOneToOne: false
            referencedRelation: "study_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          price: number | null
          start_date: string | null
          teacher_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          start_date?: string | null
          teacher_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          start_date?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string | null
          end_date: string
          id: string
          payment_id: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          end_date: string
          id?: string
          payment_id?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          payment_id?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          start_time: string | null
          title: string
          zep_link: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          start_time?: string | null
          title: string
          zep_link?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          start_time?: string | null
          title?: string
          zep_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          level: number | null
          nickname: string | null
          role: string | null
          sprite_url: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          level?: number | null
          nickname?: string | null
          role?: string | null
          sprite_url?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          level?: number | null
          nickname?: string | null
          role?: string | null
          sprite_url?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sets: {
        Row: {
          content: Json
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          owner_id: string
          target_repeat: number | null
          targeted_students: string[] | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          owner_id: string
          target_repeat?: number | null
          targeted_students?: string[] | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          owner_id?: string
          target_repeat?: number | null
          targeted_students?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_study_progress: {
        Row: {
          id: string
          last_studied_at: string | null
          study_set_id: string
          total_repeat_count: number | null
          total_skip_count: number | null
          total_speaking_count: number | null
          user_id: string
        }
        Insert: {
          id?: string
          last_studied_at?: string | null
          study_set_id: string
          total_repeat_count?: number | null
          total_skip_count?: number | null
          total_speaking_count?: number | null
          user_id: string
        }
        Update: {
          id?: string
          last_studied_at?: string | null
          study_set_id?: string
          total_repeat_count?: number | null
          total_skip_count?: number | null
          total_speaking_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_study_progress_study_set_id_fkey"
            columns: ["study_set_id"]
            isOneToOne: false
            referencedRelation: "study_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_study_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_rankings: {
        Row: {
          created_at: string | null
          id: string
          rank_position: number
          total_score: number | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rank_position: number
          total_score?: number | null
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rank_position?: number
          total_score?: number | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_rankings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_teacher_or_admin: { Args: never; Returns: boolean }
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
