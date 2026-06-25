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
      approval_rules: {
        Row: {
          approval_order: number | null
          approver_id: string
          id: string
          supplier_id: string
        }
        Insert: {
          approval_order?: number | null
          approver_id: string
          id?: string
          supplier_id: string
        }
        Update: {
          approval_order?: number | null
          approver_id?: string
          id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          approval_order: number
          approved_at: string | null
          approver_id: string
          created_at: string | null
          id: string
          invoice_id: string
          ip_address: string | null
          notes: string | null
          status: string | null
          token: string
        }
        Insert: {
          approval_order?: number
          approved_at?: string | null
          approver_id: string
          created_at?: string | null
          id?: string
          invoice_id: string
          ip_address?: string | null
          notes?: string | null
          status?: string | null
          token: string
        }
        Update: {
          approval_order?: number
          approved_at?: string | null
          approver_id?: string
          created_at?: string | null
          id?: string
          invoice_id?: string
          ip_address?: string | null
          notes?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      approvers: {
        Row: {
          auth_user_id: string | null
          business_front: string | null
          can_approve: boolean
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          role: string
          telegram_chat_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          business_front?: string | null
          can_approve?: boolean
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          role?: string
          telegram_chat_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          business_front?: string | null
          can_approve?: boolean
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          telegram_chat_id?: string | null
        }
        Relationships: []
      }
      invoice_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          created_at: string
          details: Json | null
          id: string
          invoice_id: string | null
          invoice_number: string | null
          supplier_name: string | null
          total_amount: number | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          supplier_name?: string | null
          total_amount?: number | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          supplier_name?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_activity_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approval_mode: string
          archived_at: string | null
          archived_by: string | null
          business_front: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          current_approvals: number
          description: string | null
          due_date: string | null
          email_message_id: string | null
          final_pdf_path: string | null
          has_purchase_order: boolean | null
          id: string
          invoice_number: string
          issue_date: string | null
          pdf_generation_attempted_at: string | null
          pdf_generation_error: string | null
          pdf_generation_status: string | null
          pdf_storage_path: string | null
          po_storage_path: string | null
          po_uploaded_at: string | null
          received_at: string | null
          required_approvals: number
          review_checklist: Json | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sent_to_accounting_at: string | null
          sent_to_accounting_by: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string
          supplier_nit: string
          total_amount: number
          xml_raw: Json | null
        }
        Insert: {
          approval_mode?: string
          archived_at?: string | null
          archived_by?: string | null
          business_front?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_approvals?: number
          description?: string | null
          due_date?: string | null
          email_message_id?: string | null
          final_pdf_path?: string | null
          has_purchase_order?: boolean | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          pdf_generation_attempted_at?: string | null
          pdf_generation_error?: string | null
          pdf_generation_status?: string | null
          pdf_storage_path?: string | null
          po_storage_path?: string | null
          po_uploaded_at?: string | null
          received_at?: string | null
          required_approvals?: number
          review_checklist?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_to_accounting_at?: string | null
          sent_to_accounting_by?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name: string
          supplier_nit: string
          total_amount: number
          xml_raw?: Json | null
        }
        Update: {
          approval_mode?: string
          archived_at?: string | null
          archived_by?: string | null
          business_front?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_approvals?: number
          description?: string | null
          due_date?: string | null
          email_message_id?: string | null
          final_pdf_path?: string | null
          has_purchase_order?: boolean | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          pdf_generation_attempted_at?: string | null
          pdf_generation_error?: string | null
          pdf_generation_status?: string | null
          pdf_storage_path?: string | null
          po_storage_path?: string | null
          po_uploaded_at?: string | null
          received_at?: string | null
          required_approvals?: number
          review_checklist?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_to_accounting_at?: string | null
          sent_to_accounting_by?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string
          supplier_nit?: string
          total_amount?: number
          xml_raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sent_to_accounting_by_fkey"
            columns: ["sent_to_accounting_by"]
            isOneToOne: false
            referencedRelation: "approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      review_checklist_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          approval_mode: string
          celular: string | null
          contacto_facturacion: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          mail_contacto_facturacion: string | null
          nit: string
          nombre: string
          required_approvals: number
          telefono: string | null
          tipo: string | null
        }
        Insert: {
          approval_mode?: string
          celular?: string | null
          contacto_facturacion?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          mail_contacto_facturacion?: string | null
          nit: string
          nombre: string
          required_approvals?: number
          telefono?: string | null
          tipo?: string | null
        }
        Update: {
          approval_mode?: string
          celular?: string | null
          contacto_facturacion?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          mail_contacto_facturacion?: string | null
          nit?: string
          nombre?: string
          required_approvals?: number
          telefono?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      accounting_invoices: {
        Row: {
          approvers_log: string | null
          completed_at: string | null
          currency: string | null
          due_date: string | null
          final_pdf_path: string | null
          invoice_number: string | null
          issue_date: string | null
          status: string | null
          supplier_name: string | null
          supplier_nit: string | null
          total_amount: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      avg_approval_seconds: {
        Args: { from_ts?: string; to_ts?: string }
        Returns: number
      }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      record_invoice_decision: {
        Args: {
          p_approval_id: string
          p_decision: string
          p_ip?: string
          p_notes?: string
        }
        Returns: {
          current_approvals: number
          invoice_id: string
          new_status: string
          required_approvals: number
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
