// Layout de la sección Facturas. Al hacer clic en una factura se navega a la
// página completa de detalle (/facturas/[id]); ya no se usa panel lateral.
export default function FacturasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
