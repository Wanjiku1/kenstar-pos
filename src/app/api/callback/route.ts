import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.Body?.stkCallback) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const result = body.Body.stkCallback;
    const checkoutID = result.CheckoutRequestID;

    if (result.ResultCode === 0) {
      const metadata = result.CallbackMetadata.Item;
      const mpesaReceipt = metadata.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
      const amount = metadata.find((i: any) => i.Name === "Amount")?.Value;
      const phone = metadata.find((i: any) => i.Name === "PhoneNumber")?.Value;

      // 1. Transactional Log: Record the actual M-Pesa event
      await supabase.from('mpesa_transactions').insert([{
        receipt_number: mpesaReceipt,
        phone_number: phone.toString(),
        amount: amount,
        is_claimed: true 
      }]);

      // 2. Link to Sale: Update the sale's payment_ref with the Receipt Number
      // This is the trigger the POS polling is watching for.
      const { error } = await supabase
        .from('sales')
        .update({ payment_ref: mpesaReceipt })
        .eq('payment_ref', checkoutID);

      if (error) console.error("Callback Sale Link Error:", error.message);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });

    } else {
      // For failures, we don't touch collection_status to avoid constraint errors.
      // The POS will simply time out or you can log failure to a separate audit table.
      return NextResponse.json({ ResultCode: result.ResultCode, ResultDesc: "Cancelled" });
    }
  } catch (error) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" }, { status: 500 });
  }
}