import { InvoiceDrawer } from "@/components/invoice-drawer";
import { InvoiceDetail } from "../../[id]/invoice-detail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

// Ruta interceptora: al hacer clic en una factura desde la lista, el detalle se
// abre en un panel lateral (drawer) en lugar de navegar a la página completa.
export default async function InterceptedInvoicePage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  return (
    <InvoiceDrawer>
      <InvoiceDetail invoiceId={id} variant="drawer" />
    </InvoiceDrawer>
  );
}
