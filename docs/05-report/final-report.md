# Final Project Report — MedMind

> **ฉบับร่าง** — ส่วนที่ขึ้นต้น ✅ มีข้อมูลจริงแล้ว · 🟡 มีบางส่วน ส่วน **[ ]** ทีมเติมเมื่อมีผลจริง (ไม่เดา) · **ความยาว 6–10 หน้า (PM แจ้ง 2 พ.ย. ว่าอาจารย์อนุญาต — decision-log DL-14)** · ส่งเป็น PDF ชื่อ `Final-Report.pdf`

## งบหน้า (เป้า 6–10 หน้า — ปรับตามเนื้อหาจริง)
| ส่วน | หน้า (โดยประมาณ) | เนื้อหาที่ใช้ซ้ำ |
|---|---|---|
| ปก + สรุปผู้บริหาร 1 ย่อหน้า | 0.5 | M1 |
| 1 ปัญหาและผู้ใช้ | 0.5–1 | M1 (Charter) |
| 2 สรุป requirement | 1 | M2 (ตาราง FR + NFR + MoSCoW) |
| 3 การออกแบบ | 1.5–2 | M2 Design (ไดอะแกรม + ADR + ตารางข้อมูล) |
| 4 การสร้างระบบ/ต้นแบบ | 1–1.5 | ภาพหน้าจอ Demo mode + ขอบเขต Must FR |
| 5 การทดสอบ | 1–1.5 | ตาราง AC + ผล MT |
| 6 การใช้ AI | 0.5–1 | AI Log + AI-Use Statement |
| 7 ส่วนร่วมรายคน | 0.5 | ลิงก์ PR/Issue ใน GitHub |
| 8 Golden Thread | 0.5–1 | ตารางเดียว |
| ลิงก์ | 0.25 | repo, demo, วิดีโอ (ถ้ามี) |

## ปก
| | |
|---|---|
| โครงงาน | MedMind — ระบบเตือนกินยาและแจ้งสถานะให้ผู้ดูแลผู้สูงอายุ |
| รายวิชา | Introduction to Software Engineering (15031001) ปีการศึกษา 2569 |
| ทีม | MedMind — Yar Oo (6931503064), Takkan Khanlui (6931503035), Rossatorn Sangkaew (6931503066), Nichanan Lalua (6931503049), Suchitra Khomdee (6931503079) |
| Repository | https://github.com/yaroo393-png/MedMind |
| ระบบที่เปิดได้ | [ ลิงก์ ] (เปิดได้ในมือถือ) · **Demo mode:** [ ลิงก์ `demo.html` ] (เดินครบทุก FR ในเบราว์เซอร์เดียว) · วิธีเปิด: ดู `README.md` |

## 1. ปัญหาและผู้ใช้ ✅
ผู้สูงอายุที่ต้องกินยาเม็ด/แคปซูลตามเวลาประจำอาจลืมกิน กินผิดเวลา หรือจำไม่ได้ว่ากินแล้วหรือยัง ขณะที่ลูกซึ่งเป็นผู้ดูแลต้องออกไปทำงานและตามดูทั้งวันไม่ได้ วิธีที่ใช้อยู่ (นาฬิกาปลุก กล่องยา โทร/LINE) ยืนยันสถานะและรายงานให้ผู้ดูแลโดยอัตโนมัติไม่ได้
- ผู้ใช้หลัก: ผู้สูงอายุ · ลูก/ผู้ดูแล · ข้อมูลจากการสัมภาษณ์ผู้ใช้ 3 คน (3–4 ก.ย. 2569 ทางโทรศัพท์)
- ตัววัดความสำเร็จ: ผู้ดูแลไม่ต้องโทร/ส่ง LINE ถามทุกมื้อ — ติดต่อเฉพาะมื้อที่ยังไม่ยืนยัน · ทุกมื้อที่ไม่ยืนยันภายใน T+15 ถึงผู้ดูแลเป็นการแจ้งเตือน (NFR-01) · จำนวนครั้งที่โทรถามต่อวัน: จาก [ ค่าก่อนใช้ ] เป็น [ ค่าหลังใช้ ] (ถามผู้ให้สัมภาษณ์คนที่ 2)

