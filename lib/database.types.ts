export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          telegram_chat_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          telegram_chat_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          telegram_chat_id?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          completed_at: string | null
          created_at: string | null
          currency: string | null
          current_approvals: number
          description: string | null
          due_date: string | null
          email_message_id: string | null
          final_pdf_path: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          pdf_storage_path: string | null
          received_at: string | null
          required_approvals: number
          status: string | null
          supplier_id: string | null
          supplier_name: string
          supplier_nit: string
          total_amount: number
          xml_raw: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_approvals?: number
          description?: string | null
          due_date?: string | null
          email_message_id?: string | null
          final_pdf_path?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          pdf_storage_path?: string | null
          received_at?: string | null
          required_approvals?: number
          status?: string | null
          supplier_id?: string | null
          supplier_name: string
          supplier_nit: string
          total_amount: number
          xml_raw?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_approvals?: number
          description?: string | null
          due_date?: string | null
          email_message_id?: string | null
          final_pdf_path?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          pdf_storage_path?: string | null
          received_at?: string | null
          required_approvals?: number
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string
          supplier_nit?: string
          total_amount?: number
          xml_raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          nit: string
          required_approvals: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          nit: string
          required_approvals?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          nit?: string
          required_approvals?: number
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
        Args: { from_ts?: string | null; to_ts?: string | null }
        Returns: number
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
