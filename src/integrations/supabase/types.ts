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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          check_out_photo_path: string | null
          created_at: string
          date: string
          face_match_score: number | null
          id: string
          notes: string | null
          overtime_hours: number
          photo_path: string | null
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          verification_method: string
          worked_hours: number
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          check_out_photo_path?: string | null
          created_at?: string
          date?: string
          face_match_score?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number
          photo_path?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          verification_method?: string
          worked_hours?: number
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          check_out_photo_path?: string | null
          created_at?: string
          date?: string
          face_match_score?: number | null
          id?: string
          notes?: string | null
          overtime_hours?: number
          photo_path?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          verification_method?: string
          worked_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_records: {
        Row: {
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          staff_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          absent_days: number
          created_at: string
          deductions: number
          gross_salary: number
          half_days: number
          id: string
          late_count: number
          leave_days: number
          month: string
          net_salary: number
          overtime_amount: number
          overtime_hours: number
          payment_status: string
          present_days: number
          staff_id: string
          updated_at: string
          working_days: number
        }
        Insert: {
          absent_days?: number
          created_at?: string
          deductions?: number
          gross_salary?: number
          half_days?: number
          id?: string
          late_count?: number
          leave_days?: number
          month: string
          net_salary?: number
          overtime_amount?: number
          overtime_hours?: number
          payment_status?: string
          present_days?: number
          staff_id: string
          updated_at?: string
          working_days?: number
        }
        Update: {
          absent_days?: number
          created_at?: string
          deductions?: number
          gross_salary?: number
          half_days?: number
          id?: string
          late_count?: number
          leave_days?: number
          month?: string
          net_salary?: number
          overtime_amount?: number
          overtime_hours?: number
          payment_status?: string
          present_days?: number
          staff_id?: string
          updated_at?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          business_name: string
          created_at: string
          currency: string
          daily_working_hours: number
          deduct_absent: boolean
          id: string
          late_deduction_amount: number
          late_grace_minutes: number
          monthly_working_days: number
          overtime_rate_per_hour: number
          paid_leave: boolean
          updated_at: string
          work_end: string
          work_start: string
        }
        Insert: {
          business_name?: string
          created_at?: string
          currency?: string
          daily_working_hours?: number
          deduct_absent?: boolean
          id?: string
          late_deduction_amount?: number
          late_grace_minutes?: number
          monthly_working_days?: number
          overtime_rate_per_hour?: number
          paid_leave?: boolean
          updated_at?: string
          work_end?: string
          work_start?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          currency?: string
          daily_working_hours?: number
          deduct_absent?: boolean
          id?: string
          late_deduction_amount?: number
          late_grace_minutes?: number
          monthly_working_days?: number
          overtime_rate_per_hour?: number
          paid_leave?: boolean
          updated_at?: string
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          address: string | null
          created_at: string
          date_of_joining: string | null
          department_id: string | null
          designation: string | null
          email: string | null
          face_descriptor: Json | null
          face_enrolled_at: string | null
          full_name: string
          id: string
          is_active: boolean
          mobile: string | null
          photo_path: string | null
          salary_amount: number
          salary_type: Database["public"]["Enums"]["salary_type"]
          staff_code: string
          updated_at: string
          working_hours: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_joining?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          face_descriptor?: Json | null
          face_enrolled_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          mobile?: string | null
          photo_path?: string | null
          salary_amount?: number
          salary_type?: Database["public"]["Enums"]["salary_type"]
          staff_code: string
          updated_at?: string
          working_hours?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_joining?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          face_descriptor?: Json | null
          face_enrolled_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          mobile?: string | null
          photo_path?: string | null
          salary_amount?: number
          salary_type?: Database["public"]["Enums"]["salary_type"]
          staff_code?: string
          updated_at?: string
          working_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "admin" | "user"
      attendance_status: "present" | "absent" | "half_day" | "leave" | "late"
      salary_type: "monthly" | "daily"
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
    Enums: {
      app_role: ["admin", "user"],
      attendance_status: ["present", "absent", "half_day", "leave", "late"],
      salary_type: ["monthly", "daily"],
    },
  },
} as const
