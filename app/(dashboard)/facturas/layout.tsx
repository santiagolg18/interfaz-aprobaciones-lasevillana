// Layout de la sección Facturas con un slot paralelo `@modal` para el detalle
// en panel lateral (ruta interceptora). El slot se renderiza encima de la lista
// cuando se navega a /facturas/[id] desde la propia lista; en navegación directa
// o al recargar, se muestra la página completa.
export default function FacturasLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
