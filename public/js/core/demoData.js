// ข้อมูลตัวอย่างชุดเดียวของทั้งทีม — ใช้ในเทสต์และ Demo mode (ADR-8) · ข้อมูลสมมติล้วน ไม่มีชื่อ/HN จริง (NFR-09)
// เจ้าของ: Nichanan · Issue #10 · รูปข้อมูลตาม architecture §5.1 (Medicine, Slot) และ §5.4 (JSON ที่ AI คืน — DL-19)
// ทุกฟังก์ชันคืน "สำเนาใหม่" ทุกครั้ง (structuredClone) — เทสต์หนึ่งแก้ข้อมูลแล้วไม่กระทบเทสต์อื่น

// วันตัวอย่างของ Demo mode (คงที่ เพื่อให้ผลซ้ำได้ทุกครั้ง)
export const DEMO_DATE_KEY = '2026-11-04';

// ผู้ใช้สมมติ (แทน uid ที่ได้จาก Anonymous Auth)
export const DEMO_IDS = { seniorId: 'demo-senior', caregiverId: 'demo-caregiver' };

const MEAL_TIMES = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' };

const slot = (meal, timing, tabletsPerDose, minutesBefore = null) => ({ meal, timing, minutesBefore, tabletsPerDose });

// ยาที่ผู้ดูแลบันทึกแล้ว — ออกแบบให้ครอบกรณีของ AC (ดูคอมเมนต์ท้ายแต่ละตัว)
const MEDICINES = [
  { id: 'demo-a', name: 'ยาตัวอย่าง A', instructionText: 'หลังอาหารเช้า 1 เม็ด กลางวัน 1 เม็ด เย็น 2 เม็ด',
    slots: [slot('breakfast', 'after_meal', 1), slot('lunch', 'after_meal', 1), slot('dinner', 'after_meal', 2)],
    warnings: 'อาจทำให้ง่วงซึม', contraindications: null },          // A1-T01, A1-T04: 3 slot จำนวนเม็ดไม่เท่ากัน (1/1/2)
  { id: 'demo-b', name: 'ยาตัวอย่าง B', instructionText: 'หลังอาหารเช้า 1 เม็ด',
    slots: [slot('breakfast', 'after_meal', 1)],
    warnings: null, contraindications: 'ห้ามบดเม็ดยา' },             // A1-T02: เวลาเตือนตรงกับ A → มื้อ 07:00 มื้อเดียว
  { id: 'demo-c', name: 'ยาตัวอย่าง C', instructionText: 'ก่อนอาหารเช้า 15 นาที 1 เม็ด',
    slots: [slot('breakfast', 'before_meal', 1, 15)],
    warnings: null, contraindications: null },                       // FR-03 ข้อ 4: มื้อ 06:45 ซ้อนกับ 07:00 (07:00 = T+15 ของ 06:45)
  { id: 'demo-d', name: 'ยาตัวอย่าง D', instructionText: 'ก่อนอาหารกลางวัน 30 นาที 1 เม็ด',
    slots: [slot('lunch', 'before_meal', 1, 30)],
    warnings: null, contraindications: null },                       // A1-T03: ก่อนอาหาร 30 นาที → 11:30 แยกจากมื้อ 12:00
];

