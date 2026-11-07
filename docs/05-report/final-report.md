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
**ทำแล้ว (หลักฐานอยู่ใน repo):**
- **Demo mode ของระบบจริง `public/demo.html`** — หน้าจอ FR-01–FR-05 ใน `public/js/features/` (14 หน้า: S-01…S-04, C-01…C-09 ส่วนที่เกี่ยวกับ Must FR) ต่อกับ `logic/` + `core/` จริง (`localRepo`, นาฬิกาจำลองละเอียดถึงมิลลิวินาที) · จอผู้สูงอายุกับจอผู้ดูแลคู่กัน เลือก "สถานการณ์" ได้ 8 แบบ (เริ่มใหม่, ข้อมูลตัวอย่าง, 07:00 เตือน 2 มื้อพร้อมกัน, 07:10, 07:16 เลย T+15, 07:40, ออฟไลน์, ออฟไลน์แล้วข้อมูลมาถึงช้า) · เดินครบทางปกติและทางผิด · ทุกหน้ามีป้าย "Covers: FR-xx" · ตั้งค่าขนาดตัวอักษร +/− และโหมดสว่าง/มืด · ไอคอนชุด `medmind-icons` · เปิดผ่าน static server (`python -m http.server` ในโฟลเดอร์ `public`)
- **ต้นแบบคลิกได้** `docs/02-design/prototypes/2569-11-04/` (M3 — เปิดด้วยการดับเบิลคลิก ไม่ใช้เซิร์ฟเวอร์) ครอบคลุม 43 AC ตามตารางใน `index.html`
- **ตรรกะ `public/js/logic/`** 7 โมดูล: `time`, `confirm`, `mealTimeline`, `schedule`, `status`, `labelDraft`, `pairing` — ทุกฟังก์ชันมีเทสต์อ้าง AC
- **แกน `public/js/core/`**: `clock`, `repo` (`localRepo` ครบตามสัญญา §6.3), `demoData`, `offlineQueue` (จำลองคิวออฟไลน์ของเครื่องผู้สูงอายุ ส่งด้วยเวลาที่กดเดิม — BR-20)
- **หน้าจอ `public/js/features/`** แยกเป็น `screens` (ฟังก์ชันล้วนคืน HTML ทดสอบด้วย node ได้) กับ `actions` (เรียก repo) ตามมติ DL-26 · ไฟล์ที่แตะ DOM มีแค่ `phone.js` กับ `demoShell.js` · ข้อความจากผู้ใช้/AI ผ่าน `esc()` ทุกครั้ง

**ยังไม่ได้ทำ (ระบุตามจริง):**
- Firebase จริง (Anonymous Auth, Firestore, Security Rules ที่ผ่าน Emulator, Hosting) และหน้าแยกมือถือ 2 เครื่อง (`senior.html` / `caregiver.html`) — ตัดสินใจเลื่อน (DL-24) เพราะเกณฑ์ M3 ต้องการต้นแบบที่ไม่พึ่งเซิร์ฟเวอร์ · ผลคือข้อมูลของ 2 จอใช้ที่เก็บในหน่วยความจำของหน้าเดียวกัน ไม่ข้ามเครื่อง
- อ่านฉลากด้วย AI จริง (`aiLabel.js`, `redact.js`) — "AI" ใน Demo mode เป็นตัวจำลองจากฉลากสมมติ (`core/demoData.js`) ไม่มีการส่งรูปหรือข้อมูลใดออกจากเครื่อง · AC ข้อ 5, 9 ของ FR-02 จึงเป็น 🟡
- ภาพ QR เป็นภาพประกอบ (ไม่ใช่ QR จริงที่สแกนด้วยกล้อง) · เสียงเตือนทดสอบแล้วในเบราว์เซอร์ที่ใช้พัฒนา แต่ยังไม่ทดสอบบนมือถือจริง
- เตือนตอนปิดหน้าเว็บ — อยู่นอกขอบเขตแต่แรก (ดู §2)

**เทคโนโลยี:** HTML/CSS/JavaScript (ES modules) ไม่มี build step ไม่มี framework · Node test runner · Firebase (กำหนดไว้ในการออกแบบ ยังไม่ใช้งานจริง)
**ข้อจำกัดที่รู้:** ดู README หัวข้อ "ข้อจำกัดที่สำคัญ" · ลิงก์ระบบที่เปิดได้ในมือถือ: [ ] (ต้องเปิด GitHub Pages แล้วใส่ลิงก์ที่ปก)

