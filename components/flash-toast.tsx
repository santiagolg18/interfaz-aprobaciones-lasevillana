"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function FlashToast() {
  const router = useRouter();
  const sp = useSearchParams();
  // Recuerda el último par error|success procesado para evitar doble toast
  // cuando React Strict Mode reejecuta el effect en dev.
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    const error = sp.get("error");
    const success = sp.get("success");
    if (!error && !success) return;

    const key = `${error ?? ""}|${success ?? ""}`;
    if (lastProcessedRef.current === key) return;
    lastProcessedRef.current = key;

    if (error) toast.error(decodeURIComponent(error));
    if (success) toast.success(decodeURIComponent(success));

    const params = new URLSearchParams(sp.toString());
    params.delete("error");
    params.delete("success");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [sp, router]);

  return null;
}
