<!-- title: FR-05 logic/status.js: alertFor + dailyStatus + ข้อความถึงผู้ดูแล (TC-05.1–9, A5-T04/T05/T07) -->
<!-- labels: FR-05 · assignees: Khaiwann · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** FR-05 ข้อ 1–9 · FR-04 ข้อ 4 · BR-11, BR-13, BR-14, BR-18, BR-20 · NFR-01 · architecture §7.4
**ผู้รับผิดชอบ:** Suchitra
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 3 · **ต้องรอ:** issue สัญญากลาง (signature + ตารางแปลงป้าย) · ใช้ `mealState` จาก FR-03

## ขอบเขต `public/js/logic/status.js`
- `alertFor(...)` — signature ตามที่ตกลงใน issue สัญญากลาง · คืนการแจ้งเฉพาะชนิดที่ยังไม่อยู่ใน `seenKinds` (ไม่แจ้งซ้ำ BR-13)
- `dailyStatus(...)` — ทุกมื้อของวัน เรียงเวลา · ไม่มีมื้อ → `[]` (หน้าจอแสดง "วันนี้ไม่มีมื้อยา")
- `messageFor(kind, confirmedAt)` — ข้อความตาม SRS **เท่านั้น**:
  - `not_confirmed` → "ยังไม่ยืนยันการกินยา" / "Medicine not yet confirmed"
  - `confirmed_late` → "ยืนยันการกินยาแล้ว เวลา HH:MM" / "Medicine confirmed at HH:MM"
  - **ห้ามมีคำว่า "ไม่ได้กิน" / "not taken"** ทุกที่

## เทสต์ `tests/status.test.js` (T = 08:00)
- [ ] TC-05.1 ยืนยัน 08:12 → 08:15 ไม่แจ้ง
- [ ] TC-05.2 / A5-T07 ไม่มี Dose, `now` = 08:15:00.001 → แจ้ง `not_confirmed` · ตรวจว่าข้อความไม่มี "not taken"
- [ ] TC-05.3 4 ป้ายครบ · TC-05.4 ไม่มีมื้อ → `[]`
- [ ] TC-05.5 / TC-04.4 กด "ยังไม่กิน" รอบ 08:10 → แจ้งทันที · 08:15 ไม่แจ้งซ้ำ
- [ ] TC-05.6 ยืนยันช้า 08:40 → "ยืนยันการกินยาแล้ว เวลา 08:40"
- [ ] TC-05.7 เปิดหน้า 09:00 → แจ้งที่ยังไม่เห็นแสดง (BR-18)
- [ ] TC-05.8 / A5-T04 กดที่ 08:15:00.000 และข้อมูลถึงก่อนประเมิน → ไม่แจ้ง
- [ ] TC-05.9 / A5-T05 แจ้งไปแล้ว 08:16 แล้ว Dose `confirmedAt` 08:14 มาถึง 08:20 → แทนที่ด้วย "ยืนยันแล้ว เวลา 08:14" · ไม่สร้างแจ้งใหม่
- [ ] NFR-01 นาฬิกาจำลอง: แจ้งภายใน 5 วินาทีหลัง T+15 (ทดสอบค่า `now` = T+15+1ms และ T+15+5s)

## ทำเสร็จเมื่อ
- [ ] เทสต์ผ่าน · `npm run check` ผ่าน
- [ ] TRACEABILITY ช่อง Code/Test ของ FR-05 + `fr/FR-05-caregiver-status/README.md` · AI log
