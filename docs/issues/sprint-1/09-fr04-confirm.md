<!-- title: FR-04 logic/confirm.js: confirmStatus + สร้าง Dose + canConfirm (A5-T01…T03, T06) -->
<!-- labels: FR-04 · assignees: KaidangSuk · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** FR-04 ข้อ 1, 2, 5, 6, 8, 9 · BR-10, BR-12, BR-15, BR-20 · NFR-07 · architecture §5.1 (Dose, `confirmStatus`), §7.4
**ผู้รับผิดชอบ:** Nichanan
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 3 · **ต้องรอ:** issue สัญญากลาง · **ทำก่อน `mealState` ได้** (FR-03 เรียก `confirmStatus` จากไฟล์นี้)

## ขอบเขต `public/js/logic/confirm.js`
| ฟังก์ชัน | สัญญา |
|---|---|
| `confirmStatus(scheduledTime, confirmedAt)` | `confirmedAt ≤ scheduledTime + 15 นาที` → `'taken'` · ไม่เช่นนั้น `'taken_late'` (BR-20 — ใช้เวลาที่**กด** ไม่ใช่เวลาที่ข้อมูลมาถึง) |
| `doseId(meal)` | `${dateKey}_${HHMM}` เช่น `2026-11-02_0800` — id คงที่ = กดซ้ำไม่เกิดรายการใหม่ (BR-12) |
| `buildDose({ meal, scheduledTime, confirmedAt })` | `{ scheduledTime, confirmedAt, status }` — **ไม่ใส่** `serverReceivedAt` (repo/server ใส่) |
| `canConfirm(state)` | ใช้ผลจาก `mealState` (BR-15) — ไม่คำนวณหน้าต่างเวลาซ้ำเอง |

## เทสต์ `tests/confirm.test.js` (T = 08:00)
- [ ] A5-T01 08:14:59 → `taken` · A5-T02 08:15:00.000 → `taken` · A5-T03 08:15:00.001 / 08:15:01 / 08:40 → `taken_late`
- [ ] A5-T06 / TC-04.9 มี `serverReceivedAt` = 08:30 แต่ `confirmedAt` = 08:14 → `taken` (ห้ามใช้เวลามาถึง)
- [ ] TC-04.1 กด 08:03 → Dose `confirmedAt` = 08:03, `status` = `taken`
- [ ] TC-04.2 สร้าง Dose ซ้ำ → `doseId` เดิม (ร่วมกับเทสต์ `localRepo` ใน E-2 ว่าไม่ทับ)
- [ ] TC-04.5 กด 08:40 หลังพ้น T+15 → `taken_late`
- [ ] TC-04.6 พ้นมื้อถัดไป → `canConfirm` false (ใช้ state `missed`)
- [ ] TC-04.8 = A5-T02

## ทำเสร็จเมื่อ
- [ ] เทสต์ผ่าน · `npm run check` ผ่าน
- [ ] TRACEABILITY ช่อง Code/Test ของ FR-04 + `fr/FR-04-confirm/README.md` · AI log

## ไม่อยู่ใน issue นี้
หน้า S-02 + ยืนยันออฟไลน์จริง (TC-04.7 / MT-05 — issue หน้าจอ)
