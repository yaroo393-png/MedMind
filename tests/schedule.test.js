// เทสต์ FR-02/03 logic/schedule.js — เขียนก่อนโค้ดจากสัญญา architecture §5.2 และตาราง A1 ใน docs/TRACEABILITY.md (TDD)
// ถ้ายังไม่มีไฟล์ logic/schedule.js เทสต์ในไฟล์นี้จะถูกข้าม (skip) — CI ยังเขียว · เมื่อ Yar เพิ่มไฟล์ (Issue #12) เทสต์จะรันเอง
// รูปที่ทดสอบ: validateSlot(slot) → null | เหตุผล · reminderTime(slot, mealTimes) → 'HH:MM'
//               groupMeals(medicines, mealTimes, dateKey) → { meals: [Meal], skipped: [{ medicineId, slotIndex, reason }] }
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const file = new URL('../public/js/logic/schedule.js', import.meta.url);
const S = existsSync(file) ? await import(file) : null;
const skip = S ? false : 'รอ public/js/logic/schedule.js (Issue #12)';

const mealTimes = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' };
const dateKey = '2026-11-02';
const slot = (meal, timing = 'after_meal', tabletsPerDose = 1, minutesBefore = null) => ({ meal, timing, minutesBefore, tabletsPerDose });
const med = (id, ...slots) => ({ id, name: `ยาตัวอย่าง ${id}`, instructionText: '', slots, warnings: null, contraindications: null });
const summary = (meals) => meals.map((m) => [m.reminderTime, m.medicines.map((x) => [x.medicineId, x.tabletsPerDose])]);
const reasons = (skipped) => skipped.map((s) => s.reason).sort();

test('validateSlot: slot ถูกต้องทั้ง 3 แบบ → null', { skip }, () => {
  assert.equal(S.validateSlot(slot('breakfast')), null);
  assert.equal(S.validateSlot(slot('lunch', 'before_meal', 1, 30)), null);
  assert.equal(S.validateSlot(slot('bedtime', 'at_bedtime')), null);
});

test('validateSlot (A1-T05, BR-05/07): บอกเหตุผลที่ผิดตามสัญญา §5.2', { skip }, () => {
  assert.equal(S.validateSlot(slot('brunch')), 'invalid_meal');
  assert.equal(S.validateSlot(slot('lunch', 'with_meal')), 'invalid_timing');
  assert.equal(S.validateSlot(slot('lunch', 'before_meal', 1, null)), 'minutesBefore_required');
  assert.equal(S.validateSlot(slot('lunch', 'before_meal', 1, 0)), 'minutesBefore_required');
  assert.equal(S.validateSlot(slot('lunch', 'before_meal', 1, 7.5)), 'minutesBefore_required');
  for (const t of [0, 1.5, -1, null, undefined, '1']) {
    assert.equal(S.validateSlot({ meal: 'lunch', timing: 'after_meal', minutesBefore: null, tabletsPerDose: t }), 'invalid_tablets', String(t)); // ไม่รองรับครึ่งเม็ด BR-07
  }
  assert.equal(S.validateSlot(slot('lunch', 'at_bedtime')), 'meal_timing_mismatch');
  assert.equal(S.validateSlot(slot('bedtime', 'after_meal')), 'meal_timing_mismatch'); // "หรือกลับกัน"
});

test('TC-02.7 (BR-06): ก่อนอาหารเช้า 30 นาที, เช้า 07:00 → เตือน 06:30', { skip }, () => {
  assert.equal(S.reminderTime(slot('breakfast', 'before_meal', 1, 30), mealTimes), '06:30');
});

test('reminderTime (BR-06): หลังอาหาร = เวลามื้อ · ก่อนนอน = เวลาก่อนนอน · ก่อนอาหารกลางวัน 15 นาที = 11:45', { skip }, () => {
  assert.equal(S.reminderTime(slot('dinner'), mealTimes), '18:00');
  assert.equal(S.reminderTime(slot('bedtime', 'at_bedtime'), mealTimes), '21:00');
  assert.equal(S.reminderTime(slot('lunch', 'before_meal', 1, 15), mealTimes), '11:45');
  assert.equal(S.reminderTime(slot('breakfast'), { ...mealTimes, breakfast: '06:30' }), '06:30'); // ใช้เวลามื้อที่ผู้ดูแลตั้ง
});

