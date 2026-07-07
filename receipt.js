export function renderReceipt(container, order) {
    const orderTime = new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const orderDate = new Date(order.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const orderNum = order.id.slice(0, 8).toUpperCase();

    container.innerHTML = `
        <div class="receipt-wrapper">
            <div class="receipt-header">
                <h3>ร้านอร่อยเสร็จ</h3>
                <p style="font-size: 11px; margin-bottom: 2px;">สาขาหลัก (กรุงเทพมหานคร)</p>
                <p style="font-size: 11px;">โทร: 089-765-4321</p>
                <div class="receipt-divider"></div>
                <p style="text-align: left; font-size: 11px;">เลขที่ออเดอร์: #${orderNum}</p>
                <p style="text-align: left; font-size: 11px;">วันที่: ${orderDate} เวลา: ${orderTime} น.</p>
                <p style="text-align: left; font-size: 12px; font-weight: 700; margin-top: 4px;">โต๊ะ/ตำแหน่ง: ${order.table_number}</p>
            </div>
            
            <div class="receipt-divider"></div>
            
            <div style="margin: 10px 0;">
                ${order.order_items.map(item => `
                    <div class="receipt-row">
                        <span style="font-weight: bold; flex-grow: 1;">${item.name}</span>
                    </div>
                    <div class="receipt-row" style="font-size: 11px; color: #333; margin-bottom: 8px;">
                        <span>&nbsp;&nbsp;${item.quantity} x ${Number(item.price_at_purchase).toFixed(2)}</span>
                        <span>${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                    </div>
                    ${item.notes ? `
                        <div class="receipt-row receipt-item-details" style="margin-top: -6px; margin-bottom: 6px;">
                            <span>* โน้ต: ${item.notes}</span>
                        </div>
                    ` : ''}
                `).join('')}
            </div>
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-row">
                <span>จำนวนรายการ:</span>
                <span>${order.order_items.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น</span>
            </div>
            
            <div class="receipt-row receipt-total">
                <span>ยอดสุทธิ (NET):</span>
                <span>${Number(order.total_amount).toFixed(2)} บาท</span>
            </div>

            <div class="receipt-divider"></div>

            <div style="font-size: 11px; margin-top: 10px; line-height: 1.4;">
                <p><b>การชำระเงิน:</b> ชำระเงินสด / สแกนคิวอาร์โค้ด</p>
                ${order.notes ? `<p style="margin-top: 4px;"><b>หมายเหตุรวม:</b> ${order.notes}</p>` : ''}
            </div>

            <div class="receipt-footer">
                <p>ขอขอบคุณที่ใช้บริการ</p>
                <p>อาหารอร่อย ปรุงสดใหม่ ใส่ใจทุกจาน</p>
                <p style="margin-top: 8px; font-size: 9px; color: #555;">-- ออกใบเสร็จโดยระบบหลังร้านอัตโนมัติ --</p>
            </div>
        </div>
    `;
}
