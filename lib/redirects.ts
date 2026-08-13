import { redirect } from "next/navigation";

// Helpers para el patrón de feedback vía query params (?error= / ?success=)
// que FlashToast y los banners inline saben leer. `path` puede traer ya un
// querystring; el mensaje se añade sin pisarlo.

function withParam(path: string, key: "error" | "success", message: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(message)}`;
}

export function redirectWithError(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

export function redirectWithSuccess(path: string, message: string): never {
  redirect(withParam(path, "success", message));
}
