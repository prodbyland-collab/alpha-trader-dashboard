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
  public: {
    Tables: {
      bot_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          symbol: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          symbol?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          symbol?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          bot_enabled: boolean
          breakout_lookback: number
          daily_loss_limit_usdt: number
          max_positions: number
          min_momentum_pct: number
          mode: string
          paper_balance: number
          position_size_usdt: number
          stop_loss_pct: number
          take_profit_pct: number
          trail_activate_pct: number
          trail_giveback_pct: number
          trailing_enabled: boolean
          trend_filter_enabled: boolean
          updated_at: string
          user_id: string
          volume_spike_threshold: number
        }
        Insert: {
          bot_enabled?: boolean
          breakout_lookback?: number
          daily_loss_limit_usdt?: number
          max_positions?: number
          min_momentum_pct?: number
          mode?: string
          paper_balance?: number
          position_size_usdt?: number
          stop_loss_pct?: number
          take_profit_pct?: number
          trail_activate_pct?: number
          trail_giveback_pct?: number
          trailing_enabled?: boolean
          trend_filter_enabled?: boolean
          updated_at?: string
          user_id: string
          volume_spike_threshold?: number
        }
        Update: {
          bot_enabled?: boolean
          breakout_lookback?: number
          daily_loss_limit_usdt?: number
          max_positions?: number
          min_momentum_pct?: number
          mode?: string
          paper_balance?: number
          position_size_usdt?: number
          stop_loss_pct?: number
          take_profit_pct?: number
          trail_activate_pct?: number
          trail_giveback_pct?: number
          trailing_enabled?: boolean
          trend_filter_enabled?: boolean
          updated_at?: string
          user_id?: string
          volume_spike_threshold?: number
        }
        Relationships: []
      }
      exchange_credentials: {
        Row: {
          api_key_cipher: string
          api_secret_cipher: string
          created_at: string
          exchange: string
          key_hint: string
          last_validated_at: string | null
          updated_at: string
          user_id: string
          validated: boolean
        }
        Insert: {
          api_key_cipher: string
          api_secret_cipher: string
          created_at?: string
          exchange?: string
          key_hint?: string
          last_validated_at?: string | null
          updated_at?: string
          user_id: string
          validated?: boolean
        }
        Update: {
          api_key_cipher?: string
          api_secret_cipher?: string
          created_at?: string
          exchange?: string
          key_hint?: string
          last_validated_at?: string | null
          updated_at?: string
          user_id?: string
          validated?: boolean
        }
        Relationships: []
      }
      positions: {
        Row: {
          closed_at: string | null
          entry_price: number
          exit_price: number | null
          exit_reason: string | null
          id: string
          mode: string
          notional_usdt: number
          opened_at: string
          peak_price: number | null
          pnl_pct: number | null
          pnl_usdt: number | null
          quantity: number
          side: string
          source: string
          status: string
          stop_loss_price: number
          symbol: string
          take_profit_price: number
          trailing_active: boolean
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          entry_price: number
          exit_price?: number | null
          exit_reason?: string | null
          id?: string
          mode?: string
          notional_usdt: number
          opened_at?: string
          peak_price?: number | null
          pnl_pct?: number | null
          pnl_usdt?: number | null
          quantity: number
          side?: string
          source?: string
          status?: string
          stop_loss_price: number
          symbol: string
          take_profit_price: number
          trailing_active?: boolean
          user_id: string
        }
        Update: {
          closed_at?: string | null
          entry_price?: number
          exit_price?: number | null
          exit_reason?: string | null
          id?: string
          mode?: string
          notional_usdt?: number
          opened_at?: string
          peak_price?: number | null
          pnl_pct?: number | null
          pnl_usdt?: number | null
          quantity?: number
          side?: string
          source?: string
          status?: string
          stop_loss_price?: number
          symbol?: string
          take_profit_price?: number
          trailing_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          created_at: string
          id: string
          momentum_pct: number
          price: number
          signal_type: string
          strength: number
          symbol: string
          user_id: string
          volume_ratio: number
        }
        Insert: {
          created_at?: string
          id?: string
          momentum_pct?: number
          price: number
          signal_type: string
          strength?: number
          symbol: string
          user_id: string
          volume_ratio?: number
        }
        Update: {
          created_at?: string
          id?: string
          momentum_pct?: number
          price?: number
          signal_type?: string
          strength?: number
          symbol?: string
          user_id?: string
          volume_ratio?: number
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          symbol?: string
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
