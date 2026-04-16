import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Safety check for empty or malformed body
    if (!body?.Body?.stkCallback) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = body.Body.stkCallback;
    const checkoutID = result.CheckoutRequestID;

    if (result.ResultCode === 0) {
      // 1. EXTRACT DATA FROM METADATA
      const metadata = result.CallbackMetadata.Item;
      const mpesaReceipt = metadata.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value;
      
      console.log(`✅ PAYMENT VERIFIED - ID: ${checkoutID} | Receipt: ${mpesaReceipt}`);

      // 2. UPDATE SUPABASE
      // We look for the row where 'payment_ref' is the CheckoutRequestID
      // and we update it with the real Mpesa Receipt Number
      const { data, error } = await supabase
        .from('sales')
        .update({ 
          payment_ref: mpesaReceipt,
          collection_status: 'ready' // You can change this to 'to_collect' if needed
        })
        .eq('payment_ref', checkoutID);

      if (error) {
        console.error("Supabase Update Error:", error.message);
        // We still return 200 to Safaricom so they stop retrying
        return NextResponse.json({ message: "DB Update Failed" });
      }

      // Safaricom expects a ResultCode 0 response for a successful acknowledgment
      return NextResponse.json({ 
        ResultCode: 0, 
        ResultDesc: "Success" 
      });

    } else {
      // PAYMENT FAILED (Cancelled by user, insufficient funds, etc.)
      console.log(`❌ PAYMENT FAILED/CANCELLED - ID: ${checkoutID} | Reason: ${result.ResultDesc}`);
      
      // Optional: Mark the sale as 'failed' in DB so the UI stops polling
      await supabase
        .from('sales')
        .update({ collection_status: 'failed' })
        .eq('payment_ref', checkoutID);

      return NextResponse.json({ 
        ResultCode: result.ResultCode, 
        ResultDesc: result.ResultDesc 
      });
    }
  } catch (error) {
    console.error("Callback Route Crash:", error);
    // Always return a JSON response to Safaricom
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" }, { status: 500 });
  }
}