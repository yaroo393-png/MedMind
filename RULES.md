# RULES.md — กติกาการทำงานของทีม MedMind (คน + AI)

> อ่านก่อนเริ่มงานทุกครั้ง · เกณฑ์ที่อาจารย์ใช้: คะแนนรายคนวัดจาก GitHub (commit / PR / issue ที่มีความหมาย) · ทุกคนต้องอธิบายงานของตัวเองได้ (สอบปากเปล่า)

## 1. ใครทำอะไร
- แต่ละคนเป็นเจ้าของฟีเจอร์ตามตาราง **ทีมและการแบ่งงาน** ใน [`README.md`](README.md) และมีโฟลเดอร์ `fr/<FR>/README.md` ของตัวเอง — เขียนเองครบสาย: ตรรกะใน `public/js/logic/` + เทสต์ใน `tests/` → หน้าจอใน `public/js/features/` → ผลทดสอบใน Final Report
- แก้เฉพาะไฟล์ของตัวเอง · ไฟล์ส่วนรวม (`public/*.html`, `public/css/`, `public/js/core/`, `package.json`, `.github/`, `docs/03-design/`) แก้ได้ แต่ต้องบอกในทีมและเขียนไว้ใน PR
- ข้อมูลร่วมและสัญญาระหว่างโมดูล (รูปแบบ Meal, Dose, Medicine ฯลฯ) อยู่ใน `docs/03-design/architecture.md` §5–6 — ถ้าจะเปลี่ยน ให้แก้เอกสารนั้นก่อนและบอกทีม

## 2. Git และ Pull Request
1. 1 งาน = 1 Issue · หัวข้อระบุ FR/AC เช่น `FR-03 AC2: เตือนซ้ำ T+5, T+10`
2. แตก branch จาก `main` ทุกครั้ง ตั้งชื่อ `feat/fr03-repeat` · ห้าม push ตรงเข้า `main`
3. **ทุกคน commit ด้วยบัญชี GitHub ของตัวเองจากเครื่องตัวเอง** (ส่วนร่วมรายคนวัดจาก GitHub) ข้อความบอกว่าทำอะไรและ FR ไหน เช่น `feat: เตือนซ้ำ T+5 และ T+10 (FR-03 AC2)`
4. เปิด PR ตาม template → ให้**อีก 1 คน**รีวิว → CI ผ่าน → merge
5. รัน `npm run check` ให้ผ่านก่อน push ทุกครั้ง

## 3. ความปลอดภัยและข้อมูลส่วนตัว (PDPA)
- ห้าม commit: `.env`, service account, token ใด ๆ — CI ตรวจให้ทุก PR (`npm run check:secrets`) · ค่า config เว็บของ Firebase (`apiKey` ฯลฯ) เป็นค่าสาธารณะ commit ได้ ความปลอดภัยมาจาก Security Rules
- **รูปฉลากยาจริงมีชื่อ/HN ผู้ป่วย** — ใช้ทดสอบในเครื่องเท่านั้น เก็บใน `test-labels/` (ถูก ignore) ห้ามใส่ใน repo, Issue หรือ PR · ภาพตัวอย่างในเอกสารต้องใช้ฉลากสมมติ
- **ห้ามส่งฉลากจริงที่ยังเห็นชื่อ/HN ให้ AI แม้ตอนทดสอบ** (Gemini แบบฟรีอาจนำข้อมูลไปปรับปรุงผลิตภัณฑ์ และเงื่อนไขห้ามส่งข้อมูลส่วนบุคคล) — ปิดชื่อ/HN/บาร์โค้ดทุกครั้งตาม BR-19
- ระบบไม่เก็บรูปฉลาก ไม่เก็บชื่อ/HN/เลขบัตร/ที่อยู่/วันเกิด/เบอร์โทรของผู้สูงอายุ (NFR-09)
- ข้อความที่ผู้ใช้พิมพ์ต้อง escape ก่อนใส่ HTML ทุกครั้ง

