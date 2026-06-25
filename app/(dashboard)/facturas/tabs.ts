// Definición compartida de las pestañas del ciclo de vida de facturas.
// La usa tanto la página (para mapear pestaña -> estados en las queries) como el
// componente de navegación InvoiceTabs.

export type TabKey =
  | "por_revisar"
  | "en_proceso"
  | "listas"
  | "completadas"
  | "rechazadas"
  | "archivadas"
  | "todas";

export type TabTone = "danger" | "warning" | "success" | "teal" | "rose" | "muted";

// "flow" = etapa del proceso principal (en orden); "side" = estado fuera del flujo.
export type TabGroup = "flow" | "side";

export type TabDef = {
  key: TabKey;
  label: string;
  tone: TabTone;
  group: TabGroup;
  // Estados de invoices.status que agrupa la pestaña.
  // null = "todos los estados excepto 'archived'" (vista consolidada "Todas").
  statuses: string[] | null;
};

export const DEFAULT_TAB: TabKey = "por_revisar";

export const TABS: TabDef[] = [
  {
    key: "por_revisar",
    label: "Por revisar",
    tone: "danger",
    group: "flow",
    statuses: ["in_review", "review_rejected"],
  },
  { key: "en_proceso", label: "En proceso", tone: "warning", group: "flow", statuses: ["pending"] },
  { key: "listas", label: "Listas para imprimir", tone: "success", group: "flow", statuses: ["approved"] },
  { key: "completadas", label: "Completadas", tone: "teal", group: "flow", statuses: ["completed"] },
  { key: "rechazadas", label: "Rechazadas", tone: "rose", group: "side", statuses: ["rejected"] },
  { key: "archivadas", label: "Archivadas", tone: "muted", group: "side", statuses: ["archived"] },
  { key: "todas", label: "Todas", tone: "muted", group: "side", statuses: null },
];

export function resolveTab(raw: string | undefined): TabKey {
  const found = TABS.find((t) => t.key === raw);
  return found ? found.key : DEFAULT_TAB;
}

export function tabDef(key: TabKey): TabDef {
  return TABS.find((t) => t.key === key)!;
}
