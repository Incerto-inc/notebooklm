export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          timestamp: string
        }
        Insert: {
          content: string
          created_at?: string
          id: string
          role: string
          timestamp?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          timestamp?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          completedAt: string | null
          createdAt: string
          error: string | null
          id: string
          input: Json
          maxRetries: number
          priority: number
          result: Json | null
          retryCount: number
          startedAt: string | null
          status: Database["public"]["Enums"]["JobStatus"]
          type: Database["public"]["Enums"]["JobType"]
          updatedAt: string
        }
        Insert: {
          completedAt?: string | null
          createdAt?: string
          error?: string | null
          id: string
          input: Json
          maxRetries?: number
          priority?: number
          result?: Json | null
          retryCount?: number
          startedAt?: string | null
          status?: Database["public"]["Enums"]["JobStatus"]
          type: Database["public"]["Enums"]["JobType"]
          updatedAt: string
        }
        Update: {
          completedAt?: string | null
          createdAt?: string
          error?: string | null
          id?: string
          input?: Json
          maxRetries?: number
          priority?: number
          result?: Json | null
          retryCount?: number
          startedAt?: string | null
          status?: Database["public"]["Enums"]["JobStatus"]
          type?: Database["public"]["Enums"]["JobType"]
          updatedAt?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          content: string
          created_at: string
          createdAt: string
          id: string
          loading: boolean
          selected: boolean
          title: string
          type: string
          updatedAt: string
        }
        Insert: {
          content: string
          created_at?: string
          createdAt?: string
          id: string
          loading?: boolean
          selected?: boolean
          title: string
          type: string
          updatedAt: string
        }
        Update: {
          content?: string
          created_at?: string
          createdAt?: string
          id?: string
          loading?: boolean
          selected?: boolean
          title?: string
          type?: string
          updatedAt?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          content: string
          created_at: string
          createdAt: string
          id: string
          loading: boolean
          selected: boolean
          title: string
          type: string
          updatedAt: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          createdAt?: string
          id: string
          loading?: boolean
          selected?: boolean
          title: string
          type: string
          updatedAt: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          createdAt?: string
          id?: string
          loading?: boolean
          selected?: boolean
          title?: string
          type?: string
          updatedAt?: string
          video_url?: string | null
        }
        Relationships: []
      }
      styles: {
        Row: {
          content: string
          created_at: string
          createdAt: string
          id: string
          loading: boolean
          selected: boolean
          title: string
          type: string
          updatedAt: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          createdAt?: string
          id: string
          loading?: boolean
          selected?: boolean
          title: string
          type: string
          updatedAt: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          createdAt?: string
          id?: string
          loading?: boolean
          selected?: boolean
          title?: string
          type?: string
          updatedAt?: string
          video_url?: string | null
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
      JobStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
      JobType: "ANALYZE_VIDEO" | "ANALYZE_FILE" | "GENERATE_SCENARIO"
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
    Enums: {
      JobStatus: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
      JobType: ["ANALYZE_VIDEO", "ANALYZE_FILE", "GENERATE_SCENARIO"],
    },
  },
} as const

