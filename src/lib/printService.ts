export const printReceipt = (saleData: any, cart: any[], total: number, cashierName: string = "Admin") => {
  if (typeof window === "undefined") return;

  const receiptWindow = window.open('', '_blank', 'width=400,height=800');
  if (!receiptWindow) {
    alert("Please allow pop-ups to print receipts");
    return;
  }

  const logoUrl = "https://usuncgqfmawjsqwerala.supabase.co/storage/v1/object/public/assets/Kenstar%20uniform_prev_ui.png";
  const saleNumber = `S${Date.now().toString().slice(-10)}`;
  
  // Logic to handle Cash vs M-Pesa display on receipt
  const isCash = saleData.payment_method === 'cash';
  const tenderedAmount = isCash ? Number(saleData.amount_paid) : total;
  const changeAmount = isCash ? Number(saleData.change) : 0;

  const itemsHtml = cart.map(item => `
    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 5px;">
      <span style="font-weight: bold; flex: 1;">^ ${item.products?.name?.toUpperCase()} [${item.size || 'STD'}]</span>
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
          body { 
            font-family: 'Arial', sans-serif; 
            width: 72mm; 
            padding: 4mm; 
            margin: 0 auto;
            color: #000;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .hr { border-top: 1px solid #000; margin: 8px 0; }
          .bold { font-weight: bold; }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&family=Mr+Dafoe&display=swap" rel="stylesheet">
      </head>
      <body>
        
        <div class="center">
          <img src="${logoUrl}" style="width: 80px; height: auto; border-radius: 50%; display: block; margin: 0 auto;" />
          <h1 style="font-family: 'Mr Dafoe', cursive; font-size: 28px; margin: 0;">We're here to help</h1>
          <p class="bold" style="margin: 2px 0;">KENSTAR UNIFORMS</p>
          <p style="font-size: 11px; margin: 0;">UMOJA 1 MARKET, NAIROBI</p>
          <p style="font-size: 11px; margin: 5px 0;">Phone: +254 722 876 112</p>
        </div>

        <div class="hr"></div>
        <div class="center bold" style="font-size: 13px;">RECEIPT</div>
        <div class="hr"></div>

        ${itemsHtml}

        <div class="hr" style="margin-top: 15px;"></div>

        <div style="font-size: 14px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Sub Total</span>
            <span>KES ${total.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin: 5px 0;">
            <span>Total</span>
            <span>KES ${total.toLocaleString()}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; border-top: 1px dashed #ccc; pt-2">
            <span>Tendered ${saleData.payment_method?.toUpperCase()}</span>
            <span>KES ${tenderedAmount.toLocaleString()}</span>
          </div>
          
          ${isCash ? `
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
            <span>Change</span>
            <span>KES ${changeAmount.toLocaleString()}</span>
          </div>
          ` : `
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>M-Pesa Ref:</span>
            <span>${saleData.payment_ref || 'N/A'}</span>
          </div>
          `}
        </div>

        <div class="hr" style="margin: 20px 0;"></div>

        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>${new Date().toLocaleDateString()}</span>
          <span>${new Date().toLocaleTimeString('en-GB')}</span>
          <span>CASHIER: ${cashierName.toUpperCase()}</span>
        </div>

        <div class="center" style="margin-top: 10px;">
          <div style="font-family: 'Libre Barcode 128', cursive; font-size: 40px; line-height: 1;">
            ${saleNumber}
          </div>
          <p style="font-size: 10px; margin: 0;">Sale No. ${saleNumber}</p>
        </div>

        <div class="center" style="font-size: 11px; margin-top: 15px;">
          <p>Goods once sold cannot be returned.</p>
          <p class="bold">Thank you for Shopping at Kenstar Uniforms</p>
          <p style="font-size: 14px; font-weight: 900; margin-top: 5px;">KARIBU KENSTAR</p>
        </div>
          
        <script>
          window.onload = function() { 
            window.print(); 
            setTimeout(() => window.close(), 700); 
          };
        </script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
};