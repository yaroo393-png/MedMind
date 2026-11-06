// ที่เก็บข้อมูลของคู่ผู้สูงอายุ–ผู้ดูแล (architecture §6) — localRepo สำหรับ Demo mode และเทสต์ (ADR-8)
// เจ้าของ: Takkan · Issue #9 · firestoreRepo (ขั้น B หลัง E-1) ต้องมีเมธอดชื่อเดียวกัน รูปรับ/คืนเดียวกัน
// หลัก: ทุกเมธอดคืน Promise (เหมือน Firestore) · คืนสำเนาเสมอ ผู้เรียกแก้ข้อมูลในที่เก็บโดยตรงไม่ได้
//       จำลองกฎที่มีผลต่อ AC: Dose ซ้ำไม่ทับ (R-7, BR-12) · status ตรง confirmStatus (R-10) · serverReceivedAt มาจากที่เก็บ (R-9)
//       แจ้งเห็นแล้ว (alertSeen) สร้างได้ครั้งเดียว (BR-13)
import { doseId, buildDose } from '../logic/confirm.js';

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'bedtime'];
const ALERT_KINDS = ['not_confirmed', 'confirmed_late'];
const copy = (value) => structuredClone(value);

// ตรวจเวลามื้อ { breakfast, lunch, dinner, bedtime } เป็น 'HH:MM' ครบ 4 ช่อง (BR-06)
function assertMealTimes(mealTimes) {
  for (const key of MEAL_KEYS) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(mealTimes?.[key] ?? '')) throw new TypeError(`เวลามื้อ ${key} ต้องเป็น "HH:MM"`);
  }
}

/**
 * สร้างที่เก็บข้อมูลในหน่วยความจำ (ไม่แตะ Firebase)
 * @param {{ clock: { now(): number }, seed?: { mealTimes?: object, medicines?: object[] } }} options
 *   clock = นาฬิกาจาก core/clock.js (ใช้เติม serverReceivedAt) · seed = ข้อมูลตั้งต้น เช่น จาก core/demoData.js
 */
