🌐 **Language:** [ไทย](#) · [English](README.en.md)

# MedMind — ระบบเตือนกินยาและแจ้งสถานะให้ผู้ดูแลผู้สูงอายุ

[![CI](https://github.com/yaroo393-png/MedMind/actions/workflows/ci.yml/badge.svg)](https://github.com/yaroo393-png/MedMind/actions)
[![Tests](https://img.shields.io/badge/tests-345%20passing-brightgreen)](https://github.com/yaroo393-png/MedMind/actions)

> **Intro to Software Engineering (15031001)** — ปีการศึกษา 2569  
> **Repository:** https://github.com/yaroo393-png/MedMind

## 🔗 ลิงก์สำคัญ

| ลิงก์ | คำอธิบาย |
|---|---|
| [🎯 **Demo Mode**](https://yaroo393-png.github.io/MedMind/demo.html) | เดินครบ FR-01–05 ในเบราว์เซอร์เดียว (เปิดบนมือถือได้) |
| [📱 ต้นแบบ M3](https://yaroo393-png.github.io/MedMind/prototype/2569-11-04/) | ต้นแบบคลิกได้ครบ 43 AC |
| [📚 เอกสาร](docs/) | Charter, SRS, Design, Final Report |

---

## 📸 ภาพหน้าจอ

### Demo Mode (2 จอคู่กัน)
> *รอเพิ่มภาพ: `docs/screenshots/06-demo-mode.png`*

### หน้าจับคู่ (FR-01)
> *รอเพิ่มภาพ: `docs/screenshots/01-pairing-senior.png`*

### หน้าเตือนทุกมื้อ (FR-03)
> *รอเพิ่มภาพ: `docs/screenshots/03-reminder.png`*

---

## 🎯 ภาพรวม

**MedMind** ตอบ 2 คำถาม:
1. **ผู้สูงอายุ:** "มื้อนี้กินยาอะไร กินแล้วหรือยัง?"
2. **ผู้ดูแล:** "มื้อไหนที่ยังไม่ยืนยัน โดยไม่ต้องโทรถามทุกมื้อ?"

ระบบเชื่อมผู้สูงอายุกับผู้ดูแล ใช้ AI อ่านฉลากยาเป็นร่าง (ผู้ดูแลตรวจก่อนบันทึก) เตือนทุกมื้อยา ยืนยันด้วยการกดครั้งเดียว และแจ้งผู้ดูแลเฉพาะมื้อที่ไม่ยืนยันภายใน T+15 นาที

---

## ✨ ฟีเจอร์หลัก

| FR | ฟีเจอร์ | สถานะ |
|---|---|---|
| **FR-01** | จับคู่ผู้สูงอายุ–ผู้ดูแลด้วย QR/รหัส 6 หลัก | ✅ Demo + Firebase |
| **FR-02** | ถ่ายฉลาก → ปิดชื่อ/HN → AI ร่าง → ผู้ดูแลตรวจ | ✅ Demo (AI จำลอง) |
| **FR-03** | เตือนทุกมื้อ + เตือนซ้ำ T+5, T+10 | ✅ Demo + Firebase |
| **FR-04** | ยืนยันทั้งมื้อด้วยการกดครั้งเดียว | ✅ Demo + Firebase |
| **FR-05** | แจ้งผู้ดูแลเฉพาะมื้อที่ไม่ยืนยัน (T+15) | ✅ Demo + Firebase |

---

## 🚀 วิธีเปิดระบบ

### วิธีที่ 1: Demo Mode (แนะนำ ✅)

**เปิดได้ทันที ไม่ต้องติดตั้งอะไร**

1. **คลิก:** [https://yaroo393-png.github.io/MedMind/demo.html](https://yaroo393-png.github.io/MedMind/demo.html)
2. ทดสอบ FR-01–05 ครบ 43 AC ใน 1 เบราว์เซอร์
3. ใช้ปุ่ม "+5 นาที", "+15 นาที" เลื่อนเวลาจำลอง

**ครอบคลุม:**
- ✅ FR-01: จับคู่ด้วยรหัส 6 หลัก
- ✅ FR-02: เพิ่มยา (ใช้ข้อมูลจำลอง)
- ✅ FR-03: เตือนทุกมื้อ + เตือนซ้ำ T+5, T+10
- ✅ FR-04: ยืนยันทั้งมื้อครั้งเดียว
- ✅ FR-05: แจ้งผู้ดูแลเฉพาะมื้อที่ไม่ยืนยัน

---

### วิธีที่ 2: ระบบจริง (Firebase)

**ต้องสร้าง Firebase project ก่อน**

1. **สร้าง Firebase:**
   - อ่าน [`docs/FIREBASE-SETUP.md`](docs/FIREBASE-SETUP.md)
   - ใช้เวลา ~10 นาที

2. **Deploy:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy
   ```

3. **เปิด URL ที่ได้**

---

### วิธีที่ 3: รันเทสต์

```bash
npm test
```

**ผลลัพธ์:** ✅ 345 ผ่าน / ❌ 0 ไม่ผ่าน

---

## 📂 โครงสร้างโปรเจ็กต์

```
MedMind/
├── public/
│   ├── demo.html               ← Demo mode (เปิดได้เลย)
│   ├── senior.html             ← หน้าผู้สูงอายุ (Firebase)
│   ├── caregiver.html          ← หน้าผู้ดูแล (Firebase)
│   ├── js/
│   │   ├── logic/              ← ตรรกะล้วน (7 โมดูล)
│   │   ├── core/               ← แกนของระบบ
│   │   ├── features/           ← หน้าจอ (14 หน้า)
│   │   └── services/           ← Firebase, AI
│   └── css/
├── tests/                      ← 345 เทสต์
├── emulator-tests/             ← 31 เทสต์ Firebase
├── docs/                       ← เอกสารทั้งหมด
│   ├── 01-requirements/
│   ├── 02-design/
│   ├── 05-report/
│   └── screenshots/            ← ภาพหน้าจอ
├── firebase.json
├── firestore.rules
└── package.json
```

---

## 🛠️ เทคโนโลยี

- **Frontend:** HTML, CSS, JavaScript (ES modules)
- **Backend:** Firebase (Firestore, Anonymous Auth, Hosting)
- **AI:** Firebase AI Logic (Gemini) — ยังไม่เชื่อมจริง
- **Testing:** Node.js test runner (345 tests)
- **ไม่มี:** Build step, Framework, Server code

---

## 👥 ทีมและการแบ่งงาน

| คน | FR | ไฟล์โค้ด | สถานะ |
|---|---|---|---|
| **Yar Oo** | FR-02 | `logic/schedule.js`, `logic/labelDraft.js` | ✅ ตรวจแล้ว |
| **Takkan Khanlui** | FR-01 | `logic/pairing.js`, `core/repo.js`, `core/firebase.js` | ✅ ตรวจแล้ว |
| **Rossatorn Sangkaew** | FR-03 | `logic/time.js`, `logic/mealTimeline.js` + ชุดสี | ✅ ตรวจแล้ว |
| **Nichanan Lalua** | FR-04 | `logic/confirm.js`, `core/demoData.js` | ✅ ตรวจแล้ว |
| **Suchitra Khomdee** | FR-05 | `logic/status.js`, ไอคอน | ✅ ตรวจแล้ว |

**หมายเหตุ:** ทุกคน commit ด้วยบัญชี GitHub ของตัวเอง

---

## 🧵 Golden Thread

| ปัญหา | FR | Design | Feature | Test |
|---|---|---|---|---|
| ลืมกิน/กินผิดเวลา | FR-03 | [`architecture.md`](docs/02-design/architecture.md) | [`fr/FR-03-reminder`](fr/FR-03-reminder/) | AC 1–6 |
| จำไม่ได้ว่ากินแล้วหรือยัง | FR-04 | [`architecture.md`](docs/02-design/architecture.md) | [`fr/FR-04-confirm`](fr/FR-04-confirm/) | AC 1–10 |
| โทรถามทุกมื้อ | FR-05 | [`architecture.md`](docs/02-design/architecture.md) | [`fr/FR-05-caregiver-status`](fr/FR-05-caregiver-status/) | AC 1–10 |

รายละเอียดครบ 43 AC: [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md)

---

## ⚠️ ข้อจำกัด

1. **ไม่เตือนตอนปิดหน้าเว็บ** — ต้องเปิด MedMind ค้างไว้
2. **ไม่รองรับยาเมื่อมีอาการ** — เฉพาะยาประจำตามเวลา
3. **ไม่ให้คำแนะนำทางการแพทย์** — AI แค่ร่าง ผู้ดูแลตรวจทุกครั้ง
4. **ยังไม่เชื่อม AI จริง** — ใช้ข้อมูลจำลอง
5. **ยังไม่ทดสอบมือถือจริง** — รองรับ responsive แต่ยังไม่ทดสอบ

---

## 📚 เอกสารเพิ่มเติม

- **SRS v1.5:** [`M2-SRS_MedMind.pdf`](docs/01-requirements/M2-SRS_MedMind.pdf)
- **Architecture:** [`architecture.md`](docs/02-design/architecture.md)
- **TRACEABILITY:** [`TRACEABILITY.md`](docs/TRACEABILITY.md)
- **Final Report:** [`final-report.md`](docs/05-report/final-report.md)
- **AI-Use Statement:** [`ai-use-statement.md`](docs/05-report/ai-use-statement.md)

---

## 🧪 การทดสอบ

### Unit Tests
```bash
npm test
```
✅ **345 เทสต์ผ่าน** — ครอบคลุม `logic/`, `core/`, `features/`

### Emulator Tests
```bash
cd emulator-tests
npm test
```
✅ **31 เทสต์ผ่าน** — Security Rules R-1…R-14 + `firestoreRepo`

---

## 📞 ติดต่อ

- **Repository:** https://github.com/yaroo393-png/MedMind
- **ทีม:** MedMind (5 คน)
- **รายวิชา:** Introduction to Software Engineering (15031001)
- **ปีการศึกษา:** 2569

---

## 📝 License

[MIT License](LICENSE) — ใช้เพื่อการศึกษาเท่านั้น

---

**พัฒนาด้วย ❤️ โดยทีม MedMind**
