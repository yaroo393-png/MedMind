// FR-02 ร่างยาจากผลอ่านฉลากของ AI — ตรรกะล้วน (ไม่แตะ DOM / Firebase / AI จริง)
// เจ้าของ: Yar · Issue #13 · สัญญา architecture §5.4 (DL-19) · BR-04, BR-05, BR-07, BR-19 · NFR-09, NFR-14
// หลัก: (1) ผลจาก AI ไม่น่าไว้ใจ — ตรวจชนิดทุกช่อง ค่าผิด = ว่าง ไม่เดา  (2) ช่องที่ต้องตรวจ = "โปรดตรวจสอบ" เฉพาะช่องนั้น
//       (3) ไม่คิดกฎ slot ซ้ำ — ใช้ validateSlot / groupMeals ของ schedule.js  (4) ทุกฟังก์ชันคืนร่างใหม่ ไม่แก้ร่างเดิม
import { validateSlot, groupMeals } from './schedule.js';

const MEALS = ['breakfast', 'lunch', 'dinner', 'bedtime'];
const TIMINGS = ['after_meal', 'before_meal', 'at_bedtime'];
const TEXT_FIELDS = ['name', 'instructionText', 'warnings', 'contraindications'];
const SLOT_FIELDS = ['meal', 'timing', 'minutesBefore', 'tabletsPerDose'];
const MAX_TEXT = 200;
// ช่องที่ validateSlot ชี้ — ใช้บอกว่า "โปรดตรวจสอบ" ช่องไหนของ slot
const FIELD_OF_REASON = { invalid_meal: 'meal', invalid_timing: 'timing', minutesBefore_required: 'minutesBefore', invalid_tablets: 'tabletsPerDose' };

// ---------- ทำความสะอาดค่าจาก AI ----------
// ข้อความ: ต้องเป็น string · ตัดช่องว่างหัวท้าย · ยาวเกิน 200 ตัด · ว่าง = null
function cleanText(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, MAX_TEXT);
  return text === '' ? null : text;
}
const positiveIntOrNull = (n) => (Number.isInteger(n) && n > 0 ? n : null);
const oneOfOrNull = (value, list) => (list.includes(value) ? value : null);

// slot จาก AI → รับเฉพาะ 4 ช่องตามสัญญา ค่าผิดชนิด/นอก enum = null
function cleanSlot(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    meal: oneOfOrNull(s.meal, MEALS),
    timing: oneOfOrNull(s.timing, TIMINGS),
    minutesBefore: positiveIntOrNull(s.minutesBefore),
    tabletsPerDose: positiveIntOrNull(s.tabletsPerDose),
  };
}

// ---------- หาช่องที่ต้อง "โปรดตรวจสอบ" ----------
const isEmpty = (v) => v === null || v === undefined || v === '';

// ช่องว่างใน slot (minutesBefore ต้องมีเฉพาะ "ก่อนอาหาร")
function missingFieldsOf(slot) {
  const needed = slot.timing === 'before_meal' ? SLOT_FIELDS : SLOT_FIELDS.filter((f) => f !== 'minutesBefore');
  return needed.filter((f) => isEmpty(slot[f]));
}

// ตรวจทั้งร่าง → [{ path, reason }] เรียง: ช่องว่างก่อน แล้วจึงกฎของ slot และการซ้ำ/ขัดกัน
function checksOf(draft, mealTimes) {
  if (draft.unsupported) return []; // ยาเมื่อมีอาการ: ไม่สร้างเวลาเตือน จึงไม่ตรวจ slot (FR-02 ข้อ 4)
  const checks = [];
  if (isEmpty(draft.name)) checks.push({ path: 'name', reason: 'missing' });
  if (draft.slots.length === 0) checks.push({ path: 'slots', reason: 'no_slot' });

  const completeSlots = []; // slot ที่ไม่มีช่องว่างและผ่าน validateSlot → ส่งต่อไปตรวจซ้ำ/ขัดกัน
  draft.slots.forEach((slot, i) => {
    const missing = missingFieldsOf(slot);
    if (missing.length) { missing.forEach((f) => checks.push({ path: `slots[${i}].${f}`, reason: 'missing' })); return; }
    const reason = validateSlot(slot);
    if (reason) { checks.push({ path: FIELD_OF_REASON[reason] ? `slots[${i}].${FIELD_OF_REASON[reason]}` : `slots[${i}]`, reason }); return; }
    completeSlots.push({ slot, index: i });
  });

  // slot ซ้ำ / เวลาเดียวกันเม็ดต่างกัน / คำนวณเวลาเตือนไม่ได้ — ให้ groupMeals ตัดสิน (PD-6: ไม่รวม ไม่บวกเม็ด)
  if (completeSlots.length === 0) return checks;
  const { skipped } = groupMeals([{ id: 'draft', name: 'draft', slots: completeSlots.map((c) => c.slot) }], mealTimes ?? {}, '2000-01-01');
  for (const s of skipped) checks.push({ path: `slots[${completeSlots[s.slotIndex].index}]`, reason: s.reason });
  return checks;
}

// ---------- ฟังก์ชันตามสัญญา §5.4 ----------

