export const printReceipt = (saleData: any, cart: any[], total: number, cashierName: string = "Admin") => {
  if (typeof window === "undefined") return;

  const receiptWindow = window.open('', '_blank', 'width=400,height=800');
  if (!receiptWindow) {
    alert("Please allow pop-ups to print receipts");
    return;
  }

  const logoUrl = "https://usuncgqfmawjsqwerala.supabase.co/storage/v1/object/public/assets/Kenstar%20uniform_prev_ui.png";
  const saleNumber = saleData.id ? `ID-${saleData.id.slice(0, 8)}` : `S${Date.now().toString().slice(-10)}`;
  
  const isCash = saleData.payment_method === 'cash';
  const tenderedAmount = Number(saleData.amount_paid) || total;
  const changeAmount = Number(saleData.change) || 0;
  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalSavings = saleData.discount_amount || 0;

  const itemsHtml = cart.map(item => `
    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 5px;">
      <span style="font-weight: bold; flex: 1;">^ ${(item.products?.name || item.item_name || "ITEM").toUpperCase()} [${item.size || 'STD'}]</span>
      <span style="width: 60px; text-align: right;">KES ${(item.price * item.quantity).toLocaleString()}</span>
    </div>
    <div style="font-size: 11px; margin-left: 10px; color: #333;">
      ${item.quantity} units @ KES ${item.price.toLocaleString()}/ea 
    </div>
  `).join('');

  receiptWindow.document.write(`
    <html>
      <head>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Arial', sans-serif; width: 72mm; padding: 4mm; margin: 0 auto; color: #000; line-height: 1.2; }
          .center { text-align: center; }
          .hr { border-top: 1px solid #000; margin: 8px 0; }
          .bold { font-weight: bold; }
          .flex-between { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center">
          <img src="${logoUrl}" style="width: 60px; border-radius: 50%; display: block; margin: 0 auto;" />
          <p class="bold" style="margin: 5px 0;">KENSTAR UNIFORMS</p>
          <p style="font-size: 10px; margin: 0;">UMOJA 1 MARKET, NAIROBI STALL 315/314</p>
        </div>

        <div class="hr"></div>
        <div class="center bold" style="font-size: 12px;">OFFICIAL RECEIPT</div>
        <div class="hr"></div>

        ${itemsHtml}

        <div class="hr" style="margin-top: 10px;"></div>

        <div style="font-size: 13px;">
          <div class="flex-between"><span>Sub Total</span><span>KES ${subTotal.toLocaleString()}</span></div>
          ${totalSavings > 0 ? `<div class="flex-between"><span>Discount</span><span>- KES ${totalSavings.toLocaleString()}</span></div>` : ''}

          <div class="flex-between" style="font-size: 16px; font-weight: bold; margin: 8px 0; border-top: 1px solid #000; padding-top: 4px;">
            <span>TOTAL DUE</span>
            <span>KES ${total.toLocaleString()}</span>
          </div>
          
          <div class="flex-between">
            <span>Paid via ${saleData.payment_method?.toUpperCase()}</span>
            <span>KES ${tenderedAmount.toLocaleString()}</span>
          </div>
          
          ${isCash ? `
            <div class="flex-between" style="font-weight: bold;">
              <span>CHANGE</span>
              <span>KES ${changeAmount.toLocaleString()}</span>
            </div>
          ` : `
            <div style="margin-top: 10px; padding: 8px; border: 1px solid #000; text-align: center;">
              <div style="font-size: 10px; font-weight: bold;">M-PESA REF:</div>
              <div style="font-size: 15px; font-weight: 900; letter-spacing: 1px;">${saleData.payment_ref}</div>
            </div>
          `}
        </div>

        <div class="hr"></div>
        <div class="flex-between" style="font-size: 9px; opacity: 0.8;">
          <span>${new Date().toLocaleString()}</span>
          <span>CASHIER: ${cashierName}</span>
        </div>
        <div class="center" style="margin-top: 15px; font-size: 10px;">
          <p class="bold">THANK YOU FOR CHOOSING KENSTAR</p>
        </div>
        <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); };</script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
};