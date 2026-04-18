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

      const { error } = await supabase
        .from('sales')
        .update({ 
          payment_ref: mpesaReceipt,
          collection_status: 'ready' 
        })
        .eq('payment_ref', checkoutID);

      if (error) console.error("Callback DB Update Error:", error.message);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });

    } else {
      // Mark as failed so polling stops and manager can retry
      await supabase.from('sales')
        .update({ collection_status: 'failed' })
        .eq('payment_ref', checkoutID);
        
      return NextResponse.json({ ResultCode: result.ResultCode, ResultDesc: result.ResultDesc });
    }
  } catch (error) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" }, { status: 500 });
  }
}