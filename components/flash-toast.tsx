"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function FlashToast() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const error = sp.get("error");
    const success = sp.get("success");
    if (!error && !success) return;

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
