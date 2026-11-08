# FR-03 — Reminder at each meal

| | |
|---|---|
| **ผู้รับผิดชอบ** | Rossatorn Sangkaew ([@IDK-SleepyBro](https://github.com/IDK-SleepyBro)) — UX/UI Designer |
| **Priority** | Must |
| **SRS** | [`M2-SRS_MedMind.pdf`](../../docs/01-requirements/M2-SRS_MedMind.pdf) §3 · [`spec.md`](../../docs/01-requirements/spec.md) |
| **Traceability** | [`docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md) หัวข้อ FR-03 |

> ไฟล์นี้คือหลักฐานงานของคุณใน GitHub: เติมความคืบหน้า ลิงก์ PR/Issue และสิ่งที่เรียนรู้ ทุกครั้งที่ merge งาน

## Requirement

User story: As an older adult, I want a reminder at each meal time that shows all of that meal's medicines on one screen, and to be reminded again if I haven't confirmed, so that I don't forget or mix up my medicines.

Pain this traces to: forgetting a dose or taking it late (problem statement); switching the alarm off and then forgetting (interviewee 1).

Definition — reminder timeline, shared with FR-04 and FR-05 (T = the meal's reminder time):

| Time | What happens (only while the meal is not confirmed) |
|---|---|
| T | First reminder with “Taken” / “Not yet” |
| T+5 | Repeat reminder 1 |
| T+10 | Repeat reminder 2 — last round; “Not yet” alerts the caregiver now |
| T+15 | Caregiver alerted “Medicine not yet confirmed” (unless already alerted at T+10) |
| After T+15 | Late confirmation allowed until the reminder time of the next meal that starts after T+15 (none = 23:59); the caregiver is then told “Medicine confirmed” |

Repeat reminders are at fixed times from T and only while the meal is not confirmed. The reminder screen shows every medicine in the meal (name, tablets for this meal, warnings, contraindications), a green “Taken” and a red “Not yet” button, and plays a sound at every round while MedMind is open and has been tapped once since opening; it shows no medicine photos. The caregiver alert is sent once per meal and never says “not taken”. Meals that overlap (e.g. 06:45 before breakfast and 07:00 after breakfast) each keep their own reminders, caregiver alert and late-confirmation window; the screen lists every unconfirmed meal in time order under separate headings, each with its own buttons, and reminders due at the same moment sound once. When the page is reopened, BR-18 applies. Time boundaries: the caregiver alert is raised within 5 seconds after T+15 has passed (NFR-01), so a confirmation tapped at exactly T+15 is still on time and counts as “Taken” (BR-20); in the criteria, “when it is 08:15” means the first moment after 08:15:00 has passed.

## Acceptance criteria และเทสต์

| # | AC | เทสต์ | สถานะ | PR |
|---|---|---|---|---|
| 1 | Given an 08:00 meal with two medicines, MedMind open on the older adult's phone and the page tapped at least once since it was opened, when it is 08:00, then a reminder sound plays and both medicines (name, tablets for this meal, warnings, contraindications) are shown on one screen with “Taken” / “Not yet” buttons and no medicine photos. | **TC-03.1** — mealTimeline.test · MT-04 (เสียง) | 🟡 บางส่วน — ดู TRACEABILITY |   |
| 2 | Wrong path. Given the meal is not confirmed, when it is 08:05 and then 08:10, then repeat reminders 1 and 2 are given, each with sound. | **TC-03.2** — mealTimeline.test (รอบ 1, 2) | 🟡 บางส่วน — ดู TRACEABILITY |   |
| 3 | Given the meal is confirmed, when the next repeat-reminder time arrives, then no reminder is given. | **TC-03.3** — mealTimeline.test (ยืนยันแล้วไม่เตือน) | ✅ Demo mode |   |
| 4 | Wrong path. Given meal A at 06:45 (15 minutes before breakfast) is not confirmed and meal B is at 07:00, when it is 07:00, then the reminder screen shows both meals in time order under separate headings with separate buttons and one sound, and the caregiver is alerted about meal A at 07:00, on meal A's own timeline. | **TC-03.4** — mealTimeline.test (มื้อซ้อนกัน BR-16) | ✅ Demo mode |   |
| 5 | Wrong path. Given the page was closed at 08:00 and the meal is not confirmed, when the older adult opens MedMind at 08:07, then the reminder screen shows the meal at once, the 08:00 and 08:05 rounds are not replayed, and the 08:10 round still happens. | **TC-03.5** — mealTimeline.test (เปิดหน้ากลับ BR-18) | ✅ Demo mode |   |
| 6 | Given medicine A has slots at breakfast and at dinner, medicine B has a slot at breakfast, and medicine C has a slot at lunch, when the meals are worked out, then the breakfast meal holds A and B under one reminder, the lunch meal holds C, the dinner meal holds A only, and no meal holds the same slot twice. | **TC-03.6** — schedule.test (groupMeals) — A1-T02, A1-T03, A1-T06 (รวม/แยกมื้อ ไม่ซ้ำ) | ✅ Demo mode |   |

## ไฟล์ที่ต้องเขียน

- โค้ด: logic/mealTimeline.js, features/reminder.js
- เทสต์: tests/mealTimeline.test.js
- หน้าจอ: ดู Screen Map ใน [`design-system.md`](../../docs/02-design/design-system.md) §4 · ทุกหน้าต้องมี "Covers: FR-03"

## พึ่งพา / เชื่อมกับโมดูลอื่น

**เจ้าของ `mealState()`** ที่ FR-04 และ FR-05 เรียกใช้ — ตกลงสัญญา §5.1 กับ Nichanan และ Suchitra ก่อนเขียน · รับ Meal จาก `logic/schedule.js` (FR-02)

## ก่อนสอบปากเปล่า — ต้องตอบได้

1. ปัญหาที่ฟีเจอร์นี้ตอบคืออะไร และมาจากคำพูดของผู้ให้สัมภาษณ์คนไหน
2. AC แต่ละข้อถูกทดสอบด้วยเทสต์ไหน (ชี้ในโค้ดได้)
3. กฎ (BR) ที่ใช้อยู่ในไฟล์ไหน อธิบายทีละบรรทัดได้
4. ถ้าเงื่อนไข/เวลาเปลี่ยน (เช่น T+10, ออฟไลน์, เปิดหน้ากลับ) โค้ดทำงานอย่างไร
5. ส่วนไหนใช้ AI ช่วย และคุณตรวจ/แก้อะไร (ดู `docs/AI_USAGE_LOG.md`)

## ความคืบหน้า

- [x] Issue ถูกสร้างและ assign (#14)
- [x] ตรรกะ + เทสต์ผ่าน (`npm test`) — `logic/mealTimeline.js` + `tests/mealTimeline.test.js` (18) + `tests/time.test.js` (3) (5 พ.ย. 2569)
- [x] หน้าจอเชื่อมกับ logic — `features/reminder.js` + `tests/reminderHomeView.test.js` (15, ร่วมกับ FR-04) เปิดได้ที่ `public/demo.html` (7 พ.ย. 2569)
- [x] ใช้งานจริงบน Firebase (`senior.html`) ใช้หน้าเตือนชุดเดียวกับ Demo mode (7 พ.ย. 2569) · **ยังไม่ทดสอบเสียงบนมือถือจริง** (MT-04)
- [ ] ทดสอบบนมือถือจริง (MT ที่เกี่ยวข้อง)
- [x] `docs/TRACEABILITY.md` อัปเดตแล้ว (ส่วน logic + หน้าจอใน public/ — MT บนมือถือยังไม่ทำ)
- [ ] บันทึกการใช้ AI แล้ว

**ลิงก์ PR / Issue:** PR #35 `logic/mealTimeline.js` + `tests/mealTimeline.test.js` (5 พ.ย. 2569) · PR #34 `logic/time.js` + `tests/time.test.js` (commit ใต้บัญชี PM — ดู Final Report §7) · Issue #14

**สิ่งที่เรียนรู้ / ปัญหาที่เจอ:** (เติมที่นี่)
