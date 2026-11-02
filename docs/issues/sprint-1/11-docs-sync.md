<!-- title: docs: แก้เลข R/MT/ไฟล์ที่ไม่ตรงกับ SRS v1.4 และ architecture ล่าสุด -->
<!-- labels: docs · assignees: yaroo393-png · milestone: Increment 0 — เอกสารและโครง repo -->

**FR / AC:** — (ความสอดคล้องของ Golden Thread) · RULES §5
**ผู้รับผิดชอบ:** Yar Oo (ไฟล์ส่วนรวม — แจ้งทีมใน PR)
**Milestone:** Increment 0 · **ขนาด (เสนอ):** 1

## จุดที่พบ (ตรวจ 2 พ.ย. 2569 บน `main` @ `39321b1`)
| ไฟล์ | ตอนนี้ | ควรเป็น |
|---|---|---|
| `README.md` (+ `README.en.md`) โครงสร้าง repo | "เทสต์ R-1…R-8" | R-1…R-11 (`firestore-rules-draft.md`) |
| `docs/TRACEABILITY.md` FR-01 | "Emulator R-1…R-8" | ระบุตาม AC ที่ใช้จริง (R-1…R-5, R-8) |
| `docs/TRACEABILITY.md` FR-02 ข้อ 5, 7, 9 ช่อง Code | `logic/labelDraft.js` | ข้อ 5 `services/aiLabel.js` · ข้อ 7 `logic/schedule.js` · ข้อ 9 `services/redact.js` |
| `docs/GITHUB-SETUP.md` #12 | MT-01…MT-13 | MT-01…MT-16 |
| `docs/GITHUB-SETUP.md` §4 | — | ลิงก์ไปร่าง issue ใน `docs/issues/sprint-1/` |
| `fr/FR-03-reminder/README.md` | หัวข้อ Definition ว่าง | **Rossatorn แก้เอง** (อยู่ใน issue E-4) |

## ทำเสร็จเมื่อ
- [ ] แก้ทุกแถว (ยกเว้นแถวสุดท้าย) ใน PR เดียว · `npm run check` ผ่าน
- [ ] README ไทยก่อน แล้วคัดไป `README.en.md` (RULES §5)