## 5. การทดสอบ 🟡
**ผลเทสต์อัตโนมัติ:** `npm test` (7 พ.ย. 2569) → **ผ่าน 328 / ไม่ผ่าน 0** · ทุกฟังก์ชันใน `logic/` มีเทสต์ที่อ้าง AC · เทสต์เขียนก่อนโค้ดตามสัญญา (TDD) และ "ฉีดบั๊กเทียม" ในโค้ดเพื่อพิสูจน์ว่าเทสต์จับได้ (pairing: ฉีด 10 จุด จับได้ครบ · หน้าจอ: ฉีด 16 จุด จับได้ครบ 16)

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
| `pairingView.test.js` | 11 | หน้าจอ FR-01: QR+รหัส ยินยอม ปฏิเสธรหัสผิด/หมดอายุ/มีผู้ดูแลแล้ว ยกเลิก 2 ขั้น |
| `medicineSetupView.test.js` | 15 | หน้าจอ FR-02: ร่างไม่บันทึก, โปรดตรวจสอบ, ยาเมื่อมีอาการ, AI ล่ม, ติ๊กก่อนส่ง, slot ซ้ำ |
| `reminderHomeView.test.js` | 15 | หน้าจอ FR-03/04: หลายมื้อพร้อมกัน, รอบเตือน, กินแล้ว/ยังไม่กิน, ขอบ T+15 และมื้อถัดไป, ออฟไลน์→ส่งทีหลัง |
| `caregiverStatusView.test.js` | 10 | หน้าจอ FR-05: แจ้งเฉพาะ "ยังไม่ยืนยัน" ครั้งเดียว, ปิดหน้าแล้วเปิดใหม่, ข้อมูลมาถึงช้า |
| `offlineQueue.test.js` / `alerts.test.js` | 7 / 5 | คิวออฟไลน์ (BR-20) · กล่องแจ้งเตือนผู้ดูแล (BR-13, BR-18) |
| `model.test.js` / `demoControls.test.js` / `format.test.js` / `ui.test.js` | 7 / 10 / 7 / 9 | ภาพรวมข้อมูล · สถานการณ์และนาฬิกาจำลอง · รูปแบบเวลา/ข้อความ · ชิ้นส่วน HTML และ escape |
| `publicPages.test.js` | 13 | หน้าเว็บจริง: Covers ทุกหน้า, ทุกปุ่มมีตัวจัดการ, ไม่มีสีลอย/เครือข่าย/ที่เก็บถาวร, NFR-03 ขนาดและ contrast ≥ 4.5:1 |
| `repo-structure.test.js` | 47 | ไฟล์ที่ต้องมีครบ, README 2 ภาษาและ SRS 2 ภาษาเลขตรงกัน, FR ทุกตัวอยู่ใน TRACEABILITY |

**ผลรายคุณสมบัติ (คัดจาก `docs/TRACEABILITY.md`):** ✅ = ผ่านครบ **ในขอบเขต Demo mode** (หน้าจอจริง + logic + localRepo) · ส่วนที่ต้องใช้ Firestore Rules / มือถือจริง / AI จริง ระบุเป็น "ค้าง"

| FR | AC ทั้งหมด | ✅ Demo mode | 🟡 บางส่วน | เทสต์ที่รองรับ | ค้าง (ยังไม่ได้ทดสอบ) |
|---|---|---|---|---|---|
| FR-01 จับคู่ | 6 | 5 (ข้อ 2–6) | 1 (ข้อ 1) | `pairing`, `repoPairing`, `pairingView` | QR จริง, Security Rules R-2…R-5, R-8 ใน Emulator, MT-01 |
| FR-02 ฉลาก/ตารางยา | 11 | 8 | 3 (ข้อ 1, 5, 9) | `schedule`, `labelDraft`, `demoData`, `medicineSetupView` | AI อ่านฉลากจริง, `redact.js`, MT-02, MT-03, MT-09, MT-13 |
| FR-03 เตือน/ไทม์ไลน์มื้อ | 6 | 4 (ข้อ 3–6) | 2 (ข้อ 1, 2) | `mealTimeline`, `time`, `reminderHomeView` | เสียงเตือนบนมือถือ (MT-04) |
| FR-04 ยืนยันกิน | 10 | 9 | 1 (ข้อ 7) | `confirm`, `repo`, `clock`, `offlineQueue`, `reminderHomeView` | ส่งภายใน 10 วินาทีบน Firestore (MT-05), R-7, R-9 |
| FR-05 แจ้งผู้ดูแล | 10 | 9 | 1 (ข้อ 7) | `status`, `alerts`, `caregiverStatusView` | ปิดหน้าเว็บจริงบนมือถือ (MT-06), NFR-01 แบบเรียลไทม์ |

