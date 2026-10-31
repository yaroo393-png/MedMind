# FR-03 — Reminder at each meal

| | |
|---|---|
| **ผู้รับผิดชอบ** | Rossatorn Sangkaew ([@IDK-SleepyBro](https://github.com/IDK-SleepyBro)) — UX/UI Designer |
| **Priority** | Must |
| **SRS** | [`M2-SRS_MedMind.pdf`](../../docs/02-requirements/M2-SRS_MedMind.pdf) §3 · [`spec.md`](../../docs/02-requirements/spec.md) |
| **Traceability** | [`docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md) หัวข้อ FR-03 |

> ไฟล์นี้คือหลักฐานงานของคุณใน GitHub: เติมความคืบหน้า ลิงก์ PR/Issue และสิ่งที่เรียนรู้ ทุกครั้งที่ merge งาน

## Requirement

User story: As an older adult, I want a reminder at each meal time that shows all of that meal's medicines on one screen, and to be reminded again if I haven't confirmed, so that I don't forget or mix up my medicines.

Pain this traces to: forgetting a dose or taking it late (problem statement); switching the alarm off and then forgetting (interviewee 1).

Definition — reminder timeline, shared with FR-04 and FR-05 (T = the meal's reminder time):

## Acceptance criteria และเทสต์

| # | AC | เทสต์ | สถานะ | PR |
|---|---|---|---|---|
| 1 | Given an 08:00 meal with two medicines, MedMind open on the older adult's phone and the page tapped at least once since it was opened, when it is 08:00, then a reminder sound plays and both medicines (name, tablets, warnings, contraindications) are shown on one screen with “Taken” / “Not yet” buttons and no medicine photos. | **TC-03.1** — mealTimeline.test · MT-04 (เสียง) | ⬜ | |
| 2 | Wrong path. Given the meal is not confirmed, when it is 08:05 and then 08:10, then repeat reminders 1 and 2 are given, each with sound. | **TC-03.2** — mealTimeline.test (รอบ 1, 2) | ⬜ | |
| 3 | Given the meal is confirmed, when the next repeat-reminder time arrives, then no reminder is given. | **TC-03.3** — mealTimeline.test (ยืนยันแล้วไม่เตือน) | ⬜ | |
| 4 | Wrong path. Given meal A at 06:45 (15 minutes before breakfast) is not confirmed and meal B is at 07:00, when it is 07:00, then the reminder screen shows both meals in time order under separate headings with separate buttons and one sound, and the caregiver is alerted about meal A at 07:00, on meal A's own timeline. | **TC-03.4** — mealTimeline.test (มื้อซ้อนกัน BR-16) | ⬜ | |
| 5 | Wrong path. Given the page was closed at 08:00 and the meal is not confirmed, when the older adult opens MedMind at 08:07, then the reminder screen shows the meal at once, the 08:00 and 08:05 rounds are not replayed, and the 08:10 round still happens. | **TC-03.5** — mealTimeline.test (เปิดหน้ากลับ BR-18) | ⬜ | |

## ไฟล์ที่ต้องเขียน

- โค้ด: logic/mealTimeline.js, features/reminder.js
- เทสต์: tests/mealTimeline.test.js
- หน้าจอ: ดู Screen Map ใน [`design-system.md`](../../docs/03-design/design-system.md) §4 · ทุกหน้าต้องมี "Covers: FR-03"

## พึ่งพา / เชื่อมกับโมดูลอื่น

**เจ้าของ `mealState()`** ที่ FR-04 และ FR-05 เรียกใช้ — ตกลงสัญญา §5.1 กับ Nichanan และ Suchitra ก่อนเขียน · รับ Meal จาก `logic/schedule.js` (FR-02)

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
