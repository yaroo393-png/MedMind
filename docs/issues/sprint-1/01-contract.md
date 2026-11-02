<!-- title: ตกลงสัญญากลางของ logic: mealState / confirmStatus / alertFor / dailyStatus (FR-03, FR-04, FR-05) -->
<!-- labels: design · assignees: IDK-SleepyBro, KaidangSuk, Khaiwann · milestone: Increment 0 — เอกสารและโครง repo -->

**FR / AC:** FR-03 (ทุกข้อ) · FR-04 ข้อ 1–9 · FR-05 ข้อ 1–9 · BR-08, BR-11, BR-13, BR-14, BR-15, BR-18, BR-20
**ผู้รับผิดชอบ:** Rossatorn (เจ้าของ `mealState`) — ร่วมกับ Nichanan (FR-04) และ Suchitra (FR-05)
**Milestone:** Increment 0 · **ขนาด (เสนอ):** 1 · **ต้องเสร็จก่อน:** issue FR-03, FR-04, FR-05 ทุกใบ

## ทำไมต้องมี issue นี้
3 ไฟล์ logic (`mealTimeline.js`, `confirm.js`, `status.js`) เรียกกันเป็นทอด ถ้าแต่ละคนเดา signature เอง โค้ดจะต่อกันไม่ได้ (ความเสี่ยง R6 ใน `docs/PROJECT-PLAN.md`) · `architecture.md` §5.1 กำหนด `mealState` และ `confirmStatus` แล้ว แต่ **`alertFor` และ `dailyStatus` ยังไม่มี signature** และ **ยังไม่มีกฎแปลง `state` 6 ค่าเป็นป้ายสถานะ 4 แบบของ BR-14**

## ต้องตัดสิน (บันทึกผลใน `docs/01-requirements/decision-log.md` — ไม่ใช่ requirement จนกว่าจะอนุมัติ)
1. **Signature ของ `alertFor`** — ข้อเสนอ: `alertFor({ now, meal, dose, nextMealStart, notYetLastRoundAt, seenKinds })` → `null | { kind: 'not_confirmed' | 'confirmed_late', text }` (เรียก `mealState` ภายใน, ไม่คืนชนิดที่อยู่ใน `seenKinds` — architecture §7.4)
2. **Signature ของ `dailyStatus`** — ข้อเสนอ: `dailyStatus({ now, meals, dosesByMealId, nextMealStartOf })` → `[{ mealId, reminderTime, label, time }]` หรือ `[]` เมื่อไม่มีมื้อ (FR-05 ข้อ 4)
3. **แปลง `state` → ป้าย BR-14** — ข้อเสนอ (ทีมตัดสิน):

   | `state` | ป้าย | หมายเหตุ |
   |---|---|---|
   | `not_due` | Not due yet / ยังไม่ถึงเวลา | |
   | `reminding` | Not yet confirmed / ยังไม่ยืนยัน | **ไม่มีแถบแจ้งเตือน** จนพ้น T+15 (BR-13) — ใช้ "ยังไม่ถึงเวลา" ไม่ได้เพราะถึงเวลาแล้วจริง |
   | `taken` | Taken + HH:MM | |
   | `taken_late` | Taken (late confirmation) + HH:MM | |
   | `not_confirmed` | Not yet confirmed | + แถบแจ้งเตือนครั้งเดียว |
   | `missed` | Not yet confirmed | กดยืนยันไม่ได้ (FR-04 ข้อ 6) · ห้ามใช้คำว่า "พลาด/ไม่ได้กิน" |
4. **ใครเขียนเทสต์ข้ามไฟล์:** TC-04.3 อยู่ใน `mealTimeline.test.js` (Rossatorn) · TC-04.4 อยู่ใน `status.test.js` (Suchitra) — ข้อเสนอ: เจ้าของไฟล์เทสต์เขียน, Nichanan รีวิว
5. **รูปแบบเวลา:** ทุกฟังก์ชันรับ/คืนเวลาเป็น ms (ตาม §5.1) · ข้อความ HH:MM สร้างใน UI เท่านั้น

## ทำเสร็จเมื่อ
- [ ] ประชุม ≤ 30 นาที ครบ 3 คน (หรือคอมเมนต์ตกลงใน issue นี้)
- [ ] ผลข้อ 1–5 บันทึกใน `decision-log.md` (สถานะ ✅ + ผู้รับรอง)
- [ ] signature ที่ตกลงเพิ่มใน `docs/02-design/architecture.md` §5.1 ผ่าน PR (ไฟล์ส่วนรวม — แจ้งทีม)
- [ ] ถ้าข้อ 3 ต้องเพิ่มข้อความใน SRS → **หยุด** แล้วเสนอ PM ก่อน (SRS v1.4 ล็อกแล้ว — DL-15)

## ไม่อยู่ใน issue นี้
เขียนโค้ด · หน้าจอ
