import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  searchParams,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function urlForPage(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== "" && k !== "page") params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-3 text-sm text-muted-foreground">
      <div className="tabular-nums">
        {total === 0 ? (
          "Sin resultados"
        ) : (
          <>
            <span className="font-medium text-foreground">{start.toLocaleString("es-CO")}</span>
            {"–"}
            <span className="font-medium text-foreground">{end.toLocaleString("es-CO")}</span>
            {" de "}
            <span className="font-medium text-foreground">{total.toLocaleString("es-CO")}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          asChild={canPrev}
          variant="ghost"
          size="icon"
          disabled={!canPrev}
          aria-label="Primera página"
        >
          {canPrev ? (
            <Link href={urlForPage(1)} scroll={false}>
              <ChevronsLeft className="size-4" />
            </Link>
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </Button>
        <Button
          asChild={canPrev}
          variant="ghost"
          size="icon"
          disabled={!canPrev}
          aria-label="Página anterior"
        >
          {canPrev ? (
            <Link href={urlForPage(page - 1)} scroll={false}>
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>

        <span className="px-2 text-xs tabular-nums">
          Página{" "}
          <span className="font-medium text-foreground">{page}</span>
          {" / "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>

        <Button
          asChild={canNext}
          variant="ghost"
          size="icon"
          disabled={!canNext}
          aria-label="Página siguiente"
        >
          {canNext ? (
            <Link href={urlForPage(page + 1)} scroll={false}>
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>
        <Button
          asChild={canNext}
          variant="ghost"
          size="icon"
          disabled={!canNext}
          aria-label="Última página"
        >
          {canNext ? (
            <Link href={urlForPage(totalPages)} scroll={false}>
              <ChevronsRight className="size-4" />
            </Link>
          ) : (
            <ChevronsRight className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
