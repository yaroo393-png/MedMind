// FR-03 ไทม์ไลน์ของมื้อยา — แกนที่ FR-04 (ยืนยัน) และ FR-05 (แจ้งผู้ดูแล) เรียกใช้
// เจ้าของ: Rossatorn · สัญญา: architecture §5.1 (ตารางกฎ) และ §5.3 (DL-18) · BR-08, BR-11, BR-13, BR-15, BR-16, BR-18, BR-20, BR-21
// ฟังก์ชันล้วน: ไม่แตะ DOM / Firebase / Date.now() — รับเวลาปัจจุบัน (now) เป็นพารามิเตอร์ ทุกเวลาเป็นมิลลิวินาที
import { MINUTE_MS, REMINDER_OFFSETS_MIN, ALERT_DEADLINE_MIN, scheduledTimeOf } from './time.js';
import { confirmStatus } from './confirm.js'; // กฎ T+15 อยู่ที่ confirm.js ที่เดียว ไม่เขียนซ้ำ

const ROUND_COUNT = REMINDER_OFFSETS_MIN.length;                // 3 รอบ: T, T+5, T+10
const ROUND_GAP_MS = REMINDER_OFFSETS_MIN[1] * MINUTE_MS;       // ห่างกันรอบละ 5 นาที

// เส้นตายทันเวลา = T + 15 นาที
function deadlineOf(T) {
  return T + ALERT_DEADLINE_MIN * MINUTE_MS;
}

// สิ้นวันของมื้อนี้ = 23:59:59.999 (ใช้เมื่อไม่มีมื้อถัดไป — BR-21)
function endOfDayOf(meal) {
  const [y, m, d] = meal.dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

// รอบเตือนปัจจุบัน 0, 1, 2 (T, T+5, T+10) — คืนเฉพาะรอบ "ตอนนี้" ไม่ย้อนเล่นรอบที่ผ่านไปแล้ว (BR-18)
// ที่ T+15 พอดียังเป็นรอบ 2 ไม่มีรอบที่ 4
function currentRound(now, T) {
  return Math.min(ROUND_COUNT - 1, Math.floor((now - T) / ROUND_GAP_MS));
}

// เวลาเริ่มของ "มื้อถัดไป" = เวลาเตือนแรกของมื้ออื่นในวันเดียวกันที่เริ่ม "หลัง" T+15 (BR-15, BR-16)
// มื้อที่เริ่มก่อนหรือพอดี T+15 (เช่น 07:00 ของมื้อ 06:45) ไม่นับ เพราะเตือนซ้อนกันได้ · ไม่มี → null
export function nextMealStartFor(meals, meal) {
  const T = scheduledTimeOf(meal);
  const starts = meals
    .filter((m) => m.dateKey === meal.dateKey)
    .map(scheduledTimeOf)
    .filter((t) => t > deadlineOf(T));
  return starts.length ? Math.min(...starts) : null;
}

// สถานะของมื้อ ณ เวลา now ตามตารางใน architecture §5.1
// รับ  { now, meal, dose, nextMealStart, notYetLastRoundAt }
//   dose = บันทึกยืนยัน หรือ null/undefined · nextMealStart = ผลของ nextMealStartFor (ms) หรือ null
//   notYetLastRoundAt = เวลาที่กด "ยังไม่กิน" ในรอบ T+10 (ms) หรือไม่ระบุ
// คืน  { state, round, canConfirm, caregiverAlert }
export function mealState({ now, meal, dose = null, nextMealStart = null, notYetLastRoundAt = null }) {
  if (!Number.isFinite(now)) throw new TypeError('now ต้องเป็นเวลา ms');
  const T = scheduledTimeOf(meal);
  const result = (state, round, canConfirm, caregiverAlert) => ({ state, round, canConfirm, caregiverAlert });

  if (now < T) return result('not_due', null, false, null);

  if (dose) { // ยืนยันแล้ว: ตัดสินจากเวลาที่กด (BR-20) ใช้ T ที่เก็บใน Dose เพื่อให้ผลคงที่แม้ผู้ดูแลแก้เวลามื้อทีหลัง
    const status = confirmStatus(Number.isFinite(dose.scheduledTime) ? dose.scheduledTime : T, dose.confirmedAt);
    return result(status, null, false, status === 'taken_late' ? 'confirmed_late' : null);
  }

  if (now <= deadlineOf(T)) { // T ถึง T+15 รวมขอบ: ยังเตือนอยู่ และยังไม่แจ้งผู้ดูแล (BR-21)
    const pressedNotYet = Number.isFinite(notYetLastRoundAt) && notYetLastRoundAt <= now; // BR-11: กด "ยังไม่กิน" รอบ T+10 → แจ้งทันที
    return result('reminding', currentRound(now, T), true, pressedNotYet ? 'not_confirmed' : null);
  }

  const windowEnd = nextMealStart ?? endOfDayOf(meal); // ยืนยันย้อนหลังได้ถึงมื้อถัดไปพอดี (รวมขอบ — BR-21)
  if (now <= windowEnd) return result('not_confirmed', null, true, 'not_confirmed');
  return result('missed', null, false, 'not_confirmed'); // เลยขอบแม้ 1 ms: กดไม่ได้ แต่ผู้ใช้ยังเห็น "ยังไม่ยืนยัน" (BR-15)
}
