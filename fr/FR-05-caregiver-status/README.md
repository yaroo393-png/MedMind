# FR-05 — Caregiver alert and daily status

| | |
|---|---|
| **ผู้รับผิดชอบ** | Suchitra Khomdee ([@Khaiwann](https://github.com/Khaiwann)) — QA / Tester |
| **Priority** | Must |
| **SRS** | [`M2-SRS_MedMind.pdf`](../../docs/01-requirements/M2-SRS_MedMind.pdf) §3 · [`spec.md`](../../docs/01-requirements/spec.md) |
| **Traceability** | [`docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md) หัวข้อ FR-05 |

> ไฟล์นี้คือหลักฐานงานของคุณใน GitHub: เติมความคืบหน้า ลิงก์ PR/Issue และสิ่งที่เรียนรู้ ทุกครั้งที่ merge งาน

## Requirement

User story: As a caregiver, I want to be notified only when a meal is still not confirmed after the reminders, and to see today's status of every meal in one place, so that I don't have to call or message for every meal.

Pain this traces to: having to call or send a LINE message for every meal; no single place showing the status (problem statement); wanting an alert only when a meal is not yet confirmed (interviewee 2).



## Acceptance criteria และเทสต์

| # | AC | เทสต์ | สถานะ | PR |
|---|---|---|---|---|
| 1 | Given the older adult confirmed at 08:12, when it is 08:15, then the caregiver is not alerted. | **TC-05.1** — status.test | ✅ Demo mode |   |
| 2 | Wrong path. Given there is no confirmation, when it is 08:15, then the caregiver is alerted “Medicine not yet confirmed” (never “not taken”). | **TC-05.2** — status.test (ข้อความ "ไม่ใช่ not taken") | ✅ Demo mode |   |
| 3 | Given several meals in the day, when the caregiver opens the status page, then every meal of the day is shown as “Taken” + time, “Taken (late confirmation)” + time, “Not yet confirmed”, or “Not due yet”. | **TC-05.3** — status.test (4 สถานะ) | ✅ Demo mode |   |
| 4 | Wrong path. Given there are no medication meals today, when the caregiver opens the status page, then it shows “No medication meals today”. | **TC-05.4** — status.test (ไม่มีมื้อ) | ✅ Demo mode |   |
| 5 | Given the older adult tapped “Not yet” in the 08:10 round (the caregiver has already been alerted), when it is 08:15, then the caregiver is not alerted again. | **TC-05.5** — status.test (แจ้งครั้งเดียว) | ✅ Demo mode |   |
| 6 | Given the caregiver has been alerted “Medicine not yet confirmed”, when the older adult confirms late at 08:40, then the caregiver receives “Medicine confirmed at 08:40”. | **TC-05.6** — status.test (confirmed at HH:MM) | ✅ Demo mode |   |
| 7 | Wrong path. Given the caregiver's page was closed at 08:15 when a meal was not confirmed, when the caregiver opens MedMind at 09:00, then the unseen alert is shown and the meal's status is “Not yet confirmed” (or “Taken (late confirmation)” + time if confirmed since). | **TC-05.7** — status.test (แจ้งที่ค้างเมื่อเปิดหน้า BR-18) · MT-06 | 🟡 บางส่วน — ดู TRACEABILITY |   |
| 8 | Wrong path. Given the older adult taps “Taken” at exactly 08:15 and that confirmation has reached the caregiver's phone before it evaluates the alert for 08:15, when the caregiver's phone evaluates the meal, then the caregiver is not alerted. | **TC-05.8** — status.test — A5-T04 (กดที่ T+15 พอดีก่อนประเมิน → ไม่แจ้ง) | ✅ Demo mode |   |
| 9 | Wrong path. Given the caregiver was alerted “Medicine not yet confirmed” at 08:16 because no confirmation had arrived, when a confirmation tapped at 08:14 reaches the caregiver's phone at 08:20, then the alert is replaced by “Medicine confirmed at 08:14”, the meal shows “Taken”, and the caregiver is not alerted a second time. | **TC-05.9** — status.test — A5-T05 (แจ้งแล้ว แล้วการยืนยัน T−1 มาทีหลัง → แทนที่ด้วย "ยืนยันการกินยาแล้ว" ไม่แจ้งซ้ำ) · MT-06 | ✅ Demo mode |   |
| 10 | Wrong path. Given the 08:00 meal has no confirmation, when the caregiver opens the status page at 08:07, then the meal shows “Not yet confirmed” and the caregiver is not alerted (the alert comes only after 08:15 has passed). | **TC-05.10** — status.test — C-T03 (08:07 → "ยังไม่ยืนยัน" และไม่แจ้ง) | ✅ Demo mode |   |

## ไฟล์ที่ต้องเขียน

- โค้ด: logic/status.js, features/caregiverStatus.js
- เทสต์: tests/status.test.js
- หน้าจอ: ดู Screen Map ใน [`design-system.md`](../../docs/02-design/design-system.md) §4 · ทุกหน้าต้องมี "Covers: FR-05"

## พึ่งพา / เชื่อมกับโมดูลอื่น

เรียก `mealState()` ของ FR-03 · อ่าน `doses` / `events` ที่ FR-04 เขียน · เขียน `alertSeen`

## ก่อนสอบปากเปล่า — ต้องตอบได้

1. ปัญหาที่ฟีเจอร์นี้ตอบคืออะไร และมาจากคำพูดของผู้ให้สัมภาษณ์คนไหน
2. AC แต่ละข้อถูกทดสอบด้วยเทสต์ไหน (ชี้ในโค้ดได้)
3. กฎ (BR) ที่ใช้อยู่ในไฟล์ไหน อธิบายทีละบรรทัดได้
4. ถ้าเงื่อนไข/เวลาเปลี่ยน (เช่น T+10, ออฟไลน์, เปิดหน้ากลับ) โค้ดทำงานอย่างไร
5. ส่วนไหนใช้ AI ช่วย และคุณตรวจ/แก้อะไร (ดู `docs/AI_USAGE_LOG.md`)

## ความคืบหน้า

- [x] Issue ถูกสร้างและ assign (#16)
- [x] ตรรกะ + เทสต์ผ่าน (`npm test`) — `logic/status.js` + `tests/status.test.js` 16 เทสต์ (6 พ.ย. 2569)
- [x] หน้าจอเชื่อมกับ logic — `features/caregiverStatus.js`, `features/alerts.js` + `tests/caregiverStatusView.test.js` (10), `tests/alerts.test.js` (5) เปิดได้ที่ `public/demo.html` (7 พ.ย. 2569)
- [x] ใช้งานจริงบน Firebase (`caregiver.html`) ใช้หน้าสถานะ/แจ้งเตือนชุดเดียวกับ Demo mode (7 พ.ย. 2569) · **ยังไม่ทดสอบบนมือถือจริง** (MT-06, MT-11)
- [ ] ทดสอบบนมือถือจริง (MT ที่เกี่ยวข้อง)
- [x] `docs/TRACEABILITY.md` อัปเดตแล้ว (ส่วน logic + หน้าจอใน public/ — MT บนมือถือยังไม่ทำ)
- [ ] บันทึกการใช้ AI แล้ว

**ลิงก์ PR / Issue:** (เติมที่นี่)

**สิ่งที่เรียนรู้ / ปัญหาที่เจอ:** (เติมที่นี่)
