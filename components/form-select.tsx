import { cn } from "@/lib/utils";

/**
 * Select nativo con el mismo estilo que los Input de la app.
 * Úsalo en formularios sin JS (GET forms, server actions) donde el Select
 * de shadcn no aplica.
 */
export function FormSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 sm:h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
