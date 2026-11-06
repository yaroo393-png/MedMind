// เทสต์ FR-05 logic/status.js — เขียนก่อนโค้ดจากสัญญา architecture §5.1 (BR-13/14) และ §5.3 (DL-18) (TDD)
// ถ้ายังไม่มีไฟล์ logic/status.js เทสต์ในไฟล์นี้จะถูกข้าม (skip) — เมื่อ Suchitra เพิ่มไฟล์ (Issue #16) เทสต์จะรันเอง
// รูปที่ทดสอบ (ตาม §5.3):
//   alertFor({ now, meal, dose, notYet, seen }) → null | { kind: 'not_confirmed' } | { kind: 'confirmed_late', confirmedAt }
//     notYet = เวลาที่กด "ยังไม่กิน" รอบ T+10 (ms) หรือ null · seen = ชนิดการแจ้งที่แสดงแล้วของมื้อนี้ (array)
//   dailyStatus({ now, meals, doses }) → [{ mealId, reminderTime, label, confirmedAt? }]
//     doses = { [doseId]: Dose } (id ของเอกสาร = doseId ของมื้อ) · label ∈ taken, taken_late, not_confirmed, not_due
// ⚠ รูปของ seen (array) และ doses (object ตาม doseId) เป็นข้อเสนอ — ถ้าทีมเลือกต่าง ให้แก้ §5.3 ก่อน แล้วแก้เทสต์ให้ตรง
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildDose, doseId } from '../public/js/logic/confirm.js';

const file = new URL('../public/js/logic/status.js', import.meta.url);
const S = existsSync(file) ? await import(file) : null;
const skip = S ? false : 'รอ public/js/logic/status.js (Issue #16)';

const mealAt = (hhmm) => ({ dateKey: '2026-11-02', reminderTime: hhmm, medicines: [] });
const at = (h, m, s = 0, ms = 0) => new Date(2026, 10, 2, h, m, s, ms).getTime();
const meal = mealAt('08:00');
const alert = (now, extra = {}) => S.alertFor({ now, meal, dose: null, notYet: null, seen: [], ...extra });
const dose = (confirmedAt, m = meal) => buildDose({ meal: m, confirmedAt });

test('TC-05.1 (FR-05 ข้อ 1): ยืนยัน 08:12 → ผ่าน T+15 แล้วไม่แจ้ง', { skip }, () => {
  assert.equal(alert(at(8, 15, 0, 1), { dose: dose(at(8, 12)) }), null);
  assert.equal(alert(at(9, 0), { dose: dose(at(8, 12)) }), null);
});

test('TC-05.2 / A5-T07 (FR-05 ข้อ 2, BR-21): ไม่มีการยืนยัน 08:15:00.001 → แจ้ง not_confirmed', { skip }, () => {
  assert.deepEqual(alert(at(8, 15, 0, 1)), { kind: 'not_confirmed' });
});

test('C-T03 / TC-05.10 (FR-05 ข้อ 10): ระหว่าง T ถึง T+15 (08:07, 08:15:00.000) ยังไม่แจ้ง', { skip }, () => {
  assert.equal(alert(at(8, 7)), null);
  assert.equal(alert(at(8, 15)), null);
  assert.equal(alert(at(7, 59)), null); // ก่อน T
});

test('TC-05.5 / TC-04.4 (BR-11): กด "ยังไม่กิน" รอบ T+10 → แจ้งทันที · แจ้งแล้วไม่แจ้งซ้ำตอน T+15 (BR-13)', { skip }, () => {
  assert.deepEqual(alert(at(8, 11), { notYet: at(8, 10, 30) }), { kind: 'not_confirmed' });
  assert.equal(alert(at(8, 15, 1), { notYet: at(8, 10, 30), seen: ['not_confirmed'] }), null);
});

test('TC-05.6 / C-T05 (ข) (FR-05 ข้อ 6, BR-13): ยืนยันช้า 08:40 → แจ้ง "ยืนยันแล้ว" พร้อมเวลา 08:40 ครั้งเดียว', { skip }, () => {
  assert.deepEqual(alert(at(8, 41), { dose: dose(at(8, 40)), seen: ['not_confirmed'] }), { kind: 'confirmed_late', confirmedAt: at(8, 40) });
  assert.deepEqual(alert(at(8, 41), { dose: dose(at(8, 40)) }), { kind: 'confirmed_late', confirmedAt: at(8, 40) }); // แม้ผู้ดูแลยังไม่เห็นแจ้งแรก (ปิดหน้าอยู่)
  assert.equal(alert(at(8, 42), { dose: dose(at(8, 40)), seen: ['not_confirmed', 'confirmed_late'] }), null);
});

test('C-T05 (ก) (BR-13): ยืนยันทันเวลา 08:10 และไม่เคยแจ้ง → ไม่มีข้อความใด ๆ', { skip }, () => {
  assert.equal(alert(at(8, 30), { dose: dose(at(8, 10)) }), null);
});

test('TC-05.7 (FR-05 ข้อ 7, BR-18): ผู้ดูแลเปิดหน้า 09:00 แจ้งที่ยังไม่เห็นยังแสดง · เห็นแล้วไม่แสดงซ้ำ', { skip }, () => {
  assert.deepEqual(alert(at(9, 0)), { kind: 'not_confirmed' });
  assert.equal(alert(at(9, 0), { seen: ['not_confirmed'] }), null);
});

