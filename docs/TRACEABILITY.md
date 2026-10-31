# Traceability: Problem → FR → Design → Code → Test (Golden Thread)

เอกสารนี้ผูกทุก FR กลับไปที่ปัญหา, SRS, การออกแบบ, โค้ด และเทสต์ — **คะแนน M4 วัดที่ความต่อเนื่องของเส้นนี้** (ไม่ใช่ความสวยของแอป)
อ้างอิง: SRS v1.2 ([`docs/02-requirements/M2-SRS_MedMind.pdf`](02-requirements/M2-SRS_MedMind.pdf)) · Design: [`docs/03-design/architecture.md`](03-design/architecture.md) · Backlog: [`backlog.md`](02-requirements/backlog.md) · สำเนา SRS: [`spec.md`](02-requirements/spec.md)

> **วิธีใช้:** SRS เป็นแหล่งความจริง ถ้าแก้ AC/BR/NFR ให้แก้ SRS ก่อนแล้วคัดมาที่นี่ · คอลัมน์ *Code* เป็นไฟล์ที่ **วางแผนไว้** (ใน `public/js/…`) และ *Test* เป็นรหัสเทสต์ที่ **วางแผนไว้** — เจ้าของงานเติมชื่อฟังก์ชัน/ลิงก์จริงและเปลี่ยน ⬜ เป็น ✅ เมื่อเทสต์ผ่าน
> ตัวย่อ: `TC-xx.n` = เทสต์อัตโนมัติ (`node --test`) · `R-n` = เทสต์ Security Rules (Emulator) · `MT-nn` = ทดสอบด้วยมือ (ตารางท้ายเอกสาร)

## Problem
ผู้สูงอายุที่ต้องกินยาเม็ด/แคปซูลตามเวลาประจำอาจลืมกิน กินผิดเวลา หรือจำไม่ได้ว่ากินแล้วหรือยัง ขณะที่ลูกที่เป็นผู้ดูแลต้องออกไปทำงานและตามดูทั้งวันไม่ได้ วิธีที่ใช้อยู่ (นาฬิกาปลุก กล่องยา โทร/LINE) ยืนยันสถานะและรายงานให้ผู้ดูแลโดยอัตโนมัติไม่ได้ (รายละเอียด: M1 Charter)

## Scope
- **อยู่ใน MVP (Must):** FR-01, FR-02, FR-03, FR-04, FR-05 · **Should:** FR-06 · **Could:** FR-07, FR-08, FR-09 (สรุปรายสัปดาห์ด้วย AI — ทำหลัง FR-01–05 เสร็จ)
- **นอก MVP:** เตือนตอนปิดหน้าเว็บ/ล็อกจอ, ยาเมื่อมีอาการ/ยาน้ำ/ครึ่งเม็ด, คำแนะนำทางการแพทย์ (SRS §6)

## ภาพรวม (Golden Thread)
| Problem / pain | FR | Design | Feature (หน้าจอ) | Test |
|---|---|---|---|---|
| ผู้สูงอายุสมัครบัญชียาก ผู้ดูแลไม่อยู่ด้วย | FR-01 | architecture §6, §7.1 | S-01, C-01, S-04, C-09 | AC 1–6 · NFR-04, 05, 10 |
| ผู้ดูแลอยากให้ช่วยกรอกข้อมูลยาจากฉลาก | FR-02 | architecture §5, §7.2 · ADR-3 | C-02…C-05 | AC 1–9 · NFR-06, 08, 09, 11, 14 |
| ลืมกินยา / กินไม่ตรงเวลา | FR-03 | architecture §5.1, §7.3 (state machine) | S-03 | AC 1–5 · NFR-01 |
| จำไม่ได้ว่ากินแล้วหรือยัง | FR-04 | architecture §5.1, §6 (`doses`) | S-03, S-02 | AC 1–7 · NFR-02, 03, 07, 12 |
| โทร/ส่ง LINE ถามทุกมื้อ ไม่มีสถานะรวม | FR-05 | architecture §5.1, §6 (`alertSeen`) | C-07, C-08 | AC 1–7 · NFR-01, 12, 13 |
| ผู้ดูแลอยากเห็นภาพรวมทั้งสัปดาห์ (Could) | FR-09 | (หลัง MVP) | C-10 | (เขียน AC เมื่อย้ายเข้า increment) |


