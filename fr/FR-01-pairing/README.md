# FR-01 — Pair older adult and caregiver

| | |
|---|---|
| **ผู้รับผิดชอบ** | Takkan Khanlui ([@V31311](https://github.com/V31311)) — System Designer |
| **Priority** | Must |
| **SRS** | [`M2-SRS_MedMind.pdf`](../../docs/02-requirements/M2-SRS_MedMind.pdf) §3 · [`spec.md`](../../docs/02-requirements/spec.md) |
| **Traceability** | [`docs/TRACEABILITY.md`](../../docs/TRACEABILITY.md) หัวข้อ FR-01 |

> ไฟล์นี้คือหลักฐานงานของคุณใน GitHub: เติมความคืบหน้า ลิงก์ PR/Issue และสิ่งที่เรียนรู้ ทุกครั้งที่ merge งาน

## Requirement

User story: As a caregiver, I want to pair with my parent's phone by scanning a QR code or entering an invite code, so that I can set up medicines and receive their status without my parent creating an account.

Pain this traces to: the caregiver is not there and has to call; older adults find it hard to sign up for an account (interviewee 3).

Definition: the invite code (QR + 6 digits) works once and expires after 10 minutes; the older adult can tap “Create new code”. The older adult must tap consent before pairing; neither side needs an account or password. The consent screen states (1) what the caregiver will see: medicines, meal times and confirmation status, (2) why: to alert the caregiver when a meal is not confirmed, (3) that either side can unpair at any time and the pair's data is then deleted (BR-17). In the MVP an older adult has one caregiver. Either side can unpair (with a second confirmation); the caregiver then loses access immediately and that pair's medicines and confirmation history are deleted (PDPA right to erasure).

## Acceptance criteria และเทสต์

| # | AC | เทสต์ | สถานะ | PR |
|---|---|---|---|---|
| 1 | Given the older adult opens the app for the first time, when the start screen appears, then it shows a QR code and an invite code without any sign-up or typing, and before consenting the older adult sees what data will be shared, why, and that they can cancel at any time. | **TC-01.1** — MT-01 (ดูหน้าจอ) | ⬜ | |
| 2 | Wrong path. Given the older adult has not tapped consent, when a caregiver tries to pair, then pairing fails and the caregiver is told it is waiting for consent. | **TC-01.2** — R-2 · pairing.test | ⬜ | |
| 3 | Given the older adult has consented, when the caregiver scans or enters a valid code, then both screens show that they are connected. | **TC-01.3** — R-5 | ⬜ | |
| 4 | Wrong path. Given a code that is wrong, older than 10 minutes, or already used, when the caregiver enters it, then it is rejected with a clear message and no connection is made. | **TC-01.4** — R-3 · pairing.test (checkInvite) | ⬜ | |
| 5 | Wrong path. Given the older adult is already paired with a caregiver, when a second caregiver scans or enters the code, then it is rejected with “This older adult already has a caregiver” and no connection is made. | **TC-01.5** — R-4 | ⬜ | |
| 6 | Wrong path. Given a paired older adult and caregiver, when either of them unpairs and confirms, then the caregiver immediately can no longer see the older adult's data, the pair's medicines and confirmation history are deleted, and the older adult sees a new QR code. | **TC-01.6** — R-8 · pairing.test | ⬜ | |

## ไฟล์ที่ต้องเขียน

- โค้ด: logic/pairing.js, features/pairing.js, core/repo.js
- เทสต์: tests/pairing.test.js, Emulator R-1…R-8
- หน้าจอ: ดู Screen Map ใน [`design-system.md`](../../docs/03-design/design-system.md) §4 · ทุกหน้าต้องมี "Covers: FR-01"

## พึ่งพา / เชื่อมกับโมดูลอื่น

ใช้ `core/firebase.js`, `core/repo.js` (System Designer) · ผลจับคู่เป็นฐานของ FR-02–05

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
