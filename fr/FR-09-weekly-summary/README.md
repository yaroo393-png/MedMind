# FR-09 — สรุปบันทึกยืนยันรายสัปดาห์

สถานะ: ชุดรวมสำหรับรีวิว เกณฑ์ด้านล่างยังรอทีมรับรองใน SRS ไม่รับรองผล Firebase/Gemini หรือมือถือจริง เจ้าของงานยังต้องอ่านและอธิบายโค้ดด้วยตนเอง

อ้างอิง [SRS §3.3](../../docs/01-requirements/spec.md), [Architecture §5](../../docs/02-design/architecture.md), [หน้าจอ C-10](../../docs/02-design/design-system.md) และ [Traceability](../../docs/TRACEABILITY.md) โค้ดเริ่มจาก PR #61 (`3bac49b`) แล้วพัฒนาการแสดงผลใน Sites source `daa4e47`; ชุดนี้รวมกับ `main` ฐาน `08bd3a4` เพื่อเก็บ scanner/OCR PR #63 และโครงสร้าง PR #64

## ขอบเขต

- สรุป 7 วันปฏิทินที่จบแล้วก่อนวันนี้ ไม่รวมวันนี้ ใช้เขตเวลาของเครื่องผู้ดูแล
- อ่านเฉพาะ Dose ยืนยันที่มีจริง ไม่สร้างประวัติจากตารางยาปัจจุบัน วันไม่มีรายการคือไม่มีบันทึก ไม่ใช่หลักฐานพฤติกรรมการกินยา และไม่คำนวณอัตรากินยาครบ
- หากมี valid confirmation อย่างน้อย 1 รายการ จะสรุปเฉพาะข้อมูลที่มี หากไม่มีรายการจะไม่เรียก AI
- AI เลือก 1–3 ประเด็นจากข้อเท็จจริงที่แอปคำนวณ ไม่แสดงข้อความอิสระจากโมเดล แนวทางนี้ยังเป็นข้อเสนอให้ทีมตรวจเทียบกับ story เดิมที่ใช้คำว่า AI-written summary
- ผู้ดูแลเห็นคำขอ `days` และ `candidates` ก่อนยินยอม ไม่มีวันจริง ID ชื่อ HN รายละเอียดยา หรือคำแนะนำยาในคำขอ
- ข้อมูลจริงอ่านจาก server แบบ read-only เฉพาะคู่ที่ผู้ดูแลได้รับความยินยอม ตรวจสิทธิ์ซ้ำและล้างผลเมื่อยกเลิกจับคู่ ไม่มี API เขียนหรือลบข้อมูลในฟีเจอร์นี้
- ใช้ snapshot เมื่อโหลด มีปุ่มโหลดใหม่ ไม่ใช่ข้อมูลที่อัปเดตสด และยังไม่รองรับการเปลี่ยนเขตเวลาอย่างสมบูรณ์
- เปลี่ยนภาษาเฉพาะ UI/ประโยคควบคุม ไม่เปลี่ยน payload ไม่เริ่ม AI ซ้ำ และไม่ทิ้ง consent/ผลร่างเพราะสลับภาษา

## ทดลอง

เปิด `public/` ผ่าน static server ตามวิธีเดิมของโปรเจกต์ ชื่อทางเข้า `index.html`, `senior.html`, `caregiver.html`, `demo.html` คงเดิม

1. ใน `demo.html` เลือกแท็บ **สรุป** ฝั่งผู้ดูแล: ตัวอย่างสัปดาห์สมมติมี 21 บันทึก ทันเวลา 17 และย้อนหลัง 4 ข้อมูลสรุปนี้แยกจากนาฬิกา/สถานการณ์ของมื้อวันนี้ และไม่เรียก Firebase/Gemini
2. ตรวจข้อมูล ติ๊กยินยอม แล้วสร้างสรุปจำลอง ลองสลับไทย–อังกฤษและกลับออกจากหน้า
3. `weekly-summary.html` เป็นทางเข้าแยก เริ่มด้วย Demo เสมอ ใช้ลองกรณีไม่มีข้อมูลได้

ข้อมูลจริงเข้าจากแท็บสรุปใน `caregiver.html` หลังจับคู่และยินยอมแล้ว หรือเลือก “ข้อมูลผู้ดูแลของฉัน” ในหน้าแยกด้วยโดเมน/เบราว์เซอร์เดียวกับแอปที่จับคู่ไว้ ไม่มีการเรียก AI อัตโนมัติเมื่อเปิดหน้า ผู้ดูแลต้องตรวจและยินยอมก่อนทุกคำขอ

## เกณฑ์รับงานที่เสนอและการตรวจย้อนกลับ

เกณฑ์ต่อไปนี้ยังไม่ใช่ AC ที่ทีมรับรองใน SRS:

| เกณฑ์เสนอ | โค้ด | เทสต์ |
|---|---|---|
| 7 วันปฏิทิน/ข้ามเดือน ปี DST และกรองบันทึกผิดรูป pending อนาคต | [weeklySummary.js](../../public/js/logic/weeklySummary.js) | [weeklySummary.test.js](../../tests/weeklySummary.test.js) |
| ใช้กฎ T+15 เดิม ไม่เดาข้อมูลที่หาย ส่งข้อมูลด้วย allowlist | [weeklySummary.js](../../public/js/logic/weeklySummary.js), [weeklySummaryFacts.js](../../public/js/services/weeklySummaryFacts.js) | [weeklySummary.test.js](../../tests/weeklySummary.test.js), [aiWeeklySummary.test.js](../../tests/aiWeeklySummary.test.js) |
| ตรวจ caregiver/consent ก่อนและหลังอ่าน ไม่มี write API | [weeklyHistory.js](../../public/js/services/weeklyHistory.js) | [weeklyHistory.test.js](../../tests/weeklyHistory.test.js) |
| AI เลือกเฉพาะรหัสประเด็นจริง 1–3 ค่าไม่ซ้ำ; ผลผิดรูปไม่แสดง; ไม่มีข้อมูล/ออฟไลน์ไม่ส่ง | [aiWeeklySummary.js](../../public/js/services/aiWeeklySummary.js) | [aiWeeklySummary.test.js](../../tests/aiWeeklySummary.test.js) |
| ต้องตรวจ/ยินยอม; ถอนสิทธิ์ เปลี่ยนบริบท/วันแล้วไม่แสดงผลเก่า; preview ตรงคำขอ | [weeklySummaryPage.js](../../public/js/features/weeklySummaryPage.js), [weeklySummaryController.js](../../public/js/features/weeklySummaryController.js) | [weeklySummaryPage.test.js](../../tests/weeklySummaryPage.test.js), [weeklyController.test.mjs](../../tests/weeklyController.test.mjs) |
| รวมในจอผู้ดูแลเท่านั้น แยก Demo จากบริการจริง รักษาภาษา/consent/ผลเมื่อสลับภาษา | [weeklySummaryPanel.js](../../public/js/features/weeklySummaryPanel.js), [phone.js](../../public/js/features/phone.js) | [weeklyPanel.test.mjs](../../tests/weeklyPanel.test.mjs), [weeklyLanguage.test.mjs](../../tests/weeklyLanguage.test.mjs) |

ทางเข้าแยกและรูปแบบ: [weekly-summary.html](../../public/weekly-summary.html), [weekly-summary.css](../../public/css/weekly-summary.css) ใช้ฟอนต์/สี token ร่วมของทีม ไม่รวม `qa-fr09.html` / `js/qa/` ของ Sites

## ผลตรวจและการใช้ AI

| วันที่ | สิ่งที่ช่วย/หลักฐาน | การตรวจโดยเจ้าของ |
|---|---|---|
| 8 พ.ย. 2569 | Codex ช่วยทำส่วน FR-09 แยกใน PR #61; ผลเดิมรายงาน 378/378 เป็นหลักฐานของชุดก่อนหน้า ไม่ใช่ผลชุดรวมปัจจุบัน | ยังไม่รับรองแทนเจ้าของ |
| 9 พ.ย. 2569 | ผู้ใช้ขอรวมเว็บใหม่กับ scanner ล่าสุด; Codex และผู้ช่วยย่อยรวม UI/ภาษา/weekly จาก Sites กับ main และเพิ่มเทสต์ที่เกี่ยวข้อง · ชุดรวม: **npm run check: 460/460 tests passed; check:secrets passed** | ผู้ใช้ยืนยันขอบเขตและชื่อไฟล์แล้ว แต่ยังไม่ได้อ่าน/รับรองโค้ด ต้องมีอีก 1 คนรีวิวก่อน merge |

บันทึกส่วนกลางอยู่ใน [AI usage log](../../docs/AI_USAGE_LOG.md) และ [Traceability](../../docs/TRACEABILITY.md) ผลเทสต์จำลองไม่แทน Firebase/App Check/Gemini จริง กล้องมือถือ หรือการทดสอบ Android จริง และไม่ได้แก้ SRS/backlog ให้ถือว่า FR-09 รับรองแล้ว

## จุดที่เจ้าของควรอธิบายได้

- ไม่มีบันทึกไม่ได้แปลว่าไม่กินยา ระบบเก็บการกดยืนยัน ไม่ได้เก็บประวัติตารางมื้อทุกวัน
- ใช้ `confirmStatus` เดิมตัดสินทันเวลา/ย้อนหลัง ไม่เขียนกฎ T+15 ซ้ำ
- สร้างคำขอด้วย allowlist และตรวจรหัสที่ AI คืนก่อนแสดงประโยคควบคุม
- เลขรอบคำขอและการตรวจสิทธิ์ทำให้ผลที่มาช้าหลังออกจากหน้า/ถอนสิทธิ์ถูกทิ้ง
- สรุปใน Demo ใช้ข้อมูลสมมติและผลในเครื่อง ไม่กล่าวอ้างว่าเป็นคำตอบจาก Gemini
