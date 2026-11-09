// ข้อความและรูปแบบเวลาที่หน้าจอใช้ร่วมกัน — ฟังก์ชันล้วน (ไม่แตะ DOM / Firebase / Date.now())
// เจ้าของ: Rossatorn (UX/UI) · ข้อความตาม SRS v1.5 และ BR-14 (ผู้ดูแลเห็น "ยังไม่ยืนยัน" ห้ามใช้คำว่า "ไม่ได้กิน")
// เวลาทั้งหมดเป็นมิลลิวินาที ตามเวลาท้องถิ่นของเครื่อง (เหมือน logic/time.js)

import { tr, getLanguage } from './i18n.js';

// อ่านคำแปลตอนใช้ ไม่เก็บภาษาค้างไว้ตอน import (ยังใช้ MEAL_NAMES[key] / Object.entries ได้เหมือนเดิม)
const labels = (values) => Object.defineProperties({}, Object.fromEntries(Object.entries(values).map(([key, [th, en]]) => [key, { enumerable: true, get: () => tr(th, en) }])));
export const MEAL_NAMES = labels({ breakfast: ['เช้า', 'Breakfast'], lunch: ['กลางวัน', 'Lunch'], dinner: ['เย็น', 'Dinner'], bedtime: ['ก่อนนอน', 'Bedtime'] });
export const TIMING_NAMES = labels({ after_meal: ['หลังอาหาร', 'After a meal'], before_meal: ['ก่อนอาหาร', 'Before a meal'], at_bedtime: ['ก่อนนอน', 'At bedtime'] });

// เหตุผลที่ slot ใช้ไม่ได้ → ข้อความถึงผู้ดูแล (ตรงกับ reason ของ validateSlot / groupMeals)
export const REASON_TEXT = labels({
  missing: ['อ่านไม่ได้ — กรอกเอง', 'Could not read this field — enter it manually'],
  invalid_meal: ['ยังไม่ได้เลือกมื้อ', 'Choose a meal'], invalid_timing: ['ยังไม่ได้เลือกวิธีกิน', 'Choose when to take it'],
  minutesBefore_required: ['ก่อนอาหารต้องระบุจำนวนนาที', 'Enter the number of minutes before the meal'],
  invalid_tablets: ['จำนวนเม็ดต้องเป็นจำนวนเต็มบวก (ไม่รองรับครึ่งเม็ด)', 'The tablet count must be a positive whole number (half tablets are not supported)'],
  meal_timing_mismatch: ['ก่อนนอนต้องเลือกมื้อ "ก่อนนอน" คู่กัน', 'At bedtime must use the Bedtime meal'],
  duplicate_slot: ['ช่องเวลากินซ้ำกัน', 'Duplicate dose time'],
  conflicting_tablets: ['เวลาเตือนเดียวกันแต่จำนวนเม็ดต่างกัน', 'The same reminder time has different tablet counts'],
  no_slot: ['ยังไม่มีช่องเวลากิน', 'Add at least one dose time'],
  invalid_reminder_time: ['คำนวณเวลาเตือนไม่ได้ — ตรวจเวลามื้อ', 'Cannot calculate the reminder time — check the meal times'],
});

// เหตุผลที่จับคู่ไม่สำเร็จ (reason ของ joinCheck) → ข้อความ (FR-01 ข้อ 2, 4, 5)
export const JOIN_TEXT = labels({
  wrong_code: ['รหัสไม่ถูกต้อง — ตรวจรหัสแล้วลองใหม่', 'Incorrect code — check it and try again'],
  already_has_caregiver: ['ผู้สูงอายุท่านนี้มีผู้ดูแลแล้ว', 'This older adult already has a caregiver'],
  expired: ['รหัสหมดอายุแล้ว (เกิน 10 นาที) — ขอรหัสใหม่จากเครื่องผู้สูงอายุ', 'The code has expired (over 10 minutes) — request a new code on the older adult’s device'],
  already_used: ['รหัสนี้ถูกใช้ไปแล้ว — ขอรหัสใหม่', 'This code has already been used — request a new one'],
  not_consented: ['รอผู้สูงอายุกดยินยอมก่อน แล้วลองใหม่', 'Wait for the older adult to consent, then try again'],
  self_pairing: ['เครื่องนี้คือเครื่องผู้สูงอายุของคู่นี้ — ใช้มือถืออีกเครื่องเป็นผู้ดูแล', 'This is the older adult’s device — use a different device for the caregiver'],
});

