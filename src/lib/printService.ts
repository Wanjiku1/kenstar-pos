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
    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 6px;">
      <span style="font-weight: bold; flex: 1;">^ ${(item.products?.name || item.item_name || "ITEM").toUpperCase()} [${item.size || 'STD'}]</span>
      <span style="width: 70px; text-align: right;">KES ${(item.price * item.quantity).toLocaleString()}</span>
    </div>
    <div style="font-size: 11px; margin-left: 10px; color: #444; font-style: italic;">
      ${item.quantity} unit(s) @ KES ${item.price.toLocaleString()}/ea 
    </div>
  `).join('');

  receiptWindow.document.write(`
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet">
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 72mm; 
            padding: 4mm; 
            margin: 0 auto; 
            color: #000; 
            line-height: 1.3;
          }
          .center { text-align: center; }
          .hr { border-top: 1px dashed #000; margin: 8px 0; }
          .bold { font-weight: bold; }
          .flex-between { display: flex; justify-content: space-between; }
          .calligraphy { 
            font-family: 'Great Vibes', cursive; 
            font-size: 22px; 
            color: #222;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="center">
          <img src="${logoUrl}" style="width: 75px; height: 75px; object-fit: contain; margin-bottom: 5px;" />
          <div class="bold" style="font-size: 16px; letter-spacing: 1px;">KENSTAR UNIFORMS [cite: 19]</div>
          <div style="font-size: 10px; margin-top: 2px;">UMOJA 1 MARKET, NAIROBI [cite: 20]</div>
          <div style="font-size: 10px;">STALL 315/314 [cite: 20]</div>
          <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">TEL: +254 722 876 112 </div>
        </div>

        <div class="hr"></div>
        <div class="center bold" style="font-size: 13px; letter-spacing: 2px;">OFFICIAL RECEIPT [cite: 4]</div>
        <div class="hr"></div>

        <div style="margin-bottom: 10px;">
          ${itemsHtml}
        </div>

        <div class="hr"></div>

        <div style="font-size: 13px;">
          <div class="flex-between"><span>Sub Total [cite: 7]</span><span>KES ${subTotal.toLocaleString()}</span></div>
          
          ${totalSavings > 0 ? `
          <div class="flex-between" style="font-weight: bold; margin-top: 2px;">
            <span>Discount</span>
            <span>- KES ${totalSavings.toLocaleString()}</span>
          </div>` : ''}

          <div class="flex-between" style="font-size: 18px; font-weight: 900; margin: 10px 0; border-top: 1px solid #000; padding-top: 5px;">
            <span>TOTAL [cite: 8]</span>
            <span>KES ${total.toLocaleString()}</span>
          </div>
          
          <div class="flex-between" style="font-size: 12px;">
            <span>Paid via ${saleData.payment_method?.toUpperCase()} [cite: 9]</span>
            <span>KES ${tenderedAmount.toLocaleString()}</span>
          </div>
          
          ${isCash ? `
            <div class="flex-between" style="font-weight: bold; font-size: 14px; margin-top: 4px;">
              <span>CHANGE</span>
              <span>KES ${changeAmount.toLocaleString()}</span>
            </div>
          ` : `
            <div style="margin-top: 12px; padding: 10px; border: 2px solid #000; text-align: center; background-color: #f9f9f9;">
              <div style="font-size: 10px; font-weight: bold; text-decoration: underline;">M-PESA TRANSACTION ID </div>
              <div style="font-size: 16px; font-weight: 900; letter-spacing: 1.5px; margin-top: 4px;">${saleData.payment_ref}</div>
            </div>
          `}
        </div>

        <div class="center">
            <div class="calligraphy">We are here to help</div>
        </div>

        <div class="hr"></div>
        
        <div class="flex-between" style="font-size: 10px; font-weight: bold;">
          <span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} [cite: 24]</span>
          <span>CASHIER: ${cashierName.toUpperCase()} [cite: 16]</span>
        </div>

        <div class="center" style="margin-top: 20px;">
          <div style="font-size: 10px; margin-bottom: 8px;">Sale No: ${saleNumber} [cite: 25]</div>
          <div class="bold" style="font-size: 11px;">THANK YOU FOR CHOOSING KENSTAR [cite: 26]</div>
          <div style="font-size: 13px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; display: inline-block; padding-top: 4px;">
            KARIBU TENA 
          </div>
        </div>
          
        <script>
          window.onload = function() { 
            window.print(); 
            setTimeout(() => { window.close(); }, 500); 
          };
        </script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
};