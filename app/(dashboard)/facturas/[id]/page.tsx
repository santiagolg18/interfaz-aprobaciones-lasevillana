import { FlashToast } from "@/components/flash-toast";
import { InvoiceDetail } from "./invoice-detail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ from?: string }>;

export default async function FacturaDetallePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  return (
    <>
      <FlashToast />
      <InvoiceDetail invoiceId={id} from={from} />
    </>
  );
}
