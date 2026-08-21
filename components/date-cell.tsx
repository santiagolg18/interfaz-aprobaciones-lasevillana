import { cn } from "@/lib/utils";
import { formatDateTime, formatDateTimeParts } from "@/lib/format";

// Fecha compacta para celdas de tabla: día arriba y hora abajo, en dos líneas.
// Ocupa ~50px menos de ancho que la fecha en una sola línea y no pierde información
// (el `title` muestra la fecha y hora completas).
export function DateCell({
  value,
  className,
}: {
  value: string | Date | null | undefined;
  className?: string;
}) {
  const { date, time } = formatDateTimeParts(value);

  return (
    <div
      className={cn("leading-tight text-muted-foreground", className)}
      title={formatDateTime(value)}
    >
      <div className="text-xs tabular-nums whitespace-nowrap">{date}</div>
      {time ? (
        <div className="text-[11px] tabular-nums whitespace-nowrap opacity-80">
          {time}
        </div>
      ) : null}
    </div>
  );
}
