// เทสต์ FR-03 logic/mealTimeline.js — ชื่อเทสต์ขึ้นต้นด้วยรหัสใน docs/TRACEABILITY.md (TC-03.x, TC-04.x, C-Tx, A5-Tx)
// มื้อตัวอย่าง: 2 พ.ย. 2569 เวลาเตือน 08:00 (T) · เวลาทั้งหมดเป็น ms ตามเวลาท้องถิ่น
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealState, nextMealStartFor } from '../public/js/logic/mealTimeline.js';
import { buildDose } from '../public/js/logic/confirm.js';

const mealAt = (hhmm) => ({ dateKey: '2026-11-02', reminderTime: hhmm, medicines: [] });
const at = (h, m, s = 0, ms = 0) => new Date(2026, 10, 2, h, m, s, ms).getTime();
const meal = mealAt('08:00');
const state = (now, extra = {}) => mealState({ now, meal, ...extra });
const doseAt = (confirmedAt) => buildDose({ meal, confirmedAt });

test('ก่อน T → not_due ยังกดไม่ได้ ไม่แจ้ง', () => {
  assert.deepEqual(state(at(7, 59, 59, 999)), { state: 'not_due', round: null, canConfirm: false, caregiverAlert: null });
});

test('TC-03.1: 08:00 → reminding รอบ 0 กดยืนยันได้ ยังไม่แจ้งผู้ดูแล', () => {
  assert.deepEqual(state(at(8, 0)), { state: 'reminding', round: 0, canConfirm: true, caregiverAlert: null });
});

test('TC-03.2: 08:05 → รอบ 1 · 08:10 → รอบ 2 · 08:14:59 ยังรอบ 2 (ไม่มีรอบ 3)', () => {
  assert.equal(state(at(8, 4, 59, 999)).round, 0);
  assert.equal(state(at(8, 5)).round, 1);
  assert.equal(state(at(8, 9, 59, 999)).round, 1);
  assert.equal(state(at(8, 10)).round, 2);
  assert.equal(state(at(8, 14, 59)).round, 2);
  assert.equal(state(at(8, 15)).round, 2); // T+15 พอดีก็ยังรอบ 2
});

test('TC-03.3: ยืนยันแล้ว → ไม่ใช่ reminding ไม่เตือนซ้ำ ไม่แจ้งผู้ดูแล', () => {
  assert.deepEqual(state(at(8, 6), { dose: doseAt(at(8, 3)) }), { state: 'taken', round: null, canConfirm: false, caregiverAlert: null });
});

test('TC-03.4 (BR-16): มื้อ 06:45 กับ 07:00 คำนวณแยกกัน ไม่รบกวนกัน', () => {
  const a = mealAt('06:45'), b = mealAt('07:00');
  assert.equal(mealState({ now: at(7, 0), meal: a }).round, 2); // 06:45 อยู่รอบ T+15 (ยังไม่แจ้ง)
  assert.equal(mealState({ now: at(7, 0), meal: a }).caregiverAlert, null);
  assert.equal(mealState({ now: at(7, 0), meal: b }).round, 0); // 07:00 เริ่มรอบแรก
  assert.equal(mealState({ now: at(7, 0), meal: b, dose: buildDose({ meal: b, confirmedAt: at(7, 0) }) }).state, 'taken'); // ยืนยัน 07:00 ไม่ทำให้ 06:45 เปลี่ยน
  assert.equal(mealState({ now: at(7, 0), meal: a }).state, 'reminding');
});

test('TC-03.5 (BR-18): เปิดหน้า 08:07 → รอบ 1 ทันที ไม่ย้อนเล่นรอบ 0', () => {
  assert.equal(state(at(8, 7)).round, 1);
  assert.equal(state(at(8, 7)).state, 'reminding');
});

test('TC-04.3: กด "ยังไม่กิน" รอบ 0 → 08:05 ยังเตือนรอบ 1 และไม่แจ้งผู้ดูแล', () => {
  // กด "ยังไม่กิน" ก่อนรอบ T+10 ไม่ได้บันทึกอะไรใน mealState (notYetLastRoundAt ใช้เฉพาะรอบสุดท้าย)
  assert.deepEqual(state(at(8, 5)), { state: 'reminding', round: 1, canConfirm: true, caregiverAlert: null });
});

test('BR-11 / TC-04.4: กด "ยังไม่กิน" รอบ T+10 (08:12) → แจ้งผู้ดูแลทันที ไม่รอ T+15 และยังกด "กินแล้ว" ได้', () => {
  assert.deepEqual(state(at(8, 12), { notYetLastRoundAt: at(8, 11) }), { state: 'reminding', round: 2, canConfirm: true, caregiverAlert: 'not_confirmed' });
  assert.equal(state(at(8, 12), { notYetLastRoundAt: at(8, 13) }).caregiverAlert, null); // เวลากดยังมาไม่ถึง now → ไม่นับ
  assert.equal(state(at(8, 12), { notYetLastRoundAt: at(8, 11), dose: doseAt(at(8, 12)) }).caregiverAlert, null); // ยืนยันแล้วชนะ
});

