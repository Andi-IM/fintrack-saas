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
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_statement_items: {
        Row: {
          amount: number
          balance: number | null
          cash_flow_id: string | null
          category: string | null
          date: string
          description: string
          id: string
          metadata: Json | null
          statement_id: string | null
          type: string | null
        }
        Insert: {
          amount: number
          balance?: number | null
          cash_flow_id?: string | null
          category?: string | null
          date: string
          description: string
          id?: string
          metadata?: Json | null
          statement_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          balance?: number | null
          cash_flow_id?: string | null
          category?: string | null
          date?: string
          description?: string
          id?: string
          metadata?: Json | null
          statement_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_items_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_items_transaction_id_fkey"
            columns: ["cash_flow_id"]
            isOneToOne: false
            referencedRelation: "cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_items_transaction_id_fkey"
            columns: ["cash_flow_id"]
            isOneToOne: false
            referencedRelation: "dashboard_cash_flow_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          bank_name: string
          closing_balance: number | null
          created_at: string | null
          file_path: string
          id: string
          metadata: Json | null
          opening_balance: number | null
          statement_period: string
          total_items: number | null
          user_id: string
        }
        Insert: {
          bank_name: string
          closing_balance?: number | null
          created_at?: string | null
          file_path: string
          id?: string
          metadata?: Json | null
          opening_balance?: number | null
          statement_period: string
          total_items?: number | null
          user_id: string
        }
        Update: {
          bank_name?: string
          closing_balance?: number | null
          created_at?: string | null
          file_path?: string
          id?: string
          metadata?: Json | null
          opening_balance?: number | null
          statement_period?: string
          total_items?: number | null
          user_id?: string
        }
        Relationships: []
      }
      cash_flow: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          expense: number | null
          id: string
          income: number | null
          main_category: string
          payment_method: string | null
          receipt_id: string | null
          source_item_id: string | null
          sub_category: string | null
          transaction_time: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          description?: string | null
          expense?: number | null
          id?: string
          income?: number | null
          main_category: string
          payment_method?: string | null
          receipt_id?: string | null
          source_item_id?: string | null
          sub_category?: string | null
          transaction_time?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          expense?: number | null
          id?: string
          income?: number | null
          main_category?: string
          payment_method?: string | null
          receipt_id?: string | null
          source_item_id?: string | null
          sub_category?: string | null
          transaction_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_wallets: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          name: string
          opening_balance: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          name: string
          opening_balance?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          name?: string
          opening_balance?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investment_accounts: {
        Row: {
          broker: string | null
          created_at: string | null
          currency: string
          id: string
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          broker?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          broker?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investment_holdings: {
        Row: {
          account_id: string
          asset_class: string
          avg_buy_price: number | null
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          name: string
          quantity: number
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          asset_class: string
          avg_buy_price?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          name: string
          quantity?: number
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          asset_class?: string
          avg_buy_price?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          name?: string
          quantity?: number
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "investment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_price_snapshots: {
        Row: {
          asset_class: string
          currency: string
          id: string
          price: number
          source: string
          symbol: string
          timestamp: string
        }
        Insert: {
          asset_class: string
          currency?: string
          id?: string
          price: number
          source: string
          symbol: string
          timestamp?: string
        }
        Update: {
          asset_class?: string
          currency?: string
          id?: string
          price?: number
          source?: string
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      investment_transactions: {
        Row: {
          created_at: string | null
          external_id: string | null
          fees: number | null
          holding_id: string
          id: string
          notes: string | null
          price: number
          quantity: number
          settlement_date: string | null
          taxes: number | null
          total_amount: number | null
          transaction_date: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          external_id?: string | null
          fees?: number | null
          holding_id: string
          id?: string
          notes?: string | null
          price: number
          quantity: number
          settlement_date?: string | null
          taxes?: number | null
          total_amount?: number | null
          transaction_date: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          external_id?: string | null
          fees?: number | null
          holding_id?: string
          id?: string
          notes?: string | null
          price?: number
          quantity?: number
          settlement_date?: string | null
          taxes?: number | null
          total_amount?: number | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "investment_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          created_at: string | null
          day_change: number | null
          day_change_pct: number | null
          id: string
          snapshot_date: string
          total_cost: number
          total_gain_loss: number | null
          total_gain_loss_pct: number | null
          total_value: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_change?: number | null
          day_change_pct?: number | null
          id?: string
          snapshot_date?: string
          total_cost: number
          total_gain_loss?: number | null
          total_gain_loss_pct?: number | null
          total_value: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_change?: number | null
          day_change_pct?: number | null
          id?: string
          snapshot_date?: string
          total_cost?: number
          total_gain_loss?: number | null
          total_gain_loss_pct?: number | null
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          amount_paid: number | null
          atm_id: string | null
          bank_statement_item_id: string | null
          change: number | null
          created_at: string | null
          date: string
          fee: number | null
          file_path: string | null
          id: string
          payment_method: string | null
          store_address: string | null
          store_name: string
          total_price: number
          transaction_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          atm_id?: string | null
          bank_statement_item_id?: string | null
          change?: number | null
          created_at?: string | null
          date: string
          fee?: number | null
          file_path?: string | null
          id?: string
          payment_method?: string | null
          store_address?: string | null
          store_name: string
          total_price: number
          transaction_type?: string | null
          type?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          atm_id?: string | null
          bank_statement_item_id?: string | null
          change?: number | null
          created_at?: string | null
          date?: string
          fee?: number | null
          file_path?: string | null
          id?: string
          payment_method?: string | null
          store_address?: string | null
          store_name?: string
          total_price?: number
          transaction_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_bank_statement_item_id_fkey"
            columns: ["bank_statement_item_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_items"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts_items: {
        Row: {
          id: string
          price: number
          product_name: string
          quantity: number
          receipt_id: string
        }
        Insert: {
          id?: string
          price: number
          product_name: string
          quantity: number
          receipt_id: string
        }
        Update: {
          id?: string
          price?: number
          product_name?: string
          quantity?: number
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dashboard_cash_flow_entries: {
        Row: {
          date: string | null
          description: string | null
          expense: number | null
          id: string | null
          income: number | null
          main_category: string | null
          payment_method: string | null
        }
        Insert: {
          date?: string | null
          description?: string | null
          expense?: number | null
          id?: string | null
          income?: number | null
          main_category?: string | null
          payment_method?: string | null
        }
        Update: {
          date?: string | null
          description?: string | null
          expense?: number | null
          id?: string | null
          income?: number | null
          main_category?: string | null
          payment_method?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_bank_statement_with_items: {
        Args: {
          p_bank_name: string
          p_closing_balance?: number
          p_file_path?: string
          p_items?: Json
          p_opening_balance?: number
          p_statement_period: string
          p_total_items?: number
          p_user_id: string
        }
        Returns: Json
      }
      get_cash_flow_summary: {
        Args: { p_date_from?: string; p_date_to?: string; p_user_id: string }
        Returns: {
          net_balance: number
          total_expense: number
          total_income: number
          transaction_count: number
        }[]
      }
      get_financial_analytics: {
        Args: { p_date_from?: string; p_date_to?: string; p_user_id: string }
        Returns: Json
      }
      recalculate_holding_avg_price: {
        Args: { p_holding_id: string }
        Returns: number
      }
      refresh_all_portfolio_snapshots: { Args: never; Returns: undefined }
      refresh_portfolio_snapshot: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string | null
          day_change: number | null
          day_change_pct: number | null
          id: string
          snapshot_date: string
          total_cost: number
          total_gain_loss: number | null
          total_gain_loss_pct: number | null
          total_value: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "portfolio_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_and_use_api_key: {
        Args: { p_key_hash: string; p_required_scope: string }
        Returns: {
          key_id: string
          name: string
          user_id: string
          valid: boolean
        }[]
      }
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
