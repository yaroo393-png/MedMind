// ภาพรวมข้อมูล ณ เวลานี้ที่หน้าจอใช้วาด — อ่านจาก repo แล้วคำนวณด้วย logic/ (ไม่คิดกฎเวลาเองซ้ำ)
// เจ้าของ: Nichanan (ดูแล core/demoData + Demo mode) · ใช้ร่วมกันทุกหน้าจอ · ไม่แตะ DOM / Date.now() (รับ clock เป็นพารามิเตอร์)
// รูปของมื้อ (meal) = Meal ตาม architecture §5.1 + { id, T, dose, pending, notYet, seen, st } เมื่อ st = ผลของ mealState
import { groupMeals } from '../logic/schedule.js';
import { mealState, nextMealStartFor } from '../logic/mealTimeline.js';
import { doseId } from '../logic/confirm.js';
import { scheduledTimeOf } from '../logic/time.js';
import { pairingState } from '../logic/pairing.js';

/**
 * อ่านข้อมูลทั้งหมดของคู่ แล้วคำนวณสถานะทุกมื้อของวัน dateKey
 * @param {{ repo: object, clock: { now(): number }, dateKey: string }} args
 * @returns {Promise<{ now: number, dateKey: string, pairing: object|null, pairState: string, mealTimes: object|null,
 *   medicines: object[], meals: object[], skipped: object[], doses: object }>}
 */
export async function loadSnapshot({ repo, clock, dateKey }) {
  const now = clock.now();
  const [pairing, mealTimes, medicines, doses] = await Promise.all([repo.getPairing(), repo.getMealTimes(), repo.listMedicines(), repo.getDoses()]);
  const grouped = mealTimes ? groupMeals(medicines, mealTimes, dateKey) : { meals: [], skipped: [] };
  const base = grouped.meals;

  const meals = await Promise.all(base.map(async (meal) => {
    const id = doseId(meal);
    const dose = doses[id] ?? null;
    const [notYet, seen] = await Promise.all([repo.getNotYet(meal), repo.getSeen(id)]);
    const nextMealStart = nextMealStartFor(base, meal);
    const st = mealState({ now, meal, dose, nextMealStart, notYetLastRoundAt: notYet });
    return { ...meal, id, T: scheduledTimeOf(meal), dose, pending: Boolean(dose?.pending), notYet, seen, nextMealStart, st };
  }));

  return { now, dateKey, pairing, pairState: pairingState(pairing?.pair), mealTimes, medicines, meals, skipped: grouped.skipped, doses };
}

/** มื้อที่ควรชี้ให้ผู้สูงอายุเห็นก่อน: กำลังเตือน → ยังยืนยันย้อนหลังได้ → มื้อถัดไป (หน้า S-02) */
export function focusMeal(meals) {
  for (const want of ['reminding', 'not_confirmed', 'not_due']) {
    const found = meals.find((m) => m.st.state === want);
    if (found) return found;
  }
  return null;
}
