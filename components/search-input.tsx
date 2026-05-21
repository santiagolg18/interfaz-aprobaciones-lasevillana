"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  placeholder?: string;
  paramName?: string;
  debounceMs?: number;
  className?: string;
  ariaLabel?: string;
};

export function SearchInput({
  placeholder = "Buscar…",
  paramName = "q",
  debounceMs = 300,
  className,
  ariaLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const externalValue = sp.get(paramName) ?? "";
  const [value, setValue] = useState(externalValue);
  const [lastExternal, setLastExternal] = useState(externalValue);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from URL when it changes externally (e.g., chips removed, "Clear filters").
  if (externalValue !== lastExternal) {
    setLastExternal(externalValue);
    setValue(externalValue);
  }

  function pushUpdate(next: string) {
    const params = new URLSearchParams(sp.toString());
    const trimmed = next.trim();
    if (trimmed) params.set(paramName, trimmed);
    else params.delete(paramName);
    if (params.has("page")) params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pushUpdate(next), debounceMs);
  }

  function onClear() {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    pushUpdate("");
  }

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        inputMode="search"
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-11 w-full rounded-lg border border-input bg-white pl-10 pr-11 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:text-sm"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
