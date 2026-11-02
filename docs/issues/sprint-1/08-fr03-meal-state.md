<!-- title: FR-03 logic/mealTimeline.js: mealState() + เทสต์ TC-03.1–5, TC-04.3 และขอบ T+15 -->
<!-- labels: FR-03 · assignees: IDK-SleepyBro · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** FR-03 ข้อ 1–5 · FR-04 ข้อ 3, 8 · BR-08, BR-11, BR-13, BR-15, BR-16, BR-18, BR-20 · NFR-01 · architecture §5.1, §7.3, §7.4
**ผู้รับผิดชอบ:** Rossatorn
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 3 · **ต้องรอ:** issue สัญญากลาง · **ผู้ใช้ผลลัพธ์:** FR-04, FR-05

## ขอบเขต `public/js/logic/mealTimeline.js`
`mealState({ now, meal, dose, nextMealStart, notYetLastRoundAt })` → `{ state, round, canConfirm, caregiverAlert }` ตามตารางกฎใน architecture §5.1 **ทุกแถว** — เวลาทั้งหมดเป็น ms · ห้ามเรียก `Date.now()`

แนะนำแยกฟังก์ชันเล็ก (อธิบายในสอบปากเปล่าง่าย): `minutes(n)`, `isConfirmed(dose)`, `currentRound(now, T)`, `inLateWindow(now, T, nextMealStart)` — ตรวจ `confirmedAt` ด้วย `confirmStatus` จาก `logic/confirm.js` (อย่าเขียนกฎ T+15 ซ้ำ 2 ที่)

## เทสต์ `tests/mealTimeline.test.js` (T = 08:00)
- [ ] TC-03.1 08:00 → `reminding`, round 0
- [ ] TC-03.2 08:05 → round 1 · 08:10 → round 2 · 08:14:59 → round 2 (ไม่มี round 3)
- [ ] TC-03.3 ยืนยันแล้ว → ไม่ใช่ `reminding`
- [ ] TC-03.4 มื้อ 06:45 กับ 07:00 — แต่ละมื้อคำนวณแยก ไม่รบกวนกัน (BR-16)
- [ ] TC-03.5 เปิดหน้า 08:07 → round 1 (ไม่ย้อนเล่น round 0)
- [ ] TC-04.3 กด "ยังไม่กิน" รอบ 0 → 08:05 ยังเตือน round 1
- [ ] ขอบ A5: `now` = 08:15:00.000 → ยัง `reminding` ไม่แจ้งผู้ดูแล · 08:15:00.001 → `not_confirmed` + alert
- [ ] TC-04.8 กดที่ 08:15:00.000 → `taken` (ไม่ใช่ `taken_late`)
- [ ] หน้าต่างย้อนหลัง: ก่อน `nextMealStart` → `canConfirm = true` · ถึง `nextMealStart` → `missed`, `canConfirm = false` · ไม่มีมื้อถัดไป → ถึง 23:59
- [ ] BR-11 `notYetLastRoundAt` → `caregiverAlert = 'not_confirmed'` ทันที

## ทำเสร็จเมื่อ
- [ ] เทสต์ผ่าน · `npm run check` ผ่าน
- [ ] TRACEABILITY ช่อง Code/Test ของ FR-03 + `fr/FR-03-reminder/README.md` · AI log

## ไม่อยู่ใน issue นี้
เสียง/หน้าจอ S-03 (issue แยก) · การจัดกลุ่มมื้อ (`groupMeals` — FR-02)
