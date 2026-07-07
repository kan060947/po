# ระบบสั่งอาหารร้านอาหารออนไลน์ & หลังบ้านพนักงาน (KAN)

ระบบเว็บแอปพลิเคชัน (Single Page Application) สำหรับร้านอาหารที่มีระบบสั่งอาหารออนไลน์ผ่านคิวอาร์โค้ดหรือเว็บ สำหรับลูกค้า และระบบจัดการหลังบ้านพนักงาน (คิวออร์ดอร์เรียบลไทม์, จัดการรายการเมนู, สรุปยอดขาย และพิมพ์ใบเสร็จ) ทำงานในแบบ **Light mode** สวยงามระดับพรีเมียม

---

## 📂 โครงสร้างโฟลเดอร์ของโปรเจกต์
```text
kan/
├── index.html            # โครงสร้างหลักของหน้าเว็บและโหลดไลบรารีผ่าน CDN
├── style.css             # ระบบดีไซน์สไตล์พรีเมียม Light Mode และการพิมพ์ใบเสร็จ
├── vercel.json           # การตั้งค่าสำหรับนำขึ้นเผยแพร่บน Vercel
├── README.md             # คู่มือการติดตั้งและเปิดใช้งาน (ไฟล์นี้)
└── js/
    ├── app.js            # ไฟล์เริ่มต้นแอปพลิเคชัน (Bootstrap)
    ├── config.js         # ตั้งค่าเชื่อมต่อ Supabase และเมนูอาหารจำลอง (Mock)
    ├── db.js             # ตัวเชื่อมต่อฐานข้อมูล Supabase / ตัวจำลองในบราวเซอร์
    ├── state.js          # จัดการข้อมูลและการนำทางภายในแอป (Reactive State)
    ├── router.js         # ระบบสลับหน้าอัตโนมัติ (Router)
    └── components/       # ส่วนประกอบหน้าจอการทำงานต่างๆ
        ├── header.js         # แถบเมนูด้านบนและตะกร้าอาหารสไลด์ด้านข้าง
        ├── menu.js           # หน้ารายการเมนูอาหารและการค้นหาของลูกค้า
        ├── tracking.js       # หน้าติดตามสถานะอาหารแบบเรียลไทม์
        ├── adminLogin.js     # หน้าเข้าสู่ระบบของพนักงานและตั้งค่าฐานข้อมูล
        ├── adminDashboard.js # หน้าบอร์ดจัดการคิวออเดอร์สดของพนักงาน
        ├── adminMenu.js      # หน้าเพิ่ม/ลบ/แก้ไขเมนูอาหารหลังบ้าน
        ├── adminAnalytics.js # หน้ารายงานยอดขายและสถิติเมนูขายดี
        └── receipt.js        # เทมเพลตใบเสร็จเครื่องพิมพ์ความร้อน (Thermal Receipt)
```

---

## 🚀 1. การใช้งานเบื้องต้นในเครื่องของคุณ (Local)
เนื่องจากระบบเขียนขึ้นด้วย **Modern Javascript (ES Modules)** โดยไม่มีการใช้ Build Tools ทำให้สามารถใช้งานและทดสอบได้ง่ายดายมาก:
- **วิธีเปิดใช้งาน**:
  1. ดับเบิลคลิกเปิดไฟล์ `index.html` บนบราวเซอร์ของคุณได้ทันที หรือ
  2. ใช้ส่วนขยาย (Extension) เช่น **Live Server** ใน VS Code หรือ
  3. รันผ่านคอมมานด์ไลน์โดยเปิดโฟลเดอร์นี้แล้วพิมพ์ `npx serve` เพื่อรันเซิร์ฟเวอร์จำลอง
- **การทดสอบโหมดจำลอง (Mock Mode)**:
  - ระบบจะตรวจพบว่ายังไม่ใส่ข้อมูล Supabase และเข้าสู่โหมดจำลองให้อัตโนมัติ โดยบันทึกข้อมูลทั้งหมดลงใน Browser (LocalStorage) ทำให้คุณสามารถสั่งอาหาร เพิ่มเมนู และอัปเดตสถานะได้ทันที
  - **รหัสพนักงานสำหรับเข้าหลังบ้าน (เมื่ออยู่ในโหมดจำลอง)**:
    - **อีเมล:** `admin@kan.com`
    - **รหัสผ่าน:** `admin1234`

---