test('A1-T01 (FR-02 ข้อ 10): ยา 1 ตัว 3 slot → 3 มื้อ 07:00/12:00/18:00 จำนวนเม็ด 1/1/2 เรียงเวลา', { skip }, () => {
  const r = S.groupMeals([med('M1', slot('dinner', 'after_meal', 2), slot('breakfast'), slot('lunch'))], mealTimes, dateKey);
  assert.deepEqual(summary(r.meals), [['07:00', [['M1', 1]]], ['12:00', [['M1', 1]]], ['18:00', [['M1', 2]]]]);
  assert.deepEqual(r.skipped, []);
  for (const m of r.meals) assert.equal(m.dateKey, dateKey);
});

test('A1-T02 (FR-03 ข้อ 6): ยาหลายตัวเวลาเตือนตรงกัน → มื้อเดียว เตือนครั้งเดียว', { skip }, () => {
  const r = S.groupMeals([med('M1', slot('breakfast')), med('M2', slot('breakfast', 'after_meal', 2))], mealTimes, dateKey);
  assert.deepEqual(summary(r.meals), [['07:00', [['M1', 1], ['M2', 2]]]]);
});

test('A1-T03 (FR-03 ข้อ 6): เวลาเตือนต่างกัน → 2 มื้อ เรียง 06:30 ก่อน 07:00 (จัดกลุ่มด้วยเวลา ไม่ใช่ชื่อมื้อ)', { skip }, () => {
  const r = S.groupMeals([med('M1', slot('breakfast')), med('M2', slot('breakfast', 'before_meal', 1, 30))], mealTimes, dateKey);
  assert.deepEqual(summary(r.meals), [['06:30', [['M2', 1]]], ['07:00', [['M1', 1]]]]);
});

test('A1-T04 (FR-02 ข้อ 10): จำนวนเม็ดต่อ slot ไม่รวมกัน (เช้า 1 เย็น 2 ห้ามเป็น 3)', { skip }, () => {
  const r = S.groupMeals([med('M1', slot('breakfast'), slot('dinner', 'after_meal', 2))], mealTimes, dateKey);
  assert.deepEqual(summary(r.meals), [['07:00', [['M1', 1]]], ['18:00', [['M1', 2]]]]);
});

test('A1-T05 (FR-02 ข้อ 3, 11): slot เสียถูกคัดออกพร้อมเหตุผล slot ที่ถูกยังเข้ามื้อ ไม่ throw ไม่เดา', { skip }, () => {
  const meds = [
    med('M1', slot('lunch', 'before_meal', 1, null), slot('breakfast')),   // (a)
    med('M2', slot('brunch'), slot('lunch')),                              // (b)
    med('M3', slot('dinner', 'after_meal', 1.5), slot('dinner')),          // (c) ครึ่งเม็ด แต่มี slot ถูกเวลาเดียวกัน
    med('M4'),                                                             // (d) ยาไม่มี slot
    med('M5', slot('lunch', 'at_bedtime'), slot('bedtime', 'at_bedtime')), // (e)
  ];
  const r = S.groupMeals(meds, mealTimes, dateKey);
  assert.deepEqual(reasons(r.skipped), ['invalid_meal', 'invalid_tablets', 'meal_timing_mismatch', 'minutesBefore_required', 'no_slot']);
  assert.deepEqual(r.skipped.find((s) => s.reason === 'invalid_meal'), { medicineId: 'M2', slotIndex: 0, reason: 'invalid_meal' });
  assert.deepEqual(summary(r.meals), [['07:00', [['M1', 1]]], ['12:00', [['M2', 1]]], ['18:00', [['M3', 1]]], ['21:00', [['M5', 1]]]]);
});

test('A1-T06 (FR-03 ข้อ 6, PD-6): slot ซ้ำ → ยาอยู่ในมื้อครั้งเดียว รายงาน duplicate_slot ไม่บวกเม็ด', { skip }, () => {
  const r = S.groupMeals([med('M1', slot('breakfast'), slot('breakfast'))], mealTimes, dateKey);
  assert.deepEqual(summary(r.meals), [['07:00', [['M1', 1]]]]);
  assert.deepEqual(reasons(r.skipped), ['duplicate_slot']);
});

