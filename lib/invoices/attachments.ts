// Reglas de los "Soportes" (archivos adicionales de una factura).
// Vive fuera de la server action a propósito: el cliente valida con las mismas
// constantes antes de subir, sin duplicarlas.

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB (límite del bucket)

// Lista blanca por EXTENSIÓN, no por MIME: los navegadores reportan MIME
// inconsistente para .xlsx, .csv y .heic (a veces vacío).
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic",
  "heif",
  "gif",
  "xlsx",
  "xls",
  "xlsm",
  "csv",
  "docx",
  "doc",
  "txt",
  "zip",
  "eml",
  "msg",
] as const;

export type AttachmentExtension = (typeof ALLOWED_ATTACHMENT_EXTENSIONS)[number];

// Nota: svg y html quedan fuera a propósito. Se servirían desde el dominio de
// Supabase con URL firmada y pueden ejecutar scripts (XSS).
export const ATTACHMENT_ACCEPT_ATTR = ALLOWED_ATTACHMENT_EXTENSIONS.map(
  (e) => `.${e}`,
).join(",");

export function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export function isAllowedAttachment(fileName: string): boolean {
  return (ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(
    extensionOf(fileName),
  );
}

// Se abren en el navegador; el resto se descarga con su nombre original.
const INLINE_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "gif"];

export function isInlineViewable(fileName: string): boolean {
  return INLINE_EXTENSIONS.includes(extensionOf(fileName));
}

/** Valida nombre y tamaño. Devuelve el mensaje de error o null si está bien. */
export function validateAttachment(
  fileName: string,
  size: number,
): string | null {
  if (!fileName.trim()) return "El archivo no tiene nombre";
  if (size <= 0) return "El archivo está vacío";
  if (size > MAX_ATTACHMENT_BYTES) return "El archivo supera el límite de 10 MB";
  if (!isAllowedAttachment(fileName)) {
    return "Tipo de archivo no permitido (PDF, Excel, Word, imágenes, TXT, ZIP o correos)";
  }
  return null;
}