## 2. สรุป requirement ✅
SRS v1.5 — 9 FR (Must 5 · Should 1 · Could 3), กฎธุรกิจ 21 ข้อ, NFR 14 ข้อ, use case 7 + diagram, AC 43 ข้อของ FR-01–05 (ทางผิดหรือกรณีขอบ 26 ข้อ) · ไฟล์: `docs/01-requirements/M2-SRS_MedMind.pdf` (v1.5) · มติที่ทีมอนุมัติและเรื่องที่รอตัดสิน: `docs/01-requirements/decision-log.md`
ขอบเขต: 5 FR ที่เป็น Must ตอบทั้ง 2 คำถามของโครงงาน · นอกขอบเขต: เตือนตอนปิดหน้าเว็บ, ยาเมื่อมีอาการ/ยาน้ำ/ครึ่งเม็ด, คำแนะนำทางการแพทย์

## 3. การออกแบบ ✅ (ภาพประกอบ [ ])
สถาปัตยกรรม 3 ชั้นแบบ Layered + Client–Server (หน้าจอ `features/` → ตรรกะ `logic/` → ข้อมูล `core/` + `services/`) · ตรรกะเป็นฟังก์ชันล้วนที่ไม่แตะ DOM, Firebase หรือ `Date.now()` (รับเวลาเป็นพารามิเตอร์) จึงทดสอบด้วย `node --test` ได้โดยไม่ต้องติดตั้งอะไร · ข้อมูลเข้าถึงผ่านสัญญา `repo` ชุดเดียว (§6.3) มี 2 ตัวทำงาน: `localRepo` สำหรับ Demo mode (ADR-8) และ Firestore (ยังไม่สร้าง — DL-24) · อ่านฉลากด้วย Gemini ผ่าน Firebase AI Logic หลังผู้ดูแลปิดชื่อ/HN (BR-19) AI แค่ร่าง ผู้ดูแลตรวจทุกครั้ง (BR-04)

สัญญาระหว่างโมดูลที่ทีมตกลงและบันทึกไว้: Meal/Dose (DL-18, §5.3) · labelDraft (DL-19, §5.4) · จับคู่/รหัสเชิญ (DL-20, §5.5 ลำดับตรวจ `wrong_code → already_has_caregiver → expired → already_used → not_consented`, รหัสหมดอายุเมื่อ `now > expiresAt`) · repo (§6.3) · Security Rules ร่าง (R-12–R-14: อ่านเอกสารเชิญได้ด้วย `get` แต่ `list` ไม่ได้)
ข้อบกพร่องของร่างสัญญาแรกที่พบเองก่อนเขียนโค้ดและแก้แล้ว 5 จุด (เช่น Rules เดิมห้ามอ่านเอกสารเชิญทั้งที่ขั้นเข้าร่วมต้องอ่าน, `<` กับ `<=` ที่ขอบเวลา, ใช้ `Math.random` สร้างรหัส) — ดู `docs/AI_USAGE_LOG.md` และ `docs/01-requirements/decision-log.md`

เอกสาร: `docs/02-design/architecture.md` (ADR, data model, state machine ของมื้อ, Demo mode) · `design-system.md` (Screen Map, ขนาด/สี NFR-03) · `firestore-rules-draft.md`
[ ] ใส่ภาพ architecture / ERD / ภาพหน้าจอต้นแบบ (ภาพหน้าจอต้องใช้ข้อมูลสมมติเท่านั้น)