test('PD-6: ยาเดียวกันเวลาเตือนเดียวกันแต่จำนวนเม็ดต่างกัน → conflicting_tablets ไม่รวมเป็น 3 เม็ด', { skip }, () => {
  const r = S.groupMeals([med('M1', slot('breakfast', 'after_meal', 1), slot('breakfast', 'after_meal', 2))], mealTimes, dateKey);
  assert.ok(reasons(r.skipped).includes('conflicting_tablets'));
  const inMeal = r.meals.flatMap((m) => m.medicines).filter((x) => x.medicineId === 'M1');
  assert.ok(inMeal.length <= 1, 'ยาเดียวกันต้องไม่อยู่ซ้ำในมื้อเดียว');
  assert.ok(inMeal.every((x) => x.tabletsPerDose !== 3), 'ห้ามบวกเม็ด');
});

test('TC-03.6 (FR-03 ข้อ 6): A เช้า/เย็น · B เช้า · C กลางวัน → เช้า = A+B, กลางวัน = C, เย็น = A', { skip }, () => {
  const r = S.groupMeals([med('A', slot('breakfast'), slot('dinner')), med('B', slot('breakfast')), med('C', slot('lunch'))], mealTimes, dateKey);
  assert.deepEqual(summary(r.meals), [['07:00', [['A', 1], ['B', 1]]], ['12:00', [['C', 1]]], ['18:00', [['A', 1]]]]);
});

test('groupMeals: มุมมองยาของมื้อมีข้อมูลครบ (ชื่อ คำเตือน ข้อห้าม slot) และไม่แก้ค่าที่รับเข้า', { skip }, () => {
  const meds = [{ ...med('M1', slot('breakfast')), warnings: 'ระวังง่วงซึม', contraindications: 'ห้ามบดเม็ดยา' }];
  const before = JSON.stringify(meds);
  const [view] = S.groupMeals(meds, mealTimes, dateKey).meals[0].medicines;
  assert.deepEqual(view, { medicineId: 'M1', name: 'ยาตัวอย่าง M1', tabletsPerDose: 1, warnings: 'ระวังง่วงซึม', contraindications: 'ห้ามบดเม็ดยา', slot: slot('breakfast') });
  assert.equal(JSON.stringify(meds), before);
});

test('groupMeals: ไม่มียา → ไม่มีมื้อ (หน้าจอแสดง "วันนี้ไม่มีมื้อยา")', { skip }, () => {
  assert.deepEqual(S.groupMeals([], mealTimes, dateKey), { meals: [], skipped: [] });
});

test('ขอบ (Issue #12): ก่อนอาหาร 30 นาทีจากมื้อ 00:15 ถอยข้ามเที่ยงคืน → ไม่เดา รายงาน invalid_reminder_time', { skip }, () => {
  const mt = { ...mealTimes, breakfast: '00:15' };
  assert.equal(S.reminderTime(slot('breakfast', 'before_meal', 1, 30), mt), null);
  assert.equal(S.reminderTime(slot('breakfast', 'before_meal', 1, 15), mt), '00:00'); // พอดีเที่ยงคืนยังได้
  const r = S.groupMeals([med('M1', slot('breakfast', 'before_meal', 1, 30))], mt, dateKey);
  assert.deepEqual(r, { meals: [], skipped: [{ medicineId: 'M1', slotIndex: 0, reason: 'invalid_reminder_time' }] });
});

test('ยังไม่ได้ตั้งเวลามื้อ / รูปแบบผิด → ไม่เดาเวลา รายงาน invalid_reminder_time', { skip }, () => {
  assert.equal(S.reminderTime(slot('lunch'), { ...mealTimes, lunch: undefined }), null);
  assert.equal(S.reminderTime(slot('lunch'), { ...mealTimes, lunch: '25:00' }), null);
  assert.deepEqual(S.groupMeals([med('M1', slot('lunch'))], {}, dateKey).skipped, [{ medicineId: 'M1', slotIndex: 0, reason: 'invalid_reminder_time' }]);
});
