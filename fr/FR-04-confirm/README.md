# FR-04 — Confirm the whole meal

| | |
|---|---|
| **ผู้รับผิดชอบ** | Nichanan Lalua ([@KaidangSuk](https://github.com/KaidangSuk)) — Prototype Developer |
| **Priority** | Must |
| **SRS** | [`M2-SRS_MedMind.pdf`](../../docs/02-requirements/M2-SRS_MedMind.pdf) §3 · [`spec.md`](../../docs/02-requirements/spec.md) |
| **Traceability** | [`docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md) หัวข้อ FR-04 |

> ไฟล์นี้คือหลักฐานงานของคุณใน GitHub: เติมความคืบหน้า ลิงก์ PR/Issue และสิ่งที่เรียนรู้ ทุกครั้งที่ merge งาน

## Requirement

User story: As an older adult, I want to confirm the whole meal with one tap, so that I don't have to confirm each pill and my family knows I reported taking them.

Pain this traces to: not remembering whether the medicine was taken (problem statement); wanting an easy way to tell their child (interviewee 1); large buttons and few taps (interviewee 3).

Definition: the older adult confirms on the reminder screen (FR-03) or on their home screen, which shows today's meals with their status and a “Taken” button for any meal still in the late-confirmation window.

## Acceptance criteria และเทสต์

| # | AC | เทสต์ | สถานะ | PR |
|---|---|---|---|---|
| 1 | Given the 08:00 meal reminder is showing, when the older adult taps “Taken” at 08:03, then the status becomes “Taken”, 08:03 is recorded, and reminders for that meal stop. | **TC-04.1** — confirm.test | ⬜ | |
| 2 | Wrong path. Given the meal is already confirmed, when “Taken” is tapped again, then no duplicate record is created. | **TC-04.2** — confirm.test (ไม่ซ้ำ NFR-07) · R-7 | ⬜ | |
| 3 | Given the first reminder at 08:00, when the older adult taps “Not yet”, then they are reminded again at 08:05. | **TC-04.3** — mealTimeline.test (ยังไม่กิน → รอบถัดไป) | ⬜ | |
| 4 | Wrong path. Given the last reminder at 08:10, when the older adult taps “Not yet”, then the caregiver is alerted immediately (without waiting for 08:15). | **TC-04.4** — status.test (แจ้งทันที BR-11) | ⬜ | |
| 5 | Given the meal was not confirmed by 08:15, when the older adult taps “Taken” on the home screen at 08:40, then the status becomes “Taken (late confirmation)” with 08:40. | **TC-04.5** — confirm.test (late confirmation) | ⬜ | |
| 6 | Wrong path. Given the next meal's reminder time (12:00) has passed, when the older adult tries to confirm the 08:00 meal, then it cannot be confirmed and the status stays “Not yet confirmed”. | **TC-04.6** — confirm.test (พ้นหน้าต่าง) | ⬜ | |
| 7 | Wrong path. Given the older adult's phone is offline, when they tap “Taken” at 08:03, then their screen shows “Taken” at once, and the confirmation reaches the caregiver with 08:03 as its time within 10 seconds of the connection returning. | **TC-04.7** — MT-05 (ออฟไลน์ → ส่งเมื่อกลับมา) | ⬜ | |

## ไฟล์ที่ต้องเขียน

- โค้ด: logic/confirm.js, features/home.js, features/reminder.js
- เทสต์: tests/confirm.test.js
- หน้าจอ: ดู Screen Map ใน [`design-system.md`](../../docs/03-design/design-system.md) §4 · ทุกหน้าต้องมี "Covers: FR-04"

## พึ่งพา / เชื่อมกับโมดูลอื่น

เรียก `mealState()` ของ FR-03 เพื่อรู้ว่ายืนยันได้ไหม (BR-15) · เขียน `doses` / `events` ผ่าน `core/repo.js`

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