## FR-01 — Pair older adult and caregiver

**ผู้รับผิดชอบ:** Takkan Khanlui (@V31311) · **Priority:** Must · **โฟลเดอร์งาน:** [`fr/FR-01-pairing`](../fr/FR-01-pairing/README.md)

User story: As a caregiver, I want to pair with my parent's phone by scanning a QR code or entering an invite code, so that I can set up medicines and receive their status without my parent creating an account.

Pain this traces to: the caregiver is not there and has to call; older adults find it hard to sign up for an account (interviewee 3).

| # | Acceptance criterion | Code (วางแผน) | Test (วางแผน) | สถานะ |
|---|---|---|---|---|
| 1 | Given the older adult opens the app for the first time, when the start screen appears, then it shows a QR code and an invite code without any sign-up or typing, and before consenting the older adult sees what data will be shared, why, and that they can cancel at any time. | `logic/pairing.js` | **TC-01.1** — MT-01 (ดูหน้าจอ) | ⬜ |
| 2 | Wrong path. Given the older adult has not tapped consent, when a caregiver tries to pair, then pairing fails and the caregiver is told it is waiting for consent. | `logic/pairing.js` | **TC-01.2** — R-2 · pairing.test | ⬜ |
| 3 | Given the older adult has consented, when the caregiver scans or enters a valid code, then both screens show that they are connected. | `logic/pairing.js` | **TC-01.3** — R-5 | ⬜ |
| 4 | Wrong path. Given a code that is wrong, older than 10 minutes, or already used, when the caregiver enters it, then it is rejected with a clear message and no connection is made. | `logic/pairing.js` | **TC-01.4** — R-3 · pairing.test (validateInvite) | ⬜ |
| 5 | Wrong path. Given the older adult is already paired with a caregiver, when a second caregiver scans or enters the code, then it is rejected with “This older adult already has a caregiver” and no connection is made. | `logic/pairing.js` | **TC-01.5** — R-4 | ⬜ |
| 6 | Wrong path. Given a paired older adult and caregiver, when either of them unpairs and confirms, then the caregiver immediately can no longer see the older adult's data, the pair's medicines and confirmation history are deleted, and the older adult sees a new QR code. | `logic/pairing.js` | **TC-01.6** — R-8 · pairing.test | ⬜ |

ไฟล์ที่ต้องเขียนทั้งหมดของ FR-01: logic/pairing.js, features/pairing.js, core/repo.js · เทสต์: tests/pairing.test.js, Emulator R-1…R-8

## FR-02 — Scan a medication label and create the medicine record

**ผู้รับผิดชอบ:** Yar Oo (@yaroo393-png) · **Priority:** Must · **โฟลเดอร์งาน:** [`fr/FR-02-label-scan`](../fr/FR-02-label-scan/README.md)

User story: As a caregiver, I want to photograph a medication label and get a draft filled in by AI that I can check and correct, so that I don't have to type every medicine by hand while staying in control of what is saved.

Pain this traces to: the caregiver wants to photograph the label and have it filled in (interviewee 2); the older adult wants their child to set it up (interviewee 3).