test('TC-05.8 / A5-T04 (FR-05 ข้อ 8): กดที่ 08:15:00.000 และข้อมูลถึงก่อนประเมิน (08:15:00.001) → ไม่แจ้ง', { skip }, () => {
  assert.equal(alert(at(8, 15, 0, 1), { dose: dose(at(8, 15)) }), null);
});

test('TC-05.9 / A5-T05 (FR-05 ข้อ 9): แจ้งแล้ว 08:16 แล้วการยืนยัน 08:14 มาถึง 08:20 → เปลี่ยนเป็น "ยืนยันแล้ว 08:14" ไม่แจ้งซ้ำ', { skip }, () => {
  const late = { ...dose(at(8, 14)), serverReceivedAt: at(8, 20) };
  assert.deepEqual(alert(at(8, 20), { dose: late, seen: ['not_confirmed'] }), { kind: 'confirmed_late', confirmedAt: at(8, 14) });
  assert.equal(alert(at(8, 21), { dose: late, seen: ['not_confirmed', 'confirmed_late'] }), null);
});

test('NFR-01: ประเมินที่ T+15+1 ms และ T+15+5 วินาที ได้การแจ้งทั้งคู่ (แจ้งภายใน 5 วินาที)', { skip }, () => {
  assert.deepEqual(alert(at(8, 15, 0, 1)), { kind: 'not_confirmed' });
  assert.deepEqual(alert(at(8, 15, 5)), { kind: 'not_confirmed' });
});

test('TC-05.3 (FR-05 ข้อ 3, BR-14): สถานะรายวันครบ 4 ป้าย เรียงเวลา พร้อมเวลาที่ยืนยัน', { skip }, () => {
  const meals = [mealAt('18:00'), mealAt('07:00'), mealAt('08:00'), mealAt('12:00')];
  const doses = {
    [doseId(mealAt('07:00'))]: dose(at(7, 5), mealAt('07:00')),
    [doseId(mealAt('08:00'))]: dose(at(8, 40), mealAt('08:00')),
  };
  const rows = S.dailyStatus({ now: at(12, 20), meals, doses });
  assert.deepEqual(rows.map((r) => [r.reminderTime, r.label]), [['07:00', 'taken'], ['08:00', 'taken_late'], ['12:00', 'not_confirmed'], ['18:00', 'not_due']]);
  assert.equal(rows[0].mealId, '2026-11-02_0700');
  assert.equal(rows[0].confirmedAt, at(7, 5));
  assert.equal(rows[1].confirmedAt, at(8, 40));
  assert.equal(rows[2].confirmedAt, undefined);
});

test('C-T03 (BR-14): ระหว่าง T ถึง T+15 สถานะรายวันเป็น not_confirmed ("ยังไม่ยืนยัน") แม้ยังไม่แจ้ง', { skip }, () => {
  const [row] = S.dailyStatus({ now: at(8, 7), meals: [meal], doses: {} });
  assert.equal(row.label, 'not_confirmed');
});

test('TC-05.4 (FR-05 ข้อ 4): วันนี้ไม่มีมื้อยา → []', { skip }, () => {
  assert.deepEqual(S.dailyStatus({ now: at(9, 0), meals: [], doses: {} }), []);
});

test('BR-14 / BR-15: มื้อที่เลยมื้อถัดไปแล้ว (missed) ผู้ดูแลยังเห็น "ยังไม่ยืนยัน" · ป้ายมีแค่ 4 ค่าตามสัญญา', { skip }, () => {
  const rows = S.dailyStatus({ now: at(12, 20), meals: [mealAt('08:00'), mealAt('12:00')], doses: {} });
  assert.deepEqual(rows.map((r) => [r.reminderTime, r.label]), [['08:00', 'not_confirmed'], ['12:00', 'not_confirmed']]);
  for (const r of rows) assert.ok(['taken', 'taken_late', 'not_confirmed', 'not_due'].includes(r.label), r.label);
});

test('TC-05.2 (SRS): ตรรกะคืนชนิดการแจ้ง ไม่คืนข้อความ และไม่มีคำว่า "ไม่ได้กิน" / "not taken" ในไฟล์', { skip }, () => {
  const src = readFileSync(file, 'utf8');
  assert.ok(!/not taken|ไม่ได้กิน/i.test(src.replace(/\/\/.*$/gm, '')), 'ห้ามมีคำว่า not taken ในโค้ด');
  assert.deepEqual(Object.keys(alert(at(8, 15, 0, 1))), ['kind']);
});

test('ผลลัพธ์ไม่แก้ค่าที่รับเข้า (ฟังก์ชันล้วน)', { skip }, () => {
  const meals = [mealAt('12:00'), mealAt('08:00')], doses = { [doseId(meal)]: dose(at(8, 3)) }, seen = ['not_confirmed'];
  const before = JSON.stringify([meals, doses, seen]);
  S.dailyStatus({ now: at(9, 0), meals, doses });
  S.alertFor({ now: at(9, 0), meal, dose: doses[doseId(meal)], notYet: null, seen });
  assert.equal(JSON.stringify([meals, doses, seen]), before);
});
