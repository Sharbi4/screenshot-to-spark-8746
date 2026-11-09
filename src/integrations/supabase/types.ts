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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      booking_requests: {
        Row: {
          booking_date: string
          city: string
          created_at: string
          daily_price: number
          hours: string
          id: string
          market_id: string
          market_name: string
          notes: string
          owner_id: string
          request_key: string
          stall_id: string | null
          stall_label: string
          status: string
        }
        Insert: {
          booking_date: string
          city: string
          created_at?: string
          daily_price: number
          hours: string
          id?: string
          market_id: string
          market_name: string
          notes?: string
          owner_id: string
          request_key: string
          stall_id?: string | null
          stall_label: string
          status?: string
        }
        Update: {
          booking_date?: string
          city?: string
          created_at?: string
          daily_price?: number
          hours?: string
          id?: string
          market_id?: string
          market_name?: string
          notes?: string
          owner_id?: string
          request_key?: string
          stall_id?: string | null
          stall_label?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "partner_stalls"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_markets: {
        Row: {
          address: string
          city: string
          created_at: string
          description: string
          hours: string
          id: string
          name: string
          owner_id: string
          schedule: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          description?: string
          hours: string
          id?: string
          name: string
          owner_id: string
          schedule: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          description?: string
          hours?: string
          id?: string
          name?: string
          owner_id?: string
          schedule?: string
        }
        Relationships: []
      }
      partner_stalls: {
        Row: {
          amenities: string[]
          availability: string
          created_at: string
          daily_price: number
          depth_ft: number
          id: string
          label: string
          market_id: string
          notes: string
          width_ft: number
        }
        Insert: {
          amenities?: string[]
          availability?: string
          created_at?: string
          daily_price: number
          depth_ft: number
          id?: string
          label: string
          market_id: string
          notes?: string
          width_ft: number
        }
        Update: {
          amenities?: string[]
          availability?: string
          created_at?: string
          daily_price?: number
          depth_ft?: number
          id?: string
          label?: string
          market_id?: string
          notes?: string
          width_ft?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_stalls_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "partner_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string
          category: string
          city: string
          description: string
          display_name: string
          id: string
          onboarding_complete: boolean
          participation: string
          phone: string
        }
        Insert: {
          business_name?: string
          category?: string
          city?: string
          description?: string
          display_name?: string
          id: string
          onboarding_complete?: boolean
          participation?: string
          phone?: string
        }
        Update: {
          business_name?: string
          category?: string
          city?: string
          description?: string
          display_name?: string
          id?: string
          onboarding_complete?: boolean
          participation?: string
          phone?: string
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
