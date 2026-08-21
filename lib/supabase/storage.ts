import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "invoices";
const DEFAULT_EXPIRES_IN = 60 * 60;

// Los paths se guardan como "invoices/<objeto>"; Storage espera solo <objeto>.
export function toObjectKey(path: string): string {
  let clean = path.replace(/^\/+/, "");
  if (clean.toLowerCase().startsWith(`${BUCKET}/`)) {
    clean = clean.slice(BUCKET.length + 1);
  }
  return clean;
}

export async function getSignedStorageUrl(
  path: string | null | undefined,
  expiresIn = DEFAULT_EXPIRES_IN,
): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(toObjectKey(path), expiresIn);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Firma varios objetos en una sola llamada. Devuelve las URLs en el mismo
 * orden que los paths recibidos (null en los que fallen).
 *
 * `downloadNames`: si se pasa, el objeto se sirve como descarga con ese nombre
 * en vez de abrirse en el navegador. Útil para Excel/Word/ZIP, donde el objeto
 * en Storage tiene un nombre opaco (UUID) pero el usuario espera el suyo.
 */
export async function getSignedStorageUrls(
  paths: string[],
  {
    expiresIn = DEFAULT_EXPIRES_IN,
    downloadNames,
  }: { expiresIn?: number; downloadNames?: (string | null)[] } = {},
): Promise<(string | null)[]> {
  if (paths.length === 0) return [];

  const admin = createAdminClient();
  const keys = paths.map(toObjectKey);
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(keys, expiresIn);

  if (error || !data) return paths.map(() => null);

  // createSignedUrls no garantiza el orden: se indexa por path devuelto.
  const byKey = new Map<string, string>();
  for (const row of data) {
    if (row.path && row.signedUrl) byKey.set(row.path, row.signedUrl);
  }

  return keys.map((key, i) => {
    const url = byKey.get(key);
    if (!url) return null;
    const name = downloadNames?.[i];
    if (!name) return url;
    return `${url}&download=${encodeURIComponent(name)}`;
  });
}
