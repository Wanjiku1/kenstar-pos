import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/mpesa';

export async function POST(req: Request) {
  try {
    const { phone, amount } = await req.json();
    const token = await getAccessToken();
    
    // 1. Format timestamp: YYYYMMDDHHMMSS
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    
    // 2. Generate Password: base64(shortcode + passkey + timestamp)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    // 3. Dynamic Callback URL for Vercel
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://your-vercel-domain.vercel.app";
    const callbackUrl = `${baseUrl}/api/callback`;

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount), // M-Pesa requires integers
      PartyA: phone, // Must be 2547XXXXXXXX
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: "KenstarOps",
      TransactionDesc: "Uniform Payment",
    };

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    
    // Log the CheckoutRequestID for Vercel tracking
    console.log("STK Push Initiated. ID:", data.CheckoutRequestID);

    return NextResponse.json(data);
  } catch (error) {
    console.error("STK Push Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}