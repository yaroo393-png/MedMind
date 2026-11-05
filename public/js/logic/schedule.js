// FR-02/03 ตารางเวลาเตือนจาก slot ของยา — ตรรกะล้วน (ไม่แตะ DOM / Firebase / Date.now())
// เจ้าของ: Yar · สัญญา: architecture §5.1 (Slot, Meal) และ §5.2 (groupMeals) · BR-05, BR-06, BR-07 · PD-1, PD-6
// หลัก: ไม่ throw ไม่เดาค่า — slot ที่ผิดถูกคัดออกและรายงานใน skipped พร้อมเหตุผล (หน้าร่างยาขึ้น "Please check")

const MEALS = ['breakfast', 'lunch', 'dinner', 'bedtime'];
const TIMINGS = ['after_meal', 'before_meal', 'at_bedtime'];

// จำนวนเต็มบวก (ไม่รองรับครึ่งเม็ด / 0 / ติดลบ — BR-07)
function isPositiveInt(n) {
  return Number.isInteger(n) && n > 0;
}

// 'HH:MM' → นาทีนับจากเที่ยงคืน · รูปแบบผิด → null
function toMinutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

// นาทีนับจากเที่ยงคืน → 'HH:MM'
function toHHMM(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// ตรวจ slot 1 ช่อง → null ถ้าถูก หรือเหตุผลที่ผิด (§5.2)
export function validateSlot(slot) {
  if (!MEALS.includes(slot?.meal)) return 'invalid_meal';
  if (!TIMINGS.includes(slot.timing)) return 'invalid_timing';
  if (slot.timing === 'before_meal' && !isPositiveInt(slot.minutesBefore)) return 'minutesBefore_required';
  if (!isPositiveInt(slot.tabletsPerDose)) return 'invalid_tablets';
  // "ก่อนนอน" ต้องคู่กับมื้อ bedtime เท่านั้น และมื้อ bedtime ต้องเป็น "ก่อนนอน" (หรือกลับกัน)
  if ((slot.timing === 'at_bedtime') !== (slot.meal === 'bedtime')) return 'meal_timing_mismatch';
  return null;
}

// เวลาเตือนของ slot ตาม BR-06 → 'HH:MM'
//   หลังอาหาร = เวลามื้อ · ก่อนอาหาร N นาที = เวลามื้อ − N · ก่อนนอน = เวลาก่อนนอน
// เวลามื้อไม่ได้ตั้ง/รูปแบบผิด หรือถอยข้ามเที่ยงคืน (SRS ไม่ระบุ) → null ไม่เดา
export function reminderTime(slot, mealTimes) {
  const base = toMinutes(mealTimes?.[slot.meal]);
  if (base === null) return null;
  const minutes = slot.timing === 'before_meal' ? base - slot.minutesBefore : base;
  return minutes >= 0 ? toHHMM(minutes) : null;
}

// มุมมองยาของมื้อนี้ (§5.1) — จำนวนเม็ดมาจาก slot นี้ ไม่ใช่ของยาทั้งตัว
function medicineView(medicine, slot) {
  return {
    medicineId: medicine.id, name: medicine.name, tabletsPerDose: slot.tabletsPerDose,
    warnings: medicine.warnings ?? null, contraindications: medicine.contraindications ?? null, slot: { ...slot },
  };
}

// ยาเดียวกันมีอยู่แล้วในมื้อเดียวกัน → เหตุผล (PD-6: ไม่ merge ไม่บวกเม็ด)
function duplicateReason(existing, slot) {
  return existing.tabletsPerDose === slot.tabletsPerDose ? 'duplicate_slot' : 'conflicting_tablets';
}

// รวม slot ของยาทุกตัวเป็นมื้อ — จัดกลุ่มด้วยเวลาเตือนเท่านั้น (ไม่ใช้ชื่อยา ไม่ใช้ชื่อมื้อ) เรียงเวลาจากน้อยไปมาก
// → { meals: [{ dateKey, reminderTime, medicines }], skipped: [{ medicineId, slotIndex, reason }] }
export function groupMeals(medicines, mealTimes, dateKey) {
  const byTime = new Map();
  const skipped = [];
  const skip = (medicineId, slotIndex, reason) => skipped.push({ medicineId, slotIndex, reason });

  for (const medicine of medicines) {
    if (!Array.isArray(medicine.slots) || medicine.slots.length === 0) { skip(medicine.id, null, 'no_slot'); continue; }
    medicine.slots.forEach((slot, slotIndex) => {
      const problem = validateSlot(slot);
      if (problem) return skip(medicine.id, slotIndex, problem);
      const time = reminderTime(slot, mealTimes);
      if (time === null) return skip(medicine.id, slotIndex, 'invalid_reminder_time');
      const list = byTime.get(time) ?? [];
      const existing = list.find((x) => x.medicineId === medicine.id);
      if (existing) return skip(medicine.id, slotIndex, duplicateReason(existing, slot)); // ยาอยู่ในมื้อได้ครั้งเดียว
      list.push(medicineView(medicine, slot));
      byTime.set(time, list);
    });
  }

  const meals = [...byTime.keys()].sort().map((time) => ({ dateKey, reminderTime: time, medicines: byTime.get(time) }));
  return { meals, skipped };
}
