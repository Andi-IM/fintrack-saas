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
      bank_statement_items: {
        Row: {
          amount: number
          balance: number | null
          category: string | null
          date: string
          description: string
          id: string
          metadata: Json | null
          statement_id: string | null
          cash_flow_id: string | null
          type: string | null
        }
        Insert: {
          amount: number
          balance?: number | null
          category?: string | null
          date: string
          description: string
          id?: string
          metadata?: Json | null
          statement_id?: string | null
          cash_flow_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          balance?: number | null
          category?: string | null
          date?: string
          description?: string
          id?: string
          metadata?: Json | null
          statement_id?: string | null
          cash_flow_id?: string | null
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
            foreignKeyName: "bank_statement_items_cash_flow_id_fkey"
            columns: ["cash_flow_id"]
            isOneToOne: false
            referencedRelation: "cash_flow"
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
          user_id?: string
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
        Relationships: [
          {
            foreignKeyName: "bank_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          user_id?: string
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
          {
            foreignKeyName: "receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      cash_flow: {
        Row: {
          id: string
          created_at: string | null
          date: string
          main_category: string
          sub_category: string | null
          description: string | null
          income: number | null
          expense: number | null
          payment_method: string | null
          receipt_id: string | null
          source_item_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string | null
          date: string
          main_category: string
          sub_category?: string | null
          description?: string | null
          income?: number | null
          expense?: number | null
          payment_method?: string | null
          receipt_id?: string | null
          source_item_id?: string | null
          user_id?: string
        }
        Update: {
          id?: string
          created_at?: string | null
          date?: string
          main_category?: string
          sub_category?: string | null
          description?: string | null
          income?: number | null
          expense?: number | null
          payment_method?: string | null
          receipt_id?: string | null
          source_item_id?: string | null
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
          {
            foreignKeyName: "cash_flow_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dashboard_cash_flow_entries: {
        Row: {
          id: string
          date: string
          main_category: string
          description: string | null
          income: number | null
          expense: number | null
          payment_method: string | null
        }
        Insert: {
          id?: never
          date?: never
          main_category?: never
          description?: never
          income?: never
          expense?: never
          payment_method?: never
        }
        Update: {
          id?: never
          date?: never
          main_category?: never
          description?: never
          income?: never
          expense?: never
          payment_method?: never
        }
        Relationships: []
      }
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
