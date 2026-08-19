import { cn } from "@/lib/utils";

const TONES = {
  default: {
    card: "",
    icon: "bg-neutral-100 text-neutral-600",
  },
  warning: {
    card: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
  },
  danger: {
    card: "border-rose-200 bg-rose-50",
    icon: "bg-rose-100 text-rose-700",
  },
} as const;

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
  size = "md",
  iconClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  tone?: keyof typeof TONES;
  size?: "md" | "lg";
  /** Colores del recuadro del ícono; si se pasa, reemplaza los del tono. */
  iconClassName?: string;
}) {
  const t = TONES[tone];
  const display =
    typeof value === "number" ? value.toLocaleString("es-CO") : value;
  return (
    <div className={cn("surface", size === "lg" ? "p-5" : "p-4", t.card)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex items-center justify-center rounded-md",
            size === "lg" ? "size-9" : "size-8",
            iconClassName ?? t.icon,
          )}
        >
          {icon}
        </span>
      </div>
      {size === "lg" ? (
        <>
          <p className="mt-3 text-3xl font-semibold tabular-nums leading-none text-neutral-900">
            {display}
          </p>
          {hint ? (
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {hint}
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums text-neutral-900">
            {display}
          </p>
          {hint ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {hint}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