## 4. การสร้างระบบ 🟡
**ทำแล้ว (หลักฐานอยู่ใน `main`):**
- **ต้นแบบคลิกได้** `docs/02-design/prototypes/2569-11-04/` (เปิดด้วยการดับเบิลคลิก ไม่ใช้เซิร์ฟเวอร์/ฐานข้อมูล) ครอบคลุม FR-01–FR-05 ทั้งทางปกติและทางผิด รวม 43 AC ตามตารางใน `index.html` · มีนาฬิกาจำลอง (ตั้งเวลาได้ละเอียดถึงมิลลิวินาที) · ทุกหน้ามีป้าย "Covers: FR-xx" · ตั้งค่าขนาดตัวอักษร +/− และโหมดสว่าง/มืด · ไอคอนชุด `medmind-icons`
- **ตรรกะจริง `public/js/logic/`** 7 โมดูล: `time`, `confirm`, `mealTimeline`, `schedule`, `status`, `labelDraft`, `pairing` — ทุกฟังก์ชันมีเทสต์อ้าง AC
- **แกน `public/js/core/`**: `clock` (นาฬิกาจริง/จำลอง), `repo` (`localRepo` ครบตามสัญญา §6.3: จับคู่, รหัสเชิญ, ความยินยอม, ตารางมื้อ, ยา, ยืนยันมื้อ, "ยังไม่กิน", การแจ้งเตือนที่เห็นแล้ว, `watch`), `demoData` (ข้อมูลตัวอย่างชุดเดียวของทีม)

**ยังไม่ได้ทำ (ระบุตามจริง):**
- หน้าจอจริงใน `public/js/features/` และ `public/demo.html` ที่ต่อกับ `logic/` + `core/` — ปัจจุบันต้นแบบเป็นชุดไฟล์แยกใน `docs/02-design/prototypes/` ยังไม่ได้ย้ายมาใช้โค้ดใน `public/`
- Firebase จริง (Anonymous Auth, Firestore, Security Rules ที่ผ่าน Emulator, Hosting) — ตัดสินใจเลื่อน (DL-24) เพราะเกณฑ์ M3 ต้องการต้นแบบที่ไม่พึ่งเซิร์ฟเวอร์
- อ่านฉลากด้วย AI (`aiLabel.js` + ขั้นปิดชื่อ/HN) — มีเฉพาะตรรกะร่างยา/ตรวจผล (`labelDraft`) ที่รับผลอ่านมาแล้ว ยังไม่เคยเรียก Gemini จริง
- เตือนตอนปิดหน้าเว็บ — อยู่นอกขอบเขตแต่แรก (ดู §2)

**เทคโนโลยี:** HTML/CSS/JavaScript (ES modules) ไม่มี build step ไม่มี framework · Node test runner · Firebase (กำหนดไว้ในการออกแบบ ยังไม่ใช้งานจริง)
**ข้อจำกัดที่รู้:** ดู README หัวข้อ "ข้อจำกัดที่สำคัญ" · ลิงก์ระบบที่เปิดได้ในมือถือ: [ ] (ต้องเปิด GitHub Pages แล้วใส่ลิงก์ที่ปก)

## 5. การทดสอบ 🟡
**ผลเทสต์อัตโนมัติ:** `npm test` บน `main` (commit da9fb78, 6 พ.ย. 2569) → **ผ่าน 219 / ไม่ผ่าน 0** · ทุกฟังก์ชันใน `logic/` มีเทสต์ที่อ้าง AC · เทสต์เขียนก่อนโค้ดตามสัญญา (TDD) และ "ฉีดบั๊กเทียม" ในโค้ดเพื่อพิสูจน์ว่าเทสต์จับได้ (pairing: ฉีด 10 จุด จับได้ครบ)

