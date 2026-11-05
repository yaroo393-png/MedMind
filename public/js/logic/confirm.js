// FR-04 ยืนยันการกินยาทั้งมื้อ — ตรรกะล้วน (ไม่แตะ DOM / Firebase / Date.now(): รับเวลาเป็นพารามิเตอร์)
// เจ้าของ: Nichanan · สัญญา: architecture §5.1 (Dose) และ §5.3 (DL-18) · BR-10, BR-12, BR-20 · NFR-07
// ยืนยันได้หรือไม่ (BR-15, หน้าต่างยืนยันย้อนหลัง) ใช้ mealState().canConfirm ของ FR-03 — ไม่คำนวณซ้ำในไฟล์นี้
import { MINUTE_MS, ALERT_DEADLINE_MIN, scheduledTimeOf } from './time.js';

// เส้นตาย "ทันเวลา" ของมื้อ = T + 15 นาที (ms)
function deadlineOf(scheduledTime) {
  return scheduledTime + ALERT_DEADLINE_MIN * MINUTE_MS;
}

// id ของบันทึกยืนยัน = id ของมื้อ เช่น '2026-11-02_0800'
// มื้อเดียวกันได้ id เดิมเสมอ → กด "กินแล้ว" ซ้ำก็เขียนทับที่เดิม ไม่เกิดรายการใหม่ (BR-12, NFR-07)
export function doseId(meal) {
  return `${meal.dateKey}_${meal.reminderTime.replace(':', '')}`;
}

// ตัดสินผลการยืนยันจาก "เวลาที่กด" เท่านั้น ไม่ใช้เวลาที่ข้อมูลมาถึง (BR-20)
// กดไม่เกิน T+15 (รวมตรง T+15 พอดี) = 'taken' · เกินแม้ 1 ms = 'taken_late' (BR-21)
export function confirmStatus(scheduledTime, confirmedAt) {
  return confirmedAt <= deadlineOf(scheduledTime) ? 'taken' : 'taken_late';
}

// สร้างบันทึกยืนยัน 1 มื้อ → { scheduledTime, confirmedAt, status }
// ไม่ใส่ serverReceivedAt — ชั้นข้อมูล (core/repo.js) เป็นคนเติมตอนบันทึก
export function buildDose({ meal, confirmedAt }) {
  if (!Number.isFinite(confirmedAt)) throw new TypeError('confirmedAt ต้องเป็นเวลา ms ที่ผู้สูงอายุกด');
  const scheduledTime = scheduledTimeOf(meal);
  return { scheduledTime, confirmedAt, status: confirmStatus(scheduledTime, confirmedAt) };
}
