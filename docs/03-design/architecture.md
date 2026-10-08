# Architecture & Design — MedMind

> สถานะ: **โครง** · diagram ใช้ Mermaid · ทุก diagram ติดป้าย FR

## 1. Architecture (มาจาก FR) + ADR
## 2. Use Case Diagram
## 3. Sequence Diagram — FR-03 / FR-04 (เตือน → ยืนยัน / แจ้งผู้ดูแล)
## 4. State Machine — DoseSession
## 5. Data Model / ERD (เฉพาะข้อมูลที่ต้องเก็บ; ห้ามเก็บเลขบัตร ที่อยู่ วันเกิด เบอร์โทร HN)
## 6. Module & Event (cohesion / coupling)

> ร่างตั้งต้น (ย้ายมาจาก decision-log เดิม) — สมาชิก A ตรวจและปรับตอนทำ Design

| Module | FR | ข้อมูลที่เป็นเจ้าของ |
|---|---|---|
| `pairing` | FR-01 | Senior, Caregiver, Pairing, InviteCode |
| `medication` (+ adapter `readLabel`) | FR-02 | Medication, MealTimes (เช้า/กลางวัน/เย็น/เข้านอน) |
| `doseSession` | FR-03, FR-04 | DoseSession (มื้อ, เวลาเตือน T, สถานะ: รอถึงเวลา / กำลังเตือน / กินแล้ว / ยังไม่ยืนยัน / กินแล้ว (ยืนยันช้า), รอบที่เตือน, เวลายืนยัน) |
| `escalation` | FR-05 | — (ฟัง event `DoseUnconfirmed`, `DoseConfirmedLate`) |
| `notification` | ใช้ร่วม | NotificationLog |

Events: `MedicationSaved` → `DoseConfirmed` / `DoseUnconfirmed` → `DoseConfirmedLate` (BR-15)

## 7. Coverage: FR → Design (sync-check)