| ไฟล์เทสต์ | จำนวน | ตรวจอะไร |
|---|---|---|
| `time.test.js` | 3 | แปลงเวลา |
| `confirm.test.js` | 10 | ยืนยันกินยา ขอบ T+15 (BR-21) |
| `mealTimeline.test.js` | 18 | สถานะมื้อ, หน้าต่างกินช้า, ไม่มีมื้อถัดไป = 23:59:59.999 |
| `schedule.test.js` | 16 | ตรวจช่องเวลา, เวลาเตือน, จัดกลุ่มมื้อ |
| `status.test.js` | 16 | เตือนผู้ดูแล, สรุปรายวัน, ป้าย "ยังไม่ยืนยัน" (BR-13/14) |
| `labelDraft.test.js` | 18 | ร่างยาจากผลอ่านฉลาก, ผลอ่านจาก AI ไม่เชื่อถือ, ตรวจก่อนบันทึก |
| `pairing.test.js` | 10 | สร้าง/ตรวจรหัสเชิญ 6 หลัก 10 นาที ใช้ได้ครั้งเดียว |
| `clock.test.js` | 5 | นาฬิกาจริง/จำลอง |
| `repo.test.js` / `repoPairing.test.js` | 13 / 7 | `localRepo` ทุกฟังก์ชัน, จับคู่, ยกเลิกแล้วลบข้อมูล (BR-17) |
| `demoData.test.js` | 10 | ข้อมูลตัวอย่างสมมติ ไม่มีชื่อ/HN จริง |
| `prototype.test.js` | 46 | ต้นแบบ: ป้าย Covers, token, ขนาดตัวอักษร/ความคมชัด (NFR-03), ขอบเวลา BR-21 |
| `repo-structure.test.js` | 47 | ไฟล์ที่ต้องมีครบ, README 2 ภาษาและ SRS 2 ภาษาเลขตรงกัน, FR ทุกตัวอยู่ใน TRACEABILITY |

**ผลรายคุณสมบัติ (คัดจาก `docs/TRACEABILITY.md`):** ผ่านระดับ unit test = ตรรกะของ AC นั้นทำงานตามสัญญา · ยังไม่ใช่ผลทดสอบหน้าจอบนอุปกรณ์จริง

| FR | เทสต์ที่รองรับ | ผล | ยังไม่ได้ทดสอบ |
|---|---|---|---|
| FR-01 จับคู่ | `pairing`, `repoPairing`, `repo` | ผ่านทั้งหมด | Security Rules ใน Emulator, ทดสอบบนมือถือ |
| FR-02 ฉลาก/ตารางยา | `schedule`, `labelDraft`, `demoData` | ผ่านทั้งหมด | AI อ่านฉลากจริง (ข้อ 2, 5, 6, 8, 9) |
| FR-03 เตือน/ไทม์ไลน์มื้อ | `mealTimeline`, `time` | ผ่านทั้งหมด | การแจ้งเตือนจริงบนเครื่อง |
| FR-04 ยืนยันกิน | `confirm`, `repo`, `clock` | ผ่านทั้งหมด | ทดสอบปุ่มบนจอจริง (ขนาด ≥64px) |
| FR-05 แจ้งผู้ดูแล | `status`, `repo` | ผ่านทั้งหมด | ผู้ดูแลเห็นการเปลี่ยนแบบเรียลไทม์ (ต้องใช้ Firestore) |

**ที่ยังไม่ได้ทำ (ไม่ใส่ตัวเลขที่ไม่มี):**
- ทดสอบบนมือถือ OPPO Reno 16 5G (Android) และ iPhone 13 (iOS) ทั้งสองบทบาท — ตาราง `TEST-CHECKLIST.md` ยังว่าง [ ]
- Heuristic evaluation โดยทีมอื่น (MT-14) [ ] · think-aloud 5 คน (MT-07) [ ]
- Security Rules ใน Emulator [ ]/8 · NFR ที่วัดบนระบบจริง (NFR-02, 08, 11–14) [ ] — NFR-03 (ขนาด/ความคมชัด) ตรวจด้วยเทสต์อัตโนมัติกับต้นแบบเท่านั้น ไม่ใช่การวัดบนเครื่องจริง

## 6. การใช้ AI และข้อสะท้อน ✅
**ใช้ AI ช่วยอะไรบ้าง:** (รายละเอียดครบ → [`ai-use-statement.md`](ai-use-statement.md))
- **Claude (แชท):** ร่าง/ตรวจ Charter, SRS, ออกแบบ, วาดแผนภาพ, ร่างโครง repo
- **Claude Code:** เขียนโค้ด `logic/` + `core/` + เทสต์, ต้นแบบ M3 ทั้งชุด, ร่างสัญญาโมดูล
- **Figma AI:** สร้างไอคอนชุด `medmind-icons` จากมาสคอร์ตการ์ตูนที่ Rossatorn วาดเอง (Suchitra ใช้ Figma AI)