## 🗄️ 2. การเชื่อมต่อกับฐานข้อมูล Supabase
เพื่อให้ข้อมูลสั่งอาหารและเมนูอัปเดตเป็นแบบออนไลน์จริง:
1. เข้าไปที่ [Supabase.com](https://supabase.com) แล้วสร้างโปรเจกต์ใหม่ฟรี
2. ไปที่เมนู **SQL Editor** บน Supabase แล้วนำโค้ด SQL ด้านล่างนี้ไปวางและรันเพื่อสร้างตารางข้อมูล:

```sql
-- 1. สร้างตารางเมนูอาหาร (menu_items)
CREATE TABLE menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    category TEXT NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. สร้างตารางคำสั่งซื้อ (orders)
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    total_amount NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. สร้างตารางรายละเอียดคำสั่งซื้อ (order_items)
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    price_at_purchase NUMERIC NOT NULL
);

-- 4. ใส่ข้อมูลเมนูอาหารตั้งต้น (Mock Menu)
INSERT INTO menu_items (name, description, price, image_url, category, is_available) VALUES
('ข้าวกะเพราหมูสับไข่ดาว', 'กะเพราหมูสับรสจัดจ้าน เสิร์ฟพร้อมข้าวสวยร้อนๆ และไข่ดาวกรอบ', 69.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60', 'อาหารจานเดียว', true),
('ผัดไทยกุ้งสด', 'เส้นจันท์เหนียวนุ่ม ผัดกับกุ้งสดตัวโต เครื่องเคียงครบครัน', 89.00, 'https://images.unsplash.com/photo-1626804475315-9644b37a2fc4?w=500&auto=format&fit=crop&q=60', 'อาหารจานเดียว', true),
('ต้มยำกุ้งน้ำข้น', 'ต้มยำกุ้งรสเข้มข้น หอมสมุนไพรไทย ข่า ตะไคร้ ใบมะกรูด', 159.00, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=500&auto=format&fit=crop&q=60', 'กับข้าว', true),
('ปีกไก่ทอดเกลือ', 'ปีกไก่ทอดกรอบๆ เค็มกำลังดี ทานคู่กับน้ำจิ้มแจ่วสูตรเด็ด', 79.00, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60', 'ทานเล่น', true),
('ส้มตำไทย', 'ส้มตำมะละกอรสชาติเปรี้ยวหวาน เผ็ดกำลังดี โรยถั่วลิสงคั่วหอมๆ', 55.00, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500&auto=format&fit=crop&q=60', 'ทานเล่น', true),
('บิงซูมะม่วง', 'น้ำแข็งไสนมสไตล์เกาหลี ราดซอสมะม่วงเข้มข้น และเนื้อมะม่วงน้ำดอกไม้สุก', 129.00, 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=60', 'ของหวาน', true),
('ชาไทยเย็น', 'ชาไทยชงสด รสชาติเข้มข้น หอมหวานมัน ท็อปด้วยฟองนมนุ่มๆ', 45.00, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60', 'เครื่องดื่ม', true);
```

3. เมื่อรันสำเร็จแล้ว ให้คัดลอก **Project URL** และ **API Key (anon/public)** จากแท็บ Settings > API บน Supabase
4. **นำมาเชื่อมต่อในแอปพลิเคชัน**:
   - วิธีที่ 1 (แนะนำ): เข้าไปที่หน้าล็อกอินพนักงาน `#/admin/login` บนหน้าเว็บ จะมีเมนู **"ตั้งค่าเชื่อมต่อฐานข้อมูล Supabase"** ด้านล่าง สามารถวาง URL และ Key และกดบันทึกเพื่อใช้งานได้ทันที (ข้อมูลจะเซฟในคอมพิวเตอร์เครื่องนั้นๆ)
   - วิธีที่ 2 (ถาวร): แก้ไขตัวแปร `DEFAULT_SUPABASE_URL` และ `DEFAULT_SUPABASE_ANON_KEY` ในไฟล์ `js/config.js` ให้เป็นค่าของคุณ

---

## 🐙 3. การเก็บข้อมูลขึ้น GitHub (Repository: kan)
วิธีการอัปโหลดโค้ดนี้ไปยัง GitHub ของคุณ:
1. เปิดแอปพลิเคชัน **Terminal / Command Prompt / Git Bash** ในเครื่องคอมพิวเตอร์ของคุณ
2. เข้าไปยังโฟลเดอร์โปรเจกต์นี้:
   ```bash
   cd c:\kan
   ```
3. เริ่มต้นระบุความเป็นเจ้าของ Git และแอดไฟล์ทั้งหมด:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Restaurant web application with admin panel"
   ```
4. ไปที่เว็บไซต์ GitHub แล้วกดสร้าง Repository ใหม่ ตั้งชื่อว่า `kan` (ไม่ต้องกดสร้างไฟล์ README หรือ .gitignore บน GitHub)
5. คัดลอกลิงก์ repository มาแล้วสั่งรันบนคอมมานด์ไลน์ของคุณ:
   ```bash
   git remote add origin https://github.com/<ชื่อผู้ใช้-githubของคุณ>/kan.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚡ 4. การเผยแพร่หน้าเว็บขึ้น Vercel
เมื่อนำโค้ดขึ้น GitHub เรียบร้อยแล้ว สามารถนำขึ้นออนไลน์ได้ทันทีผ่าน Vercel (ฟรี 100%):
1. สมัครใช้งานหรือเข้าสู่ระบบที่ [Vercel.com](https://vercel.com)
2. กดปุ่ม **Add New > Project**
3. ล็อกอินผ่านสิทธิ์ GitHub และเลือก Repository ที่ชื่อว่า **`kan`** แล้วกดปุ่ม **Import**
4. ในหน้ารายละเอียดการ Build ไม่จำเป็นต้องกรอก Build Command (เนื่องจากเป็น Static HTML/JS) ให้กดปุ่ม **Deploy** ได้ทันที
5. ระบบ Vercel จะเริ่มทำการนำโปรเจกต์ขึ้นออนไลน์ในเวลาไม่กี่วินาที และแสดงปล่อยลิงก์สาธารณะ (เช่น `https://kan-restaurant.vercel.app`)
6. คุณสามารถนำลิงก์นี้ไปให้ลูกค้าสแกนเพื่อสั่งอาหาร และให้พนักงานเปิดเข้าหน้าร้านในไอแพดหรือหน้าจอคอมพิวเตอร์เพื่อจัดการร้านได้ทันที!
