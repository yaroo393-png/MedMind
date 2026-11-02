<!-- title: FR-02 logic/labelDraft.js: แปลงผล AI เป็นร่างยา + canSend + canSave -->
<!-- labels: FR-02 · assignees: yaroo393-png · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** FR-02 ข้อ 1–4, 6, 8, 10, 11 · BR-04, BR-05, BR-07, BR-19 · NFR-06 · architecture §5 (`labelDraft.js`)
**ผู้รับผิดชอบ:** Yar Oo
**Milestone:** Increment 1 (logic) · **ขนาด (เสนอ):** 3 · **ต้องรอ:** `validateSlot` จาก issue `schedule.js`

## ทำไมทำใน Increment 1
logic นี้ไม่พึ่ง AI จริง — ทดสอบด้วย JSON ตัวอย่างจาก `core/demoData.js` ได้เลย ส่วนเรียก Gemini (`services/aiLabel.js`) และหน้า C-03…C-05 อยู่ Increment 2

## ขอบเขต `public/js/logic/labelDraft.js`
- `buildDraft(aiJson)` → ร่างยา `{ name, instructionText, slots[], warnings, contraindications, checks }` — ช่องที่อ่านไม่ได้ = `null` + อยู่ใน `checks` (= "Please check") **เฉพาะช่องนั้น** · ไม่เดาค่า (BR-04)
- ฉลาก "วันละ N ครั้ง" ไม่ระบุมื้อ / "ทุก 6 ชั่วโมง" / "วันเว้นวัน" → slot ว่าง + Please check (FR-02 ข้อ 3, PD-1/A3)
- ยาเมื่อมีอาการ → `{ unsupported: 'as_needed' }` ไม่สร้าง slot (FR-02 ข้อ 4, BR-07)
- `applyEdit(draft, path, value)` → ร่างใหม่ (ค่าที่ผู้ดูแลแก้ชนะค่าจาก AI — ข้อ 2)
- `canSave(draft)` → false ถ้าช่องบังคับว่าง หรือ slot ไม่ผ่าน `validateSlot` / ซ้ำ / ขัดกัน (ข้อ 3, 11)
- `canSend({ coveredTicked })` → false ถ้ายังไม่ติ๊ก "ปิดชื่อและ HN แล้ว" (ข้อ 8, BR-19)
- **ห้ามมีช่องชื่อผู้ป่วย/HN** ในร่าง (NFR-09)

## เทสต์ `tests/labelDraft.test.js`
- [ ] TC-02.1 ร่างครบ ยังไม่บันทึก · TC-02.2 ค่าที่แก้ชนะ · TC-02.3 null + บันทึกไม่ได้ (รวม "วันละ 3 ครั้ง")
- [ ] TC-02.4 ยาเมื่อมีอาการ · TC-02.6 ยกเลิก = ไม่มีอะไรถูกบันทึก (ฟังก์ชันไม่มีผลข้างเคียง)
- [ ] TC-02.8 `canSend` · TC-02.10 3 slot บันทึกได้ · TC-02.11 slot ผิด/ซ้ำ → บันทึกไม่ได้
- [ ] JSON ผิดรูป / ไม่ใช่ object → ร่างว่างทั้งหมด + Please check (ไม่ throw)

## ทำเสร็จเมื่อ
- [ ] เทสต์ผ่าน · `npm run check` ผ่าน
- [ ] TRACEABILITY: ช่อง Code ของ FR-02 ข้อ 5, 9 ให้ชี้ `services/aiLabel.js` / `services/redact.js` (ไม่ใช่ `labelDraft.js`) · FR-02 README · AI log
