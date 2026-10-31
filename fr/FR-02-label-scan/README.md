# FR-02 — Scan a medication label and create the medicine record

| | |
|---|---|
| **ผู้รับผิดชอบ** | Yar Oo ([@yaroo393-png](https://github.com/yaroo393-png)) — Project Manager |
| **Priority** | Must |
| **SRS** | [`M2-SRS_MedMind.pdf`](../../docs/02-requirements/M2-SRS_MedMind.pdf) §3 · [`spec.md`](../../docs/02-requirements/spec.md) |
| **Traceability** | [`docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md) หัวข้อ FR-02 |

> ไฟล์นี้คือหลักฐานงานของคุณใน GitHub: เติมความคืบหน้า ลิงก์ PR/Issue และสิ่งที่เรียนรู้ ทุกครั้งที่ merge งาน

## Requirement

User story: As a caregiver, I want to photograph a medication label and get a draft filled in by AI that I can check and correct, so that I don't have to type every medicine by hand while staying in control of what is saved.

Pain this traces to: the caregiver wants to photograph the label and have it filled in (interviewee 2); the older adult wants their child to set it up (interviewee 3).

Definition: only the caregiver can add or edit medicines. Required fields are medicine name, tablets per dose, and meal / time; warnings and contraindications are saved only when the label has them. The reminder time follows the label only: after a meal = the meal time; N minutes before a meal = the meal time − N; at bedtime = bedtime (worked examples in BR-06). The caregiver sets breakfast, lunch and dinner times and bedtime when adding the first medicine. Medicines with the same reminder time are grouped into one meal. Before the photo is sent, the caregiver covers the patient's name, HN, any barcode or QR code and any other personal detail (address, phone number, date of birth) by drawing boxes on it, sees the exact image that will be sent, and ticks “Name and HN are covered” (BR-19). The AI returns only the medicine fields of BR-05; it has no field for a name or HN.

## Acceptance criteria และเทสต์

| # | AC | เทสต์ | สถานะ | PR |
|---|---|---|---|---|
| 1 | Given a clear label photo with the name and HN covered, when the caregiver sends it to the AI, then a draft is shown (medicine name, tablets per dose, meal / time, warnings, contraindications) and nothing is saved yet. | **TC-02.1** — labelDraft.test | ⬜ | |
| 2 | Given the caregiver edits a field in the draft, when they tap save, then the edited value is saved, not the value read from the photo. | **TC-02.2** — labelDraft.test (ค่าที่แก้ชนะค่าจาก AI) | ⬜ | |
| 3 | Wrong path. Given a field cannot be read, or the label says “before meals” without a number of minutes, when the draft is shown, then that field is empty and marked “Please check” (never guessed), and saving is blocked until every required field is filled. | **TC-02.3** — labelDraft.test (ช่องว่าง = null, บันทึกไม่ได้) | ⬜ | |
| 4 | Wrong path. Given a label for a medicine taken only when needed, when the draft is shown, then the system says “As-needed medicines are not supported yet” and creates no schedule. | **TC-02.4** — labelDraft.test (ยาเมื่อมีอาการ) | ⬜ | |
| 5 | Wrong path. Given the photo cannot be read, or the AI service is unavailable (offline, service down or daily limit reached), when the caregiver sends the photo, then the system says why and an empty form opens for manual entry. | **TC-02.5** — MT-02 (AI ล่ม/ออฟไลน์ → กรอกเอง) | ⬜ | |
| 6 | Wrong path. Given the caregiver is on the draft screen, when they tap cancel, then nothing is saved. | **TC-02.6** — labelDraft.test / MT-02 (ยกเลิก) | ⬜ | |
| 7 | Given the label “30 minutes before breakfast” and breakfast set at 07:00, when the medicine is saved, then its reminder is at 06:30. | **TC-02.7** — schedule.test (30 นาทีก่อนมื้อ → 06:30) | ⬜ | |
| 8 | Wrong path. Given the caregiver has not ticked “Name and HN are covered”, when they try to send the photo, then nothing is sent and the “Send to AI” button stays disabled. | **TC-02.8** — labelDraft.test (canSend = false ถ้าไม่ติ๊ก) · MT-03 | ⬜ | |
| 9 | Given the caregiver has covered the name and HN and ticked the box, when they tap “Send to AI”, then only the covered copy of the photo leaves the phone, without its file details (metadata), and the original photo is not kept. | **TC-02.9** — MT-03 + NFR-14 (ภาพที่ส่งไม่มีชื่อ/HN) | ⬜ | |

## ไฟล์ที่ต้องเขียน

- โค้ด: logic/labelDraft.js, logic/schedule.js, services/redact.js, services/aiLabel.js, features/labelScan.js
- เทสต์: tests/labelDraft.test.js, tests/schedule.test.js
- หน้าจอ: ดู Screen Map ใน [`design-system.md`](../../docs/03-design/design-system.md) §4 · ทุกหน้าต้องมี "Covers: FR-02"

## พึ่งพา / เชื่อมกับโมดูลอื่น

ใช้ `core/repo.js` เขียน `medicines`/`mealTimes` · `logic/schedule.js` ให้ FR-03 ใช้จัดกลุ่มมื้อ (`groupMeals`) — **ตกลงรูปข้อมูล Medicine/Meal กับเจ้าของ FR-03 ก่อนเขียน** (architecture §5.1)

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
