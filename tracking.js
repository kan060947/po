import { state } from '../state.js';
import { db } from '../db.js';

let activeOrderSub = null; // Store active real-time subscription object

export async function renderTrackingPage(container, appState) {
    const orderId = appState.route.params.id;

    // Unsubscribe from previous subscription if exists
    if (activeOrderSub) {
        activeOrderSub.unsubscribe();
        activeOrderSub = null;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 100px 24px;">
            <div style="border: 4px solid var(--border-color); border-top-color: var(--primary); width: 40px; height: 40px; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="color: var(--text-muted);">กำลังโหลดสถานะออเดอร์ของคุณ...</p>
        </div>
    `;

    try {
        const { data: orderData, error } = await db.getOrderById(orderId);
        if (error) throw new Error(error.message);

        // Subscribe to real-time updates
        activeOrderSub = db.subscribeToOrderById(orderId, (updatedOrder) => {
            // Update order status in view without full page reload if possible,
            // or simply trigger state update to re-render.
            state.showToast(`ออเดอร์ของคุณเปลี่ยนสถานะเป็น: ${getStatusLabel(updatedOrder.status)}`, 'info');
            // Re-render
            state.notify();
        });

        // Format dates
        const orderTime = new Date(orderData.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const orderDate = new Date(orderData.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

        // Render main screen
        container.innerHTML = `
            <div class="status-container">
                <div class="status-header">
                    <h2>ติดตามออเดอร์</h2>
                    <p>ออเดอร์เลขที่: ${orderData.id.slice(0, 8).toUpperCase()}</p>
                    <p>สั่งเมื่อ: วันนี้ ${orderTime} น. (${orderDate})</p>
                    
                    <div class="order-badge-container ${orderData.status}">
                        สถานะ: ${getStatusLabel(orderData.status)}
                    </div>
                </div>

                ${orderData.status === 'cancelled' ? `
                    <div style="text-align: center; padding: 24px; background-color: var(--danger-light); color: var(--danger); border-radius: var(--radius-md); margin-bottom: 32px; border: 1px solid var(--danger);">
                        <i data-lucide="ban" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
                        <h4 style="font-weight: 700; font-size: 16px;">ออเดอร์ของคุณถูกยกเลิกแล้ว</h4>
                        <p style="font-size: 13px; margin-top: 4px;">กรุณาติดต่อพนักงานร้านหากมีข้อสงสัย</p>
                    </div>
                ` : `
                    <!-- Stepper -->
                    <div class="stepper">
                        <div class="step ${getStepClass(orderData.status, 0)}">
                            <div class="step-icon">
                                <i data-lucide="clipboard-list"></i>
                            </div>
                            <div class="step-content">
                                <div class="step-title">ได้รับออเดอร์แล้ว</div>
                                <div class="step-time">${orderData.status === 'pending' ? 'กำลังรอห้องครัวรับออเดอร์' : 'สำเร็จ'}</div>
                            </div>
                        </div>

                        <div class="step ${getStepClass(orderData.status, 1)}">
                            <div class="step-icon">
                                <i data-lucide="chef-hat"></i>
                            </div>
                            <div class="step-content">
                                <div class="step-title">กำลังปรุงอาหาร</div>
                                <div class="step-time">${orderData.status === 'preparing' ? 'เชฟกำลังตั้งใจปรุงอาหารของคุณอย่างพิถีพิถัน' : ''}</div>
                            </div>
                        </div>

                        <div class="step ${getStepClass(orderData.status, 2)}">
                            <div class="step-icon">
                                <i data-lucide="bell-ring"></i>
                            </div>
                            <div class="step-content">
                                <div class="step-title">อาหารพร้อมเสิร์ฟ</div>
                                <div class="step-time">${orderData.status === 'ready' ? 'พนักงานกำลังนำอาหารไปเสิร์ฟที่โต๊ะของคุณ' : ''}</div>
                            </div>
                        </div>

                        <div class="step ${getStepClass(orderData.status, 3)}">
                            <div class="step-icon">
                                <i data-lucide="check-check"></i>
                            </div>
                            <div class="step-content">
                                <div class="step-title">ทานให้อร่อยนะคะ</div>
                                <div class="step-time">${orderData.status === 'completed' ? 'ออเดอร์ส่งถึงโต๊ะเสร็จสมบูรณ์' : ''}</div>
                            </div>
                        </div>
                    </div>
                `}

                <!-- Order details box -->
                <div class="order-summary-box">
                    <div class="summary-title" style="display: flex; justify-content: space-between;">
                        <span>รายการอาหารที่สั่ง (${orderData.table_number})</span>
                    </div>
                    
                    <div class="summary-list">
                        ${orderData.order_items.map(item => `
                            <div class="summary-item">
                                <div style="flex-grow: 1;">
                                    <span style="font-weight: 600;">${item.name}</span>
                                    <span style="color: var(--text-muted); margin-left: 8px;">x${item.quantity}</span>
                                    ${item.notes ? `<div style="font-size: 12px; color: var(--warning); margin-top: 2px;">* ${item.notes}</div>` : ''}
                                </div>
                                <div style="font-weight: 600;">
                                    ${(item.price_at_purchase * item.quantity).toLocaleString()} บาท
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    ${orderData.notes ? `
                        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                            <b>หมายเหตุออเดอร์:</b> ${orderData.notes}
                        </div>
                    ` : ''}

                    <div class="summary-footer">
                        <span>ยอดรวมทั้งหมด</span>
                        <span>${Number(orderData.total_amount).toLocaleString()} บาท</span>
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <a href="#/" class="btn-secondary" style="text-align: center; flex-grow: 1;">กลับหน้าสั่งอาหาร</a>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error("Failed to load order status page:", err);
        container.innerHTML = `
            <div class="status-container" style="text-align: center; color: var(--danger);">
                <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                <h3>ไม่พบเลขออเดอร์นี้</h3>
                <p style="color: var(--text-muted); margin-bottom: 24px;">ออเดอร์เลขที่ ${orderId.slice(0, 8)} อาจไม่ถูกต้อง หรือเซิร์ฟเวอร์มีปัญหา</p>
                <a href="#/" class="btn-primary" style="display: inline-block; width: auto;">กลับสู่หน้าหลัก</a>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }
}

// Helpers for stepper progress classes
function getStepClass(currentStatus, stepIndex) {
    const statuses = ['pending', 'preparing', 'ready', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus);

    if (currentStatus === 'cancelled') return '';

    if (currentIndex === stepIndex) {
        return 'active';
    } else if (currentIndex > stepIndex) {
        return 'completed';
    }
    return '';
}

function getStatusLabel(status) {
    switch (status) {
        case 'pending': return 'รอยืนยัน';
        case 'preparing': return 'กำลังปรุงอาหาร';
        case 'ready': return 'พร้อมเสิร์ฟ';
        case 'completed': return 'เสิร์ฟเสร็จสิ้น';
        case 'cancelled': return 'ยกเลิกแล้ว';
        default: return status;
    }
}