export function createLocalRepo({ clock, seed = {} } = {}) {
  if (typeof clock?.now !== 'function') throw new TypeError('ต้องส่ง clock ที่มี now()');

  const state = { mealTimes: null, medicines: new Map(), doses: new Map(), notYet: new Map(), seen: new Map() };
  const listeners = new Set();
  let nextMedicineNo = 1;
  const notify = () => listeners.forEach((fn) => fn());

  if (seed.mealTimes) { assertMealTimes(seed.mealTimes); state.mealTimes = copy(seed.mealTimes); }
  for (const medicine of seed.medicines ?? []) state.medicines.set(medicine.id, copy(medicine));

  return {
    /** FR-02 BR-06: ตั้งเวลามื้อ 4 ช่อง */
    async setMealTimes(mealTimes) {
      assertMealTimes(mealTimes);
      state.mealTimes = copy({ breakfast: mealTimes.breakfast, lunch: mealTimes.lunch, dinner: mealTimes.dinner, bedtime: mealTimes.bedtime });
      notify();
    },
    /** @returns {Promise<object|null>} เวลามื้อ หรือ null ถ้ายังไม่ตั้ง */
    async getMealTimes() {
      return state.mealTimes ? copy(state.mealTimes) : null;
    },

    /**
     * FR-02 BR-04: บันทึกยา "หลังผู้ดูแลตรวจร่างแล้ว" เท่านั้น — ไม่มี id = ยาใหม่ · มี id = แก้ยาเดิม
     * ตรวจ slot ด้วย validateSlot เป็นหน้าที่ของหน้าร่างก่อนเรียก (canSave) ที่นี่ตรวจแค่โครงหยาบเหมือน Rules
     * @returns {Promise<string>} id ของยา
     */
    async saveMedicine(medicine) {
      if (typeof medicine?.name !== 'string' || !medicine.name.trim()) throw new TypeError('ยาต้องมีชื่อ');
      if (!Array.isArray(medicine.slots) || medicine.slots.length === 0) throw new TypeError('ยาต้องมี slot อย่างน้อย 1 ช่อง');
      const id = medicine.id ?? `med-${nextMedicineNo++}`;
      state.medicines.set(id, copy({ ...medicine, id }));
      notify();
      return id;
    },
    /** @returns {Promise<object[]>} ยาทั้งหมด เรียงตาม id */
    async listMedicines() {
      return [...state.medicines.values()].sort((a, b) => a.id.localeCompare(b.id)).map(copy);
    },
    /** ลบยา 1 ตัว (ผู้ดูแลลบยา — C-06) */
    async deleteMedicine(id) {
      const removed = state.medicines.delete(id);
      if (removed) notify();
      return removed;
    },

    /**
     * FR-04: บันทึกการยืนยันทั้งมื้อ — id = doseId(meal) · status คำนวณด้วย confirmStatus (R-10)
     * กดซ้ำ / ส่งซ้ำ: ไม่ทับของเดิม ถือว่าสำเร็จ และคืนบันทึกเดิม (R-7, BR-12, NFR-07)
     * @returns {Promise<{ doseId: string, dose: object, created: boolean }>}
     */
    async confirmMeal({ meal, confirmedAt }) {
      const id = doseId(meal);
      const existing = state.doses.get(id);
      if (existing) return { doseId: id, dose: copy(existing), created: false };
      const dose = { ...buildDose({ meal, confirmedAt }), serverReceivedAt: clock.now() }; // เวลาที่ "ที่เก็บ" ได้รับ ไม่ใช่เวลาที่กด (R-9)
      state.doses.set(id, dose);
      notify();
      return { doseId: id, dose: copy(dose), created: true };
    },
    /** @returns {Promise<Object<string, object>>} { [doseId]: Dose } — รูปเดียวกับที่ dailyStatus รับ */
    async getDoses() {
      return Object.fromEntries([...state.doses].map(([id, dose]) => [id, copy(dose)]));
    },

    /**
     * FR-04 BR-11: กด "ยังไม่กิน" ในรอบ T+10 — เก็บเวลาครั้งแรกเท่านั้น
     * @returns {Promise<{ created: boolean, at: number }>}
     */
    async reportNotYet({ meal, at }) {
      if (!Number.isFinite(at)) throw new TypeError('at ต้องเป็นเวลา ms');
      const id = doseId(meal);
      if (state.notYet.has(id)) return { created: false, at: state.notYet.get(id).at };
      state.notYet.set(id, { kind: 'not_yet_last_round', at });
      notify();
      return { created: true, at };
    },
    /** @returns {Promise<number|null>} เวลาที่กด "ยังไม่กิน" รอบสุดท้ายของมื้อนี้ (ส่งเข้า alertFor เป็น notYet) */
    async getNotYet(meal) {
      return state.notYet.get(doseId(meal))?.at ?? null;
    },

    /**
     * FR-05 BR-13: บันทึกว่าผู้ดูแลเห็นการแจ้งชนิดนี้ของมื้อนี้แล้ว — สร้างได้ครั้งเดียว
     * @returns {Promise<{ created: boolean }>}
     */
    async markAlertSeen({ mealId, kind }) {
      if (!ALERT_KINDS.includes(kind)) throw new TypeError(`ชนิดการแจ้งต้องเป็น ${ALERT_KINDS.join(' / ')}`);
      const key = `${mealId}_${kind}`;
      if (state.seen.has(key)) return { created: false };
      state.seen.set(key, { mealId, kind, seenAt: clock.now() });
      notify();
      return { created: true };
    },
    /** @returns {Promise<string[]>} ชนิดการแจ้งที่เห็นแล้วของมื้อนี้ — รูปเดียวกับที่ alertFor รับเป็น seen */
    async getSeen(mealId) {
      return [...state.seen.values()].filter((s) => s.mealId === mealId).map((s) => s.kind).sort();
    },

    /** ฟังการเปลี่ยนข้อมูลทุกชนิด (แทน listener ของ Firestore) → คืนฟังก์ชันเลิกฟัง */
    watch(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
