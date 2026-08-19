import { cn } from "@/lib/utils";

const TONES = {
  error: {
    box: "border-rose-200 bg-rose-50",
    text: "text-rose-700",
    title: "text-rose-900",
    icon: "bg-rose-100 text-rose-700",
  },
  warning: {
    box: "border-amber-200 bg-amber-50",
    text: "text-amber-800",
    title: "text-amber-900",
    icon: "bg-amber-100 text-amber-700",
  },
  success: {
    box: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-800",
    title: "text-emerald-900",
    icon: "bg-emerald-100 text-emerald-700",
  },
  info: {
    box: "border-sky-200 bg-sky-50",
    text: "text-sky-800",
    title: "text-sky-900",
    icon: "bg-sky-100 text-sky-700",
  },
} as const;

/**
 * Banner de aviso estándar. Sin `title` ni `icon` es una franja simple de
 * texto; con ellos usa el layout de ícono en recuadro + título + contenido.
 */
export function InfoBanner({
  tone = "info",
  title,
  icon,
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  const role = tone === "error" ? "alert" : "status";

  if (!title && !icon) {
    return (
      <div
        role={role}
        className={cn("rounded-md border p-3 text-sm", t.box, t.text, className)}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        t.box,
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            t.icon,
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className={cn("min-w-0 leading-tight text-sm", t.text)}>
        {title ? (
          <div className={cn("font-semibold", t.title)}>{title}</div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
