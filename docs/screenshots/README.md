# ภาพหน้าจอ — MedMind

> **คำแนะนำ:** ภาพทั้งหมดต้องใช้**ข้อมูลสมมติเท่านั้น** ห้ามมีชื่อ/HN/ข้อมูลผู้ป่วยจริง (PDPA)

## ภาพที่ต้องมี (จาก `demo.html` หรือต้นแบบ)

### 1. หน้าจับคู่ (FR-01)
- `01-pairing-senior.png` — ผู้สูงอายุยินยอม + แสดง QR
- `01-pairing-caregiver.png` — ผู้ดูแลสแกน QR

### 2. หน้าเพิ่มยา (FR-02)
- `02-add-medicine.png` — อัปโหลดฉลาก (ปิดชื่อ/HN แล้ว)
- `02-draft-edit.png` — แก้ร่างจาก AI

### 3. หน้าเตือน (FR-03)
- `03-reminder.png` — เตือนทุกมื้อ + รายการยา

### 4. หน้ายืนยัน (FR-04)
- `04-confirm.png` — ปุ่มยืนยันทั้งมื้อ

### 5. หน้าสถานะผู้ดูแล (FR-05)
- `05-caregiver-status.png` — สถานะรายวัน + แจ้งเตือน

### 6. Demo mode
- `06-demo-mode.png` — 2 จอคู่กัน พร้อมนาฬิกาจำลอง

---

## วิธีจับภาพหน้าจอ

### จาก `demo.html` (แนะนำ)

1. เปิด `public/demo.html` ในเบราว์เซอร์
2. กด F12 → เลือก "Toggle device toolbar" (Ctrl+Shift+M)
3. เลือกขนาด "iPhone 13" หรือ "Responsive"
4. จับภาพแต่ละหน้าจอ (Windows: Win+Shift+S, Mac: Cmd+Shift+4)
5. บันทึกเป็น PNG ใส่โฟลเดอร์นี้

### จากต้นแบบ M3

เปิด `docs/02-design/prototypes/2569-11-04/index.html` แล้วทำเหมือนข้างบน

---

## ตัวอย่างคำสั่ง

```bash
# จับภาพด้วย Playwright (ถ้าติดตั้งแล้ว)
npx playwright screenshot public/demo.html docs/screenshots/06-demo-mode.png
```

---

**เมื่อเพิ่มภาพเสร็จ:** อย่าลืม commit ด้วยบัญชีตัวเอง

```bash
git add docs/screenshots/*.png
git commit -m "docs: เพิ่มภาพหน้าจอ 6 ภาพ (ข้อมูลสมมติ)"
```
