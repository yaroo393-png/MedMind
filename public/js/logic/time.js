// เวลาและค่าคงที่ของไทม์ไลน์มื้อยา — ใช้ร่วมกันทั้ง FR-03 / FR-04 / FR-05 (สัญญา architecture §5.3, decision-log DL-18)
// เจ้าของ: Rossatorn (FR-03) · ไฟล์นี้ไม่พึ่งไฟล์อื่น · ฟังก์ชันล้วน: ไม่แตะ DOM / Firebase / Date.now()

export const MINUTE_MS = 60 * 1000;            // 1 นาที เป็นมิลลิวินาที
export const REMINDER_OFFSETS_MIN = [0, 5, 10]; // รอบเตือน T, T+5, T+10 (BR-08)
export const ALERT_DEADLINE_MIN = 15;           // T+15 = เส้นตายยืนยันทันเวลา / เริ่มแจ้งผู้ดูแลหลังเวลานี้ (BR-20, BR-21)
export const ALERT_TOLERANCE_S = 5;             // ผู้ดูแลต้องเห็นการแจ้งภายใน 5 วินาที (NFR-01)

// แปลง Meal → T (เวลาเตือนของมื้อ เป็น ms ตามเวลาท้องถิ่นของเครื่อง)
// meal.dateKey = 'YYYY-MM-DD' · meal.reminderTime = 'HH:MM' (architecture §5.1)
export function scheduledTimeOf(meal) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(meal?.dateKey ?? '');
  const time = /^(\d{2}):(\d{2})$/.exec(meal?.reminderTime ?? '');
  if (!date || !time) throw new TypeError('meal ต้องมี dateKey "YYYY-MM-DD" และ reminderTime "HH:MM"');
  const [, y, mo, d] = date.map(Number);
  const [, h, mi] = time.map(Number);
  return new Date(y, mo - 1, d, h, mi).getTime();
}
