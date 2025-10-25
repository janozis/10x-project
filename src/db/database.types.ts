export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          duration_minutes: number;
          flow: string;
          group_id: string;
          id: string;
          knowledge_scope: string;
          last_evaluation_requested_at: string | null;
          location: string;
          materials: string;
          objective: string;
          participants: string;
          responsible: string;
          status: string;
          summary: string;
          tasks: string;
          title: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          duration_minutes: number;
          flow: string;
          group_id: string;
          id?: string;
          knowledge_scope: string;
          last_evaluation_requested_at?: string | null;
          location: string;
          materials: string;
          objective: string;
          participants: string;
          responsible: string;
          status?: string;
          summary: string;
          tasks: string;
          title: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          duration_minutes?: number;
          flow?: string;
          group_id?: string;
          id?: string;
          knowledge_scope?: string;
          last_evaluation_requested_at?: string | null;
          location?: string;
          materials?: string;
          objective?: string;
          participants?: string;
          responsible?: string;
          status?: string;
          summary?: string;
          tasks?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group_dashboard_stats";
            referencedColumns: ["group_id"];
          },
          {
            foreignKeyName: "activities_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_editors: {
        Row: {
          activity_id: string;
          assigned_at: string;
          assigned_by_user_id: string;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          assigned_at?: string;
          assigned_by_user_id: string;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          assigned_at?: string;
          assigned_by_user_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_editors_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_schedules: {
        Row: {
          activity_id: string;
          camp_day_id: string;
          created_at: string;
          end_time: string;
          id: string;
          order_in_day: number;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          activity_id: string;
          camp_day_id: string;
          created_at?: string;
          end_time: string;
          id?: string;
          order_in_day: number;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          camp_day_id?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          order_in_day?: number;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_schedules_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_schedules_camp_day_id_fkey";
            columns: ["camp_day_id"];
            isOneToOne: false;
            referencedRelation: "camp_days";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_evaluations: {
        Row: {
          activity_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          lore_feedback: string;
          lore_score: number;
          scouting_feedback: string;
          scouting_values_score: number;
          suggestions: Json;
          tokens: number | null;
          version: number;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lore_feedback: string;
          lore_score: number;
          scouting_feedback: string;
          scouting_values_score: number;
          suggestions: Json;
          tokens?: number | null;
          version: number;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lore_feedback?: string;
          lore_score?: number;
          scouting_feedback?: string;
          scouting_values_score?: number;
          suggestions?: Json;
          tokens?: number | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
        ];
      };
      camp_days: {
        Row: {
          created_at: string;
          date: string;
          day_number: number;
          group_id: string;
          id: string;
          theme: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          day_number: number;
          group_id: string;
          id?: string;
          theme?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          day_number?: number;
          group_id?: string;
          id?: string;
          theme?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "camp_days_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group_dashboard_stats";
            referencedColumns: ["group_id"];
          },
          {
            foreignKeyName: "camp_days_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_memberships: {
        Row: {
          group_id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          joined_at?: string;
          role: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group_dashboard_stats";
            referencedColumns: ["group_id"];
          },
          {
            foreignKeyName: "group_memberships_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_tasks: {
        Row: {
          activity_id: string | null;
          created_at: string;
          created_by: string;
          description: string;
          due_date: string | null;
          group_id: string;
          id: string;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          activity_id?: string | null;
          created_at?: string;
          created_by: string;
          description: string;
          due_date?: string | null;
          group_id: string;
          id?: string;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          activity_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          due_date?: string | null;
          group_id?: string;
          id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_tasks_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_tasks_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group_dashboard_stats";
            referencedColumns: ["group_id"];
          },
          {
            foreignKeyName: "group_tasks_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string;
          end_date: string;
          id: string;
          invite_code: string | null;
          invite_current_uses: number;
          invite_expires_at: string | null;
          invite_max_uses: number;
          lore_theme: string;
          max_members: number;
          name: string;
          start_date: string;
          status: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description: string;
          end_date: string;
          id?: string;
          invite_code?: string | null;
          invite_current_uses?: number;
          invite_expires_at?: string | null;
          invite_max_uses?: number;
          lore_theme: string;
          max_members?: number;
          name: string;
          start_date: string;
          status?: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string;
          end_date?: string;
          id?: string;
          invite_code?: string | null;
          invite_current_uses?: number;
          invite_expires_at?: string | null;
          invite_max_uses?: number;
          lore_theme?: string;
          max_members?: number;
          name?: string;
          start_date?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      group_dashboard_stats: {
        Row: {
          evaluated_activities: number | null;
          group_id: string | null;
          pct_evaluated_above_7: number | null;
          tasks_done: number | null;
          tasks_pending: number | null;
          total_activities: number | null;
        };
        Relationships: [];
      };
      user_group_permissions: {
        Row: {
          can_edit_all: boolean | null;
          can_edit_assigned_only: boolean | null;
          group_id: string | null;
          role: string | null;
          user_id: string | null;
        };
        Insert: {
          can_edit_all?: never;
          can_edit_assigned_only?: never;
          group_id?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Update: {
          can_edit_all?: never;
          can_edit_assigned_only?: never;
          group_id?: string | null;
          role?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "group_dashboard_stats";
            referencedColumns: ["group_id"];
          },
          {
            foreignKeyName: "group_memberships_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      gtrgm_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: { "": unknown };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      set_limit: {
        Args: { "": number };
        Returns: number;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: { "": string };
        Returns: string[];
      };
      user_group_role: {
        Args: { p_group: string; p_user: string };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
