import { state } from '../state.js';
import { db } from '../db.js';

let editingItem = null; // Store item currently being edited

export async function renderAdminMenuPage(container, appState) {
    container.innerHTML = `
        <div style="text-align: center; padding: 100px 24px;">
            <div style="border: 4px solid var(--border-color); border-top-color: var(--primary); width: 40px; height: 40px; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="color: var(--text-muted);">กำลังโหลดข้อมูลเมนูอาหาร...</p>
        </div>
    `;

    try {
        const { data: menuItems, error } = await db.getMenuItems();
        if (error) throw new Error(error.message);
        state.set({ menuItems });

        renderMenuEditorContent(container, menuItems);
    } catch (err) {
        console.error("Failed to load menu in editor:", err);
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 24px; color: var(--danger);">
                <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                <h3>ไม่สามารถโหลดข้อมูลเมนูอาหารได้</h3>
                <p style="color: var(--text-muted); margin-bottom: 24px;">${err.message}</p>
                <button id="retry-menu-editor-btn" class="btn-primary" style="display: inline-block; width: auto;">ลองใหม่อีกครั้ง</button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        container.querySelector('#retry-menu-editor-btn').addEventListener('click', () => {
            state.notify();
        });
    }
}

function renderMenuEditorContent(container, menuItems) {
    container.innerHTML = `
        <div class="admin-dash-header">
            <div>
                <h1>จัดการเมนูอาหาร</h1>
                <p style="color: var(--text-muted); font-size: 14px;">เพิ่ม แก้ไข ลบ เมนูอาหาร และกำหนดเวลาเปิด-ปิดการขายของแต่ละเมนู</p>
            </div>
            <button id="add-item-btn" class="btn-primary" style="width: auto; display: flex; align-items: center; gap: 8px; padding: 10px 20px;">
                <i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i>
                <span>เพิ่มเมนูอาหารใหม่</span>
            </button>
        </div>

        <div class="menu-table-container">
            <table class="menu-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">เมนู</th>
                        <th>หมวดหมู่</th>
                        <th>ราคา (บาท)</th>
                        <th>สถานะการขาย</th>
                        <th style="width: 20%; text-align: right;">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${menuItems.length === 0 ? `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
                                ไม่มีข้อมูลเมนูอาหารในร้าน
                            </td>
                        </tr>
                    ` : menuItems.map(item => `
                        <tr>
                            <td>
                                <div class="menu-item-cell">
                                    <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" alt="${item.name}">
                                    <div>
                                        <div style="font-weight: 600;">${item.name}</div>
                                        <div style="font-size: 12px; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${item.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span class="order-badge" style="background-color: var(--bg-secondary); color: var(--text-main); font-weight: normal;">${item.category}</span></td>
                            <td style="font-weight: 600;">${Number(item.price).toLocaleString()} บาท</td>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" class="availability-toggle" data-id="${item.id}" ${item.is_available ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </td>
                            <td style="text-align: right;">
                                <div style="display: inline-flex; gap: 8px;">
                                    <button class="btn-small btn-small-secondary edit-item-btn" data-id="${item.id}" title="แก้ไขข้อมูล">
                                        <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                                    </button>
                                    <button class="btn-small btn-small-danger delete-item-btn" data-id="${item.id}" title="ลบเมนู">
                                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Menu Item Form Modal -->
        <div id="menu-form-modal" class="modal-overlay">
            <div class="modal-card" style="max-width: 520px;">
                <div class="modal-body" style="padding: 24px 32px;">
                    <h3 class="modal-title" id="form-modal-title" style="font-size: 18px; margin-bottom: 20px;">เพิ่มเมนูอาหารใหม่</h3>
                    
                    <form id="menu-editor-form">
                        <div class="form-group">
                            <label class="form-label" for="edit-name">ชื่อเมนูอาหาร *</label>
                            <input type="text" id="edit-name" class="form-input" required placeholder="เช่น ผัดกะเพราทะเล">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label" for="edit-category">หมวดหมู่ *</label>
                                <select id="edit-category" class="form-input" required>
                                    <option value="อาหารจานเดียว">อาหารจานเดียว</option>
                                    <option value="กับข้าว">กับข้าว</option>
                                    <option value="ทานเล่น">ทานเล่น</option>
                                    <option value="ของหวาน">ของหวาน</option>
                                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="edit-price">ราคา (บาท) *</label>
                                <input type="number" id="edit-price" class="form-input" required min="0" step="0.5" placeholder="80">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="edit-description">คำอธิบายรายละเอียดอาหาร</label>
                            <textarea id="edit-description" class="form-input" rows="3" placeholder="ระบุวัตถุดิบ รสชาติ หรือรายละเอียดอื่นๆ..."></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="edit-image-url">URL รูปภาพเมนูอาหาร</label>
                            <input type="url" id="edit-image-url" class="form-input" placeholder="https://images.unsplash.com/photo-...">
                            <div class="config-help">สามารถใช้ลิงก์รูปภาพของ Unsplash หรือรูปภาพออนไลน์อื่นๆ ได้</div>
                        </div>
                    </form>
                </div>
                <div class="modal-actions" style="padding: 16px 32px;">
                    <button id="form-cancel-btn" class="btn-secondary">ยกเลิก</button>
                    <button id="form-submit-btn" class="btn-primary" style="flex-grow: 1;">บันทึกข้อมูล</button>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // --- EVENT BINDINGS ---

    const modal = container.querySelector('#menu-form-modal');
    const openModal = (item = null) => {
        editingItem = item;
        const title = container.querySelector('#form-modal-title');
        const nameInput = container.querySelector('#edit-name');
        const categoryInput = container.querySelector('#edit-category');
        const priceInput = container.querySelector('#edit-price');
        const descInput = container.querySelector('#edit-description');
        const imageInput = container.querySelector('#edit-image-url');

        if (item) {
            title.innerText = "แก้ไขเมนูอาหาร: " + item.name;
            nameInput.value = item.name;
            categoryInput.value = item.category;
            priceInput.value = item.price;
            descInput.value = item.description || "";
            imageInput.value = item.image_url || "";
        } else {
            title.innerText = "เพิ่มเมนูอาหารใหม่";
            nameInput.value = "";
            categoryInput.value = "อาหารจานเดียว";
            priceInput.value = "";
            descInput.value = "";
            imageInput.value = "";
        }
        modal.classList.add('show');
    };

    const closeModal = () => {
        modal.classList.remove('show');
        editingItem = null;
    };

    // Open add item modal
    container.querySelector('#add-item-btn').addEventListener('click', () => openModal(null));

    // Cancel form
    container.querySelector('#form-cancel-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Submit form (Create / Update)
    container.querySelector('#form-submit-btn').addEventListener('click', async () => {
        const formEl = container.querySelector('#menu-editor-form');
        if (!formEl.reportValidity()) return;

        const name = container.querySelector('#edit-name').value.trim();
        const category = container.querySelector('#edit-category').value;
        const price = parseFloat(container.querySelector('#edit-price').value);
        const description = container.querySelector('#edit-description').value.trim();
        const image_url = container.querySelector('#edit-image-url').value.trim();

        const submitBtn = container.querySelector('#form-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerText = "กำลังบันทึกข้อมูล...";

        try {
            if (editingItem) {
                // Update
                const { error } = await db.updateMenuItem(editingItem.id, {
                    name, category, price, description, image_url
                });
                if (error) throw new Error(error.message);
                state.showToast(`อัปเดต ${name} สำเร็จ`);
            } else {
                // Create
                const { error } = await db.createMenuItem({
                    name, category, price, description, image_url, is_available: true
                });
                if (error) throw new Error(error.message);
                state.showToast(`เพิ่ม ${name} สำเร็จ`);
            }

            closeModal();
            // Trigger refresh
            state.notify();
        } catch (err) {
            state.showToast("บันทึกข้อมูลล้มเหลว: " + err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "บันทึกข้อมูล";
        }
    });

    // Toggle availability switches
    container.querySelectorAll('.availability-toggle').forEach(chk => {
        chk.addEventListener('change', async () => {
            const id = chk.dataset.id;
            const isChecked = chk.checked;
            
            try {
                const { error } = await db.updateMenuItem(id, { is_available: isChecked });
                if (error) throw new Error(error.message);
                state.showToast(isChecked ? "เปิดการสั่งเมนูนี้แล้ว" : "ปิดการสั่งเมนูนี้แล้ว", "info");
            } catch (err) {
                chk.checked = !isChecked; // Revert
                state.showToast("เปลี่ยนสถานะล้มเหลว: " + err.message, "error");
            }
        });
    });

    // Edit button click events
    container.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const item = menuItems.find(x => x.id === id);
            if (item) openModal(item);
        });
    });

    // Delete button click events
    container.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const item = menuItems.find(x => x.id === id);
            if (!item) return;

            if (confirm(`คุณต้องการลบเมนูอาหาร "${item.name}" ใช่หรือไม่? ออเดอร์ในประวัติที่มีเมนูนี้จะยังคงแสดงอยู่`)) {
                try {
                    const { error } = await db.deleteMenuItem(id);
                    if (error) throw new Error(error.message);

                    state.showToast(`ลบเมนู ${item.name} แล้ว`);
                    state.notify();
                } catch (err) {
                    state.showToast("ลบข้อมูลล้มเหลว: " + err.message, "error");
                }
            }
        });
    });
}