// ปัญหาของบริการ AI (FR-02 ข้อ 5) — ใช้ใน Demo mode จำลองเหตุที่ส่งไม่ได้
export const AI_PROBLEMS = labels({
  offline: ['ไม่มีอินเทอร์เน็ต ส่งให้ AI ไม่ได้', 'No internet connection — cannot send to AI'],
  down: ['บริการ AI ใช้ไม่ได้ตอนนี้', 'The AI service is currently unavailable'],
  quota: ['โควตา AI ของวันนี้หมดแล้ว', 'Today’s AI quota has been used up'],
  unreadable: ['อ่านรูปไม่ออก (ภาพเบลอหรือมืดเกินไป)', 'Cannot read this image (it may be too blurry or dark)'],
});

const pad = (n) => String(n).padStart(2, '0');

/** ms → 'HH:MM' */
export function fmtHM(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ms → 'HH:MM:SS.mmm' (แถบเวลาจำลอง — ขอบเวลา BR-21 ต้องเห็นมิลลิวินาที) */
export function fmtHMSms(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

/** ms ที่เหลือ → 'MM:SS' (นับถอยหลังอายุรหัสเชิญ) */
export function fmtCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/**
 * อ่านเวลาที่พิมพ์ในช่อง "ตั้งเวลาจำลอง": 'H:MM' · 'HH:MM' · 'HH:MM:SS' · 'HH:MM:SS.mmm'
 * dayStart = ms ของเที่ยงคืนวันตัวอย่าง → คืน ms หรือ null ถ้ารูปแบบผิด (ไม่เดา)
 */
export function parseClockInput(text, dayStart) {
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  const sec = m[3] === undefined ? 0 : Number(m[3]);
  const ms = m[4] === undefined ? 0 : Number(`${m[4]}00`.slice(0, 3));
  if (h > 23 || mi > 59 || sec > 59) return null;
  const d = new Date(dayStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi, sec, ms).getTime();
}

/** เที่ยงคืนของวันที่ 'YYYY-MM-DD' เป็น ms */
export function dayStartOf(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** 'YYYY-MM-DD' → ข้อความวันที่ภาษาไทย (พ.ศ.) */
export function thaiDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const thai = getLanguage() === 'th';
  const months = thai ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${thai ? y + 543 : y}`;
}

/**
 * ป้ายสถานะของมื้อ (BR-14): state ของ mealState หรือ label ของ dailyStatus → { text, kind }
 * reminding / not_confirmed / missed / not_confirmed = "ยังไม่ยืนยัน" เสมอ ไม่ใช้คำว่า "ไม่ได้กิน"
 */
export function statusLabel(state, confirmedAt) {
  switch (state) {
    case 'not_due': return { text: tr('ยังไม่ถึงเวลา', 'Not due yet'), kind: 'none' };
    case 'taken': return { text: tr(`กินแล้ว ${fmtHM(confirmedAt)}`, `Confirmed ${fmtHM(confirmedAt)}`), kind: 'taken' };
    case 'taken_late': return { text: tr(`กินแล้ว (ยืนยันย้อนหลัง) ${fmtHM(confirmedAt)}`, `Confirmed late ${fmtHM(confirmedAt)}`), kind: 'late' };
    default: return { text: tr('ยังไม่ยืนยัน', 'Not yet confirmed'), kind: 'notyet' };
  }
}
