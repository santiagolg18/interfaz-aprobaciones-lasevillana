"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

type Option = { value: string; label: string };

export function MobileSortSelect({
  options,
  pathname,
  defaultValue,
}: {
  options: Option[];
  pathname: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const current = sp.get("sort") ?? defaultValue;

  function onChange(next: string | null) {
    const value = next ?? defaultValue;
    const params = new URLSearchParams(sp.toString());
    if (!value || value === defaultValue) params.delete("sort");
    else params.set("sort", value);
    if (params.has("page")) params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="h-10" aria-label="Ordenar por">
        <ArrowUpDown className="size-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
