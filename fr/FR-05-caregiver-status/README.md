# FR-05 — Caregiver alert and daily status

| | |
|---|---|
| **ผู้รับผิดชอบ** | Suchitra Khomdee ([@Khaiwann](https://github.com/Khaiwann)) — QA / Tester |
| **Priority** | Must |
| **SRS** | [`M2-SRS_MedMind.pdf`](../../docs/02-requirements/M2-SRS_MedMind.pdf) §3 · [`spec.md`](../../docs/02-requirements/spec.md) |
| **Traceability** | [`docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md) หัวข้อ FR-05 |

> ไฟล์นี้คือหลักฐานงานของคุณใน GitHub: เติมความคืบหน้า ลิงก์ PR/Issue และสิ่งที่เรียนรู้ ทุกครั้งที่ merge งาน

## Requirement

User story: As a caregiver, I want to be notified only when a meal is still not confirmed after the reminders, and to see today's status of every meal in one place, so that I don't have to call or message for every meal.

Pain this traces to: having to call or send a LINE message for every meal; no single place showing the status (problem statement); wanting an alert only when a meal is not yet confirmed (interviewee 2).



## Acceptance criteria และเทสต์

| # | AC | เทสต์ | สถานะ | PR |
|---|---|---|---|---|
| 1 | Given the older adult confirmed at 08:12, when it is 08:15, then the caregiver is not alerted. | **TC-05.1** — status.test | ⬜ | |
| 2 | Wrong path. Given there is no confirmation, when it is 08:15, then the caregiver is alerted “Medicine not yet confirmed” (never “not taken”). | **TC-05.2** — status.test (ข้อความ "ไม่ใช่ not taken") | ⬜ | |
| 3 | Given several meals in the day, when the caregiver opens the status page, then every meal of the day is shown as “Taken” + time, “Taken (late confirmation)” + time, “Not yet confirmed”, or “Not due yet”. | **TC-05.3** — status.test (4 สถานะ) | ⬜ | |
| 4 | Wrong path. Given there are no medication meals today, when the caregiver opens the status page, then it shows “No medication meals today”. | **TC-05.4** — status.test (ไม่มีมื้อ) | ⬜ | |
| 5 | Given the older adult tapped “Not yet” in the 08:10 round (the caregiver has already been alerted), when it is 08:15, then the caregiver is not alerted again. | **TC-05.5** — status.test (แจ้งครั้งเดียว) | ⬜ | |
| 6 | Given the caregiver has been alerted “Medicine not yet confirmed”, when the older adult confirms late at 08:40, then the caregiver receives “Medicine confirmed at 08:40”. | **TC-05.6** — status.test (confirmed at HH:MM) | ⬜ | |
| 7 | Wrong path. Given the caregiver's page was closed at 08:15 when a meal was not confirmed, when the caregiver opens MedMind at 09:00, then the unseen alert is shown and the meal's status is “Not yet confirmed” (or “Taken (late confirmation)” + time if confirmed since). | **TC-05.7** — status.test (แจ้งที่ค้างเมื่อเปิดหน้า BR-18) · MT-06 | ⬜ | |

## ไฟล์ที่ต้องเขียน

- โค้ด: logic/status.js, features/caregiverStatus.js
- เทสต์: tests/status.test.js
- หน้าจอ: ดู Screen Map ใน [`design-system.md`](../../docs/03-design/design-system.md) §4 · ทุกหน้าต้องมี "Covers: FR-05"

## พึ่งพา / เชื่อมกับโมดูลอื่น

เรียก `mealState()` ของ FR-03 · อ่าน `doses` / `events` ที่ FR-04 เขียน · เขียน `alertSeen`

## ก่อนสอบปากเปล่า — ต้องตอบได้

1. ปัญหาที่ฟีเจอร์นี้ตอบคืออะไร และมาจากคำพูดของผู้ให้สัมภาษณ์คนไหน
2. AC แต่ละข้อถูกทดสอบด้วยเทสต์ไหน (ชี้ในโค้ดได้)
3. กฎ (BR) ที่ใช้อยู่ในไฟล์ไหน อธิบายทีละบรรทัดได้
4. ถ้าเงื่อนไข/เวลาเปลี่ยน (เช่น T+10, ออฟไลน์, เปิดหน้ากลับ) โค้ดทำงานอย่างไร
5. ส่วนไหนใช้ AI ช่วย และคุณตรวจ/แก้อะไร (ดู `docs/AI_USAGE_LOG.md`)

## ความคืบหน้า

- [ ] Issue ถูกสร้างและ assign
- [ ] ตรรกะ + เทสต์ผ่าน (`npm test`)
- [ ] หน้าจอเชื่อมกับ logic
- [ ] ทดสอบบนมือถือจริง (MT ที่เกี่ยวข้อง)
- [ ] `docs/TRACEABILITY.md` อัปเดตแล้ว
- [ ] บันทึกการใช้ AI แล้ว

**ลิงก์ PR / Issue:** (เติมที่นี่)

**สิ่งที่เรียนรู้ / ปัญหาที่เจอ:** (เติมที่นี่)
