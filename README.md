# MedMind — ระบบเตือนกินยาและแจ้งสถานะให้ผู้ดูแลผู้สูงอายุ

[![Milestone](https://img.shields.io/badge/Milestone-M4%20Final%20Project-purple)](docs/05-report/final-report.md)
[![Status](https://img.shields.io/badge/Status-In%20Progress-orange)](#สถานะปัจจุบัน-current-status)
[![Prototype](https://img.shields.io/badge/Prototype-HTML%2FCSS%2FJS%20(no%20server)-blue)](prototype/README.md)

> **Intro to Software Engineering (15031001) — Academic Year 2569**
> School of Applied Digital Technology, Mae Fah Luang University
> **Team:** **[ชื่อทีม]**
> **GitHub Repository:** **[ลิงก์ repo]**

---

## สถานะปัจจุบัน (Current Status)

| ส่วน | สถานะ |
|---|---|
| M1 Charter | ร่างฉบับปรับปรุง (ยังมีช่อง **[ ]** รอข้อมูลทีม) |
| M2 SRS / Requirements | ล็อก FR และ Business Rules แล้ว (`decision-log.md`) — SRS ฉบับเต็มยังไม่เขียน |
| M2 Design | ยังไม่เริ่ม |
| M3 Prototype | ยังไม่เริ่ม |
| Automated tests | ยังไม่มี — **ไม่มีผลทดสอบที่รายงานไว้ล่วงหน้า** |

> README นี้จะอัปเดตเมื่อมีผลจริง ช่อง **[ ]** = ยังไม่มีข้อมูลจริง ไม่เดา

---

## 📌 บทนำและภาพรวมของโครงการ (Project Overview)

**MedMind** คือระบบที่ช่วยให้ผู้สูงอายุที่ต้องกินยาตามเวลา ยืนยันการกินยาได้ด้วยการแตะเดียว และให้ผู้ดูแลที่ไม่ได้อยู่ด้วยรู้สถานะการกินยาแต่ละรอบ โดยไม่ต้องโทรหรือส่งข้อความถาม

**ปัญหา:** ผู้สูงอายุที่มีโรคประจำตัวและต้องรับประทานยาหลายรายการตามเวลาที่กำหนด อาจลืมหรือไม่แน่ใจว่ารับประทานยาแล้วหรือยัง และผู้ดูแลที่ไม่ได้อยู่กับผู้สูงอายุตลอดเวลาไม่สามารถทราบสถานะการรับประทานยาแต่ละรอบได้โดยตรง จึงต้องโทรหรือส่งข้อความเพื่อสอบถามด้วยตนเอง (รายละเอียด: [`docs/01-charter/charter.md`](docs/01-charter/charter.md))

**ผู้ใช้หลัก:** ผู้สูงอายุที่กินยาตามเวลา · ผู้ดูแล (ผู้ดูแลหลัก 1 คน + ผู้ดูแลอื่น)

### ขอบเขต MVP (Must ทั้งหมด)
| FR | ฟีเจอร์ |
|---|---|
| FR-1 | วงดูแล: จับคู่เครื่องด้วย QR / รหัส 6 หลัก, เชิญผู้ดูแล, ผู้ดูแลหลัก |
| FR-2 | เพิ่มยาจากฉลาก: สแกน → ผู้ใช้ตรวจ/แก้ → บันทึก |
| FR-3 | เตือนและยืนยันการกินยา (หัวใจ MVP) |
| FR-4 | แจ้งผู้ดูแลหลักเมื่อยังไม่ยืนยัน |
| FR-5 | สต็อกยา + แจ้งยาใกล้หมด |
| FR-6 | ประวัติการกินยา (ดู + แก้) |

**Future Expansion (ไม่อยู่ใน MVP):** นัดหมาย · Timeline การดูแล · บันทึกความดัน/น้ำตาล · ค่าใช้จ่าย · AI สรุปอาการ · เชื่อมคลินิก · อุปกรณ์วัดสุขภาพ

---

## 🧵 The Golden Thread (ตารางร้อยเรื่องสู่การประเมิน)

*คะแนนไม่ได้ให้ที่ความสวยของแอป แต่ให้ที่ความต่อเนื่อง: ปัญหา → requirement → design → feature → test*

| ปัญหา (Problem) | → Requirement | → Design | → Feature | → Test |
|---|---|---|---|---|
| **ลืม / ไม่แน่ใจว่ากินแล้ว** | **FR-3** (Must) | **[ ]** | **[ ]** | **[ ]** |
| **ผู้ดูแลไม่รู้สถานะ ต้องโทรถาม** | **FR-1, FR-4, FR-6** (Must) | **[ ]** | **[ ]** | **[ ]** |
| **ตั้งข้อมูลยายุ่งยาก** | **FR-2** (Must) | **[ ]** | **[ ]** | **[ ]** |
| **ยาหมดไม่รู้ล่วงหน้า** *(สมมติฐาน รอยืนยัน)* | **FR-5** (Must) | **[ ]** | **[ ]** | **[ ]** |

---

## 📂 สารบัญเอกสารประกอบโครงการ (Project Documentation Index)

```
docs/
├── 01-charter/
│   └── charter.md            # M1: ปัญหา, ผู้ใช้, ขอบเขต in/out, ตัววัดความสำเร็จ, SDLC, บทบาททีม
├── 02-requirements/
│   ├── decision-log.md       # บันทึกการตัดสินใจ: FR, Business Rules BR-01..16, AC ร่าง
│   ├── spec.md               # M2: SRS (User Story, AC, NFR, Use Case, Traceability)
│   └── backlog.md            # M2: Product Backlog + MoSCoW
├── 03-design/
│   ├── architecture.md       # M2: Architecture, Use Case/Sequence/State, ERD, Module & Event
│   └── design-system.md      # M2: Design tokens, Screen Map (หน้าจอ ↔ FR), error/empty states
├── 04-testing/
│   └── test-report.md        # Test plan, test cases จาก AC, ผลรันจริง
├── 05-report/
│   ├── final-report.md       # M3: Final Report + Golden Thread table
│   └── ai-use-statement.md   # M3: บันทึกการใช้ AI ตามจริง
├── 06-presentation/
│   └── demo-slides.md        # M3: โครง Demo (Problem → Solution)
├── docsM1.md                 # M1 ฉบับที่ส่งแล้ว
└── Team08_M2_SRS.pdf         # M2 SRS v1.0 ฉบับที่ส่งแล้ว
prototype/                    # Clickable prototype + tests
spikes/                       # การทดลองเทคนิค (ไม่ใช่ส่วนของระบบ)
```

---

## 🚀 วิธีการเปิดใช้งาน Prototype และการรันระบบ (Quick Start)

> **ยังไม่มี prototype** — ส่วนนี้จะเขียนเมื่อ prototype เสร็จและทดสอบแล้ว

### 1. วิธีเปิดดู Prototype ในเว็บเบราว์เซอร์ (Clickable Prototype)
Prototype เป็น HTML/CSS/JS เปิดในเบราว์เซอร์ได้โดยตรง **ไม่ต้องมี server หรือฐานข้อมูล** (ข้อมูลเป็นข้อมูลจำลอง; การแจ้งเตือนและเวลาเป็นการจำลอง)

1. เปิดผ่านลิงก์ GitHub Pages: **[ลิงก์ เมื่อมี]**
2. หรือดาวน์โหลด repo แล้วเปิดไฟล์ **[`prototype/index.html`]** ด้วยเบราว์เซอร์

### 2. วิธีรันชุดทดสอบอัตโนมัติ (Automated Tests)
```bash
# [คำสั่ง เมื่อ test เสร็จ]
```
ผลลัพธ์: **[ใส่ผลจริงหลังรัน — ห้ามใส่ล่วงหน้า]**

---

## ⚙️ ข้อสมมติและข้อจำกัด

- งบประมาณ 0 บาท — ใช้บริการฟรีทั้งหมด
- ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหวตาม PDPA — เก็บเท่าที่จำเป็น; ไม่เก็บเลขบัตรประชาชน ที่อยู่ วันเกิด เบอร์โทร หรือ HN
- AI อ่านฉลาก (FR-2): ผู้ใช้ต้องตรวจและยืนยันทุกครั้งก่อนบันทึก; spike ใช้ Gemini free tier กับรูปที่ลบข้อมูลส่วนตัวแล้วเท่านั้น (ดู `spikes/`)
- "กินแล้ว" เป็นการยืนยันด้วยตัวเอง ระบบไม่ตรวจว่ากลืนยาจริง; ข้อความถึงผู้ดูแลใช้คำว่า "ยังไม่ยืนยันการกินยา" ไม่ใช้ "ไม่ได้กิน"
- ระบบไม่ให้คำแนะนำขนาดยา ไม่ตีความหรือเปลี่ยนวิธีใช้ยาจากฉลาก
- ตัวเลขเวลา (5 นาที, T+15, 24 ชม., 3–5 วัน, 10 นาที) เป็นเป้าของทีม รอยืนยันกับผู้ใช้ตอนทดสอบ

---

## 👥 สมาชิกและส่วนร่วม (Team & Contribution)

| ชื่อ | รหัส | GitHub | บทบาท |
|---|---|---|---|
| Yar Oo | 6931503064 | `yaroo393-png` | **[ ]** |

ส่วนร่วมรายคนวัดจาก GitHub contribution (commits, PRs, issues, เอกสารที่ commit) — ทุกคน commit ด้วยบัญชีของตัวเอง

---

## 📚 แหล่งอ้างอิง (References)

1. **[แหล่งอ้างอิงเรื่องสังคมสูงวัยของไทย — ใส่ลิงก์จริง]**
2. Android: ข้อจำกัดของ full-screen intent / exact alarm (Android 14+) — **[ใส่ลิงก์เอกสารทางการ]**
3. PDPA — **[ใส่ลิงก์]**