| # | Acceptance criterion | Code (วางแผน) | Test (วางแผน) | สถานะ |
|---|---|---|---|---|
| 1 | Given a clear label photo with the name and HN covered, when the caregiver sends it to the AI, then a draft is shown (medicine name, tablets per dose, meal / time, warnings, contraindications) and nothing is saved yet. | `logic/labelDraft.js` | **TC-02.1** — labelDraft.test | ⬜ |
| 2 | Given the caregiver edits a field in the draft, when they tap save, then the edited value is saved, not the value read from the photo. | `logic/labelDraft.js` | **TC-02.2** — labelDraft.test (ค่าที่แก้ชนะค่าจาก AI) | ⬜ |
| 3 | Wrong path. Given a field cannot be read, or the label says “before meals” without a number of minutes, when the draft is shown, then that field is empty and marked “Please check” (never guessed), and saving is blocked until every required field is filled. | `logic/labelDraft.js` | **TC-02.3** — labelDraft.test (ช่องว่าง = null, บันทึกไม่ได้) | ⬜ |
| 4 | Wrong path. Given a label for a medicine taken only when needed, when the draft is shown, then the system says “As-needed medicines are not supported yet” and creates no schedule. | `logic/labelDraft.js` | **TC-02.4** — labelDraft.test (ยาเมื่อมีอาการ) | ⬜ |
| 5 | Wrong path. Given the photo cannot be read, or the AI service is unavailable (offline, service down or daily limit reached), when the caregiver sends the photo, then the system says why and an empty form opens for manual entry. | `logic/labelDraft.js` | **TC-02.5** — MT-02 (AI ล่ม/ออฟไลน์ → กรอกเอง) | ⬜ |
| 6 | Wrong path. Given the caregiver is on the draft screen, when they tap cancel, then nothing is saved. | `logic/labelDraft.js` | **TC-02.6** — labelDraft.test / MT-02 (ยกเลิก) | ⬜ |
| 7 | Given the label “30 minutes before breakfast” and breakfast set at 07:00, when the medicine is saved, then its reminder is at 06:30. | `logic/labelDraft.js` | **TC-02.7** — schedule.test (30 นาทีก่อนมื้อ → 06:30) | ⬜ |
| 8 | Wrong path. Given the caregiver has not ticked “Name and HN are covered”, when they try to send the photo, then nothing is sent and the “Send to AI” button stays disabled. | `logic/labelDraft.js` | **TC-02.8** — labelDraft.test (canSend = false ถ้าไม่ติ๊ก) · MT-03 | ⬜ |
| 9 | Given the caregiver has covered the name and HN and ticked the box, when they tap “Send to AI”, then only the covered copy of the photo leaves the phone, without its file details (metadata), and the original photo is not kept. | `logic/labelDraft.js` | **TC-02.9** — MT-03 + NFR-14 (ภาพที่ส่งไม่มีชื่อ/HN) | ⬜ |

ไฟล์ที่ต้องเขียนทั้งหมดของ FR-02: logic/labelDraft.js, logic/schedule.js, services/redact.js, services/aiLabel.js, features/labelScan.js · เทสต์: tests/labelDraft.test.js, tests/schedule.test.js

## FR-03 — Reminder at each meal

**ผู้รับผิดชอบ:** Rossatorn Sangkaew (@IDK-SleepyBro) · **Priority:** Must · **โฟลเดอร์งาน:** [`fr/FR-03-reminder`](../fr/FR-03-reminder/README.md)

User story: As an older adult, I want a reminder at each meal time that shows all of that meal's medicines on one screen, and to be reminded again if I haven't confirmed, so that I don't forget or mix up my medicines.

Pain this traces to: forgetting a dose or taking it late (problem statement); switching the alarm off and then forgetting (interviewee 1).

| # | Acceptance criterion | Code (วางแผน) | Test (วางแผน) | สถานะ |
|---|---|---|---|---|
| 1 | Given an 08:00 meal with two medicines, MedMind open on the older adult's phone and the page tapped at least once since it was opened, when it is 08:00, then a reminder sound plays and both medicines (name, tablets, warnings, contraindications) are shown on one screen with “Taken” / “Not yet” buttons and no medicine photos. | `logic/mealTimeline.js` | **TC-03.1** — mealTimeline.test · MT-04 (เสียง) | ⬜ |
| 2 | Wrong path. Given the meal is not confirmed, when it is 08:05 and then 08:10, then repeat reminders 1 and 2 are given, each with sound. | `logic/mealTimeline.js` | **TC-03.2** — mealTimeline.test (รอบ 1, 2) | ⬜ |
| 3 | Given the meal is confirmed, when the next repeat-reminder time arrives, then no reminder is given. | `logic/mealTimeline.js` | **TC-03.3** — mealTimeline.test (ยืนยันแล้วไม่เตือน) | ⬜ |
| 4 | Wrong path. Given meal A at 06:45 (15 minutes before breakfast) is not confirmed and meal B is at 07:00, when it is 07:00, then the reminder screen shows both meals in time order under separate headings with separate buttons and one sound, and the caregiver is alerted about meal A at 07:00, on meal A's own timeline. | `logic/mealTimeline.js` | **TC-03.4** — mealTimeline.test (มื้อซ้อนกัน BR-16) | ⬜ |
| 5 | Wrong path. Given the page was closed at 08:00 and the meal is not confirmed, when the older adult opens MedMind at 08:07, then the reminder screen shows the meal at once, the 08:00 and 08:05 rounds are not replayed, and the 08:10 round still happens. | `logic/mealTimeline.js` | **TC-03.5** — mealTimeline.test (เปิดหน้ากลับ BR-18) | ⬜ |