**สิ่งที่ทีมตรวจและตัดสินใจเอง:**
- ✅ ขอบเขต FR, กฎการเตือน, ข้อความถึงผู้ดูแล, ตัวเลข NFR (มติ DL-01–DL-25)
- ✅ ทุกคน commit ด้วยบัญชีตัวเอง · รัน `npm run check` ให้ผ่านก่อน push · ทุก PR ต้องมีผู้รีวิว + CI ผ่าน
- ✅ AI ลองแก้โค้ดให้ผิดเพื่อดูว่าเทสต์จับได้ (บันทึกใน log ของแต่ละงาน)
- ✅ **ทุกคนตรวจโค้ดของตัวเองแล้ว** (Takkan, Yar, Suchitra 6 พ.ย. · Nichanan, Rossatorn 7 พ.ย.)

**อะไรได้ผล:**
- เขียนเทสต์ก่อนโค้ด แล้วลองทำโค้ดให้ผิด → พิสูจน์ว่าเทสต์จับได้
- ถามทีมทุกข้อที่ SRS ไม่ตอบ (ชุดคำถาม 6 พ.ย.) → ปิด 7 มติในครั้งเดียว

**อะไรไม่ได้ผล:**
- AI เพิ่ม FR ที่ไม่มีในปัญหาจริง · ตอบว่า ML Kit อ่านไทยได้ (ผิด)
- ร่างแรกมีบั๊ก: `labelDraft` พังเมื่อไม่มี slot สมบูรณ์ · เทสต์ 2 ข้อผิดเอง
- ข้อเสนอสัญญาฉบับแรกผิด 5 จุด (เจอตอนตรวจซ้ำ)

**บทเรียน:** AI พูดมั่นใจแม้ผิด → ต้องมีเทสต์ มีมนุษย์ตรวจ และตรวจย้อนกับ requirement ก่อนยอมรับ

**AI ในตัวระบบ:** ยังไม่ได้ทำ — FR-02 (อ่านฉลาก) ใช้ร่างตัวอย่างจาก `demoData.js` ไม่มีการเรียก Gemini จริง (เลื่อนไปรอบถัดไป DL-24)

## 7. ส่วนร่วมรายคน ✅
กระบวนการ: Incremental + sprint สั้น 3 รอบ (Sprint 0 วิเคราะห์, Sprint 1–2 พัฒนา) — ดู [`docs/PROJECT-PLAN.md`](../../docs/PROJECT-PLAN.md)

