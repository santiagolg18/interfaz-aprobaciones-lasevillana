# Prompt: Dashboard de Aprobaciones de Facturas

Construye un app web con **Next.js (App Router)** conectado a **Supabase** para gestionar un sistema de aprobación de facturas electrónicas colombianas (DIAN). El sistema backend ya existe y funciona (n8n procesa correos con facturas, envía emails de aprobación a los responsables, y genera un PDF final). Este dashboard es la interfaz visual para monitorear y administrar todo, configurar y agregar proveedores y las aprovadores asignados que dependen del nit de la empresa.

---

## Stack

- Next.js con App Router (`/app`)
- `@supabase/supabase-js` + `@supabase/ssr`
- Tailwind CSS + shadcn/ui
- TypeScript
- Con autenticación pero básica (es para uso interno, no quiero complicaciones)
- Toda la UI en **español**

---

## Conexión Supabase

```
NEXT_PUBLIC_SUPABASE_URL=https://hbctaadebquqrjfofwzt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiY3RhYWRlYnF1cXJqZm9md3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTQ0MjUsImV4cCI6MjA5MTc5MDQyNX0.zSMv7FzSWwUgnCN434U8vxBFG-hZn3f2GOLk7BIQwzQ>

```

Usar la clave `anon` (pública), nunca la `service_role` en el frontend.

---

## Schema de la base de datos

Revisa el archivo `01_schema.sql`, este tiene toda la estructura y modelo de la base de datos, pero mejor utiliza el mcp que ya esta conectado con supabase y accede a esto por mcp para modificar, mejorar y agregar funciones de ser necesario.
```

**Importante**: `invoices.status` e `invoices.current_approvals` los actualiza un trigger de Postgres automáticamente cuando cambia `approvals.status`. El dashboard **nunca** debe escribir directamente sobre esos campos.

---

## Storage (PDFs)

El bucket `invoices` es **público**. Las URLs de los PDFs son directas:

- PDF original: `https://hbctaadebquqrjfofwzt.supabase.co/storage/v1/object/public/invoices/<invoice_number>.pdf`
- PDF aprobado (final): `https://hbctaadebquqrjfofwzt.supabase.co/storage/v1/object/public/invoices/final/<invoice_number>_aprobado.pdf`

Usa `pdf_storage_path` y `final_pdf_path` de la tabla `invoices` para construir las URLs.

---

## Funcionalidades

### 1. Facturas (`/` o `/facturas`)

Vista principal con tabla de facturas. Columnas: numero, proveedor, monto (formato COP con separador de miles), fecha, estado, progreso de aprobaciones (ej: "1/2").

- **Filtros**: por estado (pendiente/aprobada/rechazada), por proveedor, por rango de fechas
- **Badges de estado**: amarillo=pendiente, verde=aprobada, rojo=rechazada
- **Click en fila** abre el detalle

### 2. Detalle de factura (`/facturas/[id]`)

- Datos completos de la factura (proveedor, NIT, monto, fechas)
- **Visor PDF embebido**: mostrar el PDF original con `<embed>` o `<iframe>` usando la URL pública del Storage. Si existe `final_pdf_path`, mostrar tambien enlace al PDF aprobado
- **Lista de aprobadores**: tabla con nombre, email, estado de su aprobacion (pending/approved/rejected), fecha de aprobacion. Query: `approvals` con join a `approvers` filtrado por `invoice_id`

### 3. Proveedores (`/proveedores`)

CRUD completo:
- **Listar**: tabla con NIT, nombre, aprobaciones requeridas, cantidad de reglas asignadas
- **Crear/Editar**: formulario con NIT, nombre, numero de aprobaciones requeridas
- **Asignar aprobadores**: al editar un proveedor, mostrar checkboxes de los aprobadores activos para crear/eliminar filas en `approval_rules`
- **Eliminar**: solo si no tiene facturas asociadas (validar antes con query)

### 4. Aprobadores (`/aprobadores`)

CRUD completo:
- **Listar**: tabla con nombre, email, activo/inactivo, cantidad de proveedores asignados
- **Crear/Editar**: formulario con nombre, email
- **Activar/Desactivar**: toggle de `is_active` (no borrar, para mantener historial)

### 5. Reportes (`/reportes`)

Panel con metricas basicas:
- Conteo de facturas por estado (cards grandes arriba)
- Tiempo promedio de aprobacion (desde `received_at` hasta `completed_at`)
- Facturas pendientes mas antiguas (las que llevan mas tiempo sin aprobar)
- Filtro por rango de fechas

---

## Notas de diseno

- Usa un layout con sidebar de navegacion (Facturas, Proveedores, Aprobadores, Reportes)
- Moneda siempre en COP con formato colombiano (separador de miles con punto, decimales con coma)
- El dashboard es de solo lectura sobre facturas y aprobaciones (esas las genera el workflow de n8n). Solo es CRUD sobre proveedores, aprobadores y reglas
- Responsive: debe funcionar en tablet y desktop
