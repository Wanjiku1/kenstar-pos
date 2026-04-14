import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = body.Body.stkCallback;
    const checkoutID = result.CheckoutRequestID;

    if (result.ResultCode === 0) {
      // SUCCESSFUL PAYMENT
      const metadata = result.CallbackMetadata.Item;
      const mpesaReceipt = metadata.find((i: any) => i.Name === "MpesaReceiptNumber").Value;
      const amount = metadata.find((i: any) => i.Name === "Amount").Value;
      const phone = metadata.find((i: any) => i.Name === "PhoneNumber").Value;

      console.log(`✅ PAYMENT VERIFIED - ID: ${checkoutID} | Receipt: ${mpesaReceipt} | Amount: ${amount}`);

      // Optional: Add logic here to update your Supabase 'sales' table 
      // where checkout_request_id matches checkoutID

      return NextResponse.json({ message: "Callback received and processed" });
    } else {
      console.log(`❌ PAYMENT FAILED/CANCELLED - ID: ${checkoutID} | Reason: ${result.ResultDesc}`);
      return NextResponse.json({ message: "Payment failed" });
    }
  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.json({ error: "Invalid callback data" }, { status: 400 });
  }
}