ไฟล์ที่ต้องเขียนทั้งหมดของ FR-03: logic/mealTimeline.js, features/reminder.js · เทสต์: tests/mealTimeline.test.js

## FR-04 — Confirm the whole meal

**ผู้รับผิดชอบ:** Nichanan Lalua (@KaidangSuk) · **Priority:** Must · **โฟลเดอร์งาน:** [`fr/FR-04-confirm`](../fr/FR-04-confirm/README.md)

User story: As an older adult, I want to confirm the whole meal with one tap, so that I don't have to confirm each pill and my family knows I reported taking them.

Pain this traces to: not remembering whether the medicine was taken (problem statement); wanting an easy way to tell their child (interviewee 1); large buttons and few taps (interviewee 3).

| # | Acceptance criterion | Code (วางแผน) | Test (วางแผน) | สถานะ |
|---|---|---|---|---|
| 1 | Given the 08:00 meal reminder is showing, when the older adult taps “Taken” at 08:03, then the status becomes “Taken”, 08:03 is recorded, and reminders for that meal stop. | `logic/confirm.js` | **TC-04.1** — confirm.test | ⬜ |
| 2 | Wrong path. Given the meal is already confirmed, when “Taken” is tapped again, then no duplicate record is created. | `logic/confirm.js` | **TC-04.2** — confirm.test (ไม่ซ้ำ NFR-07) · R-7 | ⬜ |
| 3 | Given the first reminder at 08:00, when the older adult taps “Not yet”, then they are reminded again at 08:05. | `logic/confirm.js` | **TC-04.3** — mealTimeline.test (ยังไม่กิน → รอบถัดไป) | ⬜ |
| 4 | Wrong path. Given the last reminder at 08:10, when the older adult taps “Not yet”, then the caregiver is alerted immediately (without waiting for 08:15). | `logic/confirm.js` | **TC-04.4** — status.test (แจ้งทันที BR-11) | ⬜ |
| 5 | Given the meal was not confirmed by 08:15, when the older adult taps “Taken” on the home screen at 08:40, then the status becomes “Taken (late confirmation)” with 08:40. | `logic/confirm.js` | **TC-04.5** — confirm.test (late confirmation) | ⬜ |
| 6 | Wrong path. Given the next meal's reminder time (12:00) has passed, when the older adult tries to confirm the 08:00 meal, then it cannot be confirmed and the status stays “Not yet confirmed”. | `logic/confirm.js` | **TC-04.6** — confirm.test (พ้นหน้าต่าง) | ⬜ |
| 7 | Wrong path. Given the older adult's phone is offline, when they tap “Taken” at 08:03, then their screen shows “Taken” at once, and the confirmation reaches the caregiver with 08:03 as its time within 10 seconds of the connection returning. | `logic/confirm.js` | **TC-04.7** — MT-05 (ออฟไลน์ → ส่งเมื่อกลับมา) | ⬜ |

ไฟล์ที่ต้องเขียนทั้งหมดของ FR-04: logic/confirm.js, features/home.js, features/reminder.js · เทสต์: tests/confirm.test.js

## FR-05 — Caregiver alert and daily status

