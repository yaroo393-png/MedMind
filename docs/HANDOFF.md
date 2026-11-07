# HANDOFF — แผนงานจนเสร็จ 100% (สำหรับ Claude Code บัญชีอื่น และสมาชิกทุกคน)

> ตรวจจาก `main` ที่ commit `154260f` (7 พ.ย. 2569) แล้วอัปเดตหลังเขียนหน้าจอจริง (PR `feat/real-screens`) · `npm test` ผ่าน **328** ไม่ผ่าน 0 · `npm run check` ผ่าน
> เอกสารนี้ **ไม่ใช่ requirement** — requirement อยู่ใน SRS (`docs/01-requirements/spec.md`) ถ้าเอกสารนี้ขัดกับ SRS ให้ยึด SRS แล้วแก้เอกสารนี้
> สัญลักษณ์: ✅ เสร็จและมีหลักฐาน · 🟡 บางส่วน · ⬜ ยังไม่เริ่ม · **[ ]** ข้อมูลที่ต้องได้จากคนจริง ห้ามเดา

---

## 0. อ่านก่อนเริ่ม (สำหรับ Claude Code ที่รับงานต่อ)

1. อ่านตามลำดับนี้ก่อนลงมือ: `CLAUDE.md` → `RULES.md` → **เอกสารนี้** → `docs/01-requirements/spec.md` (FR/AC/BR/NFR) → `docs/02-design/architecture.md` §5–§7 → `docs/TRACEABILITY.md` → `docs/01-requirements/decision-log.md`
2. **ถามก่อนว่าผู้ใช้คือสมาชิกคนไหน** แล้วทำเฉพาะงานของคนนั้น (ตาราง §5 ด้านล่าง + ตาราง "ทีมและการแบ่งงาน" ใน `README.md`) — คะแนนรายคนวัดจาก GitHub ของบัญชีตัวเอง
3. เสนอแผนสั้น ๆ (เป้าหมาย, ไฟล์ที่จะแก้, วิธีทดสอบ) แล้ว **รออนุมัติ** ก่อนลงมือ
4. **ห้าม commit / push / เปิด PR** ถ้าผู้ใช้ไม่ได้สั่งในข้อความนั้น · ห้าม push เข้า `main` · branch ตั้งชื่อ `feat/frXX-...` หรือ `docs/...`
5. ห้ามเดา requirement · ห้ามใส่ข้อมูลผู้ป่วยจริง/รูปฉลากจริงใน repo, Issue, PR หรือ prompt · ห้ามใส่ key/token ในโค้ด · ห้ามเพิ่ม server code (ไม่ใช้ Cloud Functions)
6. `logic/` เป็นฟังก์ชันล้วน: ห้ามแตะ DOM, Firebase, `Date.now()` · ข้อความจากผู้ใช้/AI ต้อง escape ก่อนใส่ HTML · ทุกหน้าจอมีป้าย `Covers: FR-xx`
7. หลังทำงาน: รัน `npm test` (ทุกครั้ง) → อัปเดต `docs/TRACEABILITY.md` + เอกสารตาม `RULES.md` §5 → เพิ่มแถวใน `docs/AI_USAGE_LOG.md` (เขียนตามจริง ช่องตรวจ = "not yet reviewed" จนกว่าสมาชิกตรวจ)
8. ผู้ใช้ต้องอธิบายโค้ดได้ทุกบรรทัดตอนสอบปากเปล่า → ฟังก์ชันเล็ก ทำหน้าที่เดียว คอมเมนต์ภาษาไทยตามไฟล์เดิม แล้วอธิบายให้ผู้ใช้เข้าใจก่อนจบงาน
9. เครื่องของทีมเป็น Windows PowerShell → ใช้ `npm.cmd` · Node 22 · **ไม่ต้อง `npm install`** สำหรับเทสต์ปัจจุบัน

---

## 1. โปรเจกต์นี้คืออะไร (1 นาที)

**MedMind** — เว็บแอปเตือนกินยาเม็ด/แคปซูลของผู้สูงอายุ และแจ้งผู้ดูแล (ลูก) เฉพาะมื้อที่ยังไม่ยืนยันภายใน T+15 นาที ตอบ 2 คำถาม: ผู้สูงอายุ "มื้อนี้ต้องกินยาอะไร กินแล้วหรือยัง" · ผู้ดูแล "วันนี้กินครบหรือยัง โดยไม่ต้องโทรถามทุกมื้อ"
วิชา Intro to Software Engineering (15031001) ปี 2569 · ทีม 5 คน · repo `yaroo393-png/MedMind`

| คน | บัญชี GitHub | บทบาท | FR / งานหลัก |
|---|---|---|---|
| Yar Oo | `yaroo393-png` | PM | FR-02 (`schedule`, `labelDraft`, `redact`, `aiLabel`) · เอกสารรวม · repo/CI |
| Takkan Khanlui | `V31311` | System Designer | FR-01 (`pairing`) · `core/` (`clock`, `repo`, `firebase`) |
| Rossatorn Sangkaew | `IDK-SleepyBro` | UX | FR-03 (`time`, `mealTimeline`) · design system / CSS / หน้าจอ |
| Nichanan Lalua | `KaidangSuk` | Developer | FR-04 (`confirm`) · ต้นแบบ · Demo mode (`demoData`, `demo.html`) |
| Suchitra Khomdee | `khaiwann` | QA | FR-05 (`status`) · Security Rules tests (E-6, DL-12) · แผน/ผลทดสอบ MT |

