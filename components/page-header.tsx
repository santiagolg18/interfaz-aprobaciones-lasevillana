import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 flex-wrap", className)}>
      <div className="min-w-0">
        {backHref ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1 text-muted-foreground"
          >
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {backLabel ?? "Volver"}
            </Link>
          </Button>
        ) : null}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
