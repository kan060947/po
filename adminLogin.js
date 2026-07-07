import { state } from '../state.js';
import { db } from '../db.js';
import { getConfig, saveConfig } from '../config.js';

export function renderAdminLoginPage(container, appState) {
    const config = getConfig();

    let html = `
        <div class="login-container">
            <div class="login-header">
                <a href="#/" style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
                    <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
                    <span>กลับสู่หน้าหลักลูกค้า</span>
                </a>
                <h2>เข้าสู่ระบบพนักงาน</h2>
                <p>จัดการออเดอร์ ข้อมูลเมนูอาหาร และดูรายงานหลังร้าน</p>
            </div>
            
            <form id="admin-login-form">
                <div class="form-group">
                    <label class="form-label" for="login-email">อีเมลพนักงาน</label>
                    <input type="email" id="login-email" class="form-input" required placeholder="เช่น staff@kan.com">
                </div>
                <div class="form-group">
                    <label class="form-label" for="login-password">รหัสผ่าน</label>
                    <input type="password" id="login-password" class="form-input" required placeholder="••••••••">
                </div>
                <button type="submit" id="login-submit-btn" class="btn-primary" style="margin-top: 10px;">
                    เข้าสู่ระบบ
                </button>
            </form>
            
            ${config.isMock ? `
                <div style="background-color: var(--primary-light); color: var(--primary-hover); border-radius: var(--radius-sm); padding: 12px; margin-top: 20px; font-size: 13px;">
                    <i data-lucide="info" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>
                    <span><b>โหมดทดลองใช้ (Mock Db):</b> ใช้เมล <code>admin@kan.com</code> รหัส <code>admin1234</code> ในการเข้าสู่ระบบ</span>
                </div>
            ` : ''}

            <!-- Supabase settings manager panel -->
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border-color);">
                <details ${config.isMock ? 'open' : ''}>
                    <summary style="font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text-muted); padding: 8px 0; outline: none; display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="database" style="width: 14px; height: 14px;"></i>
                        <span>ตั้งค่าเชื่อมต่อฐานข้อมูล Supabase</span>
                    </summary>
                    <div style="margin-top: 16px;">
                        <div class="form-group">
                            <label class="form-label" style="font-size: 12px;" for="db-url">Supabase URL</label>
                            <input type="text" id="db-url" class="form-input" style="font-size: 13px; padding: 10px 12px;" placeholder="https://your-project.supabase.co" value="${config.supabaseUrl}">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="font-size: 12px;" for="db-key">Supabase Anon Key</label>
                            <input type="password" id="db-key" class="form-input" style="font-size: 13px; padding: 10px 12px;" placeholder="eyJhbGciOi..." value="${config.supabaseAnonKey}">
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="save-db-config" class="btn-small btn-small-primary" style="flex-grow: 1; justify-content: center; padding: 10px;">
                                บันทึกและรีโหลด
                            </button>
                            ${config.supabaseUrl ? `
                                <button id="reset-db-config" class="btn-small btn-small-secondary" style="color: var(--danger); border-color: var(--danger-light); padding: 10px;">
                                    รีเซ็ตเป็น Mock
                                </button>
                            ` : ''}
                        </div>
                        <div class="config-help">
                            * ข้อมูลเชื่อมต่อจะบันทึกไว้ใน Browser (LocalStorage) ของคุณ ปลอดภัย 100% และเว็บจะเปลี่ยนไปดึง/เขียนกับฐานข้อมูล Supabase โดยตรงทันที
                        </div>
                    </div>
                </details>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // --- BIND EVENT LISTENERS ---

    // 1. Submit login
    const form = container.querySelector('#admin-login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = container.querySelector('#login-email').value.trim();
        const password = container.querySelector('#login-password').value;
        const submitBtn = container.querySelector('#login-submit-btn');

        submitBtn.disabled = true;
        submitBtn.innerText = "กำลังตรวจสอบข้อมูล...";

        try {
            const { data, error } = await db.login(email, password);
            if (error) throw new Error(error.message);

            state.showToast("เข้าสู่ระบบพนักงานสำเร็จ!");
            state.set({ user: data.user });
            state.navigate('/admin');
        } catch (err) {
            console.error("Login error:", err);
            state.showToast(err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerText = "เข้าสู่ระบบ";
        }
    });

    // 2. Save db config
    container.querySelector('#save-db-config').addEventListener('click', () => {
        const url = container.querySelector('#db-url').value;
        const key = container.querySelector('#db-key').value;

        if (!url || !key) {
            state.showToast("กรุณากรอกทั้ง URL และ Anon Key ของ Supabase", "error");
            return;
        }

        saveConfig(url, key);
        state.showToast("บันทึกการตั้งค่าแล้ว ระบบกำลังรีโหลด...");
    });

    // 3. Reset db config if button exists
    const resetBtn = container.querySelector('#reset-db-config');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            saveConfig("", "");
            state.showToast("รีเซ็ตเป็นโหมดจำลองเรียบร้อยแล้ว...");
        });
    }

    if (window.lucide) window.lucide.createIcons();
}
