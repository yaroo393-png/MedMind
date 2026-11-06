// เทสต์ core/demoData.js (Issue #10) — ข้อมูลตัวอย่างต้องถูกรูป ครอบกรณีของ AC และไม่มีข้อมูลส่วนตัว
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_DATE_KEY, DEMO_IDS, mealTimes, medicines, labelDrafts, demoSeed, demoStart } from '../public/js/core/demoData.js';
import { validateSlot, reminderTime, groupMeals } from '../public/js/logic/schedule.js';
import { mealState, nextMealStartFor } from '../public/js/logic/mealTimeline.js';
import { createClock } from '../public/js/core/clock.js';
import { createLocalRepo } from '../public/js/core/repo.js';

const meals = () => groupMeals(medicines(), mealTimes(), DEMO_DATE_KEY).meals;
const at = (h, m) => new Date(2026, 10, 4, h, m).getTime();

test('ยาตัวอย่างทุกตัวมี slot ≥ 1 และทุก slot ผ่าน validateSlot (BR-05, §5.1)', () => {
  for (const med of medicines()) {
    assert.ok(med.slots.length >= 1, med.id);
    for (const s of med.slots) assert.equal(validateSlot(s), null, `${med.id} ${JSON.stringify(s)}`);
  }
});

test('groupMeals บนข้อมูลตัวอย่าง: 06:45 / 07:00 / 11:30 / 12:00 / 18:00 ไม่มี slot เสีย', () => {
  const r = groupMeals(medicines(), mealTimes(), DEMO_DATE_KEY);
  assert.deepEqual(r.meals.map((m) => m.reminderTime), ['06:45', '07:00', '11:30', '12:00', '18:00']);
  assert.deepEqual(r.skipped, []);
});

test('A1-T02: ยา A และ B เวลาเตือนตรงกัน → มื้อ 07:00 มื้อเดียว', () => {
  const m0700 = meals().find((m) => m.reminderTime === '07:00');
  assert.deepEqual(m0700.medicines.map((x) => x.medicineId), ['demo-a', 'demo-b']);
});

test('A1-T01 / A1-T04: ยา A 3 slot จำนวนเม็ด 1/1/2 ไม่รวมกัน', () => {
  const tabletsOfA = meals().flatMap((m) => m.medicines.filter((x) => x.medicineId === 'demo-a').map((x) => [m.reminderTime, x.tabletsPerDose]));
  assert.deepEqual(tabletsOfA, [['07:00', 1], ['12:00', 1], ['18:00', 2]]);
});

test('FR-03 ข้อ 4: มื้อ 06:45 ซ้อนกับ 07:00 — ที่ 07:00 ทั้งสองมื้อยังเตือนพร้อมกัน', () => {
  const [m0645, m0700] = meals();
  assert.equal(mealState({ now: at(7, 0), meal: m0645 }).state, 'reminding');
  assert.equal(mealState({ now: at(7, 0), meal: m0700 }).state, 'reminding');
  assert.equal(nextMealStartFor(meals(), m0645), at(11, 30)); // 07:00 = T+15 ของ 06:45 ไม่นับเป็นมื้อถัดไป
});

test('ข้อมูลส่วนตัว (NFR-09): ไม่มีช่องชื่อผู้ป่วย/HN/เบอร์ ชื่อยาเป็นยาสมมติทั้งหมด', () => {
  const all = JSON.stringify({ medicines: medicines(), labelDrafts: labelDrafts(), ids: DEMO_IDS });
  assert.ok(!/\b(hn|patient|phone|birth|address|idCard)\b/i.test(all), 'ห้ามมีช่องข้อมูลส่วนตัว');
  for (const med of medicines()) assert.match(med.name, /^ยาตัวอย่าง [A-Z]$/);
  for (const d of Object.values(labelDrafts())) assert.ok(d.name === null || /^ยาตัวอย่าง [A-Z]$/.test(d.name));
});

test('JSON ที่ AI คืนมีเฉพาะช่องตาม §5.4 (DL-19)', () => {
  const allowed = ['name', 'instructionText', 'warnings', 'contraindications', 'asNeeded', 'slots'].sort();
  for (const [key, d] of Object.entries(labelDrafts())) {
    assert.deepEqual(Object.keys(d).sort(), allowed, key);
    for (const s of d.slots) assert.deepEqual(Object.keys(s).sort(), ['meal', 'minutesBefore', 'tabletsPerDose', 'timing'], key);
  }
});

test('ร่างฉลากครอบกรณีของ FR-02 ข้อ 1, 3, 4, 7, 10, 11', () => {
  const d = labelDrafts();
  assert.equal(d.complete.slots.length, 3);
  assert.ok(d.complete.slots.every((s) => validateSlot(s) === null));                       // ข้อ 1, 10
  assert.equal(reminderTime(d.beforeBreakfast30.slots[0], mealTimes()), '06:30');           // ข้อ 7
  assert.equal(d.timesADayNoMeals.name, null);                                              // ข้อ 3: อ่านชื่อไม่ออก
  assert.ok(d.timesADayNoMeals.slots.length === 3 && d.timesADayNoMeals.slots.every((s) => s.meal === null)); // ข้อ 3: วันละ 3 ครั้ง (DL-19)
  assert.equal(validateSlot(d.beforeMealNoMinutes.slots[0]), 'minutesBefore_required');    // ข้อ 3: ไม่บอกนาที
  assert.ok(d.every6Hours.slots[0].meal === null && d.every6Hours.slots[0].timing === null); // ข้อ 3: ไม่ผูกมื้อ
  assert.equal(d.asNeeded.asNeeded, true);                                                  // ข้อ 4
  const dup = groupMeals([{ id: 'J', name: d.duplicateSlots.name, slots: d.duplicateSlots.slots }], mealTimes(), DEMO_DATE_KEY);
  assert.deepEqual(dup.skipped.map((s) => s.reason).sort(), ['conflicting_tablets', 'duplicate_slot']); // ข้อ 11
});

test('คืนสำเนาใหม่ทุกครั้ง — แก้ข้อมูลที่ได้ไปแล้วไม่กระทบครั้งถัดไป', () => {
  const a = medicines(); a[0].slots[0].tabletsPerDose = 99; a.pop();
  const t = mealTimes(); t.breakfast = '09:00';
  const d = labelDrafts(); d.complete.name = 'แก้แล้ว';
  assert.equal(medicines().length, 4);
  assert.equal(medicines()[0].slots[0].tabletsPerDose, 1);
  assert.equal(mealTimes().breakfast, '07:00');
  assert.equal(labelDrafts().complete.name, 'ยาตัวอย่าง E');
});

test('demoSeed + demoStart ใช้กับ localRepo ได้ทันที (Demo mode เริ่ม 06:40 ก่อนมื้อแรก)', async () => {
  assert.equal(demoStart(), at(6, 40));
  const repo = createLocalRepo({ clock: createClock({ start: demoStart() }), seed: demoSeed() });
  assert.deepEqual(await repo.getMealTimes(), mealTimes());
  assert.deepEqual((await repo.listMedicines()).map((m) => m.id), ['demo-a', 'demo-b', 'demo-c', 'demo-d']);
});
