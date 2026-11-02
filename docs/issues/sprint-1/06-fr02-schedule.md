<!-- title: FR-02 logic/schedule.js: validateSlot, reminderTime, groupMeals + เทสต์ A1-T01…T06 -->
<!-- labels: FR-02 · assignees: yaroo393-png · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** FR-02 ข้อ 7, 10, 11 · FR-03 ข้อ 6 · BR-05, BR-06, BR-07 · A1-T01…T06 · architecture §5.2
**ผู้รับผิดชอบ:** Yar Oo
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 3 · **ผู้ใช้ผลลัพธ์:** FR-03 (`mealState` รับ Meal จากไฟล์นี้)

## ขอบเขต
`public/js/logic/schedule.js` — ฟังก์ชันล้วน (ห้ามแตะ DOM / Firebase / `Date.now()`):
| ฟังก์ชัน | สัญญา (architecture §5.2) |
|---|---|
| `validateSlot(slot)` | คืน `null` ถ้าถูก หรือเหตุผล: `invalid_meal`, `invalid_timing`, `minutesBefore_required`, `invalid_tablets`, `meal_timing_mismatch` |
| `reminderTime(slot, mealTimes)` | `'HH:MM'` ตาม BR-06: หลังอาหาร = เวลามื้อ · ก่อนอาหาร N = เวลามื้อ − N · ก่อนนอน = bedtime |
| `groupMeals(medicines, mealTimes, dateKey)` | `{ meals, skipped }` · จัดกลุ่มด้วย reminderTime **เท่านั้น** · เรียงเวลา · slot ซ้ำใส่ครั้งเดียว (`duplicate_slot`) · เวลาเดียวกันเม็ดต่าง → `conflicting_tablets` · **ไม่ throw ไม่เดา** |

## เทสต์ `tests/schedule.test.js` (ชื่อเทสต์ขึ้นต้นด้วยรหัส)
- [ ] TC-02.7 ก่อนอาหารเช้า 30 นาที, เช้า 07:00 → 06:30
- [ ] A1-T01 ยา 1 ตัว 3 slot → 3 มื้อ 07:00/12:00/18:00 จำนวนเม็ด 1/1/2
- [ ] A1-T02 สองยาเวลาตรงกัน → 1 มื้อ
- [ ] A1-T03 เวลาต่างกัน → 2 มื้อ เรียงเวลา
- [ ] A1-T04 เม็ดต่อ slot ต่างกัน ไม่รวมกัน
- [ ] A1-T05 (a)–(e) slot ผิด → อยู่ใน `skipped` พร้อมเหตุผล
- [ ] A1-T06 slot ซ้ำ → ยาอยู่ในมื้อครั้งเดียว
- [ ] TC-03.6 (FR-03 ข้อ 6) ตัวอย่าง A/B/C ใน AC
- [ ] ขอบ: ก่อนอาหาร 30 นาทีจากมื้อ 00:15 (ข้ามเที่ยงคืน) — **ถ้า SRS ไม่ระบุ ให้รายงานใน `skipped` และเปิดคำถามในทีม ห้ามเดา**

## ทำเสร็จเมื่อ
- [ ] เทสต์ทุกข้อผ่าน · `npm run check` ผ่าน
- [ ] อัปเดต `docs/TRACEABILITY.md` (FR-02 ข้อ 7 ช่อง Code ให้ชี้ `logic/schedule.js` ซึ่งตอนนี้ชี้ผิดเป็น `labelDraft.js`) + `fr/FR-02-label-scan/README.md` + AI log