| คน | FR / งาน | ไฟล์โค้ด | PR / Commit สำคัญ |
|---|---|---|---|
| **Yar Oo** (PM) | FR-02, เอกสาร, repo/CI | [`logic/schedule.js`](../../public/js/logic/schedule.js), [`logic/labelDraft.js`](../../public/js/logic/labelDraft.js) | [#41](https://github.com/yaroo393-png/MedMind/pull/41) labelDraft, [#36](https://github.com/yaroo393-png/MedMind/pull/36) schedule, [#39](https://github.com/yaroo393-png/MedMind/pull/39) มติ DL-19–25, [#45](https://github.com/yaroo393-png/MedMind/pull/45) AI-Use Statement · 13 commits |
| **Takkan Khanlui** | FR-01, core, Rules | [`logic/pairing.js`](../../public/js/logic/pairing.js), [`core/repo.js`](../../public/js/core/repo.js), [`core/clock.js`](../../public/js/core/clock.js) | [#43](https://github.com/yaroo393-png/MedMind/pull/43) pairing, [#38](https://github.com/yaroo393-png/MedMind/pull/38) clock+repo, ต้นแบบ FR-01 · ตรวจแล้ว (6 พ.ย.) |
| **Rossatorn Sangkaew** | FR-03, Design | [`logic/time.js`](../../public/js/logic/time.js), [`logic/mealTimeline.js`](../../public/js/logic/mealTimeline.js), [`tokens.css`](../../docs/02-design/prototypes/2569-11-04/tokens.css) (ออกแบบชุดสี/ฟอนต์เอง) + วาดมาสคอร์ตการ์ตูนเอง | [#35](https://github.com/yaroo393-png/MedMind/pull/35) mealTimeline · ตรวจแล้ว (7 พ.ย.) · 5 commits |
| **Nichanan Lalua** | FR-04, ต้นแบบ | [`logic/confirm.js`](../../public/js/logic/confirm.js), [`core/demoData.js`](../../public/js/core/demoData.js), ต้นแบบ Demo mode | [#40](https://github.com/yaroo393-png/MedMind/pull/40) demoData, เทสต์ต้นแบบ · ตรวจแล้ว (7 พ.ย.) |
| **Suchitra Saelim** | FR-05, ไอคอน | [`logic/status.js`](../../public/js/logic/status.js), [`tests/status.test.js`](../../tests/status.test.js), ไอคอน (ใช้ Figma AI สร้างจากมาสคอร์ตที่ Rossatorn วาด) | [#37](https://github.com/yaroo393-png/MedMind/pull/37) status.js + เทสต์ · ตรวจแล้ว (6 พ.ย.) |

**หมายเหตุ:** ✅ ทุกคนตรวจโค้ดของตัวเองครบแล้ว (Takkan, Yar, Suchitra 6 พ.ย. · Nichanan, Rossatorn 7 พ.ย.) — พร้อมอธิบายได้ทุกบรรทัดสำหรับสอบปากเปล่า

## 8. ตาราง Golden Thread
(คัดจาก `docs/TRACEABILITY.md` — ตรวจตรงของจริงเมื่อ 6 พ.ย. 2569 · "ต้นแบบ" = หน้าจอใน `docs/02-design/prototypes/2569-11-04/`)

| ปัญหา | FR | Design | Feature (หน้าจอ) | Test (ผลจริง) |
|---|---|---|---|---|
| ผู้สูงอายุสมัครบัญชียาก; ผู้ดูแลไม่อยู่ด้วย | FR-01 | architecture §5.5, §6, §7.1 | S-01, C-01 (ต้นแบบ) | `pairing.test.js` 10 + `repoPairing.test.js` 7 ผ่าน · มือถือ/Rules Emulator [ ยังไม่ทำ ] |
| ผู้ดูแลอยากให้ช่วยกรอกข้อมูลยาจากฉลาก | FR-02 | architecture §5.4, §7.2 | C-02…C-05 (ต้นแบบ) | `schedule.test.js` 16 + `labelDraft.test.js` 18 + `demoData.test.js` 10 ผ่าน · AI อ่านฉลากจริง [ ยังไม่ทำ ] |
| ลืมกินยา / กินไม่ตรงเวลา | FR-03 | architecture §5.1, §7.3 | S-03 (ต้นแบบ) | `mealTimeline.test.js` 18 + `time.test.js` 3 ผ่าน · แจ้งเตือนบนเครื่อง [ ยังไม่ทำ ] |
| จำไม่ได้ว่ากินแล้วหรือยัง | FR-04 | architecture §5.3, §6 | S-02, S-03 (ต้นแบบ) | `confirm.test.js` 10 + `repo.test.js` 13 + `clock.test.js` 5 ผ่าน · ปุ่มบนจอจริง [ ยังไม่ทำ ] |
| โทร/ส่ง LINE ถามทุกมื้อ | FR-05 | architecture §5.3, §6 | C-07, C-08 (ต้นแบบ) | `status.test.js` 16 ผ่าน · เรียลไทม์บน Firestore [ ยังไม่ทำ ] |

รวม: `npm test` ผ่าน 219 / 0 ไม่ผ่าน · ระดับ ✅ เฉพาะ unit test และต้นแบบ — แถวที่ยังเป็น [ ] ห้ามเปลี่ยนเป็น ✅ จนกว่าจะมีผลจริง
