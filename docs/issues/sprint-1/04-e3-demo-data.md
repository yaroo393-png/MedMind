<!-- title: E-3 ข้อมูลตัวอย่างคู่ทดสอบ core/demoData.js -->
<!-- labels: test · assignees: KaidangSuk · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** ทุก FR (enabler) · ADR-8 (Demo mode) · architecture §11 (คู่ทดสอบ Increment 1) · A1-T01…T06
**ผู้รับผิดชอบ:** Nichanan
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 2 · **ต้องรอ:** issue สัญญากลาง

## ทำไมต้องมี
เทสต์ของทุกคนและ Demo mode ต้องใช้ข้อมูลชุดเดียวกัน — ถ้าแต่ละคนสร้างยา/เวลามื้อเอง ผลจะเทียบกันไม่ได้

## ขอบเขต
`public/js/core/demoData.js` — export ข้อมูล**สมมติ**ล้วน (ห้ามชื่อ/HN จริง — NFR-09):
- `mealTimes`: `{ breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' }`
- `medicines`: รูปตาม Medicine + `slots[]` ใน architecture §5.1 ครอบกรณี
  - ยา 1 ตัว 3 slot จำนวนเม็ดต่างกัน (A1-T01, A1-T04)
  - 2 ยาเวลาเตือนตรงกัน (A1-T02) · ก่อนอาหาร 30 นาที (A1-T03, FR-02 ข้อ 7)
  - มื้อซ้อน 06:45 / 07:00 (FR-03 ข้อ 4)
- `labelDrafts`: JSON ตัวอย่างที่ "AI คืน" สำหรับ Demo mode — 1 ใบอ่านครบ, 1 ใบมีช่อง null, 1 ใบยาเมื่อมีอาการ (FR-02 ข้อ 3, 4)
- ฟังก์ชันคืนสำเนาใหม่ทุกครั้ง (`structuredClone`) กันเทสต์แก้ข้อมูลกันเอง

## ทำเสร็จเมื่อ
- [ ] `tests/demoData.test.js`: ทุกยามี slot ≥ 1 · ทุก slot ผ่านรูปแบบ §5.1 (เว้นใบที่ตั้งใจให้ผิด และระบุไว้ในคอมเมนต์)
- [ ] ไม่มีข้อมูลส่วนตัวจริง · `npm run check` ผ่าน
- [ ] อัปเดต `fr/FR-04-confirm/README.md` (ความคืบหน้า) + AI log

## ไม่อยู่ใน issue นี้
หน้า `demo.html` (E-5 — issue แยก)
