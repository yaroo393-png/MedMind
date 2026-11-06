// เทสต์ FR-02 logic/labelDraft.js (Issue #13) — ชื่อเทสต์ขึ้นต้นด้วยรหัสใน docs/TRACEABILITY.md · สัญญา architecture §5.4 (DL-19)
// ข้อมูลฉลากมาจาก core/demoData.js ชุดเดียวของทีม
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraft, applyEdit, addSlot, removeSlot, canSave, canSend, toMedicine } from '../public/js/logic/labelDraft.js';
import { groupMeals } from '../public/js/logic/schedule.js';
import { labelDrafts, mealTimes } from '../public/js/core/demoData.js';
import { createClock } from '../public/js/core/clock.js';
import { createLocalRepo } from '../public/js/core/repo.js';

const opts = { mealTimes: mealTimes() };
const L = labelDrafts();
const paths = (draft) => draft.checks.map((c) => `${c.path}:${c.reason}`);

test('TC-02.1 (FR-02 ข้อ 1): ฉลากอ่านครบ → ร่างมีชื่อ 3 slot คำเตือน ไม่มีช่องต้องตรวจ และยังไม่บันทึกอะไร', async () => {
  const repo = createLocalRepo({ clock: createClock({ start: 0 }) });
  const draft = buildDraft(L.complete, opts);
  assert.equal(draft.name, 'ยาตัวอย่าง E');
  assert.equal(draft.slots.length, 3);
  assert.equal(draft.warnings, 'ดื่มน้ำตามมาก ๆ');
  assert.deepEqual(draft.checks, []);
  assert.equal(canSave(draft), true);
  assert.deepEqual(await repo.listMedicines(), []); // สร้างร่างไม่บันทึกอะไร
});

test('TC-02.2 (FR-02 ข้อ 2): ค่าที่ผู้ดูแลแก้ชนะค่าที่ AI อ่าน และร่างเดิมไม่เปลี่ยน', () => {
  const draft = buildDraft(L.complete, opts);
  const edited = applyEdit(applyEdit(draft, 'name', '  ยาตัวอย่าง E (แก้)  ', opts), 'slots[2].tabletsPerDose', '1', opts);
  assert.equal(edited.name, 'ยาตัวอย่าง E (แก้)');
  assert.equal(edited.slots[2].tabletsPerDose, 1);
  assert.equal(toMedicine(edited).name, 'ยาตัวอย่าง E (แก้)');
  assert.equal(draft.name, 'ยาตัวอย่าง E');           // ฟังก์ชันล้วน
  assert.equal(draft.slots[2].tabletsPerDose, 2);
});

test('TC-02.3 (FR-02 ข้อ 3): อ่านชื่อไม่ออก + "วันละ 3 ครั้ง" ไม่ระบุมื้อ → ช่องว่าง "โปรดตรวจสอบ" ไม่เดา บันทึกไม่ได้', () => {
  const draft = buildDraft(L.timesADayNoMeals, opts);
  assert.equal(draft.name, null);
  assert.ok(draft.slots.every((s) => s.meal === null && s.timing === null && s.tabletsPerDose === 1)); // ช่องอื่นยังอยู่
  assert.deepEqual(paths(draft), ['name:missing',
    'slots[0].meal:missing', 'slots[0].timing:missing', 'slots[1].meal:missing', 'slots[1].timing:missing', 'slots[2].meal:missing', 'slots[2].timing:missing']);
  assert.equal(canSave(draft), false);
  assert.throws(() => toMedicine(draft));
});

test('TC-02.3 (FR-02 ข้อ 3): "ก่อนอาหาร" ไม่บอกนาที และ "ทุก 6 ชั่วโมง" → เฉพาะช่องนั้นต้องตรวจ', () => {
  assert.deepEqual(paths(buildDraft(L.beforeMealNoMinutes, opts)), ['slots[0].minutesBefore:missing']);
  assert.deepEqual(paths(buildDraft(L.every6Hours, opts)), ['slots[0].meal:missing', 'slots[0].timing:missing']);
});