**ที่ยังไม่ได้ทำ (ไม่ใส่ตัวเลขที่ไม่มี):**
- ทดสอบบนมือถือ OPPO Reno 16 5G (Android) และ iPhone 13 (iOS) ทั้งสองบทบาท — ตาราง `TEST-CHECKLIST.md` ยังว่าง [ ]
- Heuristic evaluation โดยทีมอื่น (MT-14) [ ] · think-aloud 5 คน (MT-07) [ ]
- Security Rules ใน Emulator [ ]/8 · NFR ที่วัดบนระบบจริง (NFR-02, 08, 11–14) [ ] — NFR-03 (ขนาด/ความคมชัด) ตรวจด้วยเทสต์อัตโนมัติกับ token และ CSS (ปุ่ม ≥ 64px, ชื่อยา ≥ 24px, ตัวอักษร ≥ 18px, contrast ≥ 4.5:1) ไม่ใช่การวัดบนเครื่องจริง (MT-08)

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
| **Yar Oo** (PM) | FR-02, เอกสาร, repo/CI | [`logic/schedule.js`](../../public/js/logic/schedule.js), [`logic/labelDraft.js`](../../public/js/logic/labelDraft.js) | [#41](https://github.com/yaroo393-png/MedMind/pull/41) labelDraft, [#36](https://github.com/yaroo393-png/MedMind/pull/36) schedule, [#39](https://github.com/yaroo393-png/MedMind/pull/39) มติ DL-19–25, [#45](https://github.com/yaroo393-png/MedMind/pull/45) AI-Use Statement |
| **Takkan Khanlui** | FR-01, core, Rules | [`logic/pairing.js`](../../public/js/logic/pairing.js), [`core/repo.js`](../../public/js/core/repo.js), [`core/clock.js`](../../public/js/core/clock.js) | [#43](https://github.com/yaroo393-png/MedMind/pull/43) pairing, [#38](https://github.com/yaroo393-png/MedMind/pull/38) clock+repo, ต้นแบบ FR-01 · ตรวจแล้ว (6 พ.ย.) |
| **Rossatorn Sangkaew** | FR-03, Design | [`logic/time.js`](../../public/js/logic/time.js), [`logic/mealTimeline.js`](../../public/js/logic/mealTimeline.js), [`tokens.css`](../02-design/prototypes/tokens.css) (ออกแบบชุดสี/ฟอนต์เอง) + วาดมาสคอร์ตการ์ตูนเอง | [#35](https://github.com/yaroo393-png/MedMind/pull/35) mealTimeline · ตรวจแล้ว (7 พ.ย.) |
| **Nichanan Lalua** | FR-04, ต้นแบบ | [`logic/confirm.js`](../../public/js/logic/confirm.js), [`core/demoData.js`](../../public/js/core/demoData.js), ต้นแบบ Demo mode | [#40](https://github.com/yaroo393-png/MedMind/pull/40) demoData, เทสต์ต้นแบบ · ตรวจแล้ว (7 พ.ย.) |
| **Suchitra Khomdee** | FR-05, ไอคอน | [`logic/status.js`](../../public/js/logic/status.js), [`tests/status.test.js`](../../tests/status.test.js), ไอคอน (ใช้ Figma AI สร้างจากมาสคอร์ตที่ Rossatorn วาด) | [#37](https://github.com/yaroo393-png/MedMind/pull/37) status.js + เทสต์ · ตรวจแล้ว (6 พ.ย.) |

**หมายเหตุความโปร่งใส:**
- `confirm.js` และ `time.js` (เจ้าของคือ Nichanan และ Rossatorn) ถูก commit ใน [PR #34](https://github.com/yaroo393-png/MedMind/pull/34) ภายใต้บัญชี PM · เจ้าของทั้งสองตรวจและอธิบายโค้ดได้ (7 พ.ย.) ตามบันทึกใน AI-Use Statement
- ✅ ตรวจแล้ว: โค้ด `logic/` และ `core/` ที่เขียนถึง 6 พ.ย. (Takkan, Yar, Suchitra 6 พ.ย. · Nichanan, Rossatorn 7 พ.ย.)
- **ยังไม่ตรวจ:** หน้าจอจริง `public/js/features/`, `public/demo.html`, `core/offlineQueue.js` และเทสต์ 109 ข้อที่เพิ่ม 7 พ.ย. (ร่างโดย AI) — เจ้าของแต่ละ FR ต้องอ่านและอธิบายได้ก่อนสอบ และเปิด PR จากบัญชีตัวเอง · ตารางข้างบนจะเติมลิงก์ PR ของหน้าจอเมื่อ merge
- PR #42 ("Create status.js" ของ Suchitra) ซ้ำกับ #37 ที่ merge แล้ว ต้องปิดโดยไม่ merge [ ยืนยันหลังปิดแล้ว] · ส่วนร่วมรายคนตัดสินจาก GitHub ของแต่ละบัญชี [ ตรวจหน้า Contributors ก่อนส่ง ]

## 8. ตาราง Golden Thread
(คัดจาก `docs/TRACEABILITY.md` — ตรวจตรงของจริงเมื่อ 7 พ.ย. 2569 · หน้าจอ = `public/demo.html` (Demo mode) และต้นแบบ M3 ใน `docs/02-design/prototypes/2569-11-04/` · ✅ = ในขอบเขต Demo mode)

| ปัญหา | FR | Design | Feature (หน้าจอ) | Test (ผลจริง) |
|---|---|---|---|---|
| ผู้สูงอายุสมัครบัญชียาก; ผู้ดูแลไม่อยู่ด้วย | FR-01 | architecture §5.5, §6, §7.1 | S-01, S-04, C-01, C-09 · `features/pairing.js` | `pairing` 10 + `repoPairing` 7 + `pairingView` 11 ผ่าน (AC 2–6 ✅ Demo) · ค้าง: Rules R-2…R-8 ใน Emulator, QR จริง, MT-01 |
| ผู้ดูแลอยากให้ช่วยกรอกข้อมูลยาจากฉลาก | FR-02 | architecture §5.4, §7.2 | C-02…C-06 · `features/medicineSetup.js` | `schedule` 16 + `labelDraft` 18 + `demoData` 10 + `medicineSetupView` 15 ผ่าน (AC 8 ข้อ ✅ Demo) · ค้าง: AI อ่านฉลากจริง, `redact.js` (AC 5, 9), MT-09/13 |
| ลืมกินยา / กินไม่ตรงเวลา | FR-03 | architecture §5.1, §7.3 | S-03 · `features/reminder.js` | `mealTimeline` 18 + `time` 3 + `reminderHomeView` 15 (ร่วม FR-04) ผ่าน (AC 3–6 ✅ Demo) · ค้าง: เสียงเตือนบนมือถือ MT-04 |
| จำไม่ได้ว่ากินแล้วหรือยัง | FR-04 | architecture §5.3, §6 | S-02, S-03 · `features/home.js` | `confirm` 10 + `repo` 13 + `clock` 5 + `offlineQueue` 7 + `reminderHomeView` ผ่าน (AC 9 ข้อ ✅ Demo) · ค้าง: AC 7 ส่งภายใน 10 วินาที MT-05, R-7/R-9 |
| โทร/ส่ง LINE ถามทุกมื้อ | FR-05 | architecture §5.3, §6 | C-07, C-08 · `features/caregiverStatus.js` | `status` 16 + `alerts` 5 + `caregiverStatusView` 10 ผ่าน (AC 9 ข้อ ✅ Demo) · ค้าง: AC 7 ปิดหน้าเว็บจริง MT-06, เรียลไทม์บน Firestore |

รวม: `npm test` ผ่าน 328 / 0 ไม่ผ่าน · ✅ เฉพาะในขอบเขต Demo mode (หน้าจอจริง + logic + localRepo) — ผลบนมือถือจริง, Security Rules ใน Emulator และ AI อ่านฉลากจริง **ยังไม่มี** ห้ามเปลี่ยนเป็น ✅ จนกว่าจะมีผลจริง
