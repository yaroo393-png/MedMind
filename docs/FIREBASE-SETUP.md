# ตั้งค่า Firebase ของ MedMind (ใช้งานจริง)

> โปรเจกต์: `medmind-12eb2` (แพ็ก **Spark ฟรี — ห้ามผูกบัตร / ห้ามอัปเกรด Blaze**) · เจ้าของ: Yar (PM) · ผู้ดูแลส่วน core/Rules: Takkan
> ค่า `firebaseConfig` อยู่ใน `public/js/core/firebase.js` — เป็นค่าสาธารณะ commit ได้ (RULES §3) ความปลอดภัยมาจาก `firestore.rules`

## 1. ที่ตั้งไว้แล้วในคอนโซล (7 พ.ย. 2569)
- [x] สร้างโปรเจกต์ + เว็บแอป `medmind-web` (ไม่ใช้ Firebase Hosting — ใช้ GitHub Pages)
- [x] Firestore Database: Standard edition · `asia-southeast1` · Production mode (ไม่ใช้ backup — ต้องใช้ Blaze)
- [x] Authentication → Anonymous: Enable · Authorized domains: `yaroo393-png.github.io`
- [x] AI Logic → Gemini Developer API (ปิด AI monitoring)
- [ ] **วาง Security Rules (ข้อ 2) — ต้องทำก่อนใช้ ไม่เช่นนั้นแอปอ่าน/เขียนอะไรไม่ได้เลย**

## 2. วาง Security Rules (ทำครั้งเดียว และทุกครั้งที่ `firestore.rules` เปลี่ยน)
1. ตรวจว่าเทสต์ Rules ผ่าน: CI งาน `emulator` เขียว (หรือรันเองตามข้อ 4)
2. คอนโซล → Firestore Database → แท็บ **Rules** → ลบของเดิมทั้งหมด → คัดลอกเนื้อหา `firestore.rules` ทั้งไฟล์มาวาง → **Publish**
3. ห้ามแก้ Rules ในคอนโซลโดยตรง — แก้ที่ไฟล์ใน repo + เทสต์ก่อนเสมอ

## 3. ใช้งานบนมือถือ (หลัง Pages เผยแพร่)
- มือถือผู้สูงอายุ: `https://yaroo393-png.github.io/MedMind/` (ลิงก์เดียว) → หน้าแรก (มาสคอตเมล็ดพีช) → "เริ่มใช้งาน" → เลือก "ผู้สูงอายุ" → กดยินยอม → แสดง QR + รหัส 6 หลัก
- มือถือผู้ดูแล: กด "สแกน QR ด้วยกล้อง" ในแอป (อนุญาตกล้อง · อ่านด้วย jsQR บนเครื่อง ไม่ส่งภาพออก) หรือสแกนด้วยแอปกล้องของมือถือ (เปิด `index.html?code=…` → เข้าหน้าผู้ดูแลและเติมรหัสให้ · ถ้าเปิดลิงก์ตรง ๆ ให้เลือก "ผู้ดูแล" · เครื่องจำบทบาทไว้ เลือกใหม่ที่ `?choose=1` · ติดตั้งเป็นแอป: Android Chrome เมนู ⋮ → "ติดตั้งแอป/เพิ่มลงหน้าจอหลัก" · iPhone Safari ปุ่มแชร์ → "เพิ่มลงหน้าจอโฮม" (PWA — เปิดเต็มจอ มีไอคอน)) → เชื่อมต่อ → ตั้งเวลามื้อ → เพิ่มยาจากฉลาก
- **ฉลากที่ใช้ทดสอบต้องปิดชื่อ HN QR และบาร์โค้ดก่อนกด "ส่งให้ AI" ทุกครั้ง** — ห้ามส่ง/แชร์รูปฉลากที่ยังเห็นข้อมูลผู้ป่วย (RULES §3, BR-19)
- ผลทดสอบกรอกใน `docs/02-design/prototypes/2569-11-04/TEST-CHECKLIST.md` ส่วน G และ `docs/TRACEABILITY.md` (MT-01, 02, 05, 06, 09, 11, 13)

## 4. รันเทสต์ Rules + firestoreRepo บนเครื่อง (ต้องมี Java 21)
```bash
cd emulator-tests
npm install
npm test
```
ใช้โปรเจกต์ `demo-medmind` ของ Emulator — ไม่แตะข้อมูลจริง · CI รันให้ทุก PR (งาน `emulator` ใน `.github/workflows/ci.yml`)

## 5. ข้อควรรู้
- **โมเดล AI:** `AI_MODEL` ใน `public/js/services/aiLabel.js` (`gemini-2.5-flash`) — ถ้าคอนโซล AI Logic แจ้งว่าเลิกใช้ ให้เปลี่ยนที่นี่ที่เดียว
- **App Check (ต้องตั้ง — Firebase AI Logic บังคับ):** ลงทะเบียนแอป `medmind-wep` ด้วย reCAPTCHA Enterprise (คีย์สร้างใน Google Cloud โปรเจกต์ `medmind-12eb2` · Website · โดเมน `yaroo393-png.github.io` · ฟรี 10,000 ครั้ง/เดือน ไม่ผูกบัตร) แล้ววาง Site key ใน Firebase → App Check → Apps · โค้ดส่งโทเคนใน `core/firebase.js` (`APP_CHECK_SITE_KEY` เป็นค่าสาธารณะ) · ไม่ตั้ง = คำขอ AI ถูกปฏิเสธ 401 "App Check token is invalid" แอปขึ้น "AI ใช้ไม่ได้" · Firestore/Auth ยัง Unenforced
- **โควตาฟรี:** Firestore อ่าน 50,000 / เขียน 20,000 ครั้งต่อวัน · แอปอ่านจากสำเนาในเครื่อง (onSnapshot) ไม่ได้อ่านซ้ำทุกวินาที · AI มีโควตาต่อนาที/ต่อวัน — หมดแล้วแอปบอกเหตุผลและเปิดฟอร์มกรอกเอง (FR-02 ข้อ 5)
- **ยกเลิกจับคู่** ลบยา ประวัติ การแจ้ง และรหัส ของคู่นั้นทั้งหมด (BR-17) — กู้คืนไม่ได้
