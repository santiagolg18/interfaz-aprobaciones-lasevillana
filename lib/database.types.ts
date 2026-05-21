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
          auth_user_id: string | null
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
          po_storage_path: string | null
          po_uploaded_at: string | null
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
          po_storage_path?: string | null
          po_uploaded_at?: string | null
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
          po_storage_path?: string | null
          po_uploaded_at?: string | null
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
