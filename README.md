# MedMind — ระบบเตือนกินยาและแจ้งสถานะให้ผู้ดูแลผู้สูงอายุ

> **Intro to Software Engineering (15031001) — ปีการศึกษา 2569** · คณะ/สาขา: School of Applied Digital Technology, Mae Fah Luang University
> **ทีม:** MedMind · **Repository:** https://github.com/yaroo393-png/MedMind · **ลิงก์ทดลองใช้:** [ ยังไม่มี — ใส่หลัง deploy ]

## สถานะปัจจุบัน
| ส่วน | สถานะ |
|---|---|
| M1 Team Charter | ✅ ฉบับสมบูรณ์ (มีขอบเขต in/out + ตัววัดความสำเร็จ) — [`M1-Charter_MedMind.pdf`](docs/01-charter/M1-Charter_MedMind.pdf) · อ่านบน GitHub: [`charter.md`](docs/01-charter/charter.md) |
| M2 SRS | ✅ v1.2 (FR-01–05 Must, FR-06 Should, FR-07–09 Could · BR-01–19 · NFR-01–14 · use case + diagram · Document history) — [`M2-SRS_MedMind.pdf`](docs/02-requirements/M2-SRS_MedMind.pdf) · [`spec.md`](docs/02-requirements/spec.md) · [`backlog.md`](docs/02-requirements/backlog.md) |
| M2 Design | 🟡 ฉบับร่าง (รวม Demo mode, ADR-8) — [`architecture.md`](docs/03-design/architecture.md), [`design-system.md`](docs/03-design/design-system.md), [`firestore-rules-draft.md`](docs/03-design/firestore-rules-draft.md) · รอทีมตรวจและตัดสินใจ §11 |
| Traceability (Golden Thread) | 🟡 โครงพร้อม — [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) · ช่อง Code/Test เติมเมื่อมีโค้ด |
| ระบบ (เว็บแอป) | ⬜ ยังไม่เริ่มเขียน — Increment 1: FR-03–05 · Increment 2: FR-01–02 |
| เทสต์อัตโนมัติ | ⬜ มีเฉพาะเทสต์โครง repo (`tests/repo-structure.test.js`) · เทสต์ของ FR เพิ่มพร้อมโค้ด |
| แผนงาน (Week 10) | 🟡 sprint 0–3, ความเสี่ยง, บทบาทหมุนเวียน, retro — [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md) |
| Final Report / AI-Use Statement / Demo | 🟡 โครงร่าง — [`docs/05-report/`](docs/05-report/), [`docs/06-presentation/`](docs/06-presentation/) |

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
| ผู้สูงอายุสมัครบัญชียาก; ผู้ดูแลไม่อยู่ด้วย | **FR-01** | [architecture §6, §7.1](docs/03-design/architecture.md) | S-01, C-01 · [`fr/FR-01-pairing`](fr/FR-01-pairing/README.md) | AC 1–6 · NFR-04, 05, 10 |
| ผู้ดูแลอยากให้ช่วยกรอกข้อมูลยาจากฉลาก | **FR-02** | [architecture §5, §7.2, ADR-3](docs/03-design/architecture.md) | C-02…C-05 · [`fr/FR-02-label-scan`](fr/FR-02-label-scan/README.md) | AC 1–9 · NFR-06, 08, 09, 11, 14 |
| ลืมกินยา / กินไม่ตรงเวลา | **FR-03** | [architecture §5.1, §7.3](docs/03-design/architecture.md) | S-03 · [`fr/FR-03-reminder`](fr/FR-03-reminder/README.md) | AC 1–5 · NFR-01 |
| จำไม่ได้ว่ากินแล้วหรือยัง | **FR-04** | [architecture §6 (`doses`)](docs/03-design/architecture.md) | S-02, S-03 · [`fr/FR-04-confirm`](fr/FR-04-confirm/README.md) | AC 1–7 · NFR-02, 03, 07, 12 |
| โทร/ส่ง LINE ถามทุกมื้อ ไม่มีสถานะรวม | **FR-05** | [architecture §6 (`alertSeen`)](docs/03-design/architecture.md) | C-07, C-08 · [`fr/FR-05-caregiver-status`](fr/FR-05-caregiver-status/README.md) | AC 1–7 · NFR-01, 12, 13 |

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
├── 01-charter/
│   ├── M1-Charter_MedMind.pdf   # M1 (ฉบับส่ง): ปัญหา, ผู้ใช้, ขอบเขต in/out, ตัววัดความสำเร็จ, Gate 1–3, SDLC, ทีม
│   └── charter.md               # สำเนาอ่านบน GitHub
├── 02-requirements/
│   ├── M2-SRS_MedMind.pdf       # M2 (ฉบับส่ง) SRS v1.2
│   ├── spec.md                  # สำเนา SRS อ่านบน GitHub (FR, AC, BR, NFR, use case, traceability, AI log §8)
│   └── backlog.md               # Product Backlog: MoSCoW + pain + ขนาดงาน + สถานะ
├── 03-design/
│   ├── architecture.md          # สถาปัตยกรรม, ADR 1–8 (รวม Demo mode), โมดูล+สัญญา, ERD, sequence/state
│   ├── design-system.md         # tokens (ตรวจ contrast แล้ว), คอมโพเนนต์, Screen Map (หน้าจอ ↔ FR)
│   ├── firestore-rules-draft.md # ร่าง Security Rules + เทสต์ R-1…R-8 (ยังไม่ทดสอบ)
│   └── diagrams/                # use-case-diagram.png
├── 05-report/
│   ├── final-report.md          # Final Report + ตาราง Golden Thread (โครงร่าง)
│   └── ai-use-statement.md      # สรุปการใช้ AI (โครงร่าง)
├── 06-presentation/
│   └── demo-slides.md           # โครงสไลด์ Problem → Solution
├── TRACEABILITY.md              # Golden Thread: AC → โค้ด → เทสต์, NFR, BR, แผนทดสอบมือ MT-01…15
├── AI_USAGE_LOG.md              # บันทึกการใช้ AI ตามจริง (log เต็ม)
├── PROJECT-PLAN.md              # sprint, velocity, ความเสี่ยง, บทบาทหมุนเวียน, retrospective
└── GITHUB-SETUP.md              # labels, milestones, ruleset, issue ชุดแรก
fr/FR-01…FR-05/README.md          # งานของแต่ละคน (หลักฐานส่วนร่วมรายคน)
public/                           # เว็บแอป: index.html (เลือกบทบาท) · senior.html · caregiver.html · demo.html (ผู้ตรวจ) · css/ · js/{core,logic,services,features}/
tests/                            # node --test
scripts/check-secrets.js          # ตรวจความลับ/ไฟล์ต้องห้าม
.github/                          # CI, PR template, issue template
README.md · CLAUDE.md · RULES.md
```

## 🚀 วิธีเปิดใช้งาน
**ตอนนี้ยังไม่มีระบบให้เปิด** (ดูสถานะด้านบน) — ส่วนนี้จะอัปเดตเมื่อ Increment 1 เสร็จ

ต้องมี Node.js 22 ขึ้นไป (Windows PowerShell ใช้ `npm.cmd` แทน `npm`):
```bash
git clone https://github.com/yaroo393-png/MedMind.git
cd MedMind
npm test              # เทสต์อัตโนมัติ (ไม่ต้อง npm install)
npm run check         # test + ตรวจความลับ — รันก่อน push ทุกครั้ง
```
เปิดเว็บในเครื่อง (เมื่อมีหน้าเว็บ): ให้ static server ชี้โฟลเดอร์ `public/` เช่น Live Server ใน VS Code (ไม่เปิดไฟล์ HTML ด้วย `file://` เพราะใช้ ES modules) · ลิงก์ทดลองใช้: [ ใส่หลัง deploy ]

