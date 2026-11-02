<!-- title: E-2 core/clock.js + core/repo.js (localRepo ก่อน, firestoreRepo ตามมา) -->
<!-- labels: design · assignees: V31311 · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** ทุก FR (enabler) · NFR-01 (นาฬิกาจำลอง) · NFR-07 (ไม่ซ้ำ) · ADR-4, ADR-8 · architecture §5, §6
**ผู้รับผิดชอบ:** Takkan
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 3 · **ต้องรอ:** issue สัญญากลาง (signature) · E-1 เฉพาะส่วน `firestoreRepo`

## ทำไมต้องแยก 2 ขั้น
`logic/` ไม่ต้องใช้ repo เลย แต่หน้าจอและ Demo mode ต้องใช้ — ทำ `localRepo` (ในหน่วยความจำ) ให้ใช้ได้ก่อน ทุกคนต่อหน้าจอได้โดยไม่รอ Firebase (ความเสี่ยง R2)

## ขอบเขต
**ขั้น A (ทำก่อน — ไม่ต้องรอ E-1)**
- `public/js/core/clock.js` — `createClock({ start })` คืน `{ now(), advance(ms), set(ms) }` · ตัวจริงใช้ `Date.now()` **เฉพาะไฟล์นี้**
- `public/js/core/repo.js` — `localRepo`: เมธอดตาม operations ใน architecture §6.1 ที่ Increment 1 ใช้ (`setMealTimes`, `saveMedicine`, `confirmMeal`, `reportNotYet`, `markAlertSeen`, `watch…`) — เขียน JSDoc ทุกเมธอด
- `localRepo` ต้องจำลองกฎที่มีผลต่อ AC: Dose id เดิมเขียนซ้ำ → **ไม่ทับ** และถือว่าสำเร็จ (R-7, BR-12) · `alertSeen` สร้างได้ครั้งเดียว
- `tests/repo.test.js` — เทสต์ `localRepo` (ไม่ import Firebase)

**ขั้น B (หลัง E-1)**
- `public/js/core/firebase.js` + `firestoreRepo` เมธอดชื่อเดียวกับ `localRepo` · `serverReceivedAt` = `serverTimestamp()` · เปิด offline persistence

## ทำเสร็จเมื่อ
- [ ] `logic/` และ `features/` **ไม่ import** repo ตรง — รับผ่านพารามิเตอร์
- [ ] เทสต์ `localRepo`: ยืนยันซ้ำ = 1 Dose, `confirmedAt` เดิมไม่เปลี่ยน
- [ ] `npm run check` ผ่าน · Node 22 ไม่ต้อง `npm install`
- [ ] อัปเดต `docs/TRACEABILITY.md` (TC-04.2 ส่วน repo) + `fr/FR-01-pairing/README.md` + AI log

## ไม่อยู่ใน issue นี้
pairing (FR-01, Increment 2) · Security Rules
