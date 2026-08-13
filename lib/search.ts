// PostgREST usa la coma y los paréntesis como separadores dentro de `.or()`:
// un término de búsqueda que los contenga (p. ej. "ACME S.A.S., LTDA") genera
// un filtro malformado y la consulta falla con 400. Se reemplazan por espacio.
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
}
