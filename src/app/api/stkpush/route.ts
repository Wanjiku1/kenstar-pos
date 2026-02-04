import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/mpesa'; // The function we built in Step 3

export async function POST(req: Request) {
  try {
    const { phone, amount } = await req.json();
    const token = await getAccessToken();
    
    // Format timestamp: YYYYMMDDHHMMSS
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    
    // Generate Password: base64(shortcode + passkey + timestamp)
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone, // Must be 2547XXXXXXXX
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: "https://your-domain.com/api/callback", // We will build this next
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
    return NextResponse.json(data);
  } catch (error) {
    console.error("STK Push Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}