test('TC-02.3: แก้ช่องที่ต้องตรวจครบแล้วบันทึกได้ — ช่องที่แก้หายจาก "โปรดตรวจสอบ" ทีละช่อง', () => {
  let d = buildDraft(L.beforeMealNoMinutes, opts);
  d = applyEdit(d, 'slots[0].minutesBefore', 15, opts);
  assert.deepEqual(d.checks, []);
  assert.equal(canSave(d), true);
});

test('TC-02.4 (FR-02 ข้อ 4, BR-07): ยากินเมื่อมีอาการ → ยังไม่รองรับ ไม่สร้างเวลาเตือน บันทึกไม่ได้', () => {
  const draft = buildDraft(L.asNeeded, opts);
  assert.equal(draft.unsupported, 'as_needed');
  assert.deepEqual(draft.slots, []);
  assert.equal(canSave(draft), false);
  assert.equal(buildDraft({ ...L.complete, asNeeded: true }, opts).slots.length, 0); // มี slot ก็ไม่สร้าง
});

test('FR-02 ข้อ 5: เปิดฟอร์มกรอกเองที่ว่าง (buildDraft(null)) → เพิ่ม slot แล้วกรอกจนบันทึกได้', () => {
  let d = buildDraft(null, opts);
  assert.deepEqual(paths(d), ['name:missing', 'slots:no_slot']);
  d = addSlot(d, opts);
  for (const [path, value] of [['name', 'ยาตัวอย่าง K'], ['slots[0].meal', 'dinner'], ['slots[0].timing', 'after_meal'], ['slots[0].tabletsPerDose', 1]]) d = applyEdit(d, path, value, opts);
  assert.equal(canSave(d), true);
});

test('TC-02.6 (FR-02 ข้อ 6): ยกเลิก = ไม่เรียก saveMedicine ไม่มีอะไรถูกบันทึก (ฟังก์ชันไม่มีผลข้างเคียง)', async () => {
  const repo = createLocalRepo({ clock: createClock({ start: 0 }) });
  let d = buildDraft(L.complete, opts);
  d = applyEdit(d, 'name', 'แก้แล้วกดยกเลิก', opts);
  d = removeSlot(d, 0, opts);
  assert.deepEqual(await repo.listMedicines(), []);
});

test('FR-02 ข้อ 7: ฉลาก "ก่อนอาหารเช้า 30 นาที" เช้า 07:00 → บันทึกแล้วเตือน 06:30', () => {
  const med = toMedicine(buildDraft(L.beforeBreakfast30, opts));
  assert.deepEqual(groupMeals([{ ...med, id: 'F' }], mealTimes(), '2026-11-04').meals.map((m) => m.reminderTime), ['06:30']);
});

test('TC-02.8 (FR-02 ข้อ 8, BR-19): ยังไม่ติ๊ก "ปิดชื่อและ HN แล้ว" → ส่งไม่ได้', () => {
  assert.equal(canSend({ coveredTicked: false }), false);
  assert.equal(canSend({}), false);
  assert.equal(canSend(), false);
  assert.equal(canSend({ coveredTicked: 'yes' }), false); // ต้องเป็น true จริงเท่านั้น
  assert.equal(canSend({ coveredTicked: true }), true);
});

test('TC-02.10 (FR-02 ข้อ 10) / A1-T01: บันทึก 1 ยา 3 slot (1, 1, 2 เม็ด) → เตือน 07:00, 12:00, 18:00', () => {
  const med = toMedicine(buildDraft(L.complete, opts));
  assert.deepEqual(med.slots.map((s) => [s.meal, s.tabletsPerDose]), [['breakfast', 1], ['lunch', 1], ['dinner', 2]]);
  const meals = groupMeals([{ ...med, id: 'E' }], mealTimes(), '2026-11-04').meals;
  assert.deepEqual(meals.map((m) => [m.reminderTime, m.medicines[0].tabletsPerDose]), [['07:00', 1], ['12:00', 1], ['18:00', 2]]);
});

