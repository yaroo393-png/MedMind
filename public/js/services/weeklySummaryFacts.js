// FR-09: ข้อเท็จจริงควบคุมที่ใช้ร่วมกับหน้าจอและ Demo ไม่มี Firebase/AI SDK หรือการเรียกบริการ
import { toWeeklyAiPayload } from '../logic/weeklySummary.js';

const allowedStatus = new Set(['taken', 'taken_late']);
const validTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const invalidData = () => Object.assign(new TypeError('ข้อมูลสรุปผิดรูป'), { reason: 'unreadable', code: 'invalid_data' });

/** รับเฉพาะลำดับวัน เวลา และสถานะ แม้มีฟิลด์ส่วนตัวอื่นแนบเข้ามา */
export function cleanPayload(payload) {
  if (!Array.isArray(payload?.days) || payload.days.length !== 7) throw invalidData();
  return {
    days: payload.days.map((day, i) => {
      if (day?.day !== i + 1 || !Array.isArray(day.meals)) throw invalidData();
      const times = new Set();
      const meals = day.meals.map((meal) => {
        if (!validTime(meal?.time) || !allowedStatus.has(meal.status) || times.has(meal.time)) throw invalidData();
        times.add(meal.time);
        return { time: meal.time, status: meal.status };
      }).sort((a, b) => a.time.localeCompare(b.time));
      return { day: i + 1, meals };
    }),
  };
}

/** ประโยคและ ID คำนวณจากหลักฐานเดิมเสมอ ไม่เชื่อ totals หรือข้อความที่แนบมาจากภายนอก */
export function summaryChoices(payload) {
  const safe = cleanPayload(payload);
  const meals = safe.days.flatMap((day) => day.meals);
  if (!meals.length) return [];
  const late = meals.filter((meal) => meal.status === 'taken_late').length;
  const choices = [{
    id: 'overview',
    text: `จากบันทึกยืนยันในช่วง 7 วัน พบทั้งหมด ${meals.length} มื้อ: ยืนยันทันเวลา ${meals.length - late} มื้อ และยืนยันช้า ${late} มื้อ`,
  }];
  const times = [...new Set(meals.filter((meal) => meal.status === 'taken_late').map((meal) => meal.time))].sort();
  for (const time of times) {
    const atTime = meals.filter((meal) => meal.time === time);
    const count = atTime.filter((meal) => meal.status === 'taken_late').length;
    choices.push({ id: `late_${time.replace(':', '')}`, text: `เวลาเตือน ${time} มีบันทึกยืนยันช้า ${count} มื้อ จากบันทึกยืนยัน ${atTime.length} มื้อในช่วงนี้` });
  }
  return choices;
}

/** ชุดข้อมูลเดียวกับคำขอจริง ใช้ preview โดยไม่โหลด service หรือ SDK */
export function weeklyRequestData(summary) {
  const payload = cleanPayload(toWeeklyAiPayload(summary));
  return { days: payload.days, candidates: summaryChoices(payload) };
}

/** ผลจำลองเลือกประเด็นที่มีจริง ไม่เชื่อม backend และคงรูป { items, text } เดิม */
export function demoWeeklySummary(summary) {
  const items = weeklyRequestData(summary).candidates.slice(0, 3);
  return { items, text: items.map((item) => item.text).join('\n') };
}
