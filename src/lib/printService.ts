export const printReceipt = (saleData: any, cart: any[], total: number, staffId: string = "Admin") => {
  if (typeof window === "undefined") return;

  const receiptWindow = window.open('', '_blank', 'width=400,height=800');
  if (!receiptWindow) {
    alert("Please allow pop-ups for this site to print receipts automatically.");
    return;
  }

  const logoUrl = "https://usuncgqfmawjsqwerala.supabase.co/storage/v1/object/public/assets/Kenstar%20uniform_prev_ui.png";
  const saleNumber = saleData.id ? `ID-${saleData.id.slice(0, 8)}` : `S${Date.now().toString().slice(-10)}`;
  
  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalSavings = saleData.discount_amount || 0;
  const isCustom = saleData.is_custom_order;

  // Logic for Deposit/Balance
  const depositPaid = Number(saleData.deposit_amount) || total;
  const balanceRemaining = Number(saleData.balance_amount) || 0;
  const paymentRef = saleData.payment_ref || "N/A";

  // Parse Production Specs if they exist
  let specs = { measurements: 'AS PER REQ', customerContact: 'N/A' };
  if (saleData.production_specs) {
    try {
      const parsed = typeof saleData.production_specs === 'string' 
        ? JSON.parse(saleData.production_specs) 
        : saleData.production_specs;
      specs = { ...specs, ...parsed };
    } catch (e) { console.error("Specs parsing error", e); }
  }

  const itemsHtml = cart.map(item => `
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 6px; font-weight: bold;">
      <span>${(item.products?.name || item.item_name || "ITEM").toUpperCase()}</span>
      <span>KES ${(item.price * item.quantity).toLocaleString()}</span>
    </div>
    <div style="font-size: 11px; margin-bottom: 2px; color: #333;">
      ${item.quantity} x KES ${item.price.toLocaleString()} ${item.size ? `[SZ: ${item.size}]` : ''}
    </div>
  `).join('');

  receiptWindow.document.write(`
    <html>
      <head>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 72mm; padding: 4mm; margin: 0 auto; color: #000; }
          .center { text-align: center; }
          .hr { border-top: 1px dashed #000; margin: 8px 0; }
          .bold { font-weight: bold; }
          .flex-between { display: flex; justify-content: space-between; }
          .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 5px; }
          .production-box { border: 1px solid #000; padding: 8px; margin: 10px 0; font-size: 11px; }
          .total-row { font-size: 16px; font-weight: 900; margin: 5px 0; }
          .balance-row { color: #d00; font-weight: bold; border: 1px solid #000; padding: 4px; margin-top: 5px; }
          .mpesa-box { border: 1px solid #000; background-color: #f9f9f9; padding: 6px; text-align: center; font-size: 11px; margin-top: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <img src="${logoUrl}" class="logo" />
          <div class="calligraphy">Home of Quality</div>
          <div class="bold" style="font-size: 15px;">KENSTAR UNIFORMS</div>
          <div style="font-size: 10px;">UMOJA 1 MARKET, STALL 315/314</div>
          <div style="font-size: 10px; font-weight: bold;">TEL: 0722 876 112 / 0714 950 573</div>
        </div>

        <div class="hr"></div>
        <div class="center bold" style="font-size: 12px;">${isCustom ? 'PRODUCTION RECEIPT' : 'CASH SALE RECEIPT'}</div>
        <div class="hr"></div>

        ${isCustom ? `
        <div class="production-box">
          <div class="bold center" style="text-decoration: underline; margin-bottom: 5px;">CUSTOM ORDER DETAILS</div>
          <div><strong>CLIENT:</strong> ${specs.customerContact}</div>
          <div><strong>DUE DATE:</strong> ${saleData.collection_date || 'TBD'}</div>
          <div style="margin-top: 3px;"><strong>SPECS:</strong> ${specs.measurements}</div>
        </div>
        ` : ''}

        <div style="margin-bottom: 10px;">${itemsHtml}</div>
        <div class="hr"></div>
        
        <div style="font-size: 13px;">
          <div class="flex-between"><span>Sub Total</span><span>KES ${subTotal.toLocaleString()}</span></div>
          ${totalSavings > 0 ? `<div class="flex-between"><span>Discount</span><span>- KES ${totalSavings.toLocaleString()}</span></div>` : ''}
          <div class="flex-between total-row" style="border-top: 1px solid #000; padding-top: 5px;">
            <span>GRAND TOTAL</span><span>KES ${total.toLocaleString()}</span>
          </div>
          
          <div class="flex-between" style="font-weight: bold; margin-top: 5px;">
            <span>${isCustom ? 'DEPOSIT PAID' : 'AMOUNT PAID'} (${saleData.payment_method?.toUpperCase()})</span>
            <span>KES ${depositPaid.toLocaleString()}</span>
          </div>

          ${balanceRemaining > 0 ? `
            <div class="flex-between balance-row">
              <span>BALANCE DUE</span><span>KES ${balanceRemaining.toLocaleString()}</span>
            </div>
          ` : `
            <div class="flex-between" style="font-size: 11px; margin-top: 2px;">
              <span>CHANGE GIVEN</span><span>KES ${(Number(saleData.change) || 0).toLocaleString()}</span>
            </div>
          `}

          ${saleData.payment_method === 'mpesa' ? `
            <div class="mpesa-box">
              MPESA REF CODE: ${paymentRef}
            </div>
          ` : ''}
          
        </div>

        <div class="hr" style="margin-top: 15px;"></div>
        <div class="flex-between" style="font-size: 9px; font-weight: bold;">
          <span>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
          <span>Cashier: ${staffId.toUpperCase()}</span>
        </div>

        <div class="center" style="margin-top: 15px;">
          <div style="font-size: 9px; margin-bottom: 5px;">No: ${saleNumber}</div>
          <div class="bold" style="font-size: 11px;">Thank you for choosing Kenstar</div>
          <div style="font-size: 12px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; display: inline-block; padding-top: 2px;">KARIBU TENA</div>
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