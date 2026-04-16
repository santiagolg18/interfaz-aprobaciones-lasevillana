-- ============================================================
-- Sistema de Aprobación de Facturas DIAN
-- Schema consolidado para Supabase (PostgreSQL)
-- Ejecutar UNA VEZ en el SQL Editor del proyecto nuevo.
-- ============================================================

-- ============================================================
-- TABLA: suppliers (proveedores)
-- Cada proveedor tiene un NIT único y cuántas aprobaciones requiere.
-- ============================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nit VARCHAR(20) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  required_approvals INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLA: approvers (personas que aprueban)
-- ============================================================
CREATE TABLE approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telegram_chat_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLA: approval_rules (quién aprueba qué proveedor)
-- ============================================================
CREATE TABLE approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES approvers(id) ON DELETE CASCADE,
  approval_order INT DEFAULT 1,
  UNIQUE(supplier_id, approver_id)
);

-- ============================================================
-- TABLA: invoices (facturas recibidas)
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_nit VARCHAR(20) NOT NULL,
  supplier_name TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  issue_date DATE,
  due_date DATE,
  description TEXT,
  xml_raw JSONB,
  pdf_storage_path TEXT,
  final_pdf_path TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  required_approvals INT NOT NULL DEFAULT 1,
  current_approvals INT NOT NULL DEFAULT 0,
  email_message_id TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLA: approvals (aprobación individual por persona)
-- ============================================================
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES approvers(id),
  status VARCHAR(20) DEFAULT 'pending',
  token VARCHAR(64) NOT NULL UNIQUE,
  approved_at TIMESTAMPTZ,
  ip_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(invoice_id, approver_id)
);

-- ============================================================
-- Índices para rendimiento
-- ============================================================
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_supplier ON invoices(supplier_nit);
CREATE INDEX idx_approvals_token ON approvals(token);
CREATE INDEX idx_approvals_invoice ON approvals(invoice_id);

-- ============================================================
-- Función + Trigger: actualizar factura cuando alguien aprueba.
-- Cuenta approvals con status='approved', actualiza current_approvals
-- y marca la factura como 'approved' si se alcanza el umbral.
-- ============================================================
CREATE OR REPLACE FUNCTION check_invoice_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_required INT;
  v_total_approved INT;
BEGIN
  v_invoice_id := NEW.invoice_id;

  SELECT COUNT(*) INTO v_total_approved
  FROM approvals
  WHERE invoice_id = v_invoice_id AND status = 'approved';

  SELECT required_approvals INTO v_total_required
  FROM invoices
  WHERE id = v_invoice_id;

  UPDATE invoices
  SET current_approvals = v_total_approved
  WHERE id = v_invoice_id;

  IF v_total_approved >= v_total_required THEN
    UPDATE invoices
    SET status = 'approved',
        completed_at = now()
    WHERE id = v_invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_completion
  AFTER UPDATE OF status ON approvals
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION check_invoice_completion();

-- ============================================================
-- Vista para contabilidad / exportación a Excel
-- ============================================================
CREATE OR REPLACE VIEW accounting_invoices AS
SELECT
  i.invoice_number,
  i.supplier_nit,
  i.supplier_name,
  i.total_amount,
  i.currency,
  i.issue_date,
  i.due_date,
  i.status,
  i.completed_at,
  i.final_pdf_path,
  STRING_AGG(ap.name || ' (' || a.status || ' ' ||
             COALESCE(TO_CHAR(a.approved_at, 'YYYY-MM-DD HH24:MI'), 'pendiente') || ')',
             ', ') AS approvers_log
FROM invoices i
LEFT JOIN approvals a ON a.invoice_id = i.id
LEFT JOIN approvers ap ON ap.id = a.approver_id
GROUP BY i.id;