**ผู้รับผิดชอบ:** Suchitra Khomdee (@Khaiwann) · **Priority:** Must · **โฟลเดอร์งาน:** [`fr/FR-05-caregiver-status`](../fr/FR-05-caregiver-status/README.md)

User story: As a caregiver, I want to be notified only when a meal is still not confirmed after the reminders, and to see today's status of every meal in one place, so that I don't have to call or message for every meal.

Pain this traces to: having to call or send a LINE message for every meal; no single place showing the status (problem statement); wanting an alert only when a meal is not yet confirmed (interviewee 2).

| # | Acceptance criterion | Code (วางแผน) | Test (วางแผน) | สถานะ |
|---|---|---|---|---|
| 1 | Given the older adult confirmed at 08:12, when it is 08:15, then the caregiver is not alerted. | `logic/status.js` | **TC-05.1** — status.test | ⬜ |
| 2 | Wrong path. Given there is no confirmation, when it is 08:15, then the caregiver is alerted “Medicine not yet confirmed” (never “not taken”). | `logic/status.js` | **TC-05.2** — status.test (ข้อความ "ไม่ใช่ not taken") | ⬜ |
| 3 | Given several meals in the day, when the caregiver opens the status page, then every meal of the day is shown as “Taken” + time, “Taken (late confirmation)” + time, “Not yet confirmed”, or “Not due yet”. | `logic/status.js` | **TC-05.3** — status.test (4 สถานะ) | ⬜ |
| 4 | Wrong path. Given there are no medication meals today, when the caregiver opens the status page, then it shows “No medication meals today”. | `logic/status.js` | **TC-05.4** — status.test (ไม่มีมื้อ) | ⬜ |
| 5 | Given the older adult tapped “Not yet” in the 08:10 round (the caregiver has already been alerted), when it is 08:15, then the caregiver is not alerted again. | `logic/status.js` | **TC-05.5** — status.test (แจ้งครั้งเดียว) | ⬜ |
| 6 | Given the caregiver has been alerted “Medicine not yet confirmed”, when the older adult confirms late at 08:40, then the caregiver receives “Medicine confirmed at 08:40”. | `logic/status.js` | **TC-05.6** — status.test (confirmed at HH:MM) | ⬜ |
| 7 | Wrong path. Given the caregiver's page was closed at 08:15 when a meal was not confirmed, when the caregiver opens MedMind at 09:00, then the unseen alert is shown and the meal's status is “Not yet confirmed” (or “Taken (late confirmation)” + time if confirmed since). | `logic/status.js` | **TC-05.7** — status.test (แจ้งที่ค้างเมื่อเปิดหน้า BR-18) · MT-06 | ⬜ |

ไฟล์ที่ต้องเขียนทั้งหมดของ FR-05: logic/status.js, features/caregiverStatus.js · เทสต์: tests/status.test.js

## NFR → วิธีตรวจ