**กำหนดการ:** ส่งงานและนำเสนอ **จันทร์ 9 พ.ย. 2569** กลุ่ม 8 เวลา 13:29–13:41 (มาก่อน 13:19) · 12 นาที = ตั้งเครื่อง 1 + เดโม 5 + ถามตอบ 6 (ทุกคนตอบ 1–2 ข้อ) · **ฟีเจอร์ที่ไม่ได้โชว์ = ถือว่าไม่ได้ทำ**

---

## 2. นิยาม "เสร็จ 100%"

แยกเป็น 2 ระดับ ทำ **ระดับ A ให้ครบก่อน 9 พ.ย.** ระดับ B เป็น increment ถัดไป (มติ DL-24)

### ระดับ A — ส่งงานวิชาได้คะแนนเต็ม (เกณฑ์อาจารย์ M3/M4)
| เกณฑ์ | คะแนน / ประตู | เงื่อนไขที่ต้องมีหลักฐาน |
|---|---|---|
| Prototype คลิกได้ครบทุก Must FR + ทางผิดอย่างน้อย 1 | 12 | เปิดในเบราว์เซอร์ได้ ไม่ต้องมี server/DB · ทุกหน้าชี้ FR · **เปิดได้จากลิงก์ในมือถือ** |
| Golden Thread | 6 · **ประตู: ด้ายขาด = จำกัด 50%** | ปัญหา → FR → design → หน้าจอ → เทสต์ ตรงกันทุกไฟล์ (README, TRACEABILITY, Final Report, สไลด์) |
| Demo & presentation | 6 | เดโม 5 นาทีเดินครบ FR-01–05 + ทางผิด · สไลด์จริง |
| Engineering & AI-first | 6 | PR + review + CI · เทสต์ · AI log ตามจริง |
| AI-Use Statement | **ประตู: ไม่มี = จำกัด 50%** | มีแล้ว (`docs/05-report/ai-use-statement.md`) — ต้องตรงกับ log |
| สอบปากเปล่า | 4 เกณฑ์ × 0–5 | ทุกคนอธิบายไฟล์ของตัวเองได้ · "อธิบายไม่ได้ = 0" |
| ส่วนร่วมรายคน | ตัวคูณ 1.00 / 0.70 / 0.40 | ดูจาก GitHub ของบัญชีตัวเองเท่านั้น |
| ส่งช้า | หักครึ่ง | push สุดท้ายก่อนเวลานำเสนอ |

### ระดับ B — ระบบจริงตาม SRS v1.5 (Must FR-01–05 ครบ 43 AC + NFR)
ระบบจริงบน Firebase Spark (Anonymous Auth + Firestore + Hosting + AI Logic) ใช้ได้ข้ามมือถือ 2 เครื่อง · Security Rules ผ่าน Emulator R-1…R-14 · MT-01…MT-16 มีผลจริง · Final Report อัปเดตด้วยตัวเลขที่วัดได้ · ต่อด้วย Should/Could (FR-06…FR-09) ถ้ามีเวลา

---

## 3. สถานะจริง ณ 7 พ.ย. ค่ำ (หลักฐานบน `main` หลัง PR #49)

| ส่วน | สถานะ | หลักฐาน |
|---|---|---|
| M1 Charter, M2 SRS v1.5 (9 FR, 21 BR, 14 NFR, 43 AC) | ✅ | `docs/00-charter/`, `docs/01-requirements/` |
| Design + สัญญาโมดูล (DL-18–20, DL-26–28) | ✅ | `docs/02-design/`, `decision-log.md` |
| ต้นแบบคลิกได้ M3 + Demo mode `public/demo.html` (FR-01–05 ทางถูก+ทางผิด) | ✅ | PR #29, #48 |
| ระบบจริงบน Firebase: `senior.html`, `caregiver.html`, `firestoreRepo`, `firestore.rules`, QR จริง, AI อ่านฉลาก (redact + Gemini) | ✅ เขียนและทดสอบกับ Emulator/เบราว์เซอร์แล้ว · **ยังไม่ทดสอบบนมือถือจริง ยังไม่เคยเรียก Gemini จริง** | PR #49 · `emulator-tests/` 31 เทสต์ |
| เทสต์อัตโนมัติ | ✅ `npm test` 345 · `emulator-tests` 31 | CI งาน `check` + `emulator` |
| ลิงก์ GitHub Pages | ✅ เปิดบนมือถือได้ (PM ยืนยัน) | README, ปกรายงาน |
| รายงาน / AI-Use Statement / สไลด์ / สคริปต์เดโม / ชุดซ้อมสอบ | ✅ เขียนแล้ว (ช่อง [ ] = ผลจริงที่ยังไม่มี) | `docs/05-report/`, `docs/06-presentation/` |
| โค้ดชุด 7 พ.ย. ได้รับการตรวจโดยสมาชิก | ⬜ ยังไม่มีใครตรวจ — **ต้องตรวจก่อนสอบปากเปล่า** | `ai-use-statement.md` ข้อ 6 |
| ทดสอบมือถือจริง (ส่วน G) / MT-07 / MT-14 / MT-09 | ⬜ ช่องผลว่าง | `TEST-CHECKLIST.md` |
| วาง `firestore.rules` ในคอนโซล Firebase | ⬜ ต้องทำก่อนใช้งานจริง | `docs/FIREBASE-SETUP.md` ข้อ 2 |
| ปิด PR #42 (ซ้ำกับ #37) | ⬜ | GitHub |

