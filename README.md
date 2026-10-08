# MedMind — ระบบเตือนกินยาและแจ้งสถานะให้ผู้ดูแลผู้สูงอายุ

[![Milestone](https://img.shields.io/badge/Milestone-M4%20Final%20Project-purple)](docs/05-report/final-report.md)
[![Status](https://img.shields.io/badge/Status-In%20Progress-orange)](#สถานะปัจจุบัน-current-status)
[![Prototype](https://img.shields.io/badge/Prototype-HTML%2FCSS%2FJS%20(no%20server)-blue)](prototype/README.md)

> **Intro to Software Engineering (15031001) — Academic Year 2569**
> School of Applied Digital Technology, Mae Fah Luang University
> **Team:** **MedMind**
> **GitHub Repository:** https://github.com/yaroo393-png/SE-Project

---

## สถานะปัจจุบัน (Current Status)

| ส่วน | สถานะ |
|---|---|
| M1 Charter | ร่างฉบับปรับปรุง (ยังมีช่อง **[ ]** รอข้อมูลทีม) |
| M2 SRS / Requirements | SRS v2.0 ร่างแล้ว (`spec.md`): 5 FR, BR-01..17, AC, NFR-01..10, Use case, Traceability — ยังรอ: Use-case diagram, ช่อง **[ ]** ข้อมูลทีม |
| M2 Design | ยังไม่เริ่ม |
| M3 Prototype | ยังไม่เริ่ม |
| Automated tests | ยังไม่มี — **ไม่มีผลทดสอบที่รายงานไว้ล่วงหน้า** |

> README นี้จะอัปเดตเมื่อมีผลจริง ช่อง **[ ]** = ยังไม่มีข้อมูลจริง ไม่เดา

---

## 📌 บทนำและภาพรวมของโครงการ (Project Overview)

**MedMind** คือระบบที่ช่วยให้ผู้สูงอายุที่ต้องกินยาตามเวลา ยืนยันการกินยาได้ด้วยการแตะเดียว และให้ผู้ดูแลที่ไม่ได้อยู่ด้วยรู้สถานะการกินยาแต่ละรอบ โดยไม่ต้องโทรหรือส่งข้อความถาม

**ปัญหา:** ผู้สูงอายุที่ต้องรับประทานยาเป็นประจำอาจลืมกินยา กินไม่ตรงเวลา หรือจำไม่ได้ว่ากินแล้วหรือยัง ขณะที่ลูกหลานต้องออกไปทำงานและไม่สามารถติดตามได้ตลอดวัน วิธีปัจจุบัน (นาฬิกาปลุก กล่องยา โทรถาม ส่ง LINE) ยังไม่สามารถยืนยันและสรุปสถานะการกินยาให้ผู้ดูแลทราบโดยอัตโนมัติได้ (รายละเอียด: [`docs/01-charter/charter.md`](docs/01-charter/charter.md))

**ผู้ใช้หลัก:** ผู้สูงอายุ (Senior) · ลูกหลาน / ผู้ดูแล (Caregiver)

### ขอบเขต MVP (5 FR — Must ทั้งหมด)
| FR | ฟีเจอร์ |
|---|---|
| FR-01 | จับคู่ Senior–Caregiver ผ่าน QR / รหัสเชิญ (Senior ไม่ต้องสมัคร แต่ต้องยินยอม) |
| FR-02 | สแกนฉลากยา → Caregiver ตรวจ/แก้ → บันทึก |
| FR-03 | แจ้งเตือนเมื่อถึงมื้อยา + แจ้งซ้ำ 2 ครั้ง (หัวใจ MVP) |
| FR-04 | ยืนยันการกินยาทั้งมื้อด้วยการกดครั้งเดียว |
| FR-05 | แจ้ง Caregiver เมื่อยังไม่ยืนยัน (ไม่เกิน T+15) + หน้าสถานะรายวัน |

**หลัง MVP (Should / Could — ดู SRS §3.6 ใน [`spec.md`](docs/02-requirements/spec.md)):** หลาย Caregiver ต่อ Senior · ยาเมื่อมีอาการ/ยาน้ำ/ยาครึ่งเม็ด · สต็อกยา + แจ้งยาใกล้หมด · แก้ประวัติย้อนหลัง · วิเคราะห์รูปแบบการพลาดยา · นัดหมาย · ความดัน/น้ำตาล · ค่าใช้จ่าย · เชื่อมโรงพยาบาล · Smart Pillbox / IoT / Smartwatch · รูปยา · ยืนยันรายเม็ด

---

## 🧵 The Golden Thread 
*คะแนนไม่ได้ให้ที่ความสวยของแอป แต่ให้ที่ความต่อเนื่อง: ปัญหา → requirement → design → feature → test*

| ปัญหา (Problem) | → Requirement | → Design | → Feature | → Test |
|---|---|---|---|---|
| ผู้สูงอายุไม่สะดวกสมัครบัญชี; ผู้ดูแลไม่อยู่ด้วย | **FR-01** | (M3 Design) | (M3 Prototype) | FR-01 AC 1–6 · NFR-04, NFR-05, NFR-10 |
| ผู้ดูแลอยากให้ช่วยกรอกข้อมูลยาจากฉลาก | **FR-02** | (M3 Design) | (M3 Prototype) | FR-02 AC 1–10 · NFR-06, NFR-09 |
| ลืมกินยา / กินไม่ตรงเวลา | **FR-03** | State machine ของมื้อยา: รอถึงเวลา → กำลังเตือน (T, T+5, T+10) → กินแล้ว / ยังไม่ยืนยัน / ยืนยันช้า *(planned)* | หน้าเตือน: ยาทั้งมื้อ + เสียง + ปุ่ม "กินแล้ว" / "ยังไม่กิน" *(planned)* | FR-03 AC 1–4 · NFR-01 *(planned)* |
| จำไม่ได้ว่ากินแล้วหรือยัง | **FR-04** | (M3 Design) | (M3 Prototype) | FR-04 AC 1–6 · NFR-02, NFR-03, NFR-07 |
| ต้องโทร/ส่ง LINE ถามทุกมื้อ; ไม่มีสถานะรวม | **FR-05** | (M3 Design) | (M3 Prototype) | FR-05 AC 1–6 · NFR-01 |
| ผู้ดูแลไม่ได้อยู่ด้วยตลอด บางครั้งโทรไม่ได้ | **FR-06** (Should) | (หลัง MVP) | (หลัง MVP) | (หลัง MVP — AC เขียนเมื่อย้ายเข้า increment) |
| ไม่รู้ว่ามื้อนี้/วันนี้ต้องกินยาอะไร | **FR-07** (Could) | (หลัง MVP) | (หลัง MVP) | (หลัง MVP — AC เขียนเมื่อย้ายเข้า increment) |
| อยากเห็นรูปยา (ผู้ให้สัมภาษณ์ 1) | **FR-08** (Could) | (หลัง MVP) | (หลัง MVP) | (หลัง MVP — AC เขียนเมื่อย้ายเข้า increment) |

> ตารางนี้คัดจาก `docs/02-requirements/spec.md` §7 — แก้ที่ spec ก่อนแล้วคัดมาให้ตรง

---

## 📂 สารบัญเอกสารประกอบโครงการ (Project Documentation Index)

```
docs/
├── 01-charter/
│   └── charter.md            # M1: ปัญหา, ผู้ใช้, ขอบเขต in/out, ตัววัดความสำเร็จ, SDLC, บทบาททีม
├── 02-requirements/
│   └── spec.md               # M2: SRS (Business Rules, User Story, AC, MoSCoW, NFR, Use Case, Traceability)
├── 03-design/
│   ├── architecture.md       # M2: Architecture, Use Case/Sequence/State, ERD, Module & Event
│   └── design-system.md      # M2: Design tokens, Screen Map (หน้าจอ ↔ FR), error/empty states
├── 05-report/
│   ├── final-report.md       # M3: Final Report + Golden Thread table
│   └── ai-use-statement.md   # M3: บันทึกการใช้ AI ตามจริง
├── 06-presentation/
│   └── demo-slides.md        # M3: โครง Demo (Problem → Solution)
prototype/                    # Clickable prototype + tests
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

## ⚙️ ข้อจำกัดที่สำคัญ

- การกดยืนยันเป็นการรายงานด้วยตนเอง ระบบไม่ตรวจว่ากินยาจริง; ข้อความถึงผู้ดูแลใช้คำว่า "ยังไม่ยืนยันการกินยา"
- ผล OCR ต้องผ่านการตรวจของ Caregiver ทุกครั้งก่อนบันทึก
- ระบบไม่วินิจฉัย ไม่แนะนำยา และไม่เปลี่ยนวิธีใช้ยา
- Prototype ไม่มี backend จริง — การแจ้งเตือน เวลา และ OCR เป็นการจำลอง

---

## 👥 สมาชิกและส่วนร่วม (Team & Contribution)

ดู `docs/01-charter/charter.md` §9 (รอทีมกรอก)

ส่วนร่วมรายคนวัดจาก GitHub contribution (commits, PRs, issues, เอกสารที่ commit) — ทุกคน commit ด้วยบัญชีของตัวเอง

---

## 📚 แหล่งอ้างอิง (References)

**[ทีมกรอก]**
