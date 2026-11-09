// FR-09: สรุปเฉพาะบันทึกยืนยันจริงของ 7 วันที่จบแล้ว — ไม่อนุมานมื้อที่หายจากตารางยาปัจจุบัน
// ฟังก์ชันล้วน: เวลาอ้างอิงมาจากผู้เรียก ไม่อ่าน DOM / Firebase / นาฬิกาเครื่อง
import { confirmStatus } from './confirm.js';

const STATUSES = new Set(['taken', 'taken_late']);
const pad = (value) => String(value).padStart(2, '0');
const dateKeyOf = (date) => `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const validTime = (time) => typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
const isTimestamp = (value) => typeof value === 'number' && Number.isInteger(value) && Number.isFinite(new Date(value).getTime());

// ใช้เที่ยงวันและเลื่อนด้วย setDate ไม่ลบ 24 ชั่วโมง: วันท้องถิ่นอาจมี 23 หรือ 25 ชั่วโมงเมื่อเปลี่ยน DST
function parseDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new TypeError('วันที่ต้องเป็น YYYY-MM-DD');
  const [year, month, day] = dateKey.split('-').map(Number);
  if (year < 1) throw new TypeError('ปีต้องอยู่ระหว่าง 0001–9999');
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (dateKeyOf(date) !== dateKey) throw new TypeError('วันที่ไม่มีอยู่จริง');
  return date;
}

/** วันที่ท้องถิ่น 7 วันก่อน anchorDateKey เรียงเก่าสุดก่อน ไม่รวมวันอ้างอิงที่ยังไม่จบ */
export function weekDateKeys(anchorDateKey) {
  const date = parseDateKey(anchorDateKey);
  const dates = [];
  for (let index = 0; index < 7; index += 1) {
    date.setDate(date.getDate() - 1);
    if (date.getFullYear() < 1) throw new RangeError('ช่วงสัปดาห์อยู่นอกปีที่รองรับ');
    dates.unshift(dateKeyOf(date));
  }
  return dates;
}

function readRecord(id, dose, dates, now) {
  const match = /^(\d{4}-\d{2}-\d{2})_((?:[01]\d|2[0-3])([0-5]\d))$/.exec(id);
  if (!match || !dates.has(match[1]) || !dose || typeof dose !== 'object' || Array.isArray(dose)) return null;
  if (dose.pending !== undefined && dose.pending !== false) return null;
  if (!isTimestamp(dose.scheduledTime) || !isTimestamp(dose.confirmedAt)) return null;
  if (dose.confirmedAt < dose.scheduledTime || dose.confirmedAt > now) return null;
  const scheduled = new Date(dose.scheduledTime);
  const reminderTime = `${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}`;
  if (dateKeyOf(scheduled) !== match[1] || reminderTime.replace(':', '') !== match[2]) return null;
  if (scheduled.getSeconds() !== 0 || scheduled.getMilliseconds() !== 0) return null;
  const status = confirmStatus(dose.scheduledTime, dose.confirmedAt);
  if (!STATUSES.has(dose.status) || dose.status !== status) return null;
  return { dateKey: match[1], record: { reminderTime, status } };
}

/**
 * Dose map จาก repo.getDoses() → ตาราง 7 วันและจำนวนบันทึกยืนยัน
 * วันที่ไม่มี records คือไม่มีหลักฐานยืนยัน ไม่ได้แปลว่าไม่กินยา/ยังไม่ยืนยันทุกมื้อ
 * excludedCount รวมรายการนอกช่วง รอส่ง เสียรูป หรือยังเป็นอนาคต — ไม่ส่งข้อมูลเหล่านั้นให้ AI
 */
export function buildWeeklySummary({ doses = {}, anchorDateKey, now } = {}) {
  if (!doses || typeof doses !== 'object' || Array.isArray(doses)) throw new TypeError('doses ต้องเป็น object');
  if (!isTimestamp(now)) throw new TypeError('now ต้องเป็นเวลา ms ที่ถูกต้อง');
  const dates = weekDateKeys(anchorDateKey);
  if (anchorDateKey > dateKeyOf(new Date(now))) throw new RangeError('วันอ้างอิงต้องไม่อยู่ในอนาคต');
  const days = dates.map((dateKey) => ({ dateKey, records: [] }));
  const daysByKey = new Map(days.map((day) => [day.dateKey, day]));
  const includedDates = new Set(dates);
  const totals = { confirmed: 0, onTime: 0, late: 0 };
  let excludedCount = 0;
  for (const [id, dose] of Object.entries(doses)) {
    const parsed = readRecord(id, dose, includedDates, now);
    if (!parsed) { excludedCount += 1; continue; }
    daysByKey.get(parsed.dateKey).records.push(parsed.record);
    totals.confirmed += 1;
    if (parsed.record.status === 'taken') totals.onTime += 1;
    else totals.late += 1;
  }
  for (const day of days) day.records.sort((left, right) => left.reminderTime.localeCompare(right.reminderTime));
  return { dates, days, totals, hasData: totals.confirmed > 0, excludedCount };
}

/**
 * สร้าง allowlist ใหม่สำหรับ AI ทุกครั้ง: มีเพียงลำดับวัน เวลา และสถานะยืนยัน
 * ไม่ส่งวันจริง/ID/เวลาที่กด/ชื่อ/HN/ข้อมูลยา แม้ผู้เรียกเติมฟิลด์อื่นเข้ามา
 * ข้อมูลว่างหรือผิดรูปไม่ควรส่งไปให้ AI จึงแจ้งข้อผิดพลาดก่อนสร้างคำขอ
 */
export function toWeeklyAiPayload(summary) {
  if (!Array.isArray(summary?.days) || summary.days.length !== 7) throw new TypeError('ต้องมีข้อมูลครบ 7 วันในตาราง');
  const lastDate = parseDateKey(summary.days[6]?.dateKey);
  lastDate.setDate(lastDate.getDate() + 1);
  const expectedDates = weekDateKeys(dateKeyOf(lastDate));
  let count = 0;
  const days = summary.days.map((day, index) => {
    if (day?.dateKey !== expectedDates[index] || !Array.isArray(day?.records)) throw new TypeError('วันหรือบันทึกยืนยันผิดรูป');
    const times = new Set();
    const meals = day.records.map((record) => {
      if (!validTime(record?.reminderTime) || !STATUSES.has(record?.status) || times.has(record.reminderTime)) throw new TypeError('เวลา/สถานะยืนยันผิดรูปหรือซ้ำ');
      times.add(record.reminderTime);
      count += 1;
      return { time: record.reminderTime, status: record.status };
    });
    meals.sort((left, right) => left.time.localeCompare(right.time));
    return { day: index + 1, meals };
  });
  if (count === 0) throw new RangeError('ไม่มีบันทึกยืนยันเพียงพอสำหรับส่งให้ AI');
  return { days };
}
