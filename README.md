🌐 **ภาษา / Language:** ไทย · [English](README.en.md)

# MedMind — ระบบเตือนกินยาและแจ้งสถานะให้ผู้ดูแลผู้สูงอายุ

> **Intro to Software Engineering (15031001) — ปีการศึกษา 2569** · คณะ/สาขา: School of Applied Digital Technology, Mae Fah Luang University
>
> **ทดลองใช้งานจริง:** https://yaroo393-png.github.io/MedMind/
>
> **โหมดสาธิต:** https://yaroo393-png.github.io/MedMind/demo.html

## การรวมเว็บใหม่ (9 พ.ย. 2569 — รอรีวิว)

นำหน้าตาและการทำงานจาก [เว็บทดสอบ MedMind](https://medmind-fr09-test-20261108.rossatoun.chatgpt.site/) ต้นฉบับ `daa4e47e902d9ba20c95de1c62a4a4597767bc9f` มารวมบน `main` ฐาน `08bd3a4` (รวม PR #63 ระบบสแกน/OCR และ PR #64 โครงสร้าง repo แล้ว) โดยคง `index.html`, `senior.html`, `caregiver.html`, `demo.html` และลิงก์ด้านบน ใช้ภาษาไทย–อังกฤษ ธีมที่ลดความสว่าง และการรักษาข้อความ/เคอร์เซอร์ขณะกรอกฟอร์มจากเว็บใหม่

ส่วนสแกน FR-02 ยังคงการปิดข้อมูลก่อนส่งภาพ, Gemini พร้อม timeout/โมเดลสำรอง, OCR ในเครื่อง และการทิ้งผลเก่าหลังยกเลิกของ PR #63 · FR-09 เพิ่มแท็บสรุปในหน้าผู้ดูแลและตัวอย่างใน Demo; [เกณฑ์รับงาน FR-09](fr/FR-09-weekly-summary/README.md) ยังรอทีมรับรอง ไม่เปลี่ยน SRS หรือกฎความปลอดภัย · ไม่รวม `qa-fr09.html` และ `js/qa/` ของเว็บทดสอบ

**ผลตรวจชุดรวม:** npm run check: 460/460 tests passed; check:secrets passed · ยังไม่รับรองผล Firebase/Gemini จริงหรือมือถือ Android จริง · เจ้าของงานยังต้องอ่านโค้ด และให้อีก 1 คนรีวิวก่อน merge ตาม `RULES.md` §2; เอกสารนี้ไม่ใช่หลักฐานว่าเผยแพร่ขึ้นเว็บจริงแล้ว

## สถานะปัจจุบัน
| ส่วน | สถานะ |
|---|---|
| M1 Team Charter | ✅ ฉบับสมบูรณ์ (มีขอบเขต in/out + ตัววัดความสำเร็จ) — [`M1-Charter_MedMind.pdf`](docs/00-charter/M1-Charter_MedMind.pdf) · อ่านบน GitHub: [`charter.md`](docs/00-charter/charter.md) |
| M2 SRS | ✅ v1.5 (FR-01–05 Must, FR-06 Should, FR-07–09 Could · BR-01–21 · NFR-01–14 · use case + diagram · Document history) — [`M2-SRS_MedMind.pdf`](docs/01-requirements/M2-SRS_MedMind.pdf) · [`spec.md`](docs/01-requirements/spec.md) · [`backlog.md`](docs/01-requirements/backlog.md) |
| M2 Design | ✅ ร่างครบและสัญญาโมดูลตกลงแล้ว (DL-18–DL-20, DL-26; รวม Demo mode, ADR-8) — [`architecture.md`](docs/02-design/architecture.md), [`design-system.md`](docs/02-design/design-system.md), [`firestore-rules-draft.md`](docs/02-design/firestore-rules-draft.md) · เรื่องที่ยังเปิด: §11 |
| Traceability (Golden Thread) | 🟡 ครบ 43 AC — ✅ ใน Demo mode เป็นส่วนใหญ่ · ส่วนที่ค้าง (Rules บน Firestore, มือถือจริง, AI จริง) ระบุไว้ในแต่ละแถว — [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) |
| ต้นแบบ M3 (`prototype/`) | ✅ ครบ FR-01–05 + ทางที่ผิด + โหมดสาธิต 2 จอ — เปิดได้โดยไม่ต้องมี server — [`prototype/index.html`](prototype/index.html) · [`NOTES.md`](prototype/NOTES.md) · ยังไม่ได้ทดสอบบนมือถือจริง (MT-08, MT-16) |
| ระบบ (เว็บแอป) `public/` | 🟡 **Demo mode** (`demo.html`) เสร็จ · **ใช้งานจริงบน Firebase** (`senior.html` / `caregiver.html`) เขียนเสร็จ: จับคู่ด้วย QR จริง · Firestore + Security Rules · AI อ่านฉลากด้วย Gemini หลังปิดชื่อ/HN — ทดสอบกับ Firebase Emulator และ 2 เบราว์เซอร์แล้ว · **ยังไม่ได้ทดสอบบนมือถือจริงกับโปรเจกต์จริง และยังไม่เคยเรียก Gemini จริง** · ตั้งค่า: [`docs/FIREBASE-SETUP.md`](docs/FIREBASE-SETUP.md) |
| เทสต์อัตโนมัติ | ✅ `npm test` 460 เทสต์ผ่าน (logic, core, หน้าจอทุก FR ระดับ AC, QR, AI อ่านฉลากด้วยของปลอม, โครงสร้างหน้าเว็บ) · ✅ `emulator-tests/` 31 เทสต์ผ่าน (Security Rules R-1…R-14 + `firestoreRepo` กับ Firebase Emulator — CI งาน `emulator`) · ยังไม่มี: ผลบนมือถือจริง |
| แผนงาน (Week 10) | 🟡 sprint 0–3, ความเสี่ยง, บทบาทหมุนเวียน, retro — [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md) |
| Final Report / AI-Use Statement / Demo | 🟡 Final Report และ AI-Use Statement มีเนื้อหาแล้ว (ช่อง [ ] = ยังไม่มีผลจริง) · สไลด์ยังเป็นโครงเรื่อง — [`docs/05-report/`](docs/05-report/), [`docs/06-presentation/`](docs/06-presentation/) |

> ช่อง **[ ]** = ยังไม่มีข้อมูลจริง ไม่เดา · README นี้อัปเดตเมื่อมีผลจริง

## ภาพรวมโครงการ
**ปัญหา:** ผู้สูงอายุที่ต้องกินยาเม็ด/แคปซูลตามเวลาประจำอาจลืมกิน กินผิดเวลา หรือจำไม่ได้ว่ากินแล้วหรือยัง ขณะที่ลูกที่เป็นผู้ดูแลต้องออกไปทำงานและตามดูทั้งวันไม่ได้ วิธีที่ใช้อยู่ (นาฬิกาปลุก กล่องยา โทร/LINE) ยืนยันสถานะและรายงานให้ผู้ดูแลโดยอัตโนมัติไม่ได้

**MedMind ตอบ 2 คำถาม:** "มื้อนี้ต้องกินยาอะไร กินแล้วหรือยัง" (ผู้สูงอายุ) และ "ยาทุกมื้อวันนี้ถูกกินครบหรือยัง โดยไม่ต้องโทรถาม" (ผู้ดูแล)

**ผู้ใช้หลัก:** ผู้สูงอายุที่กินยาเม็ด/แคปซูลเวลาตายตัว · ลูก/ผู้ดูแลที่ไม่ได้อยู่ด้วยตลอดวัน · ข้อมูลจากการสัมภาษณ์ผู้ใช้ 3 คน (3–4 ก.ย. 2569 ทางโทรศัพท์)

### ขอบเขต MVP
| FR | ฟีเจอร์ | Priority | ผู้รับผิดชอบ |
|---|---|---|---|
| FR-01 | จับคู่ผู้สูงอายุ–ผู้ดูแลด้วย QR / รหัส 6 หลัก (ผู้สูงอายุยินยอมก่อน ไม่ต้องมีบัญชี) | Must | Takkan Khanlui |
| FR-02 | ถ่ายฉลากยา → **ผู้ดูแลปิดชื่อ/HN** → **AI (Gemini) ร่างรายการยา** → ผู้ดูแลตรวจ → บันทึก | Must | Yar Oo |
| FR-03 | เตือนทุกมื้อ (เสียง + ยาทั้งมื้อ) และเตือนซ้ำ T+5, T+10 — หัวใจของ MVP | Must | Rossatorn Sangkaew |
| FR-04 | ยืนยันทั้งมื้อด้วยการกดครั้งเดียว (ยืนยันย้อนหลังได้, ใช้ได้ขณะออฟไลน์) | Must | Nichanan Lalua |
| FR-05 | แจ้งผู้ดูแลเมื่อมื้อยังไม่ยืนยัน (ภายใน T+15) + สถานะรายวัน | Must | Suchitra Khomdee |
| FR-06–08 | หลายผู้ดูแล · รายการยาทั้งหมด · รูปยา | Should / Could | หลัง MVP |
| FR-09 | AI สรุปรายสัปดาห์ให้ผู้ดูแล (ส่งเฉพาะสถานะมื้อ ไม่มีชื่อ/HN/ยา) | Could | หลัง FR-01–05 เสร็จ |

**ฟีเจอร์ AI:** อ่านฉลากด้วย Gemini ผ่าน Firebase AI Logic (FR-02) — AI **แค่ร่าง** ผู้ดูแลตรวจทุกครั้ง ไม่ให้คำแนะนำยา และเวลาเตือนคำนวณโดยระบบตามกฎ ไม่ใช่โดย AI

## 🧵 The Golden Thread
*คะแนนไม่ได้ให้ที่ความสวยของแอป แต่ให้ที่ความต่อเนื่อง: ปัญหา → requirement → design → feature → test*

| ปัญหา | → FR | → Design | → Feature | → Test |
|---|---|---|---|---|
| ผู้สูงอายุสมัครบัญชียาก; ผู้ดูแลไม่อยู่ด้วย | **FR-01** | [architecture §6, §7.1](docs/02-design/architecture.md) | S-01, C-01 · [`fr/FR-01-pairing`](fr/FR-01-pairing/README.md) | AC 1–6 · NFR-04, 05, 10 |
| ผู้ดูแลอยากให้ช่วยกรอกข้อมูลยาจากฉลาก | **FR-02** | [architecture §5, §7.2, ADR-3](docs/02-design/architecture.md) | C-02…C-05 · [`fr/FR-02-label-scan`](fr/FR-02-label-scan/README.md) | AC 1–11 · NFR-06, 08, 09, 11, 14 |
| ลืมกินยา / กินไม่ตรงเวลา | **FR-03** | [architecture §5.1, §7.3](docs/02-design/architecture.md) | S-03 · [`fr/FR-03-reminder`](fr/FR-03-reminder/README.md) | AC 1–6 · NFR-01 |
| จำไม่ได้ว่ากินแล้วหรือยัง | **FR-04** | [architecture §6 (`doses`)](docs/02-design/architecture.md) | S-02, S-03 · [`fr/FR-04-confirm`](fr/FR-04-confirm/README.md) | AC 1–10 · NFR-02, 03, 07, 12 |
| โทร/ส่ง LINE ถามทุกมื้อ ไม่มีสถานะรวม | **FR-05** | [architecture §6 (`alertSeen`)](docs/02-design/architecture.md) | C-07, C-08 · [`fr/FR-05-caregiver-status`](fr/FR-05-caregiver-status/README.md) | AC 1–10 · NFR-01, 12, 13 |
| ผู้ดูแลอยากเห็นภาพรวมบันทึกยืนยันหลายวัน | **FR-09 (Could; รอรับรองเกณฑ์)** | [architecture §5](docs/02-design/architecture.md) | C-10 (`cg-weekly`) · [`fr/FR-09-weekly-summary`](fr/FR-09-weekly-summary/README.md) | เทสต์สรุป/สิทธิ์/ภาษาใน `tests/`; ไม่แทนผลบริการจริง |

รายละเอียดทีละ AC → โค้ด → เทสต์ อยู่ใน [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) · **SRS เป็นแหล่งความจริง** แก้ SRS ก่อนแล้วคัดมาที่นี่

## 👥 ทีมและการแบ่งงาน
| ชื่อ–นามสกุล | รหัสนักศึกษา | GitHub | บทบาท | ฟีเจอร์ที่เขียน (ครบสาย: logic + เทสต์ + หน้าจอ) | งานของฉัน |
|---|---|---|---|---|---|
| Yar Oo | 6931503064 | [yaroo393-png](https://github.com/yaroo393-png) | Project Manager | **FR-02** อ่านฉลากด้วย AI · รวมเอกสารทั้งหมด · repo/CI | [`fr/FR-02-label-scan`](fr/FR-02-label-scan/README.md) |
| Takkan Khanlui | 6931503035 | [V31311](https://github.com/V31311) | System Designer | **FR-01** จับคู่ · `core/firebase.js`, `core/repo.js`, Security Rules · Design doc | [`fr/FR-01-pairing`](fr/FR-01-pairing/README.md) |
| Rossatorn Sangkaew | 6931503066 | [IDK-SleepyBro](https://github.com/IDK-SleepyBro) | UX/UI Designer | **FR-03** เตือนทุกมื้อ (`mealState`) · Design system · หน้าจอ | [`fr/FR-03-reminder`](fr/FR-03-reminder/README.md) |
| Nichanan Lalua | 6931503049 | [KaidangSuk](https://github.com/KaidangSuk) | Prototype Developer | **FR-04** ยืนยันมื้อยา · หน้าหลักผู้สูงอายุ | [`fr/FR-04-confirm`](fr/FR-04-confirm/README.md) |
| Suchitra Khomdee | 6931503079 | [Khaiwann](https://github.com/Khaiwann) | QA / Tester | **FR-05** แจ้งผู้ดูแล + สถานะรายวัน · แผนและผลทดสอบ (MT) | [`fr/FR-05-caregiver-status`](fr/FR-05-caregiver-status/README.md) |

กติกาการทำงาน (branch, PR, การใช้ AI, PDPA): [`RULES.md`](RULES.md) · ส่วนร่วมรายคนวัดจาก GitHub — **ทุกคน commit ด้วยบัญชีของตัวเอง**

## 📂 สารบัญเอกสารและโครงสร้าง repo
```text
docs/
├── 00-charter/
│   ├── M1-Charter_MedMind.pdf   # M1 (ฉบับส่ง): ปัญหา, ผู้ใช้, ขอบเขต in/out, ตัววัดความสำเร็จ, Gate 1–3, SDLC, ทีม
│   └── charter.md               # สำเนาอ่านบน GitHub (อังกฤษ) · charter.th.md = ฉบับแปลไทย
├── 01-requirements/
│   ├── M2-SRS_MedMind.pdf       # M2 (ฉบับส่ง) SRS v1.5
│   ├── spec.md                  # สำเนา SRS อ่านบน GitHub (อังกฤษ) · spec.th.md = ฉบับแปลไทย (FR, AC, BR, NFR, use case, traceability, AI log §8)
│   ├── backlog.md               # Product Backlog: MoSCoW + pain + ขนาดงาน + สถานะ
│   └── decision-log.md          # มติที่ทีมอนุมัติ (A1, A5) + Pending Decisions
├── 02-design/
│   ├── architecture.md          # สถาปัตยกรรม, ADR 1–8 (รวม Demo mode), โมดูล+สัญญา, ERD, sequence/state
│   ├── design-system.md         # tokens (ตรวจ contrast แล้ว), คอมโพเนนต์, Screen Map (หน้าจอ ↔ FR)
│   ├── firestore-rules-draft.md # ร่าง Security Rules + เทสต์ R-1…R-14 (ยังไม่ทดสอบ)
│   └── diagrams/                # use-case-diagram.png
├── 05-report/
│   ├── final-report.md          # Final Report + ตาราง Golden Thread
│   └── ai-use-statement.md      # M3 AI-Use Statement
├── 06-presentation/
│   ├── demo-slides.md           # โครงสไลด์ Problem → Solution (ข้อความของสไลด์)
│   ├── demo-script.md           # สคริปต์เดโม 5 นาที
│   └── oral-exam-prep.md        # ชุดซ้อมสอบปากเปล่า
├── TRACEABILITY.md              # Golden Thread: AC → โค้ด → เทสต์, NFR, BR, แผนทดสอบมือ MT-01…16
├── AI_USAGE_LOG.md              # บันทึกการใช้ AI ตามจริง (log เต็ม)
├── PROJECT-PLAN.md              # sprint, velocity, ความเสี่ยง, บทบาทหมุนเวียน, retrospective
└── GITHUB-SETUP.md              # labels, milestones, ruleset, issue ชุดแรก
fr/FR-01…FR-05/README.md          # งานของแต่ละคน (หลักฐานส่วนร่วมรายคน)
fr/FR-09-weekly-summary/README.md # สรุปรายสัปดาห์: ขอบเขตและเกณฑ์ที่เสนอให้ทีมรีวิว
prototype/                        # ต้นแบบ M3 คลิกได้ — เปิด index.html ด้วยดับเบิลคลิก ไม่ต้องมี server (app.html, demo.html, css/, js/, NOTES.md, TEST-CHECKLIST.md)
slides/                           # สไลด์เดโม: demo-slides.pdf (ไฟล์ส่ง) · demo-slides.pptx (ไฟล์ต้นฉบับที่แก้ได้)
public/                           # เว็บแอปจริง: index / senior / caregiver / demo .html + css/ + js/{logic,core,services,features}/
tests/                            # node --test
scripts/check-secrets.js          # ตรวจความลับ/ไฟล์ต้องห้าม
.github/                          # CI, PR template, issue template
README.md (ไทย) · README.en.md (English) · CLAUDE.md · RULES.md
```

## 🚀 วิธีเปิดใช้งาน

### ① เปิดต้นแบบที่คลิกเดินได้ (สำหรับผู้ตรวจ M3) — ไม่ต้องติดตั้งอะไร ไม่ต้องมี server
1. โหลดโค้ด: กด **Code → Download ZIP** บน GitHub แล้วแตกไฟล์ (หรือ `git clone https://github.com/yaroo393-png/MedMind.git`)
2. เปิดไฟล์ในเบราว์เซอร์ด้วยการ **ดับเบิลคลิก**:
   - [`prototype/demo.html`](prototype/demo.html) — **จอผู้สูงอายุและจอผู้ดูแลคู่กัน** ใช้ข้อมูลชุดเดียวกัน มีนาฬิกาจำลอง (เลือก "สถานการณ์" เช่น `07:00 — ถึงเวลาเตือน 2 มื้อพร้อมกัน`, ปุ่ม +5 นาที / ไปเวลาเตือนถัดไป / ไป T+15 พอดี, ช่อง "ตั้งเวลาจำลอง" ถึงมิลลิวินาที) — เดินครบ FR-01–05 ทั้งทางถูกและทางผิดในเบราว์เซอร์เดียว
   - [`prototype/app.html`](prototype/app.html) — จอเดียว สลับบทบาทได้
   - [`prototype/index.html`](prototype/index.html) — **สารบัญ**: ตารางครอบคลุม acceptance criteria ทั้ง 43 ข้อ บอกว่าข้อไหนดูได้ที่หน้าจอไหน (ทางผิดมีเครื่องหมาย ❌)
3. ทุกหน้ามีแถบ **"Covers: FR-xx"** บอกว่าหน้านี้ตอบ FR/BR ข้อไหน · ข้อมูลทั้งหมดเป็นข้อมูลสมมติ ไม่ส่งข้อมูลออกนอกเครื่อง
4. รายละเอียด วิธีลอง และข้อจำกัดของต้นแบบ: [`NOTES.md`](prototype/NOTES.md) · รายการทดสอบด้วยมือ: [`TEST-CHECKLIST.md`](prototype/TEST-CHECKLIST.md)

> ต้นแบบเป็นของจำลอง (กฎเวลาเขียนซ้ำไว้ในต้นแบบ) — กฎจริงอยู่ใน `public/js/logic/` และพิสูจน์ด้วยเทสต์อัตโนมัติ (ข้อ ② ด้านล่าง)

### ② เทสต์อัตโนมัติของโค้ดจริง

ต้องมี Node.js 22 ขึ้นไป (Windows PowerShell ใช้ `npm.cmd` แทน `npm`):
```bash
git clone https://github.com/yaroo393-png/MedMind.git
cd MedMind
npm test              # เทสต์อัตโนมัติ (ไม่ต้อง npm install)
npm run check         # test + ตรวจความลับ — รันก่อน push ทุกครั้ง
```
### ③ Demo mode ของระบบจริงใน `public/` (หน้าจอจริงที่ต่อกับ `logic/` + `core/`)
ใช้ ES modules จึงต้องเปิดผ่าน static server (ไม่ใช่ดับเบิลคลิก `file://`):
```bash
cd public
python -m http.server 8000      # หรือ: npx serve public · หรือ Live Server ใน VS Code
```
แล้วเปิด `http://localhost:8000/demo.html` — จอผู้สูงอายุกับจอผู้ดูแลคู่กัน ใช้ข้อมูลตัวอย่างและนาฬิกาจำลอง (ละเอียดถึงมิลลิวินาที) · เลือก "สถานการณ์" ที่แถบด้านบน หรือเปิดตรง ๆ เช่น `demo.html?preset=reminding` (สถานการณ์: `fresh`, `sample`, `reminding`, `round2`, `notconfirmed`, `late`, `offline`, `syncdelay`)
เดินครบ FR-01–05 ทั้งทางปกติและทางผิด · ลิงก์ทดลองใช้บนเว็บ: [https://yaroo393-png.github.io/MedMind/demo.html](https://yaroo393-png.github.io/MedMind/demo.html)

### ④ ใช้งานจริงบนมือถือ 2 เครื่อง (Firebase)
- เครื่องผู้สูงอายุเปิด `senior.html` → กดยินยอม → แสดง QR + รหัส 6 หลัก · เครื่องผู้ดูแลสแกน QR ด้วยแอปกล้อง (เปิด `caregiver.html` พร้อมเติมรหัส) → เชื่อมต่อ
- ลิงก์บนเว็บ: `https://yaroo393-png.github.io/MedMind/` · ต้องวาง Security Rules ในคอนโซลก่อน — ดู [`docs/FIREBASE-SETUP.md`](docs/FIREBASE-SETUP.md)
- **ฉลากที่ใช้ต้องปิดชื่อ HN QR และบาร์โค้ดก่อนกด "ส่งให้ AI" ทุกครั้ง** (BR-19) · เตือนได้เฉพาะตอนเปิดหน้า MedMind ไว้

## ⚙️ ข้อจำกัดที่สำคัญ (จาก SRS §2.2)
- การกดยืนยันเป็นการรายงานด้วยตนเอง ไม่ใช่หลักฐานว่ากินยาจริง · ข้อความถึงผู้ดูแลใช้ "Medicine not yet confirmed" (ไม่ใช้ "not taken")
- ระบบเป็นเว็บแอป **ไม่มี server code** — เตือนผู้สูงอายุและแจ้งผู้ดูแลเฉพาะตอนเปิดหน้าเว็บ (ตอนปิดหน้า/ล็อกจอ ไม่มีการแจ้ง) · เสียงเตือนดังหลังแตะหน้าจอครั้งแรก
- ทดสอบบน **Android (Chrome) และ iPhone (Safari)** — บน iOS หน้าเว็บอาจถูกพักเมื่อล็อกจอ ต้องทดสอบ (MT-16)
- ต้องใช้อินเทอร์เน็ตแชร์สถานะ (ยืนยันตอนออฟไลน์จะส่งเมื่อกลับมาออนไลน์)
- รองรับเฉพาะยาเม็ด/แคปซูลเวลาตายตัว (ไม่รองรับยาเมื่อมีอาการ ยาน้ำ ครึ่งเม็ด)
- AI อ่านฉลากผิดได้ — ผู้ดูแลต้องตรวจทุกช่องก่อนบันทึก · ระบบไม่วินิจฉัย ไม่แนะนำยา ไม่เปลี่ยนวิธีใช้ยา

## 🔒 ความเป็นส่วนตัว (PDPA)
- ข้อมูลยาและสถานะการกินยาเป็นข้อมูลสุขภาพ — เก็บเท่าที่ FR ใช้ ไม่เก็บชื่อ/HN/เลขบัตร/ที่อยู่/วันเกิด/เบอร์โทร และ **ไม่เก็บรูปฉลาก** (NFR-09)
- ก่อนส่งรูปให้ AI ผู้ดูแลต้องปิดชื่อ HN บาร์โค้ด และข้อมูลส่วนตัวอื่น แล้วติ๊กยืนยัน (BR-19) · Gemini แบบฟรีอาจนำข้อมูลที่ส่งไปปรับปรุงผลิตภัณฑ์ — หน้ายินยอมต้องแจ้งข้อนี้
- เมื่อยกเลิกจับคู่ ข้อมูลของคู่นั้นถูกลบ (BR-17, NFR-10)
- ห้ามนำรูปฉลากจริงขึ้น repo (`test-labels/` ถูก ignore)

## 🤖 การใช้ AI ในการพัฒนา
บันทึกตามจริงที่ [`docs/AI_USAGE_LOG.md`](docs/AI_USAGE_LOG.md) · สรุปใน [`docs/05-report/ai-use-statement.md`](docs/05-report/ai-use-statement.md) · SRS §8 มีเฉพาะแถวที่ทีมเลือก (ดูหมายเหตุ ¹ ใน log)

## 📚 แหล่งอ้างอิง
- ข้อมูลผู้ใช้: การสัมภาษณ์ 3 คน — M1 Charter Gate 1
- W3C. *WCAG 2.2 — Target Size (Enhanced)* — https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html · *Contrast (Minimum)* — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html (NFR-03)
- Apple. *Human Interface Guidelines — Accessibility* — https://developer.apple.com/design/human-interface-guidelines/accessibility · Google. *Material Design — Accessibility* — https://m2.material.io/design/usability/accessibility.html (NFR-03)
- Nielsen, J. *Why You Only Need to Test with 5 Users*. NN/g — https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ (NFR-02)
- Firebase. *Gemini API using Firebase AI Logic* — https://firebase.google.com/docs/ai-logic (ADR-3) · Google. *Gemini API Additional Terms of Service* (ส่วน Unpaid Services) — https://ai.google.dev/gemini-api/terms
- พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) (NFR-09, NFR-10, BR-17, BR-19)
- เอกสารรายวิชา Intro to Software Engineering 2569: คู่มือ M1, M2, M3 และ Milestone 4 — Final Project
