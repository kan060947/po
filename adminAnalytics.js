import { state } from '../state.js';
import { db } from '../db.js';

export async function renderAdminAnalyticsPage(container, appState) {
    container.innerHTML = `
        <div style="text-align: center; padding: 100px 24px;">
            <div style="border: 4px solid var(--border-color); border-top-color: var(--primary); width: 40px; height: 40px; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="color: var(--text-muted);">กำลังคำนวณและประมวลผลรายงานยอดขาย...</p>
        </div>
    `;

    try {
        const { data: orders, error } = await db.getOrders();
        if (error) throw new Error(error.message);
        state.set({ orders });

        // Let's analyze orders
        // Filter out cancelled orders for sales calculations.
        const completedOrders = orders.filter(o => o.status === 'completed');
        const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
        const cancelledOrders = orders.filter(o => o.status === 'cancelled');

        const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const totalOrdersCount = completedOrders.length;
        const avgOrderVal = totalOrdersCount > 0 ? (totalSales / totalOrdersCount) : 0;
        
        // Let's fetch popular items by checking all orders details (we'll fetch details for completed orders)
        // For performance in client-side mock/supabase, we will aggregate them.
        const itemsStats = {};
        
        // Load details for completed orders to build accurate sales details.
        // We will run this in parallel for completed orders.
        const detailPromises = completedOrders.map(o => db.getOrderById(o.id));
        const detailsResults = await Promise.all(detailPromises);
        
        detailsResults.forEach(res => {
            if (!res.error && res.data) {
                res.data.order_items.forEach(item => {
                    const id = item.menu_item_id || 'unknown';
                    const name = item.name || 'รายการเก่าถูกลบ';
                    const qty = item.quantity;
                    const price = item.price_at_purchase;

                    if (!itemsStats[id]) {
                        itemsStats[id] = {
                            name: name,
                            qty: 0,
                            revenue: 0,
                            id: id
                        };
                    }
                    itemsStats[id].qty += qty;
                    itemsStats[id].revenue += (qty * price);
                });
            }
        });

        const popularItems = Object.values(itemsStats).sort((a, b) => b.qty - a.qty);

        // Render Page
        container.innerHTML = `
            <div class="admin-dash-header">
                <div>
                    <h1>รายงาน & ยอดขาย</h1>
                    <p style="color: var(--text-muted); font-size: 14px;">สรุปผลประกอบการ ยอดขายเมนูยอดนิยม และสถิติสำหรับบริหารจัดการร้าน</p>
                </div>
            </div>

            <!-- Stats grid Cards -->
            <div class="analytics-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i data-lucide="banknote" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">ยอดขายสำเร็จทั้งหมด</span>
                        <span class="stat-value" style="color: var(--success);">${totalSales.toLocaleString()} ฿</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon" style="background-color: var(--info-light); color: var(--info);">
                        <i data-lucide="chef-hat" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">จำนวนออเดอร์ที่เสิร์ฟแล้ว</span>
                        <span class="stat-value">${totalOrdersCount.toLocaleString()} รายการ</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon" style="background-color: var(--primary-light); color: var(--primary-hover);">
                        <i data-lucide="calculator" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">เฉลี่ยต่อออเดอร์ (Ticket)</span>
                        <span class="stat-value">${Math.round(avgOrderVal).toLocaleString()} ฿</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon" style="background-color: var(--danger-light); color: var(--danger);">
                        <i data-lucide="ban" style="width: 24px; height: 24px;"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-label">ออเดอร์ที่ถูกยกเลิก</span>
                        <span class="stat-value">${cancelledOrders.length.toLocaleString()} รายการ</span>
                    </div>
                </div>
            </div>

            <div class="charts-row">
                <!-- Popular menu items card -->
                <div class="chart-card" style="grid-column: span 2;">
                    <h3>เมนูขายดีประจำร้าน (ยอดขายเรียงตามจำนวนเสิร์ฟ)</h3>
                    
                    <div class="menu-table-container">
                        <table class="menu-table">
                            <thead>
                                <tr>
                                    <th style="width: 10%;">อันดับ</th>
                                    <th style="width: 45%;">ชื่อเมนูอาหาร</th>
                                    <th style="width: 20%; text-align: center;">จำนวนที่ขายได้</th>
                                    <th style="width: 25%; text-align: right;">ยอดขายสะสม (บาท)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${popularItems.length === 0 ? `
                                    <tr>
                                        <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">
                                            ไม่มีสถิติยอดขายในระบบเนื่องจากยังไม่มีออเดอร์ที่เสร็จสมบูรณ์
                                        </td>
                                    </tr>
                                ` : popularItems.map((item, index) => {
                                    // Try to match image_url from current menu items list if found
                                    const menuItemDetail = appState.menuItems.find(x => x.id === item.id);
                                    const image = menuItemDetail ? menuItemDetail.image_url : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100';

                                    return `
                                        <tr>
                                            <td style="font-weight: 600; text-align: center;">${index + 1}</td>
                                            <td>
                                                <div class="menu-item-cell">
                                                    <img src="${image}" alt="${item.name}" style="width: 36px; height: 36px;">
                                                    <div style="font-weight: 600;">${item.name}</div>
                                                </div>
                                            </td>
                                            <td style="text-align: center; font-weight: 600;">${item.qty} จาน</td>
                                            <td style="text-align: right; font-weight: 600; color: var(--success);">${item.revenue.toLocaleString()} บาท</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error("Failed to compute analytics:", err);
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 24px; color: var(--danger);">
                <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                <h3>ไม่สามารถประมวลผลรายงานได้</h3>
                <p style="color: var(--text-muted); margin-bottom: 24px;">${err.message}</p>
                <button id="retry-analytics-btn" class="btn-primary" style="display: inline-block; width: auto;">ลองใหม่อีกครั้ง</button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        container.querySelector('#retry-analytics-btn').addEventListener('click', () => {
            state.notify();
        });
    }
}
