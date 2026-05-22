"use client";

import { MessageSquare } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";

export type InvoiceNote = {
  approverName: string;
  status: string | null;
  approvedAt: string | null;
  notes: string;
};

export function InvoiceNotesPopover({ notes }: { notes: InvoiceNote[] }) {
  if (notes.length === 0) return null;

  const label =
    notes.length === 1
      ? "Ver nota del aprobador"
      : `Ver ${notes.length} notas de aprobadores`;

  return (
    <span className="relative z-10 inline-flex">
      <Popover>
        <PopoverTrigger
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex size-7 items-center justify-center rounded-md text-amber-500 hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <MessageSquare className="size-4" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 max-h-80 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notas de aprobadores
            </div>
            {notes.map((n, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1.5 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900 truncate">
                    {n.approverName}
                  </span>
                  <StatusBadge status={n.status} />
                </div>
                {n.approvedAt ? (
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(n.approvedAt)}
                  </div>
                ) : null}
                <p className="text-sm text-neutral-800 whitespace-pre-wrap break-words">
                  {n.notes}
                </p>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </span>
  );
}