/**
 * ผลอ่านฉลากจาก AI → ร่างยา (ยังไม่บันทึก — FR-02 ข้อ 1)
 * ไม่ throw: JSON ผิดรูป/ไม่ใช่ object → ร่างว่าง + "โปรดตรวจสอบ" (ข้อ 3) · ใช้ buildDraft(null) เปิดฟอร์มกรอกเอง (ข้อ 5)
 * รับเฉพาะช่องตามสัญญา — ช่องอื่น (เช่น ชื่อผู้ป่วย / HN) ถูกทิ้ง ไม่เข้าร่าง (NFR-09)
 */
export function buildDraft(aiJson, { mealTimes } = {}) {
  const src = aiJson && typeof aiJson === 'object' && !Array.isArray(aiJson) ? aiJson : {};
  const asNeeded = src.asNeeded === true;
  const draft = {
    name: cleanText(src.name), instructionText: cleanText(src.instructionText),
    warnings: cleanText(src.warnings), contraindications: cleanText(src.contraindications),
    slots: asNeeded || !Array.isArray(src.slots) ? [] : src.slots.map(cleanSlot),
    unsupported: asNeeded ? 'as_needed' : null, // BR-07
    checks: [],
  };
  draft.checks = checksOf(draft, mealTimes);
  return draft;
}

// แยก path เช่น 'slots[1].meal' → { index: 1, field: 'meal' } · 'name' → { field: 'name' }
function parsePath(path) {
  const m = /^slots\[(\d+)\]\.(\w+)$/.exec(path);
  if (m && SLOT_FIELDS.includes(m[2])) return { index: Number(m[1]), field: m[2] };
  if (TEXT_FIELDS.includes(path)) return { field: path };
  throw new RangeError(`แก้ช่อง "${path}" ไม่ได้`);
}

// ค่าที่ผู้ดูแลกรอก: ข้อความทำความสะอาดแบบเดียวกับ AI · ตัวเลขที่พิมพ์เป็นข้อความแปลงเป็นตัวเลข · ค่าว่าง = null
function editValue(field, value) {
  if (TEXT_FIELDS.includes(field)) return cleanText(value);
  if (isEmpty(value)) return null;
  if ((field === 'minutesBefore' || field === 'tabletsPerDose') && typeof value === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(value)) return Number(value);
  return value; // ค่าแปลก ๆ เก็บไว้ตามที่กรอก แล้วให้ checks แจ้ง "โปรดตรวจสอบ"
}

/** ผู้ดูแลแก้ 1 ช่อง → ร่างใหม่ (ค่าที่แก้ชนะค่าจาก AI — ข้อ 2) */
export function applyEdit(draft, path, value, { mealTimes } = {}) {
  const { index, field } = parsePath(path);
  const next = structuredClone(draft);
  if (index === undefined) next[field] = editValue(field, value);
  else {
    if (index >= next.slots.length) throw new RangeError(`ไม่มี slot ที่ ${index}`);
    next.slots[index][field] = editValue(field, value);
  }
  next.checks = checksOf(next, mealTimes);
  return next;
}

/** เพิ่ม slot ว่าง 1 ช่อง (ฟอร์มกรอกเอง ข้อ 5 · ยาที่อ่านได้ไม่ครบ) — เพิ่มจากสัญญาเดิม บันทึกใน §5.4 */
export function addSlot(draft, { mealTimes } = {}) {
  const next = structuredClone(draft);
  next.slots.push({ meal: null, timing: null, minutesBefore: null, tabletsPerDose: null });
  next.checks = checksOf(next, mealTimes);
  return next;
}

/** ลบ slot ที่ index → ร่างใหม่ (แก้หรือลบ slot เพื่อปลดการบล็อกบันทึก — ข้อ 11) */
export function removeSlot(draft, index, { mealTimes } = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= draft.slots.length) throw new RangeError(`ไม่มี slot ที่ ${index}`);
  const next = structuredClone(draft);
  next.slots.splice(index, 1);
  next.checks = checksOf(next, mealTimes);
  return next;
}

/** บันทึกได้เมื่อไม่ใช่ยาที่ยังไม่รองรับ และไม่มีช่องที่ต้องตรวจ (BR-04, BR-05) */
export function canSave(draft) {
  return draft.unsupported === null && draft.checks.length === 0 && draft.slots.length > 0 && !isEmpty(draft.name);
}

/** ส่งภาพให้ AI ได้เมื่อติ๊ก "ปิดชื่อและ HN แล้ว" เท่านั้น (ข้อ 8, BR-19) */
export function canSend({ coveredTicked } = {}) {
  return coveredTicked === true;
}

/** ร่างที่ตรวจแล้ว → Medicine (§5.1) ส่งต่อให้ repo.saveMedicine · ยังบันทึกไม่ได้ = โยนข้อผิดพลาด */
export function toMedicine(draft) {
  if (!canSave(draft)) throw new Error('ร่างยายังมีช่องที่ต้องตรวจ — บันทึกไม่ได้ (BR-04)');
  return {
    name: draft.name, instructionText: draft.instructionText,
    slots: draft.slots.map((s) => ({ meal: s.meal, timing: s.timing, minutesBefore: s.timing === 'before_meal' ? s.minutesBefore : null, tabletsPerDose: s.tabletsPerDose })),
    warnings: draft.warnings, contraindications: draft.contraindications,
  };
}