// JSON ที่ "AI คืน" สำหรับ Demo mode และเทสต์ labelDraft (§5.4 ก) — ไม่มีช่องชื่อผู้ป่วย/HN
const LABEL_DRAFTS = {
  // FR-02 ข้อ 1, 10 · A1-T01: อ่านครบ 3 slot (1/1/2 เม็ด)
  complete: { name: 'ยาตัวอย่าง E', instructionText: 'หลังอาหารเช้า 1 เม็ด กลางวัน 1 เม็ด เย็น 2 เม็ด', warnings: 'ดื่มน้ำตามมาก ๆ', contraindications: null, asNeeded: false,
    slots: [slot('breakfast', 'after_meal', 1), slot('lunch', 'after_meal', 1), slot('dinner', 'after_meal', 2)] },
  // FR-02 ข้อ 7: ก่อนอาหารเช้า 30 นาที (เช้า 07:00 → เตือน 06:30)
  beforeBreakfast30: { name: 'ยาตัวอย่าง F', instructionText: 'ก่อนอาหารเช้า 30 นาที 1 เม็ด', warnings: null, contraindications: null, asNeeded: false,
    slots: [slot('breakfast', 'before_meal', 1, 30)] },
  // FR-02 ข้อ 3: อ่านชื่อไม่ออก + "วันละ 3 ครั้ง" ไม่ระบุมื้อ = 3 slot ที่ meal ว่าง (DL-19)
  timesADayNoMeals: { name: null, instructionText: 'วันละ 3 ครั้ง ครั้งละ 1 เม็ด', warnings: null, contraindications: null, asNeeded: false,
    slots: [slot(null, null, 1), slot(null, null, 1), slot(null, null, 1)] },
  // FR-02 ข้อ 3: ก่อนอาหารแต่ไม่บอกนาที
  beforeMealNoMinutes: { name: 'ยาตัวอย่าง G', instructionText: 'ก่อนอาหารกลางวัน 1 เม็ด', warnings: null, contraindications: null, asNeeded: false,
    slots: [slot('lunch', 'before_meal', 1, null)] },
  // FR-02 ข้อ 3: เวลาที่ไม่ผูกกับมื้อ ("ทุก 6 ชั่วโมง") = meal และ timing ว่าง
  every6Hours: { name: 'ยาตัวอย่าง H', instructionText: 'ทุก 6 ชั่วโมง ครั้งละ 1 เม็ด', warnings: null, contraindications: null, asNeeded: false,
    slots: [slot(null, null, 1)] },
  // FR-02 ข้อ 4 · BR-07: ยากินเมื่อมีอาการ → ยังไม่รองรับ ไม่สร้างเวลาเตือน
  asNeeded: { name: 'ยาตัวอย่าง I', instructionText: 'รับประทานเมื่อมีอาการปวด', warnings: null, contraindications: null, asNeeded: true, slots: [] },
  // FR-02 ข้อ 11 · PD-6: slot ซ้ำ และเวลาเดียวกันแต่จำนวนเม็ดต่างกัน → ห้ามรวม ห้ามบวกเม็ด
  duplicateSlots: { name: 'ยาตัวอย่าง J', instructionText: 'หลังอาหารเช้า 1 เม็ด (ซ้ำ) และหลังอาหารเช้า 2 เม็ด', warnings: null, contraindications: null, asNeeded: false,
    slots: [slot('breakfast', 'after_meal', 1), slot('breakfast', 'after_meal', 1), slot('breakfast', 'after_meal', 2)] },
};

/** @returns {{ breakfast: string, lunch: string, dinner: string, bedtime: string }} เวลามื้อตัวอย่าง */
export function mealTimes() {
  return structuredClone(MEAL_TIMES);
}

/** @returns {object[]} ยาตัวอย่างที่บันทึกแล้ว (รูป Medicine §5.1) */
export function medicines() {
  return structuredClone(MEDICINES);
}

/** @returns {Object<string, object>} JSON ตัวอย่างที่ AI คืน แยกตามกรณี (รูป §5.4 ก) */
export function labelDrafts() {
  return structuredClone(LABEL_DRAFTS);
}

/** ข้อมูลตั้งต้นสำหรับ createLocalRepo({ clock, seed }) */
export function demoSeed() {
  return { mealTimes: mealTimes(), medicines: medicines() };
}

/** เวลาเริ่มของ Demo mode: 06:40 ของวันตัวอย่าง (ก่อนมื้อแรก 06:45) — ms ตามเวลาท้องถิ่น */
export function demoStart() {
  const [y, m, d] = DEMO_DATE_KEY.split('-').map(Number);
  return new Date(y, m - 1, d, 6, 40).getTime();
}