## 4. การใช้ AI
- ใช้ AI ช่วยได้ (อธิบายโค้ด, หาบั๊ก, ร่างเทสต์, ร่างเอกสาร) แต่**ต้องอธิบายโค้ดที่ตัวเอง commit ได้ทุกบรรทัด**
- **ทุกครั้งที่ใช้ AI ช่วยงาน ต้องบันทึกตามจริง**ใน [`docs/AI_USAGE_LOG.md`](docs/AI_USAGE_LOG.md) (log เต็ม: วันที่, เครื่องมือ, ขออะไร, AI ทำอะไร, เราแก้/ตรวจอะไร, ได้เรียนรู้อะไร) — log ว่างแต่เนื้อหาดูเหมือน AI เขียน = milestone ถูกจำกัดที่ 50% · SRS §8 / `spec.md` §8 เป็นสำเนาของแถวที่ทีมเลือก เมื่อออก SRS ใหม่ให้คัดให้ตรงกัน · สรุปรวมใน [`docs/05-report/ai-use-statement.md`](docs/05-report/ai-use-statement.md)
- ถ้าให้ AI agent ทำงานใน repo (เช่น Claude Code — อ่าน [`CLAUDE.md`](CLAUDE.md) เอง) agent ต้อง:
  - ถามก่อนเมื่อข้อมูลไม่ครบ หรือเรื่องกระทบความปลอดภัย / ข้อมูลผู้ป่วย
  - เสนอแผนสั้น ๆ แล้วรอเจ้าของงานอนุมัติก่อนลงมือ
  - แก้เฉพาะไฟล์ของเจ้าของงานคนนั้น และไม่ commit / push เองถ้าไม่ได้รับคำสั่ง
- AI ใน**ตัวระบบ** (อ่านฉลาก, สรุปรายสัปดาห์) แค่ร่าง — ผู้ดูแลตรวจทุกครั้ง ไม่ให้คำแนะนำยา (SRS §6)

## 5. เมื่อเปลี่ยนอะไร ต้องอัปเดตไฟล์ไหน
| เปลี่ยนอะไร | อัปเดตไฟล์ |
|---|---|
| requirement / AC / BR / NFR | **SRS ก่อน** (Word → PDF ใน `docs/02-requirements/` + `spec.md`) แล้วคัด `backlog.md`, `docs/TRACEABILITY.md`, `fr/<FR>/README.md`, ตาราง Golden Thread ใน `README.md` + Final Report · เพิ่มแถวใน Document history ของ SRS |
| เพิ่ม/ย้ายไฟล์โค้ด | ตารางแบ่งงานและโครงสร้างใน `README.md`, `fr/<FR>/README.md`, `architecture.md` §5 |
| หน้าจอ | ป้าย "Covers: FR-xx" บนหน้านั้น + Screen Map ใน `docs/03-design/design-system.md` · ต้องเปิดได้ใน Demo mode |
| โครงข้อมูล / Security Rules | `docs/03-design/architecture.md` §6 และ `firestore-rules-draft.md` |
| ทดสอบ | ช่อง Test ใน `docs/TRACEABILITY.md` + ตารางผลใน `docs/05-report/final-report.md` §5 |
| ใช้ AI | `docs/AI_USAGE_LOG.md` |
| สถานะงาน / sprint | บอร์ด GitHub Projects + `docs/02-requirements/backlog.md` + velocity/retro ใน `docs/PROJECT-PLAN.md` |

## 6. ก่อนวันส่ง / วันสอบ
- ทุกคนซ้อมอธิบายฟีเจอร์ของตัวเอง 3–5 นาที: ปัญหา → FR/AC → ไฟล์ที่เขียน → เทสต์ → demo
- ตรวจ Golden Thread ให้ตรงของจริง — ถ้าปัญหา / FR / design / ฟีเจอร์ / เทสต์ ไม่ตรงกัน คะแนนถูกจำกัด
- ก่อน push ครั้งสุดท้าย: `npm run check` ผ่าน, README บอกวิธีเปิดระบบ, ลิงก์ demo เปิดได้ในมือถือ, **Demo mode เดินครบทุก Must FR + ทางผิดได้ในเบราว์เซอร์เดียว** (MT-15)