test('TC-02.11 (FR-02 ข้อ 11, PD-6): slot ซ้ำ/เม็ดขัดกัน → เฉพาะ slot นั้นต้องตรวจ ไม่รวม ไม่บวกเม็ด · ลบแล้วบันทึกได้', () => {
  let d = buildDraft(L.duplicateSlots, opts);
  assert.deepEqual(paths(d), ['slots[1]:duplicate_slot', 'slots[2]:conflicting_tablets']);
  assert.equal(d.slots.length, 3); // ไม่ merge
  assert.equal(canSave(d), false);
  d = removeSlot(removeSlot(d, 2, opts), 1, opts);
  assert.deepEqual(d.checks, []);
  assert.deepEqual(toMedicine(d).slots, [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }]);
});

test('TC-02.11: slot ที่ผู้ดูแลกรอกผิด (ครึ่งเม็ด / ก่อนนอนแต่มื้อกลางวัน) → บอกช่องที่ผิดตามเหตุผลของ validateSlot', () => {
  let d = buildDraft(L.complete, opts);
  d = applyEdit(d, 'slots[0].tabletsPerDose', 1.5, opts);
  d = applyEdit(d, 'slots[1].timing', 'at_bedtime', opts);
  assert.deepEqual(paths(d), ['slots[0].tabletsPerDose:invalid_tablets', 'slots[1]:meal_timing_mismatch']);
});

test('BR-06: ยังไม่ได้ตั้งเวลามื้อ → คำนวณเวลาเตือนไม่ได้ บันทึกไม่ได้ (ไม่เดาเวลา)', () => {
  const d = buildDraft(L.complete, {});
  assert.deepEqual(paths(d), ['slots[0]:invalid_reminder_time', 'slots[1]:invalid_reminder_time', 'slots[2]:invalid_reminder_time']);
  assert.equal(canSave(d), false);
});

test('ผลจาก AI ไม่น่าไว้ใจ: JSON ผิดรูปไม่ throw · ชนิดผิด/นอก enum = ว่าง · ตัดข้อความเกิน 200 ตัว', () => {
  for (const bad of [null, undefined, 'ยา', 42, [], { slots: 'ไม่ใช่ array' }]) {
    assert.deepEqual(paths(buildDraft(bad, opts)), ['name:missing', 'slots:no_slot']);
  }
  const d = buildDraft({ name: 'ก'.repeat(500), warnings: 123, asNeeded: 'true',
    slots: [{ meal: 'brunch', timing: 'after_meal', tabletsPerDose: -1, minutesBefore: 'สิบ' }] }, opts);
  assert.equal(d.name.length, 200);
  assert.equal(d.warnings, null);
  assert.equal(d.unsupported, null); // asNeeded ต้องเป็น true จริงเท่านั้น
  assert.deepEqual(d.slots[0], { meal: null, timing: 'after_meal', minutesBefore: null, tabletsPerDose: null });
});

test('NFR-09: ช่องที่ไม่อยู่ในสัญญา (ชื่อผู้ป่วย, HN) ไม่เข้าร่างและไม่เข้ายาที่บันทึก', () => {
  const d = buildDraft({ ...L.complete, patientName: 'สมมติ', hn: '12345', slots: L.complete.slots.map((s) => ({ ...s, hn: '1' })) }, opts);
  const all = JSON.stringify([d, toMedicine(d)]);
  assert.ok(!all.includes('12345') && !all.includes('สมมติ') && !all.includes('"hn"'));
});

test('applyEdit / removeSlot: path หรือ index ที่ไม่มีอยู่ → แจ้งข้อผิดพลาด ไม่แก้อะไร', () => {
  const d = buildDraft(L.complete, opts);
  assert.throws(() => applyEdit(d, 'hn', '1', opts), RangeError);
  assert.throws(() => applyEdit(d, 'slots[9].meal', 'lunch', opts), RangeError);
  assert.throws(() => removeSlot(d, 3, opts), RangeError);
});

test('toMedicine: minutesBefore เก็บเฉพาะ "ก่อนอาหาร" ตาม §5.1 · ไม่มี checks/unsupported ในยาที่บันทึก', () => {
  let d = buildDraft(L.beforeBreakfast30, opts);
  d = applyEdit(d, 'slots[0].timing', 'after_meal', opts);
  const med = toMedicine(d);
  assert.equal(med.slots[0].minutesBefore, null);
  assert.deepEqual(Object.keys(med).sort(), ['contraindications', 'instructionText', 'name', 'slots', 'warnings']);
});
