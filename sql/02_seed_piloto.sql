-- ============================================================
-- Seed piloto: 2 proveedores + 3 aprobadores + reglas.
-- Ejecutar DESPUÉS de 01_schema.sql.
--
-- REEMPLAZAR antes de ejecutar:
--   * NITs reales de los proveedores piloto
--   * Emails reales de Adrián, Steven, Ángela
--   * telegram_chat_id se puebla después (ver PASO 2 de la guía)
-- ============================================================

-- ------------------------------------------------------------
-- Proveedores piloto
-- ------------------------------------------------------------
INSERT INTO suppliers (nit, name, required_approvals) VALUES
  ('REEMPLAZAR_NIT_1', 'Motores y Repuestos (camiones)', 2),  -- firma Adrián + Steven
  ('REEMPLAZAR_NIT_2', 'Parrilla / Carnes',              2);  -- firma Adrián + Ángela

-- ------------------------------------------------------------
-- Aprobadores
-- ------------------------------------------------------------
INSERT INTO approvers (name, email, telegram_chat_id) VALUES
  ('Adrián',  'REEMPLAZAR_adrian@empresa.com',  NULL),
  ('Steven',  'REEMPLAZAR_steven@empresa.com',  NULL),
  ('Ángela',  'REEMPLAZAR_angela@empresa.com',  NULL);

-- ------------------------------------------------------------
-- Reglas: quién aprueba qué proveedor
-- ------------------------------------------------------------

-- Motores y Repuestos → Adrián + Steven
INSERT INTO approval_rules (supplier_id, approver_id) VALUES
  ((SELECT id FROM suppliers WHERE nit = 'REEMPLAZAR_NIT_1'),
   (SELECT id FROM approvers WHERE email = 'REEMPLAZAR_adrian@empresa.com')),
  ((SELECT id FROM suppliers WHERE nit = 'REEMPLAZAR_NIT_1'),
   (SELECT id FROM approvers WHERE email = 'REEMPLAZAR_steven@empresa.com'));

-- Parrilla / Carnes → Adrián + Ángela
INSERT INTO approval_rules (supplier_id, approver_id) VALUES
  ((SELECT id FROM suppliers WHERE nit = 'REEMPLAZAR_NIT_2'),
   (SELECT id FROM approvers WHERE email = 'REEMPLAZAR_adrian@empresa.com')),
  ((SELECT id FROM suppliers WHERE nit = 'REEMPLAZAR_NIT_2'),
   (SELECT id FROM approvers WHERE email = 'REEMPLAZAR_angela@empresa.com'));

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
-- SELECT s.name, s.nit, s.required_approvals,
--        STRING_AGG(a.name, ', ') AS aprobadores
-- FROM suppliers s
-- LEFT JOIN approval_rules r ON r.supplier_id = s.id
-- LEFT JOIN approvers a ON a.id = r.approver_id
-- GROUP BY s.id;