**ใช้งานจริงบนมือถือ (1 เครื่อง = 1 บทบาท):** มือถือผู้สูงอายุเปิดลิงก์แล้วเลือก "ผู้สูงอายุ" (เห็น QR) · มือถือผู้ดูแลเปิดลิงก์เดียวกันเลือก "ผู้ดูแล" หรือสแกน QR ด้วยแอปกล้องของมือถือ → จับคู่ → ถ่ายฉลากจริงจากมือถือผู้ดูแล (ต้องเปิดผ่าน HTTPS) — architecture §5.0, ADR-9

**สำหรับผู้ตรวจ — Demo mode:** เปิด `demo.html` (ลิงก์: [ ใส่หลัง deploy ]) จะเห็นจอผู้สูงอายุและผู้ดูแลคู่กัน ใช้ข้อมูลตัวอย่างและนาฬิกาจำลอง (ปุ่ม +5 นาที / ไปเวลาเตือนถัดไป) ไม่ต้องมีบัญชี มือถือ 2 เครื่อง หรือ server — เดินครบทุก Must FR และทางผิดได้ (architecture ADR-8)

## ⚙️ ข้อจำกัดที่สำคัญ (จาก SRS §2.2)
- การกดยืนยันเป็นการรายงานด้วยตนเอง ไม่ใช่หลักฐานว่ากินยาจริง · ข้อความถึงผู้ดูแลใช้ "Medicine not yet confirmed" (ไม่ใช้ "not taken")
- ระบบเป็นเว็บแอป **ไม่มี server code** — เตือนผู้สูงอายุและแจ้งผู้ดูแลเฉพาะตอนเปิดหน้าเว็บ (ตอนปิดหน้า/ล็อกจอ ไม่มีการแจ้ง) · เสียงเตือนดังหลังแตะหน้าจอครั้งแรก
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
