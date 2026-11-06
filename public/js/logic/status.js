// FR-05 แจ้งผู้ดูแลและสถานะรายวัน — ตรรกะล้วน (ไม่แตะ DOM / Firebase / Date.now(): รับเวลาเป็นพารามิเตอร์)
// เจ้าของ: Suchitra · สัญญา: architecture §5.1 (BR-13, BR-14) และ §5.3 (DL-18) · BR-11, BR-13, BR-14, BR-18, BR-20, BR-21 · NFR-01
// ต่อยอดจาก mealState (FR-03) — ไม่คำนวณเวลา T+15 ซ้ำในไฟล์นี้ · คืน "ชนิด/ป้าย" ไม่คืนข้อความ (หน้าจอแปลงเป็นภาษาไทย)
import { mealState, nextMealStartFor } from './mealTimeline.js';
import { doseId } from './confirm.js';

// สถานะภายใน (mealState) → ป้ายที่ผู้ดูแลเห็น (BR-14)
// ช่วงเตือน (reminding) และเลยมื้อถัดไป (missed) ผู้ดูแลเห็นเหมือน not_confirmed = "ยังไม่ยืนยัน"
const LABEL_OF_STATE = {
  not_due: 'not_due',
  reminding: 'not_confirmed',
  not_confirmed: 'not_confirmed',
  missed: 'not_confirmed',
  taken: 'taken',
  taken_late: 'taken_late',
};

// ต้องแสดงข้อความ "ยืนยันการกินยาแล้ว เวลา …" ไหม (BR-13)
// (ก) ยืนยันช้าจริง (taken_late) หรือ (ข) ยืนยันทันเวลาแต่เคยแจ้ง "ยังไม่ยืนยัน" ไปแล้ว (ข้อมูลมาถึงช้า — A5-T05)
function needsConfirmedMessage(state, seen) {
  return state === 'taken_late' || seen.includes('not_confirmed');
}

// การแจ้งที่ต้องแสดงให้ผู้ดูแลตอนนี้ (ชนิดละครั้งต่อมื้อ — BR-13)
// รับ  { now, meal, dose, notYet, seen }
//   dose = บันทึกยืนยัน หรือ null · notYet = เวลาที่กด "ยังไม่กิน" รอบ T+10 (ms) หรือ null
//   seen = ชนิดการแจ้งที่แสดงแล้วของมื้อนี้ เช่น ['not_confirmed']
// คืน  null | { kind: 'not_confirmed' } | { kind: 'confirmed_late', confirmedAt }
export function alertFor({ now, meal, dose = null, notYet = null, seen = [] }) {
  const { state, caregiverAlert } = mealState({ now, meal, dose, notYetLastRoundAt: notYet });

  if (dose) { // มีการยืนยันแล้ว: แจ้งได้อย่างเดียวคือ "ยืนยันแล้ว เวลา …" และแจ้งครั้งเดียว
    const show = needsConfirmedMessage(state, seen) && !seen.includes('confirmed_late');
    return show ? { kind: 'confirmed_late', confirmedAt: dose.confirmedAt } : null;
  }

  // ยังไม่ยืนยัน: แจ้งเมื่อพ้น T+15 หรือกด "ยังไม่กิน" รอบสุดท้าย (mealState ตัดสินให้) และยังไม่เคยแสดง
  // ผู้ดูแลเปิดหน้ากลับมาทีหลัง (BR-18) ก็ได้การแจ้งที่ค้างอยู่ เพราะยังไม่อยู่ใน seen
  const show = caregiverAlert === 'not_confirmed' && !seen.includes('not_confirmed');
  return show ? { kind: 'not_confirmed' } : null;
}

// สถานะทุกมื้อของวัน เรียงตามเวลาเตือน (FR-05 ข้อ 3, BR-14)
// รับ  { now, meals, doses } — doses = { [doseId]: Dose } (id ของเอกสาร = doseId ของมื้อ)
// คืน  [{ mealId, reminderTime, label, confirmedAt? }] · ไม่มีมื้อ → [] (หน้าจอแสดง "วันนี้ไม่มีมื้อยา")
export function dailyStatus({ now, meals, doses = {} }) {
  return [...meals]
    .sort((a, b) => a.reminderTime.localeCompare(b.reminderTime))
    .map((meal) => {
      const mealId = doseId(meal);
      const dose = doses[mealId] ?? null;
      const { state } = mealState({ now, meal, dose, nextMealStart: nextMealStartFor(meals, meal) });
      const row = { mealId, reminderTime: meal.reminderTime, label: LABEL_OF_STATE[state] };
      if (dose) row.confirmedAt = dose.confirmedAt;
      return row;
    });
}