| NFR | ชนิด | ข้อกำหนด | วิธีตรวจ (ตาม SRS) | ตรวจที่ (เทสต์ / MT) | ผล |
|---|---|---|---|---|---|
| NFR-01 | reliability | Repeat reminders occur at T+5 and T+10, and every meal not confirmed raises exactly one caregiver alert no later than T+15 (at T+15, or immediately when “Not yet” is tapped in the T+10 round); it shows at once while the caregiver's MedMind is open, otherwise on the next open (BR-18). | Automated test with a simulated clock | tests/mealTimeline.test.js + tests/status.test.js (นาฬิกาจำลอง) | ⬜ |
| NFR-02 | usability | At least 4 of 5 older adults confirm within 10 seconds of seeing the reminder screen, on their first try and without help (if only 3 can be found: 3 of 3, reported as a small sample). | Hand over the working app on the reminder screen, say only “If you have taken your medicine, what do you do next?”, and time it — when Increment 1 is done | MT-07 (จับเวลา 5 คน / 3 คน) | ⬜ |
| NFR-03 | usability | “Taken” / “Not yet” buttons at least 64 px high and full width; medicine names on the reminder screen at least 24 px; body text at least 18 px; text-to-background contrast at least 4.5:1. | Measure in browser DevTools and a contrast checker — when Increment 1 is done | MT-08 (DevTools + contrast checker) | ⬜ |
| NFR-04 | security / privacy (required) | A caregiver sees only the older adult they are paired with; a request for another older adult's data is refused. | Automated test of the access rules: a caregiver asks for another older adult's data and is refused | Emulator R-1 | ⬜ |
| NFR-05 | privacy | No connection happens before the older adult taps consent (0 times). | Automated test (FR-01, criterion 2) | Emulator R-2 | ⬜ |
| NFR-06 | safety | No medicine record is saved without the caregiver's check (0 records). | Automated test (FR-02) | tests/labelDraft.test.js + Emulator R-6 | ⬜ |
| NFR-07 | reliability | However many times “Taken” is tapped, there is only one confirmation record for that meal. | Automated test (FR-04, criterion 2) | tests/confirm.test.js + Emulator R-7 | ⬜ |
| NFR-08 | performance | With the phone online, the AI draft appears within 10 seconds of tapping “Send to AI” for at least 18 of 20 real labels (90%). | Time from tapping “Send to AI” to seeing the draft, with 20 real labels on a phone on mobile data | MT-09 (20 ฉลากจริงที่ปิดชื่อแล้ว บนมือถือ) | ⬜ |
| NFR-09 | privacy / PDPA | The system stores only what FR-01–05 use (medicine details, meal times, confirmation status, pairing and its consent record) and none of the older adult's national ID number, address, date of birth, phone number or hospital number (0 fields). MedMind never stores a label photo (0 photos); only a copy with the name, HN and barcodes covered is sent to the AI service. Medicine data and medication status are health data (sensitive under PDPA), kept only as far as the FRs need and shared only after consent (BR-02). | Review every field in the data model in the Design document, and check the data store holds no images | ตรวจทุกฟิลด์ใน architecture.md §6 + ตรวจว่า Firestore ไม่มีรูป (MT-10) | ⬜ |
| NFR-10 | privacy / PDPA | After unpairing, the former caregiver's requests for that data succeed 0 times, and that pair's medicines and history are 0 records. | Automated test: after unpairing, the request is refused and remaining records are counted | Emulator R-8 | ⬜ |
| NFR-11 | accuracy | All required fields (medicine name, tablets per dose, meal / time) are read correctly, with no edit needed, on at least 16 of 20 real labels (80%). | Compare each draft with its label by hand, using the same 20 labels as NFR-08 | MT-09 (ชุดเดียวกับ NFR-08, เทียบกับฉลากด้วยตา) | ⬜ |
| NFR-12 | performance | With both phones online, a confirmation, or a “Not yet” in the last round, appears on the caregiver's phone within 10 seconds in at least 19 of 20 trials. | Timed trials on two real phones on mobile data | MT-11 (จับเวลา 20 ครั้ง บน 2 มือถือ ใช้ข้อมูลมือถือ) | ⬜ |
| NFR-13 | cost | Running 5 test pairs (team phones and browsers) for 7 days stays inside the online data store's free daily quota (0 days over) and needs no payment method. | Read the daily usage in the data store's console at the end of the test week | MT-12 (ดูโควตาใน Firebase Console หลังทดสอบ 7 วัน) | ⬜ |
| NFR-14 | privacy / PDPA | In a test with 20 real labels, 0 of the images sent to the AI service show a readable patient name, HN, barcode or other personal detail. | In a local test build, save each image just before it is sent (never uploaded) and check all 20 by eye | MT-13 (20 ฉลาก ตรวจภาพที่ส่งด้วยตา) | ⬜ |

## Business Rule → FR → ไฟล์ที่ต้องทำตามกฎ

