import { FlashToast } from "@/components/flash-toast";
import { InvoiceDetail } from "./invoice-detail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function FacturaDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <>
      <FlashToast />
      <InvoiceDetail invoiceId={id} variant="page" />
    </>
  );
}
