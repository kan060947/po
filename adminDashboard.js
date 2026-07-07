import { state } from '../state.js';
import { db } from '../db.js';
import { renderReceipt } from './receipt.js';

let activeOrdersSub = null; // Store active subscription to orders list

export async function renderAdminDashboardPage(container, appState) {
    // 1. Unsubscribe from previous updates if exists
    if (activeOrdersSub) {
        activeOrdersSub.unsubscribe();
        activeOrdersSub = null;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 100px 24px;">
            <div style="border: 4px solid var(--border-color); border-top-color: var(--primary); width: 40px; height: 40px; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="color: var(--text-muted);">กำลังโหลดรายการออเดอร์หลังบ้านแบบเรียลไทม์...</p>
        </div>
    `;

    try {
        // 2. Fetch all orders
        const { data: orders, error } = await db.getOrders();
        if (error) throw new Error(error.message);

        // Save orders to local state (to render correctly)
        state.set({ orders });

        // 3. Subscribe to real-time order changes
        activeOrdersSub = db.subscribeToOrders((change) => {
            // Re-fetch all orders to keep it completely in sync
            db.getOrders().then(({ data }) => {
                if (data) {
                    state.set({ orders: data });
                    state.showToast("มีการอัปเดตออเดอร์ใหม่!", "info");
                }
            });
        });

        // 4. Render main layout
        renderDashboardContent(container, appState);

    } catch (err) {
        console.error("Dashboard load failed:", err);
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 24px; color: var(--danger);">
                <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                <h3>ไม่สามารถโหลดคิวออเดอร์ได้</h3>
                <p style="color: var(--text-muted); margin-bottom: 24px;">${err.message}</p>
                <button id="retry-dash-btn" class="btn-primary" style="display: inline-block; width: auto;">ลองใหม่อีกครั้ง</button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        container.querySelector('#retry-dash-btn').addEventListener('click', () => {
            state.notify(); // Re-trigger subscribe/render
        });
    }
}

function renderDashboardContent(container, appState) {
    const orders = appState.orders;
    const currentTab = appState.adminActiveTab;

    // Filter orders by status corresponding to selected tab
    const filteredOrders = orders.filter(o => o.status === currentTab);

    // Calculate count of each status for tabs badges
    const counts = {
        pending: orders.filter(o => o.status === 'pending').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        completed: orders.filter(o => o.status === 'completed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
    };

    container.innerHTML = `
        <div class="admin-dash-header">
            <div>
                <h1>จัดการออเดอร์สด</h1>
                <p style="color: var(--text-muted); font-size: 14px;">ติดตามและอัปเดตสถานะการทำอาหารของร้านแบบเรียลไทม์</p>
            </div>
            <div style="font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; background-color: var(--bg-secondary); padding: 8px 16px; border-radius: 20px;">
                <span class="status-pulse"></span>
                <span>เรียลไทม์ (ใช้งานได้ปกติ)</span>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="admin-tabs">
            <button class="admin-tab ${currentTab === 'pending' ? 'active' : ''}" data-tab="pending">
                รอยืนยัน (${counts.pending})
            </button>
            <button class="admin-tab ${currentTab === 'preparing' ? 'active' : ''}" data-tab="preparing">
                กำลังทำ (${counts.preparing})
            </button>
            <button class="admin-tab ${currentTab === 'ready' ? 'active' : ''}" data-tab="ready">
                พร้อมเสิร์ฟ (${counts.ready})
            </button>
            <button class="admin-tab ${currentTab === 'completed' ? 'active' : ''}" data-tab="completed">
                สำเร็จแล้ว (${counts.completed})
            </button>
            <button class="admin-tab ${currentTab === 'cancelled' ? 'active' : ''}" data-tab="cancelled">
                ยกเลิกแล้ว (${counts.cancelled})
            </button>
        </div>

        <!-- Orders Queue -->
        <div class="orders-list">
            ${filteredOrders.length === 0 ? `
                <div style="text-align: center; padding: 80px 24px; background-color: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); color: var(--text-muted);">
                    <i data-lucide="inbox" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4;"></i>
                    <p>ไม่มีออเดอร์ในหมวดหมู่นี้ในขณะนี้</p>
                </div>
            ` : filteredOrders.map(order => {
                const orderTime = new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="order-card">
                        <div class="order-card-info">
                            <div class="order-card-header">
                                <span class="order-title">${order.table_number}</span>
                                <span class="order-time"><i data-lucide="clock" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>สั่งเมื่อ ${orderTime} น.</span>
                            </div>

                            ${order.notes ? `
                                <div class="order-notes-alert">
                                    <i data-lucide="alert-circle" style="width: 14px; height: 14px;"></i>
                                    <span><b>โน้ตออเดอร์:</b> ${order.notes}</span>
                                </div>
                            ` : ''}

                            <div class="order-card-items" id="items-container-${order.id}">
                                <div style="font-size: 12px; color: var(--text-muted);">กำลังดึงรายละเอียดเมนู...</div>
                            </div>

                            <div class="order-card-total">
                                ยอดรวม: <span style="color: var(--primary-hover);">${Number(order.total_amount).toLocaleString()} บาท</span>
                            </div>
                        </div>

                        <div class="order-card-actions">
                            <span class="order-badge ${order.status}">${getStatusLabel(order.status)}</span>
                            
                            <div class="action-buttons" style="margin-top: 16px;">
                                ${renderActionButtons(order)}
                                <button class="btn-small btn-small-secondary print-receipt-btn" data-id="${order.id}">
                                    <i data-lucide="printer" style="width: 14px; height: 14px;"></i>
                                    <span>พิมพ์ใบเสร็จ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Hidden receipt printer target -->
        <div id="print-receipt-target"></div>
        
        <style>
            .status-pulse {
                width: 8px;
                height: 8px;
                background-color: var(--success);
                border-radius: 50%;
                display: inline-block;
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
                70% { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
                100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
            }
        </style>
    `;

    // Process Lucide
    if (window.lucide) window.lucide.createIcons();

    // Bind tabs change
    container.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.set({ adminActiveTab: tab.dataset.tab });
        });
    });

    // Populate order items details asynchronously and bind order action events
    filteredOrders.forEach(async (order) => {
        try {
            const { data, error } = await db.getOrderById(order.id);
            if (!error && data) {
                const itemsContainer = container.querySelector(`#items-container-${order.id}`);
                if (itemsContainer) {
                    itemsContainer.innerHTML = data.order_items.map(item => `
                        <div class="order-card-item-row">
                            <span class="order-card-item-qty">${item.quantity}x</span>
                            <span>${item.name}</span>
                            ${item.notes ? `<span style="font-size: 12px; color: var(--warning); margin-left: 8px;">(โน้ต: ${item.notes})</span>` : ''}
                        </div>
                    `).join('');
                }
            }
        } catch (e) {
            console.error("Failed to load order details for card:", e);
        }
    });

    // Bind state change actions (Accept, Serve, Complete, Cancel)
    container.querySelectorAll('.status-update-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orderId = btn.dataset.id;
            const newStatus = btn.dataset.status;
            
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="spin" style="width: 14px; height: 14px;"></i>`;
            if (window.lucide) window.lucide.createIcons();

            try {
                const { error } = await db.updateOrderStatus(orderId, newStatus);
                if (error) throw new Error(error.message);

                state.showToast("อัปเดตสถานะออเดอร์เรียบร้อย!");
                // Trigger re-fetch of orders
                const { data } = await db.getOrders();
                if (data) state.set({ orders: data });
            } catch (err) {
                state.showToast("อัปเดตออเดอร์ล้มเหลว: " + err.message, "error");
                state.notify();
            }
        });
    });

    // Bind print receipt action
    container.querySelectorAll('.print-receipt-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orderId = btn.dataset.id;
            const printTarget = container.querySelector('#print-receipt-target');
            
            try {
                const { data: fullOrder, error } = await db.getOrderById(orderId);
                if (error) throw new Error(error.message);

                // Render receipt in print target
                renderReceipt(printTarget, fullOrder);
                
                // Trigger browser print
                window.print();
            } catch (err) {
                state.showToast("พิมพ์ใบเสร็จล้มเหลว: " + err.message, "error");
            }
        });
    });
}

function renderActionButtons(order) {
    if (order.status === 'pending') {
        return `
            <button class="btn-small btn-small-primary status-update-btn" data-id="${order.id}" data-status="preparing">
                <i data-lucide="play" style="width: 14px; height: 14px;"></i>
                <span>รับออเดอร์</span>
            </button>
            <button class="btn-small btn-small-danger status-update-btn" data-id="${order.id}" data-status="cancelled">
                <i data-lucide="ban" style="width: 14px; height: 14px;"></i>
                <span>ยกเลิก</span>
            </button>
        `;
    } else if (order.status === 'preparing') {
        return `
            <button class="btn-small btn-small-primary status-update-btn" data-id="${order.id}" data-status="ready" style="background-color: var(--info);">
                <i data-lucide="chef-hat" style="width: 14px; height: 14px;"></i>
                <span>ปรุงเสร็จแล้ว</span>
            </button>
        `;
    } else if (order.status === 'ready') {
        return `
            <button class="btn-small btn-small-primary status-update-btn" data-id="${order.id}" data-status="completed" style="background-color: var(--success);">
                <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                <span>เสิร์ฟสำเร็จ</span>
            </button>
        `;
    }
    return ''; // Completed or Cancelled orders have no status modification buttons
}

function getStatusLabel(status) {
    switch (status) {
        case 'pending': return 'รอยืนยัน';
        case 'preparing': return 'กำลังปรุง';
        case 'ready': return 'พร้อมเสิร์ฟ';
        case 'completed': return 'เสร็จสมบูรณ์';
        case 'cancelled': return 'ยกเลิกแล้ว';
        default: return status;
    }
}
