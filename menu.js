import { state } from '../state.js';
import { db } from '../db.js';

let selectedItemForModal = null; // Store item selected for cart notes modal

export async function renderMenuPage(container, appState) {
    // 1. Fetch menu items from DB if they are empty in state
    if (appState.menuItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 100px 24px;">
                <div style="border: 4px solid var(--border-color); border-top-color: var(--primary); width: 40px; height: 40px; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <p style="color: var(--text-muted);">กำลังโหลดเมนูอาหารสดใหม่...</p>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        
        try {
            const { data, error } = await db.getMenuItems();
            if (error) throw new Error(error.message);
            state.set({ menuItems: data });
            return; // state subscription will re-trigger renderMenuPage
        } catch (err) {
            console.error("Failed to load menu items:", err);
            container.innerHTML = `
                <div style="text-align: center; padding: 80px 24px; color: var(--danger);">
                    <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                    <h3>ไม่สามารถโหลดเมนูอาหารได้</h3>
                    <p style="color: var(--text-muted); margin-bottom: 24px;">${err.message}</p>
                    <button id="retry-menu-btn" class="btn-primary" style="display: inline-block; width: auto;">ลองใหม่อีกครั้ง</button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            container.querySelector('#retry-menu-btn').addEventListener('click', () => {
                state.set({ menuItems: [] }); // Reset to trigger refetch
            });
            return;
        }
    }

    // 2. Render Hero banner
    let html = `
        <section class="hero">
            <h1>อร่อยเสร็จ เสิร์ฟความอร่อยถึงมือคุณ</h1>
            <p>สัมผัสรสชาติอาหารไทยแท้และวัตถุดิบคุณภาพ สั่งง่ายส่งตรงถึงโต๊ะคุณแบบเรียลไทม์</p>
        </section>
    `;

    // Render Supabase warning banner if running in Mock database mode
    if (db.isMock()) {
        html += `
            <div class="search-container" style="margin-bottom: 12px; max-width: 800px;">
                <div class="supabase-banner">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i data-lucide="database-backup"></i>
                        <span>แอปพลิเคชันกำลังรันด้วย <b>Mock Database (LocalStorage)</b> เชื่อมต่อ Supabase เพื่อเริ่มใช้งานฐานข้อมูลจริง</span>
                    </div>
                    <button class="btn-banner" onclick="window.location.hash='#/admin/login'">ตั้งค่า Supabase</button>
                </div>
            </div>
        `;
    }

    // 3. Render Search box
    html += `
        <div class="search-container">
            <i data-lucide="search"></i>
            <input type="text" id="menu-search-input" class="search-input" placeholder="ค้นหาเมนูอาหารอร่อยๆ..." value="${appState.searchQuery}">
        </div>
    `;

    // 4. Render Category tabs
    const categories = ['ทั้งหมด', 'อาหารจานเดียว', 'กับข้าว', 'ทานเล่น', 'ของหวาน', 'เครื่องดื่ม'];
    html += `
        <div class="categories-container">
            <div class="category-tabs">
                ${categories.map(cat => `
                    <button class="category-tab ${appState.activeCategory === cat ? 'active' : ''}" data-category="${cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // 5. Filter and Render Menu Items
    const filteredItems = appState.menuItems.filter(item => {
        const matchesCategory = appState.activeCategory === 'ทั้งหมด' || item.category === appState.activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(appState.searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    html += `
        <section class="menu-section">
            ${filteredItems.length === 0 ? `
                <div style="text-align: center; padding: 60px 0; color: var(--text-muted);">
                    <i data-lucide="salad" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>ไม่พบรายการอาหารที่ค้นหา ลองพิมพ์คำอื่นดูนะ</p>
                </div>
            ` : `
                <div class="menu-grid">
                    ${filteredItems.map(item => `
                        <div class="menu-card">
                            <div class="menu-img-wrapper">
                                <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}" alt="${item.name}" class="menu-img" loading="lazy">
                                <span class="menu-tag">${item.category}</span>
                            </div>
                            <div class="menu-content">
                                <h3 class="menu-title">${item.name}</h3>
                                <p class="menu-desc">${item.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับอาหารจานนี้'}</p>
                                <div class="menu-footer">
                                    <span class="menu-price">${Number(item.price).toLocaleString()}</span>
                                    ${item.is_available ? `
                                        <button class="btn-add add-to-cart-btn" data-id="${item.id}">
                                            <i data-lucide="plus"></i>
                                        </button>
                                    ` : `
                                        <span class="badge-soldout">หมดชั่วคราว</span>
                                    `}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </section>

        <!-- Customization / Notes Modal -->
        <div id="notes-modal" class="modal-overlay">
            <div class="modal-card">
                <div class="modal-body">
                    <h3 class="modal-title" id="modal-item-name">ชื่อเมนูอาหาร</h3>
                    <p class="modal-desc" id="modal-item-desc">รายละเอียดอาหาร</p>
                    
                    <div class="form-group">
                        <label class="form-label" for="item-notes-input">หมายเหตุพิเศษของจานนี้ (เช่น เผ็ดน้อย, ไม่สุก, แยกน้ำซอส)</label>
                        <textarea id="item-notes-input" class="form-input" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติม..."></textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="modal-cancel-btn" class="btn-secondary">ยกเลิก</button>
                    <button id="modal-confirm-btn" class="btn-primary" style="flex-grow: 1;">เพิ่มลงตะกร้า</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // --- BIND EVENT LISTENERS ---

    // 1. Search input event
    const searchInput = container.querySelector('#menu-search-input');
    searchInput.addEventListener('input', (e) => {
        state.set({ searchQuery: e.target.value });
    });
    // Keep focus at the end of input value
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);

    // 2. Category selection click events
    container.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.set({ activeCategory: tab.dataset.category });
        });
    });

    // 3. Add to Cart click events (Opens Modal)
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.id;
            const item = appState.menuItems.find(x => x.id === itemId);
            if (item) {
                selectedItemForModal = item;
                
                // Set modal values
                container.querySelector('#modal-item-name').innerText = item.name;
                container.querySelector('#modal-item-desc').innerText = item.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับอาหารจานนี้';
                container.querySelector('#item-notes-input').value = ""; // Reset notes

                // Open modal
                container.querySelector('#notes-modal').classList.add('show');
            }
        });
    });

    // 4. Modal actions
    const notesModal = container.querySelector('#notes-modal');
    
    // Close modal helper
    const closeModal = () => {
        notesModal.classList.remove('show');
        selectedItemForModal = null;
    };

    container.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);
    
    container.querySelector('#modal-confirm-btn').addEventListener('click', () => {
        if (selectedItemForModal) {
            const notes = container.querySelector('#item-notes-input').value.trim();
            state.addToCart(selectedItemForModal, notes);
            closeModal();
        }
    });

    // Close modal when clicking background overlay
    notesModal.addEventListener('click', (e) => {
        if (e.target === notesModal) closeModal();
    });
}
