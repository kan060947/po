import { state } from '../state.js';
import { db } from '../db.js';

export function renderHeader(container, appState) {
    const totalQty = appState.cart.reduce((sum, item) => sum + item.quantity, 0);

    container.className = 'navbar';
    container.innerHTML = `
        <div class="navbar-container">
            <a href="#/" class="brand">
                <i data-lucide="cooking-pot"></i>
                <span>ร้านอร่อยเสร็จ (อร่อยชัวร์)</span>
            </a>
            <div class="nav-actions">
                <!-- Check if logged in, show dashboard link, else show login -->
                ${appState.user ? `
                    <a href="#/admin" class="btn-icon" title="ระบบหลังบ้าน">
                        <i data-lucide="layout-dashboard"></i>
                    </a>
                ` : `
                    <a href="#/admin/login" class="btn-icon" title="เข้าสู่ระบบพนักงาน">
                        <i data-lucide="user-cog"></i>
                    </a>
                `}
                
                <button id="cart-toggle-btn" class="btn-icon" title="ตะกร้าสินค้า">
                    <i data-lucide="shopping-basket"></i>
                    ${totalQty > 0 ? `<span class="badge">${totalQty}</span>` : ''}
                </button>
            </div>
        </div>
    `;

    // Bind event to toggle cart drawer
    container.querySelector('#cart-toggle-btn').addEventListener('click', () => {
        const overlay = document.getElementById('cart-drawer-overlay');
        if (overlay) overlay.classList.add('show');
    });
}

export function renderCartDrawer(container, appState) {
    const cartItems = appState.cart;
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    container.innerHTML = `
        <div class="cart-drawer">
            <div class="cart-header">
                <h2>ตะกร้าอาหารของคุณ (${totalQty} รายการ)</h2>
                <button id="cart-close-btn" class="btn-close">
                    <i data-lucide="x"></i>
                </button>
            </div>
            
            <div class="cart-items-list">
                ${cartItems.length === 0 ? `
                    <div class="cart-empty">
                        <i data-lucide="shopping-cart"></i>
                        <p>ไม่มีรายการอาหารในตะกร้าของคุณ</p>
                        <a href="#/" id="start-shopping" class="btn-secondary" style="font-size: 13px; margin-top: 8px;">เลือกเมนูอาหาร</a>
                    </div>
                ` : cartItems.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${item.name}</div>
                            ${item.notes ? `<div class="cart-item-notes">หมายเหตุ: ${item.notes}</div>` : ''}
                            <div class="cart-item-price">${(item.price * item.quantity).toLocaleString()} บาท</div>
                        </div>
                        <div class="cart-qty-control">
                            <button class="btn-qty decrease-qty" data-id="${item.id}" data-notes="${item.notes || ''}">
                                <i data-lucide="minus" style="width: 14px; height: 14px;"></i>
                            </button>
                            <span class="qty-val">${item.quantity}</span>
                            <button class="btn-qty increase-qty" data-id="${item.id}" data-notes="${item.notes || ''}">
                                <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            ${cartItems.length > 0 ? `
                <div class="cart-footer">
                    <div class="cart-summary-row">
                        <span class="cart-total-label">ยอดรวมทั้งหมด</span>
                        <span class="cart-total-price">${totalAmount.toLocaleString()} บาท</span>
                    </div>
                    
                    <div class="cart-input-group">
                        <label class="cart-label" for="table-number">ระบุเลขโต๊ะ หรือ สั่งกลับบ้าน *</label>
                        <select id="table-number" class="cart-input">
                            <option value="" disabled selected>-- เลือกสถานที่ทาน --</option>
                            <option value="กลับบ้าน">สั่งกลับบ้าน (Takeout)</option>
                            <option value="โต๊ะ 1">โต๊ะ 1</option>
                            <option value="โต๊ะ 2">โต๊ะ 2</option>
                            <option value="โต๊ะ 3">โต๊ะ 3</option>
                            <option value="โต๊ะ 4">โต๊ะ 4</option>
                            <option value="โต๊ะ 5">โต๊ะ 5</option>
                            <option value="โต๊ะ 6">โต๊ะ 6</option>
                            <option value="โต๊ะ 7">โต๊ะ 7</option>
                            <option value="โต๊ะ 8">โต๊ะ 8</option>
                        </select>
                    </div>

                    <div class="cart-input-group">
                        <label class="cart-label" for="order-notes">หมายเหตุเพิ่มเติมถึงห้องครัว (ไม่บังคับ)</label>
                        <textarea id="order-notes" class="cart-input" rows="2" placeholder="เช่น เผ็ดน้อย, ไม่ใส่กระเทียม, ขอช้อนส้อมเพิ่ม"></textarea>
                    </div>
                    
                    <button id="place-order-btn" class="btn-primary">
                        ยืนยันการสั่งออเดอร์
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    // Bind event: Close drawer when clicking Close Button or Overlay
    const closeDrawer = () => {
        container.classList.remove('show');
    };

    container.querySelector('#cart-close-btn').addEventListener('click', closeDrawer);
    
    // Close on overlay click (not drawer content click)
    container.addEventListener('click', (e) => {
        if (e.target === container) closeDrawer();
    });

    // Check if start shopping exists
    const startShop = container.querySelector('#start-shopping');
    if (startShop) startShop.addEventListener('click', closeDrawer);

    // Quantity modifiers
    container.querySelectorAll('.increase-qty').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const notes = btn.dataset.notes;
            const item = cartItems.find(x => x.id === id && x.notes === notes);
            if (item) {
                state.updateCartQuantity(id, notes, item.quantity + 1);
            }
        });
    });

    container.querySelectorAll('.decrease-qty').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const notes = btn.dataset.notes;
            const item = cartItems.find(x => x.id === id && x.notes === notes);
            if (item) {
                state.updateCartQuantity(id, notes, item.quantity - 1);
            }
        });
    });

    // Submit Order
    const placeOrderBtn = container.querySelector('#place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async () => {
            const tableSelect = container.querySelector('#table-number');
            const notesInput = container.querySelector('#order-notes');
            
            if (!tableSelect.value) {
                state.showToast("กรุณาเลือกหมายเลขโต๊ะหรือกลับบ้านก่อนสั่งอาหาร", "error");
                tableSelect.focus();
                return;
            }

            placeOrderBtn.disabled = true;
            placeOrderBtn.innerText = "กำลังส่งข้อมูลออเดอร์...";

            try {
                const { data, error } = await db.createOrder(
                    tableSelect.value,
                    notesInput.value.trim(),
                    cartItems
                );

                if (error) {
                    throw new Error(error.message);
                }

                state.showToast("สั่งอาหารสำเร็จ! กำลังไปที่หน้าติดตามออเดอร์...");
                state.clearCart();
                closeDrawer();
                
                // Navigate to tracking page
                state.navigate(`/order/${data.id}`);
            } catch (err) {
                console.error("Order submission failed:", err);
                state.showToast("การสั่งซื้อล้มเหลว: " + err.message, "error");
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerText = "ยืนยันการสั่งออเดอร์";
            }
        });
    }
}