test('ขอบ A5 / BR-21: 08:15:00.000 ยัง reminding ไม่แจ้ง · 08:15:00.001 → not_confirmed + แจ้ง', () => {
  assert.deepEqual(state(at(8, 15)), { state: 'reminding', round: 2, canConfirm: true, caregiverAlert: null });
  assert.deepEqual(state(at(8, 15, 0, 1)), { state: 'not_confirmed', round: null, canConfirm: true, caregiverAlert: 'not_confirmed' });
});

test('A5-T02 / TC-04.8: กดที่ 08:15:00.000 → taken (ไม่ใช่ taken_late) · 08:15:00.001 → taken_late + confirmed_late', () => {
  assert.deepEqual(state(at(8, 15, 1), { dose: doseAt(at(8, 15)) }), { state: 'taken', round: null, canConfirm: false, caregiverAlert: null });
  assert.deepEqual(state(at(8, 40), { dose: doseAt(at(8, 15, 0, 1)) }), { state: 'taken_late', round: null, canConfirm: false, caregiverAlert: 'confirmed_late' });
});

test('A5-T06 (BR-20): ตัดสินจาก confirmedAt ใช้ scheduledTime ใน Dose แม้ผู้ดูแลแก้เวลามื้อทีหลัง', () => {
  const dose = { scheduledTime: at(8, 0), confirmedAt: at(8, 14), serverReceivedAt: at(8, 30), status: 'taken' };
  assert.equal(state(at(9, 0), { dose }).state, 'taken');
  assert.equal(mealState({ now: at(9, 0), meal: mealAt('08:30'), dose }).state, 'taken'); // เวลามื้อถูกแก้เป็น 08:30 ผลยังเดิม
});

test('C-T01 / TC-04.10 (BR-21): 12:00:00.000 (มื้อถัดไปพอดี) ยังกดย้อนหลังได้', () => {
  const next = at(12, 0);
  assert.deepEqual(state(next, { nextMealStart: next }), { state: 'not_confirmed', round: null, canConfirm: true, caregiverAlert: 'not_confirmed' });
});

test('C-T02 / TC-04.6: เลยมื้อถัดไป 1 ms (12:00:00.001) → missed กดไม่ได้ แต่ผู้ดูแลยังเห็นแจ้ง "ยังไม่ยืนยัน"', () => {
  assert.deepEqual(state(at(12, 0, 0, 1), { nextMealStart: at(12, 0) }), { state: 'missed', round: null, canConfirm: false, caregiverAlert: 'not_confirmed' });
});

test('C-T04: ไม่มีมื้อถัดไป → กดได้ถึง 23:59:59.999 · 00:00:00.000 วันถัดไป = missed', () => {
  assert.equal(state(at(23, 59, 59, 999)).canConfirm, true);
  assert.equal(state(new Date(2026, 10, 3, 0, 0, 0, 0).getTime()).state, 'missed');
});

test('nextMealStartFor (BR-15/16): ใช้มื้อที่เริ่ม "หลัง" T+15 · 07:00 = T+15 ของ 06:45 ไม่นับ · มื้อสุดท้าย = null', () => {
  const meals = [mealAt('06:45'), mealAt('07:00'), mealAt('12:00'), mealAt('18:00')];
  assert.equal(nextMealStartFor(meals, meals[0]), at(12, 0)); // ข้าม 07:00 ที่เริ่มพอดี T+15
  assert.equal(nextMealStartFor(meals, meals[1]), at(12, 0));
  assert.equal(nextMealStartFor(meals, meals[2]), at(18, 0));
  assert.equal(nextMealStartFor(meals, meals[3]), null);
  assert.equal(nextMealStartFor([mealAt('08:00'), mealAt('08:15'), mealAt('08:16')], mealAt('08:00')), at(8, 16)); // 08:15 = T+15 พอดีไม่นับ · 08:16 นับ
});

test('nextMealStartFor: ไม่นับมื้อของวันอื่น', () => {
  const tomorrow = { dateKey: '2026-11-03', reminderTime: '07:00', medicines: [] };
  assert.equal(nextMealStartFor([mealAt('18:00'), tomorrow], mealAt('18:00')), null);
});

test('ผลลัพธ์ไม่เปลี่ยนตามลำดับ/ค่าที่ส่งเข้ามา และไม่แก้ค่าที่รับ (ฟังก์ชันล้วน)', () => {
  const dose = doseAt(at(8, 3)), copy = JSON.stringify([meal, dose]);
  assert.deepEqual(state(at(8, 5), { dose }), state(at(8, 5), { dose }));
  assert.equal(JSON.stringify([meal, dose]), copy);
});

test('now ไม่ใช่ตัวเลข → แจ้งข้อผิดพลาด ไม่เดาเวลา', () => {
  for (const bad of [undefined, null, '08:00', NaN]) assert.throws(() => mealState({ now: bad, meal }), TypeError);
});
