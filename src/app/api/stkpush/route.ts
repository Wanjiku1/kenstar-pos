import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    // 1. Get Access Token - Ensure no whitespace in keys
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();

    if (!consumerKey || !consumerSecret) {
      throw new Error("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET in Vercel Envs");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const tokenRes = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Safaricom Auth Error Details:", errorText);
      throw new Error(`M-Pesa Auth Failed: ${tokenRes.status}`);
    }

    const { access_token } = await tokenRes.json();

    // 2. Generate Timestamp & Password (STRICT FORMAT)
    // Format must be YYYYMMDDHHMMSS
    const date = new Date();
    const timestamp = 
      date.getFullYear().toString() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const shortCode = process.env.MPESA_SHORTCODE || "174379";
    const passkey = process.env.MPESA_PASSKEY?.trim();

    if (!passkey) throw new Error("Missing MPESA_PASSKEY");

    const password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

    // 3. Initiate STK Push
    const stkUrl = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    
    // Ensure phone starts with 254 and has no '+'
    const formattedPhone = phone.replace(/\+/g, "").trim();

    const res = await fetch(stkUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // Change to CustomerBuyGoodsOnline if using Till
        Amount: Math.floor(amount),
        PartyA: formattedPhone,
        PartyB: shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: "https://kenstar-pos.vercel.app/api/callback",
        AccountReference: "KenstarOps",
        TransactionDesc: "POS Payment",
      }),
    });

    const data = await res.json();
    
    // Log the result so you can see the CheckoutRequestID in Vercel
    console.log("STK Push Response:", data);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Full STK Push Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}