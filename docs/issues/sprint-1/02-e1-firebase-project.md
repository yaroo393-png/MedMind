<!-- title: E-1 ตั้ง Firebase project (Spark) + ตรวจรายการเทคนิค D9 -->
<!-- labels: design · assignees: V31311 · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** ทุก FR (enabler) · NFR-13 (ไม่เสียเงิน) · ADR-2, ADR-3, ADR-10 · decision-log PD-9 / D9
**ผู้รับผิดชอบ:** Takkan
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 2 · **บล็อก:** E-2 ส่วน `firestoreRepo`, E-6, ทดสอบบนมือถือจริง

## ขอบเขต
1. สร้าง Firebase project แพ็ก **Spark** (ห้ามผูกบัตร) → เปิด Anonymous Auth, Cloud Firestore (โหมด production + rules ปฏิเสธทั้งหมดไว้ก่อน), Hosting
2. เพิ่มสมาชิกทีม 4 คนเป็น Editor ของ project
3. ค่า config เว็บ (`apiKey` ฯลฯ) เป็นค่าสาธารณะ commit ได้ (RULES §3) — **ห้าม** commit service account / token ใด ๆ
4. กรอกตาราง "ผลงานตรวจเทคนิค D9" ใน `docs/01-requirements/decision-log.md` **จากการตรวจจริง ห้ามเดา**:
   - หลักฐาน Cloud Functions บน Spark (DL-10) — ภาพ/ลิงก์ + วันที่
   - เวอร์ชัน Firebase JS SDK ที่ pin: เวอร์ชันเสถียรที่เผยแพร่ ≥ 14 วัน (`npm.cmd view firebase time --json`) → ให้ตรงกับ `package.json`
   - โมเดล Gemini ใน free tier + โควตาต่อนาที/วัน
   - App Check แบบไม่มีค่าใช้จ่าย
   - ไลบรารีสร้าง QR + license
   - ไฟล์เสียงเตือน: ที่มา/license (หรือสร้างเสียงเองด้วย Web Audio)

## ทำเสร็จเมื่อ
- [ ] project ใช้ได้ · ทุกคนเข้า Console ได้ · หน้า Billing แสดง Spark
- [ ] ตาราง D9 ครบทุกแถว + หลักฐาน
- [ ] `npm run check` ผ่าน (ไม่มี secret หลุด)
- [ ] บันทึก AI log ถ้าใช้ AI ช่วย

## ไม่อยู่ใน issue นี้
Security Rules จริง (E-6 — Suchitra) · โค้ด `core/` (E-2)
