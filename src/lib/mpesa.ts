// src/lib/mpesa.ts

export async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  // 1. Create the credentials string (Base64 encoded)
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`M-Pesa Auth Failed: ${errorData}`);
    }

    const data = await response.json();
    
    // This returns the actual token needed for the STK Push
    return data.access_token; 
  } catch (error) {
    console.error("M-Pesa Token Error:", error);
    throw error;
  }
}