---

## 4. ผลตรวจ: สิ่งที่ผิด/ไม่ตรงบน `main` ตอนนี้ (แก้ก่อน 9 พ.ย. — งาน P0)

> **สถานะ F1–F12 ณ 7 พ.ย. ค่ำ:** ✅ แก้แล้ว F1, F2, F3, F4 (รายงาน §7), F7 (README), F11 (สไลด์), F12 (ความเสี่ยง R5/R2) · 🟡 F5 (ช่อง [ ] ของรายงานเหลือเฉพาะผลที่ยังไม่มีจริง) · ⬜ F6 (velocity ใน PROJECT-PLAN — PM เติมจากบอร์ด), F8 (ปิด PR #42 — Close ไม่ใช่ Merge), F9 (ตรวจ Issue #8, #9, #11 บน GitHub ว่าปิดหรือยัง แล้วคอมเมนต์สถานะ), F10 (ผู้ตรวจเติมชื่อ/วันที่ในแถว AI log หลังตรวจโค้ดจริง)

| # | ไฟล์ | ปัญหา | แก้เป็น | ใครแก้ |
|---|---|---|---|---|
| F1 | `docs/05-report/final-report.md` §7 | เขียน "**Suchitra Saelim**" แต่ Charter/README เป็น **Suchitra Khomdee** (6931503079) | Suchitra Khomdee | Yar |
| F2 | `final-report.md` §7 | ลิงก์ `../../docs/02-design/prototypes/2569-11-04/tokens.css` **ไม่มีไฟล์** | `../02-design/prototypes/tokens.css` | Yar |
| F3 | `final-report.md` §7 | "Yar · 13 commits", "Rossatorn · 5 commits" ไม่ตรง `git shortlog` (Yar 29 = 16 + 13 จาก 2 ชื่อ, Rossatorn 4 = 3 + 1) | ตัดจำนวน commit ออก หรือใส่ตามหน้า Contributors ณ วันส่ง | Yar |
| F4 | `final-report.md` §7 | ลบหมายเหตุเดิมว่า `confirm.js`/`time.js` ถูก commit ใน **PR #34 ใต้บัญชี PM** — แถว Nichanan/Rossatorn เลยอ่านเหมือนเป็นผู้ commit เอง | ใส่กลับ 1 บรรทัด: "`confirm.js`, `time.js` commit ใน PR #34 ใต้บัญชี PM · เจ้าของ (Nichanan, Rossatorn) ตรวจและอธิบายได้ 7 พ.ย." — ตรงไปตรงมาดีกว่าโดนถามตอนสอบ | Yar |
| F5 | `final-report.md` หัวเอกสาร + §3–§5, §8 | ยังขึ้น "ฉบับร่าง" และมี [ ] 15 จุด (ลิงก์ demo, ภาพประกอบ, MT, Rules, NFR) | เติมเฉพาะที่มีผลจริง ที่ไม่ได้ทำให้เขียน "ไม่ได้ทำ เพราะ…" แทน [ ] · เอาคำว่าร่างออกเมื่อครบ | Yar + เจ้าของผล |
| F6 | `final-report.md` §7 | "sprint 3 รอบ" ขัดกับ `PROJECT-PLAN.md` (Sprint 0–3) และตาราง velocity ยังว่าง | ให้ตรงกัน และเติม points จริงจากบอร์ด | Yar |
| F7 | `README.md` / `README.en.md` ตาราง "สถานะปัจจุบัน" | ล้าสมัย: Design "ฉบับร่าง รอทีมตรวจ", Traceability "โครงพร้อม เติมเมื่อมีโค้ด", ต้นแบบ "ร่างแรก", Final Report "โครงร่าง" · ลิงก์ทดลองใช้ "ยังไม่มี" | อัปเดตตาม §3 ของเอกสารนี้ · ใส่ลิงก์ Pages (P0-2) · แก้ไทยก่อนแล้วคัดอังกฤษ | Yar |
| F8 | PR #42 "Create status.js" (khaiwann) | ยังเปิด · ซ้ำกับ #37 ที่ merge แล้ว · ถ้า merge จะทับ `status.js` | **Close โดยไม่ merge** + คอมเมนต์ว่าซ้ำ #37 | Suchitra หรือ Yar |
| F9 | Issue #8, #9, #11 ยังเปิด | #9 ขั้น A เสร็จแล้ว (PR #38) แต่ไม่มีบันทึก · #8/#11 ไม่ได้ทำในรอบนี้ (DL-24, ต้นแบบแทน) | คอมเมนต์สถานะจริงในแต่ละ Issue · ปิด #11 ถ้าทีมถือว่าต้นแบบแทนแล้ว หรือย้ายไป increment ถัดไป | Takkan, Rossatorn |
| F10 | `docs/AI_USAGE_LOG.md` | 7 แถวยังเขียน "not yet reviewed" | ผู้ตรวจแทนที่ด้วย ชื่อ · วันที่ · ตรวจอะไร (ถ้าไม่ได้ตรวจจริง ให้คงไว้ อย่าเขียนว่าตรวจ) | เจ้าของแต่ละแถว |
| F11 | `docs/06-presentation/demo-slides.md` | สไลด์ 10 "เทสต์อัตโนมัติ [ ]" | 219 ผ่าน / 0 ไม่ผ่าน (`main` 154260f) + ข้อจำกัดตามจริง | Suchitra |
| F12 | `docs/PROJECT-PLAN.md` ความเสี่ยง R5 "ผู้ตรวจเปิดระบบจริงเองไม่ได้" | สถานะ "เปิด" ทั้งที่ต้นแบบ/Demo แก้แล้ว (เหลือลิงก์) | ปิดเมื่อ P0-2 เสร็จ | Nichanan |

ตรวจซ้ำได้ด้วย: `npm test` · ลิงก์ในไฟล์ `.md` (สคริปต์ใน §8) · `git shortlog -sne --no-merges origin/main`

---

## 5. แผนงาน (เรียงตามลำดับที่ต้องทำ)

รูปแบบแต่ละงาน: **รหัส · เจ้าของ · ไฟล์ · อ้างอิง · ขั้นตอน · เสร็จเมื่อ (ตรวจอย่างไร)** · 1 งาน = 1 Issue = 1 branch = 1 PR (+ รีวิว 1 คน + CI ผ่าน)

### P0 — ต้องเสร็จก่อนนำเสนอ 9 พ.ย. 13:29 (ระดับ A)

**P0-1 แก้ผลตรวจ F1–F12** · Yar (+ ตามตาราง §4) · branch `docs/fix-audit-1107`
- เสร็จเมื่อ: ไม่มีชื่อ/ลิงก์/ตัวเลขผิดตาม §4 · สคริปต์ตรวจลิงก์ไม่เจอลิงก์เสีย · `npm run check` ผ่าน

**P0-2 ลิงก์ที่เปิดบนมือถือได้ (GitHub Pages)** · Yar (เจ้าของ repo — ต้องมีสิทธิ์ Settings)
1. merge PR นี้ (มี `.github/workflows/pages.yml` ที่เผยแพร่ `public/` และต้นแบบ M3 อัตโนมัติ เมื่อเทสต์ผ่าน)
2. GitHub → Settings → Pages → Build and deployment → Source = **GitHub Actions** (ครั้งเดียว) แล้ว Actions → Pages → Run workflow (หรือ push ถัดไปเข้า `main`)
3. ลิงก์: `https://yaroo393-png.github.io/MedMind/demo.html` (Demo mode จริง) · `https://yaroo393-png.github.io/MedMind/prototype/2569-11-04/` (ต้นแบบ M3)
4. เปิดบนมือถือทั้ง 2 เครื่องตรวจฟอนต์/ไอคอน/นาฬิกาจำลอง แล้วใส่ลิงก์ใน `README.md` (ไทยก่อน) → `README.en.md` → ปก `final-report.md` → สไลด์ 1 → `TEST-CHECKLIST.md`
- เสร็จเมื่อ: ลิงก์เปิดได้จากมือถือที่ไม่ได้ล็อกอิน GitHub · ถ้า repo เป็น private และไม่ได้ใช้แผนที่รองรับ Pages จะเปิดไม่ได้ → ใช้ Firebase Hosting (P2-1 ขั้นแรก) หรือเดโมจากเครื่องแล้วเขียนตามจริง

**P0-3 ทดสอบต้นแบบบนมือถือจริงและในเบราว์เซอร์ (MT-15, MT-08, MT-16)** · Suchitra (QA) + เจ้าของ FR ทดสอบแถวของตัวเอง
1. เดินทุกแถวใน `TEST-CHECKLIST.md` (A1–A14 …) บน OPPO Reno 16 5G และ iPhone 13 ทั้งสองบทบาท
2. กรอกช่อง ผล / ผู้ทดสอบ / วันที่ / หมายเหตุ ตามจริง · ❌ = เปิด Issue พร้อมขั้นตอนทำซ้ำ (ห้ามใส่ข้อมูลจริง)
3. MT-08: วัดขนาดตัวอักษร ≥ 18px, ชื่อยา ≥ 24px, ปุ่ม ≥ 64px, contrast ≥ 4.5:1 ด้วย DevTools
- เสร็จเมื่อ: ไม่มีแถว ⬜ · ตัวเลขถูกคัดไป `final-report.md` §5 และ `TRACEABILITY.md` (ตาราง MT) · บั๊กที่พบแก้แล้วหรือระบุเป็นข้อจำกัด

**P0-4 Heuristic evaluation (MT-14) และ think-aloud (MT-07)** · Suchitra จัด · ทุกคนช่วย
- MT-14: ขอทีมอื่นประเมินต้นแบบตาม 10 ข้อของ Nielsen → ตาราง ปัญหา/ระดับ/แก้หรือไม่
- MT-07: ผู้สูงอายุ 3–5 คน ที่หน้าเตือน (ไม่ใช้ข้อมูลจริง ไม่ถ่ายหน้า) → อัตราทำสำเร็จ + เวลา
- ถ้าไม่ทันก่อน 9 พ.ย. ให้เขียนใน Final Report ว่า "ไม่ได้ทำ" — ห้ามใส่ตัวเลขที่ไม่ได้วัด

**P0-5 สไลด์จริง + ซ้อมเดโม** · Yar เป็นเจ้าของไฟล์ · ทุกคนทำสไลด์ส่วนตัวเอง
1. ทำสไลด์จาก `demo-slides.md` 12 หน้า (PDF ใน `docs/06-presentation/`) · ภาพหน้าจอจากต้นแบบที่ใช้ข้อมูลสมมติเท่านั้น
2. สคริปต์เดโม 5 นาที (เปิด `demo.html`): FR-01 จับคู่ + รหัสผิด → FR-02 ร่างจากฉลากตัวอย่าง + ไม่ติ๊กปิดชื่อ/HN → FR-03 ถึงเวลาเตือน + เตือนซ้ำ T+5/T+10 → FR-04 กดกินแล้ว + กดซ้ำ + ยังไม่กิน → FR-05 ข้าม T+15 → ผู้ดูแลเห็น "ยังไม่ยืนยัน" → ยืนยันช้า → ผู้ดูแลเห็นเวลา
3. ซ้อมจับเวลาอย่างน้อย 2 รอบ · เตรียมเครื่องสำรอง + ไฟล์ต้นแบบในเครื่อง (เผื่อเน็ตล่ม)
- เสร็จเมื่อ: เดโมจบใน 5 นาที เห็นครบ 5 FR + ทางผิด · ทุกคนพูดส่วนตัวเองได้

**P0-6 ซ้อมสอบปากเปล่ารายคน** · ทุกคน (Claude ช่วยถามได้)
- ใช้ `docs/05-report/ai-use-statement.md` ข้อ 6 + `fr/<FR>/README.md` หัวข้อ "ก่อนสอบปากเปล่า"
- ทุกคนต้องตอบได้: ปัญหาข้อไหน → FR/AC ข้อไหน → ไฟล์และฟังก์ชันไหน → เทสต์ไหนพิสูจน์ → ใช้ AI ตรงไหน แก้อะไร เพราะอะไร
- เสร็จเมื่อ: แต่ละคนอธิบายไฟล์ตัวเองได้ 3–5 นาทีโดยไม่ดูโน้ต

**P0-7 ปิดงานก่อนส่ง** · Yar
- ทุก PR merge แล้ว · `npm run check` ผ่านบน `main` · ตรวจหน้า Contributors ว่าทุกบัญชีมี commit · AI log ครบทุกงาน · Final Report + สไลด์เป็น PDF

### P1 — ระบบจริงใน Demo mode: `public/` ✅ เสร็จ 7 พ.ย. (รอสมาชิกตรวจและเปิด PR จากบัญชีตัวเอง)

**ที่ทำแล้ว:** รูปแบบ `screens`/`actions` ตาม architecture §5.6 (DL-26) · `public/demo.html` + `index.html` · `features/{ui,format,model,alerts,pairing,medicineSetup,reminder,home,caregiverStatus,phone,demoShell,demoControls}.js` · `core/offlineQueue.js` · `css/{tokens,app}.css` + ฟอนต์ · เทสต์ 109 ข้อ (`pairingView`, `medicineSetupView`, `reminderHomeView`, `caregiverStatusView`, `offlineQueue`, `alerts`, `model`, `demoControls`, `format`, `ui`, `publicPages`)

| ไฟล์ | เจ้าของที่ต้องตรวจ/อธิบายได้ | ต้องตอบได้ |
|---|---|---|
| `features/pairing.js` | Takkan | ลำดับเหตุผลปฏิเสธ (`JOIN_TEXT`) · ทำไมยกเลิกจับคู่ต้อง 2 ขั้นและลบอะไร |
| `features/medicineSetup.js` | Yar | ทำไมปุ่มส่งปิดจนกว่าจะติ๊ก (BR-19) · ทำไมช่องที่อ่านไม่ออกเป็น "โปรดตรวจสอบ" ไม่เดา · "AI" ตอนนี้จำลอง |
| `features/reminder.js`, `ui.js`, `format.js`, `css/` | Rossatorn | หลายมื้อพร้อมกันแสดงอย่างไร (BR-16) · ทำไมเสียงดังครั้งเดียว · ขนาด/contrast NFR-03 |
| `features/home.js`, `core/offlineQueue.js`, `demoShell.js`, `demoControls.js`, `model.js`, `phone.js` | Nichanan | ทำไมตัดสินจาก "เวลาที่กด" (BR-20) · "ยังไม่กิน" รอบ 3 ต่างจากรอบ 1–2 อย่างไร (BR-11) · คิวออฟไลน์ |
| `features/caregiverStatus.js`, `alerts.js` | Suchitra | ทำไมแจ้งครั้งเดียวต่อมื้อ (BR-13) · ปิดหน้าแล้วเปิดใหม่เห็นอะไร (BR-18) · ทำไมไม่แจ้งช่วง T–T+15 (BR-21) |

**ที่ยังเหลือใน P1 (ถ้ามีเวลา):** `public/index.html` ให้เป็นหน้าเลือกบทบาท S-00 จริง (จำบทบาทด้วย `localStorage`) เมื่อทำ `senior.html`/`caregiver.html` · ปรับดีไซน์หน้าจอจริงตามผลทดสอบมือถือ (MT-08/MT-16)

### P2 — Firebase จริง ✅ เขียนและทดสอบกับ Emulator แล้ว 7 พ.ย. (เหลือ: วาง Rules ในคอนโซล + ทดสอบมือถือจริง — `docs/FIREBASE-SETUP.md`, TEST-CHECKLIST ส่วน G)

> โปรเจกต์ `medmind-12eb2` (Spark) · `firestore.rules` + `core/firebase.js` + `core/firestoreRepo.js` + `senior.html`/`caregiver.html` + `features/realShell.js` + QR จริง · Rules R-1…R-14 และ repo ผ่าน 31 เทสต์ใน `emulator-tests/` · ตารางเดิมด้านล่างเก็บไว้เป็นประวัติ

### P2 (แผนเดิม) — Firebase จริง (ระดับ B · Issue #8, #9 ขั้น B, E-6)

**ต้องตัดสินใจก่อนเริ่ม (ถามทีม บันทึก DL):** สร้าง Firebase project ด้วยบัญชีใคร · ใช้ `firebase-tools` + `@firebase/rules-unit-testing` เป็น devDependencies (ต้อง `npm install` และ Java สำหรับ Emulator) · CI จะรัน Emulator หรือไม่

| รหัส | เจ้าของ | ไฟล์ / งาน | อ้างอิง | เสร็จเมื่อ |
|---|---|---|---|---|
| P2-1 | Takkan | สร้างโปรเจกต์ Spark (ไม่ผูกบัตร) · `firebase.json`, `.firebaserc`, Hosting ชี้ `public/` · ตรวจรายการเทคนิค D9 (PD-9) | Issue #8, ADR-2 | deploy preview channel แล้วเปิด `demo.html` จากมือถือได้ |
| P2-2 | Takkan | `public/js/core/firebase.js` (init, Anonymous Auth, offline persistence) — import SDK จาก CDN แบบ ES module (ไม่มี build step) · config เว็บ commit ได้ (RULES §3) | architecture §5, §6.2 | เปิดหน้าแล้วได้ uid นิรนาม · ไม่มี key ลับในโค้ด |
| P2-3 | Takkan | `firestoreRepo` ใน `core/repo.js` — **เมธอดชื่อ/รูปเดียวกับ `localRepo` ทุกตัว** (§5.5, §6.3) · `watch` ใช้ `onSnapshot` | architecture §6.2–6.3 | เทสต์สัญญาเดียวกันรันได้กับทั้ง 2 repo (บน Emulator) |
| P2-4 | Suchitra | `firestore.rules` (จาก `firestore-rules-draft.md`) + `tests/rules/*.test.js` R-1…R-14 บน Emulator | firestore-rules-draft, DL-12, NFR-04/05/07/10 | R-1…R-14 ผ่าน · คัดผลไป Final Report §5 ("Rules [x]/14") |
| P2-5 | Rossatorn + Nichanan | `public/senior.html`, `public/caregiver.html` ใช้ `features/` ชุดเดียวกับ `demo.html` ต่างแค่ repo | ADR-9 | ทดสอบข้ามมือถือ 2 เครื่อง (MT-01, MT-05, MT-06, MT-11) |
| P2-6 | Nichanan | FR-04 AC7 ออฟไลน์: พึ่ง offline persistence ของ Firestore + `confirmedAt` จากเวลาที่กด (BR-20) | FR-04 AC7, MT-05 | MT-05 ผ่าน: ปิดเน็ต กด → จอขึ้นทันที → เปิดเน็ต ผู้ดูแลเห็นภายใน 10 วินาที |

### P3 — AI อ่านฉลากจริง ✅ เขียนแล้ว 7 พ.ย. (เหลือ: เรียก Gemini จริงด้วยฉลากที่ปิดชื่อ/HN — MT-09, MT-13 · DL-28)

### P3 (แผนเดิม) — AI อ่านฉลากจริง (FR-02 AC5, AC9 · Yar)

| รหัส | ไฟล์ / งาน | อ้างอิง | เสร็จเมื่อ |
|---|---|---|---|
| P3-1 | `services/redact.js`: วาดกรอบปิดบน canvas → วาดภาพใหม่ (ไม่มี metadata) → ย่อภาพ · ไม่เก็บภาพต้นฉบับ | BR-19, NFR-09, NFR-14, DL-21 | MT-03, MT-13 ผ่าน: ภาพที่ส่งไม่มีชื่อ/HN/EXIF |
| P3-2 | `services/aiLabel.js` `requestDraft(redactedImage) → Promise<aiJson>` ผ่าน Firebase AI Logic (Gemini) พร้อม JSON schema ตาม architecture §5.4(ก) · ออฟไลน์/โควตาหมด/อ่านไม่ได้ → โยน error ให้ UI เปิดฟอร์มกรอกเอง | ADR-3, §5.4, FR-02 AC5 | เทสต์ด้วย stub (ไม่เรียก AI จริงในเทสต์) · MT-02 |
| P3-3 | ต่อ C-03/C-04/C-05 เข้ากับ P3-1, P3-2 | FR-02 AC1–11 | MT-09: 20 ฉลาก **ปิดชื่อแล้ว** ถูก ≥ 18/20 (ใช้ฉลากใน `test-labels/` ที่ถูก ignore เท่านั้น) |
- ตรวจเอกสารล่าสุดของ Firebase AI Logic ก่อนเขียน (API เปลี่ยนเร็ว) · ห้ามส่งฉลากที่ยังเห็นชื่อ/HN แม้ตอนทดสอบ (RULES §3)

### P4 — วัดผลและเอกสารปิดงาน (ระดับ B)
- MT-01…MT-16 ครบ (MT-09, MT-10, MT-11, MT-12 ต้องมีระบบ Firebase) · NFR-02, 08, 11–14 วัดจริง ระบุขนาดตัวอย่าง
- อัปเดต TRACEABILITY 🟡 → ✅ เฉพาะ AC ที่มีผลบนหน้าจอ/อุปกรณ์จริง · Final Report §4–§5, §8 · README · velocity/retro ใน PROJECT-PLAN
- ตัววัดความสำเร็จใน Charter: จำนวนครั้งที่ผู้ดูแลโทรถามต่อวัน ก่อน/หลัง (ถามผู้ให้สัมภาษณ์คนที่ 2) และตรวจ SRS กับผู้ให้สัมภาษณ์จริง (ai-use-statement ข้อ 3)

### P5 — Should / Could (ถ้ามีเวลา หลัง P1–P4)
FR-06 หลายผู้ดูแล (Should) · FR-07 รายการยาทั้งหมด · FR-08 รูปยา · FR-09 สรุปรายสัปดาห์ด้วย AI (`logic/weeklySummary.js`, ส่งเฉพาะสถานะมื้อ) — **ต้องเขียน AC ใน SRS ก่อน** แล้วคัดตาม RULES §5

---

## 6. อ้างอิงเร็ว: API ที่มีอยู่แล้ว (ห้ามเปลี่ยนรูปโดยไม่แก้ architecture ก่อนและบอกทีม)

| ไฟล์ | export | สัญญา |
|---|---|---|
| `logic/time.js` | `MINUTE_MS`, `REMINDER_OFFSETS_MIN = [0,5,10]`, `ALERT_DEADLINE_MIN = 15`, `ALERT_TOLERANCE_S`, `scheduledTimeOf(meal)` | §5.3 |
| `logic/confirm.js` | `doseId(meal)`, `confirmStatus(scheduledTime, confirmedAt)` → `taken`/`taken_late`, `buildDose({ meal, confirmedAt })` | §5.3, DL-18 |
| `logic/mealTimeline.js` | `nextMealStartFor(meals, meal)`, `mealState({ now, meal, dose, nextMealStart, notYetLastRoundAt })` | §5.1, §5.3, BR-21 |
| `logic/schedule.js` | `validateSlot(slot)`, `reminderTime(slot, mealTimes)`, `groupMeals(medicines, mealTimes, dateKey)` | §5.2 |
| `logic/status.js` | `alertFor({ now, meal, dose, notYet, seen })`, `dailyStatus({ now, meals, doses })` | §5.3, §7.4 |
| `logic/labelDraft.js` | `buildDraft`, `applyEdit`, `addSlot`, `removeSlot`, `canSave`, `canSend({ coveredTicked })`, `toMedicine` | §5.4, DL-19 |
| `logic/pairing.js` | `INVITE_TTL_MIN = 10`, `makeInvite({ now, randomInt })`, `joinCheck({ now, invite, enteredCode })`, `pairingState(pair)` | §5.5, DL-20 |
| `core/clock.js` | `createClock()` = นาฬิกาจริง · `createClock({ start })` = นาฬิกาจำลอง | §6.3 |
| `core/repo.js` | `createLocalRepo({ clock, seed, randomInt })` → จับคู่ (`createPairing`, `createInviteCode`, `recordConsent`, `joinWithCode`, `getPairing`, `cancelPairing`), `setMealTimes/getMealTimes`, `saveMedicine/listMedicines/deleteMedicine`, `confirmMeal`, `getDoses`, `reportNotYet/getNotYet`, `markAlertSeen/getSeen`, `watch` | §5.5, §6.3 |
| `core/demoData.js` | `DEMO_DATE_KEY`, `DEMO_IDS`, `mealTimes()`, `medicines()`, `labelDrafts()`, `demoSeed()`, `demoStart()` | §11 |

กฎขอบเวลาที่พลาดง่าย (BR-21): กดที่ T+15:00.000 พอดี = `taken` · แจ้งผู้ดูแลเมื่อ **เลย** T+15 เท่านั้น · ยืนยันย้อนหลังได้ถึงเวลาเริ่มมื้อถัดไป **รวม** ms นั้น · ไม่มีมื้อถัดไป = 23:59:59.999 · รหัสเชิญหมดอายุเมื่อ `now > expiresAt` · ลำดับเหตุผลของ `joinCheck`: `wrong_code → already_has_caregiver → expired → already_used → not_consented` · สุ่มรหัสด้วย `crypto` ห้าม `Math.random` · ผู้ดูแลเห็น "ยังไม่ยืนยัน" ห้ามใช้คำ "ไม่ได้กิน" (BR-13/14)

---

## 7. วิธีทำงานกับ Git (บัญชีของสมาชิกแต่ละคน)

```bash
git checkout main
git pull origin main
git checkout -b feat/fr03-reminder-view
npm.cmd run check
git add <ไฟล์ของตัวเองเท่านั้น>
git commit -m "feat: หน้าเตือน S-03 แยกหัวข้อมื้อซ้อน (FR-03 AC4)"
git push -u origin feat/fr03-reminder-view
```
แล้วเปิด PR ไป `main` ตาม `.github/pull_request_template.md` → ขอรีวิว 1 คน → CI ผ่าน → merge (ถ้า commit ขึ้น Unverified ใช้ *Squash and merge*)
ข้อผิดพลาดที่เคยเกิด: commit บน `main` แทน branch · push แล้ว branch ว่าง (ลืม add) · แตกซิปไม่ลงโฟลเดอร์ repo · เปิด PR ผ่านเว็บที่ทับไฟล์ที่ merge แล้ว (PR #42) — ตรวจ `git status` และ `git log --oneline -3` ทุกครั้งก่อน push

---

## 8. คำสั่งตรวจ

```bash
npm test
```
```bash
npm run check
```
ตรวจลิงก์ภายในไฟล์ `.md` ทั้ง repo (Python 3):
```bash
python3 -c "import re,os;[print('BROKEN',p,t) for r,d,f in os.walk('.') if '.git' not in r for n in f if n.endswith('.md') for p in [os.path.join(r,n)] for t in re.findall(r'\]\(([^)#\s]+)',open(p,encoding='utf8').read()) if not t.startswith(('http','mailto')) and not os.path.exists(os.path.normpath(os.path.join(r,t)))]"
```

---

## 9. ข้อความเริ่มต้นสำหรับ Claude Code ในบัญชีอื่น (คัดไปวางได้)

```text
ฉันคือ <ชื่อสมาชิก> (บัญชี GitHub <บัญชี>) ในทีม MedMind
อ่าน CLAUDE.md, RULES.md และ docs/HANDOFF.md ก่อน แล้วทำงาน <รหัสงาน เช่น P1-5> ของฉัน
แก้เฉพาะไฟล์ของฉันตาม HANDOFF §5 · อ้าง FR/AC/BR ทุกครั้ง · เขียนเทสต์ก่อนโค้ด
เสนอแผนสั้น ๆ แล้วรอฉันอนุมัติ · ห้าม commit/push เอง · จบงานให้รัน npm test,
อัปเดต TRACEABILITY และเพิ่มแถว AI_USAGE_LOG ตามจริง แล้วอธิบายโค้ดให้ฉันเข้าใจทุกส่วน
```

---

## 10. คำถามที่ต้องให้ทีมตอบ (ห้ามให้ AI ตัดสินแทน)
1. P0-2: repo เป็น public หรือ private (Pages ฟรีเฉพาะ public) · ถ้าไม่ได้ จะใช้ Firebase Hosting หรือเดโมจากไฟล์ในเครื่อง
2. P1: ตกลงรูปแบบ `view()` + `mount()` สำหรับ `features/` หรือไม่ (ต้องบันทึกเป็น DL ใหม่)
3. P2: Firebase project อยู่ในบัญชีใคร · ยอมเพิ่ม devDependencies + Java สำหรับ Emulator หรือไม่
4. P4: ใครติดต่อผู้ให้สัมภาษณ์เพื่อวัดตัววัดความสำเร็จและตรวจ SRS
5. Issue #8, #9, #11 จะปิดหรือย้ายไป increment ถัดไป
