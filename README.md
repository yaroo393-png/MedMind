# MedMind — ระบบเตือนกินยาและแจ้งสถานะให้ผู้ดูแลผู้สูงอายุ

> Intro to Software Engineering (15031001) — ปีการศึกษา 2569 · School of Applied Digital Technology, MFU
> **Team:** **[ชื่อทีม]** · **Repo:** **[ลิงก์]**

> สถานะ: **กำลังจัดทำ** — โครงเอกสารพร้อม, prototype ยังไม่เริ่ม; ช่อง **[ ]** = ยังไม่มีข้อมูลจริง

## ปัญหา
ผู้สูงอายุที่มีโรคประจำตัวและต้องกินยาหลายรายการตามเวลา อาจลืมหรือไม่แน่ใจว่ากินแล้วหรือยัง ผู้ดูแลที่ไม่ได้อยู่ด้วยไม่รู้สถานะแต่ละรอบ จึงต้องโทรหรือส่งข้อความถามเอง (รายละเอียด: `docs/01-charter/charter.md`)

## Golden Thread
| ปัญหา | Requirement | Design | Feature | Test |
|---|---|---|---|---|
| ลืม / ไม่แน่ใจว่ากินแล้ว | FR-3 | **[ ]** | **[ ]** | **[ ]** |
| ผู้ดูแลไม่รู้สถานะ | FR-1, FR-4, FR-6 | **[ ]** | **[ ]** | **[ ]** |
| ตั้งข้อมูลยายุ่งยาก | FR-2 | **[ ]** | **[ ]** | **[ ]** |
| ยาหมดไม่รู้ล่วงหน้า (สมมติฐาน) | FR-5 | **[ ]** | **[ ]** | **[ ]** |

## สารบัญเอกสาร
```
docs/
├── 01-charter/charter.md                          # M1
├── 02-requirements/{spec,backlog,decision-log}.md # M2 SRS + MoSCoW
├── 03-design/{architecture,design-system}.md      # M2 Design
├── 04-testing/test-report.md
├── 05-report/{final-report,ai-use-statement}.md   # M3
└── 06-presentation/demo-slides.md
prototype/   # clickable prototype + tests
spikes/      # การทดลอง (ไม่ใช่ส่วนของระบบ)
```
ไฟล์ที่ส่งไปแล้ว: `docs/docsM1.md` (M1), `docs/Team08_M2_SRS.pdf` (M2 v1.0)

## วิธีเปิด Prototype
**[เขียนเมื่อ prototype เสร็จ]**

## วิธีรัน Test
**[เขียนเมื่อ test เสร็จ]**

## สมาชิกและส่วนร่วม
ดู `docs/01-charter/charter.md` §7 · ทุกคน commit ด้วยบัญชี GitHub ของตัวเอง