| BR | กฎ | FR | ไฟล์หลัก (วางแผน) |
|---|---|---|---|
| BR-01 | The invite code (QR + 6 digits) works once and expires after 10 minutes; the older adult can tap “Create new code”. | FR-01 | logic/pairing.js |
| BR-02 | The older adult must tap consent before pairing; neither side has an account or password; one older adult has one caregiver. The consent screen states (1) wh… | FR-01 | features/pairing.js, core/repo.js |
| BR-03 | Only the caregiver can add or edit medicines. | FR-02 | Rules (medicines), features/labelScan.js |
| BR-04 | A scanned draft is never saved until the caregiver checks and confirms it; a field that cannot be read is left empty and marked “Please check” (never guessed… | FR-02 | logic/labelDraft.js |
| BR-05 | Required fields: medicine name, tablets per dose, meal / time. Warnings and contraindications are saved only when the label has them. | FR-02 | logic/labelDraft.js, logic/schedule.js |
| BR-06 | The reminder time follows the label only: after a meal = the meal time; N minutes before a meal = meal time − N; at bedtime = bedtime. The caregiver sets bre… | FR-02, FR-03 | logic/schedule.js |
| BR-07 | Only tablets and capsules taken at fixed times; no as-needed medicines, liquids or half tablets. | FR-02 | logic/labelDraft.js |
| BR-08 | Reminder at T, repeats at T+5 and T+10 (fixed times from T), only while the meal is not confirmed. | FR-03 | logic/mealTimeline.js |
| BR-09 | The reminder screen shows every medicine in the meal (name, tablets, warnings, contraindications), a green “Taken” and a red “Not yet” button, and plays a so… | FR-03 | features/reminder.js |
| BR-10 | One tap on “Taken” confirms the whole meal, records the time and stops the reminders. | FR-04 | logic/confirm.js |
| BR-11 | “Not yet” in round 1 or 2 → wait for the next round; in round 3 → alert the caregiver immediately. | FR-04, FR-05 | logic/status.js, logic/mealTimeline.js |
| BR-12 | Tapping “Taken” again creates no duplicate record. | FR-04 | logic/confirm.js, Rules (doses) |
| BR-13 | Not confirmed by T+15 → status “Not yet confirmed” + caregiver alert “Medicine not yet confirmed”, sent once per meal (not again at T+15 if already sent unde… | FR-05 | logic/status.js |
| BR-14 | The daily status shows every meal of the day: “Taken” + time / “Taken (late confirmation)” + time / “Not yet confirmed” / “Not due yet”. | FR-05 | logic/status.js |
| BR-15 | Late confirmation: after T+15 the older adult can still tap “Taken” on the home screen until the reminder time of the next meal that starts after this meal's… | FR-04, FR-05 | logic/mealTimeline.js, logic/confirm.js |
| BR-16 | Overlapping meals (e.g. 06:45 and 07:00): each keeps its own rounds (BR-08), caregiver alert (BR-13) and late window (BR-15); the reminder screen lists every… | FR-03, FR-04, FR-05 | logic/mealTimeline.js |
| BR-17 | Unpairing: either side can unpair (with a second confirmation) → the caregiver loses access immediately, and that pair's medicines and confirmation history a… | FR-01 | features/pairing.js, core/repo.js |
| BR-18 | Reopening the page: each meal's status is worked out from the clock. Rounds whose time passed while the page was closed are not replayed. A meal still within… | FR-03, FR-05 | logic/mealTimeline.js, logic/status.js |
| BR-19 | Before a label photo is sent to the AI service, the caregiver covers the patient's name, HN, any barcode or QR code and any other personal detail, sees the e… | FR-02 | services/redact.js, features/labelScan.js |

## แผนทดสอบด้วยมือ (Manual Test) — กรอกผลหลังทดสอบบนมือถือจริง 2 เครื่อง

| ID | ขั้นตอน | ผลที่คาดหวัง | อ้างอิง | ผล | ผู้ทดสอบ / วันที่ |
|---|---|---|---|---|---|
| MT-01 | เปิดแอปผู้สูงอายุครั้งแรก | เห็น QR + รหัส + ข้อความ 3 ข้อก่อนยินยอม ไม่ต้องสมัคร/พิมพ์ | FR-01 AC1 | ⬜ | |
| MT-02 | ปิดเน็ต แล้วส่งภาพฉลากให้ AI | ระบบบอกเหตุผล และเปิดฟอร์มกรอกเอง | FR-02 AC5 | ⬜ | |
| MT-03 | ถ่ายฉลากตัวอย่าง ลากกรอบปิดชื่อ/HN ไม่ติ๊กยืนยัน → กดส่ง; แล้วติ๊กและส่ง | ไม่ติ๊ก = ส่งไม่ได้; ติ๊กแล้วได้ร่าง และบันทึกภาพไม่เก็บ | FR-02 AC8, AC9 | ⬜ | |
| MT-04 | ถึงเวลาเตือน (หลังแตะหน้าจอ 1 ครั้ง) | เสียงดัง ยาทั้งมื้อบนหน้าเดียว ปุ่ม Taken/Not yet | FR-03 AC1 | ⬜ | |
| MT-05 | ปิดเน็ตบนมือผู้สูงอายุ กด Taken แล้วเปิดเน็ต | หน้าจอเป็น Taken ทันที ผู้ดูแลเห็นเวลาที่กดจริงภายใน 10 วินาที | FR-04 AC7 | ⬜ | |
| MT-06 | ปิดหน้าเว็บผู้ดูแลช่วง T+15 แล้วเปิดหลังจากนั้น | เห็นแจ้งเตือนที่ค้าง + สถานะถูกต้อง | FR-05 AC7 | ⬜ | |
| MT-07 | ยื่นมือถือผู้สูงอายุ 5 คน (หรือ 3) ที่หน้าเตือน บอกแค่ "ถ้ากินยาแล้วต้องทำอะไรต่อ" ให้คิดออกเสียง (think-aloud) และห้ามช่วย | ≥ 4/5 กด Taken ภายใน 10 วินาที · จดจุดที่ลังเล | NFR-02 | ⬜ | |
| MT-08 | วัดขนาดปุ่ม/ตัวอักษร/contrast ด้วย DevTools + contrast checker | ปุ่ม ≥ 64 px, ชื่อยา ≥ 24 px, เนื้อหา ≥ 18 px, ≥ 4.5 : 1 | NFR-03 | ⬜ | |
| MT-09 | ส่ง 20 ฉลากจริง (ปิดชื่อแล้ว) บนมือถือ จับเวลา + เทียบช่องกับฉลาก | ≥ 18/20 ได้ร่างใน 10 วินาที · ≥ 16/20 ช่องบังคับถูกโดยไม่ต้องแก้ | NFR-08, 11 | ⬜ | |
| MT-10 | เปิด Firebase Console ดูทุก collection | ไม่มีรูป ไม่มีชื่อ/HN/เลขบัตร/ที่อยู่/วันเกิด/เบอร์โทร | NFR-09 | ⬜ | |
| MT-11 | กด Taken บนเครื่องหนึ่ง จับเวลาจนเครื่องผู้ดูแลแสดง (20 ครั้ง) | ≥ 19/20 ภายใน 10 วินาที | NFR-12 | ⬜ | |
| MT-12 | ทดสอบ 5 คู่ 7 วัน แล้วดูการใช้งานใน Firebase Console | ไม่เกินโควตารายวันที่ใช้ฟรี 0 วัน ไม่ต้องผูกบัตร | NFR-13 | ⬜ | |
| MT-13 | บันทึกภาพที่ถูกส่งให้ AI ทุกใบในชุดทดสอบ (test build เท่านั้น) แล้วดูด้วยตา | 0/20 ภาพอ่านชื่อ HN บาร์โค้ด หรือข้อมูลส่วนตัวได้ | NFR-14 | ⬜ | |
| MT-14 | ให้ทีมอื่นทำ heuristic evaluation บน Demo mode ตาม 10 ข้อของ Nielsen | รายการปัญหา + ระดับความรุนแรง (0–4) และสิ่งที่แก้แล้ว | UX primer §5.2, NFR-02/03 | ⬜ | |
| MT-15 | ผู้ตรวจเปิด `demo.html` ในเบราว์เซอร์เดียว แล้วเดินทุก Must FR + ทางผิด | ครบ FR-01–05 โดยไม่ต้องมีมือถือ 2 เครื่อง/บัญชี | M4 (prototype), ADR-8 | ⬜ | |

