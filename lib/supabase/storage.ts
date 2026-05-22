import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "invoices";
const DEFAULT_EXPIRES_IN = 60 * 60;

export async function getSignedStorageUrl(
  path: string | null | undefined,
  expiresIn = DEFAULT_EXPIRES_IN,
): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  let clean = path.replace(/^\/+/, "");
  if (clean.toLowerCase().startsWith(`${BUCKET}/`)) {
    clean = clean.slice(BUCKET.length + 1);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(clean, expiresIn);

  if (error || !data) return null;
  return data.signedUrl;
}
