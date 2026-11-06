// เทสต์ core/repo.js — localRepo (Issue #9) · ไม่ import Firebase
// ตรวจกฎที่มีผลต่อ AC: R-7/BR-12 ยืนยันซ้ำไม่ทับ · R-9 serverReceivedAt มาจากที่เก็บ · R-10 status ตรง confirmStatus · BR-13 แจ้งเห็นแล้วครั้งเดียว
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../public/js/core/clock.js';
import { createLocalRepo } from '../public/js/core/repo.js';
import { alertFor, dailyStatus } from '../public/js/logic/status.js';

const at = (h, m, s = 0, ms = 0) => new Date(2026, 10, 2, h, m, s, ms).getTime();
const meal = { dateKey: '2026-11-02', reminderTime: '08:00', medicines: [] };
const mealTimes = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' };
const medicine = { name: 'ยาตัวอย่าง A', instructionText: 'หลังอาหารเช้า', slots: [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }], warnings: null, contraindications: null };
const setup = (start = at(8, 3)) => { const clock = createClock({ start }); return { clock, repo: createLocalRepo({ clock }) }; };

test('ต้องส่ง clock ให้ repo', () => {
  assert.throws(() => createLocalRepo(), TypeError);
});

test('TC-04.1 (FR-04 AC1): ยืนยัน 08:03 → บันทึก confirmedAt 08:03 status taken และ serverReceivedAt จากที่เก็บ (R-9)', async () => {
  const { clock, repo } = setup(at(8, 3));
  clock.advance(2000); // ข้อมูลถึงที่เก็บช้ากว่าเวลากด 2 วินาที
  const r = await repo.confirmMeal({ meal, confirmedAt: at(8, 3) });
  assert.equal(r.created, true);
  assert.equal(r.doseId, '2026-11-02_0800');
  assert.deepEqual(r.dose, { scheduledTime: at(8, 0), confirmedAt: at(8, 3), status: 'taken', serverReceivedAt: at(8, 3, 2) });
});

test('TC-04.2 / R-7 (FR-04 AC2, BR-12, NFR-07): ยืนยันซ้ำ → 1 รายการ confirmedAt เดิมไม่เปลี่ยน ถือว่าสำเร็จ', async () => {
  const { repo } = setup();
  await repo.confirmMeal({ meal, confirmedAt: at(8, 3) });
  const again = await repo.confirmMeal({ meal, confirmedAt: at(8, 9) });
  assert.equal(again.created, false);
  assert.equal(again.dose.confirmedAt, at(8, 3));
  assert.deepEqual(Object.keys(await repo.getDoses()), ['2026-11-02_0800']);
});

test('R-10 / A5-T02: status ใน Dose คำนวณจากเวลาที่กดเสมอ — T+15 พอดี taken · +1 ms taken_late', async () => {
  const { repo } = setup(at(8, 20));
  await repo.confirmMeal({ meal, confirmedAt: at(8, 15) });
  const lunch = { ...meal, reminderTime: '12:00' };
  await repo.confirmMeal({ meal: lunch, confirmedAt: at(12, 15, 0, 1) });
  const doses = await repo.getDoses();
  assert.equal(doses['2026-11-02_0800'].status, 'taken');
  assert.equal(doses['2026-11-02_1200'].status, 'taken_late');
});

test('A5-T05 / TC-04.9: ข้อมูลออฟไลน์มาถึงช้า (08:20) แต่กด 08:14 → status ยัง taken (BR-20)', async () => {
  const { repo } = setup(at(8, 20));
  const { dose } = await repo.confirmMeal({ meal, confirmedAt: at(8, 14) });
  assert.equal(dose.serverReceivedAt, at(8, 20));
  assert.equal(dose.status, 'taken');
});

test('BR-11: กด "ยังไม่กิน" รอบสุดท้าย เก็บเวลาครั้งแรกเท่านั้น', async () => {
  const { repo } = setup();
  assert.equal(await repo.getNotYet(meal), null);
  assert.deepEqual(await repo.reportNotYet({ meal, at: at(8, 10, 30) }), { created: true, at: at(8, 10, 30) });
  assert.deepEqual(await repo.reportNotYet({ meal, at: at(8, 12) }), { created: false, at: at(8, 10, 30) });
  assert.equal(await repo.getNotYet(meal), at(8, 10, 30));
});

test('BR-13: แจ้งเห็นแล้วสร้างได้ครั้งเดียวต่อชนิดต่อมื้อ · ชนิดต้องถูกต้อง', async () => {
  const { repo } = setup();
  const mealId = '2026-11-02_0800';
  assert.deepEqual(await repo.markAlertSeen({ mealId, kind: 'not_confirmed' }), { created: true });
  assert.deepEqual(await repo.markAlertSeen({ mealId, kind: 'not_confirmed' }), { created: false });
  await repo.markAlertSeen({ mealId, kind: 'confirmed_late' });
  assert.deepEqual(await repo.getSeen(mealId), ['confirmed_late', 'not_confirmed']);
  assert.deepEqual(await repo.getSeen('2026-11-02_1200'), []);
  await assert.rejects(repo.markAlertSeen({ mealId, kind: 'not_taken' }), TypeError);
});

test('BR-06: ตั้งเวลามื้อครบ 4 ช่องรูปแบบ HH:MM · ผิดรูปแบบไม่บันทึก', async () => {
  const { repo } = setup();
  assert.equal(await repo.getMealTimes(), null);
  await repo.setMealTimes(mealTimes);
  assert.deepEqual(await repo.getMealTimes(), mealTimes);
  await assert.rejects(repo.setMealTimes({ ...mealTimes, lunch: '25:00' }), TypeError);
  await assert.rejects(repo.setMealTimes({ breakfast: '07:00' }), TypeError);
  assert.deepEqual(await repo.getMealTimes(), mealTimes); // ค่าเดิมไม่ถูกทับ
});

test('FR-02: บันทึก/แก้/ลบยา · ยาต้องมีชื่อและ slot อย่างน้อย 1 ช่อง', async () => {
  const { repo } = setup();
  const id = await repo.saveMedicine(medicine);
  assert.equal(id, 'med-1');
  await repo.saveMedicine({ ...medicine, id, name: 'ยาตัวอย่าง A (แก้)' });
  assert.deepEqual((await repo.listMedicines()).map((m) => [m.id, m.name]), [['med-1', 'ยาตัวอย่าง A (แก้)']]);
  await assert.rejects(repo.saveMedicine({ ...medicine, name: ' ' }), TypeError);
  await assert.rejects(repo.saveMedicine({ ...medicine, slots: [] }), TypeError);
  assert.equal(await repo.deleteMedicine(id), true);
  assert.deepEqual(await repo.listMedicines(), []);
});

test('คืนสำเนาเสมอ — ผู้เรียกแก้ข้อมูลในที่เก็บโดยตรงไม่ได้', async () => {
  const { repo } = setup();
  await repo.setMealTimes(mealTimes);
  const input = structuredClone(medicine);
  await repo.saveMedicine(input);
  await repo.confirmMeal({ meal, confirmedAt: at(8, 3) });
  input.name = 'แก้ของที่ส่งเข้าไป'; // ของที่ส่งเข้าไปไม่ผูกกับที่เก็บ
  (await repo.getMealTimes()).lunch = '13:00';
  (await repo.listMedicines())[0].name = 'แก้จากข้างนอก';
  (await repo.getDoses())['2026-11-02_0800'].status = 'taken_late';
  assert.equal((await repo.getMealTimes()).lunch, '12:00');
  assert.equal((await repo.listMedicines())[0].name, 'ยาตัวอย่าง A');
  assert.equal((await repo.getDoses())['2026-11-02_0800'].status, 'taken');
});

test('watch: แจ้งเมื่อข้อมูลเปลี่ยน ไม่แจ้งเมื่อกดซ้ำแล้วไม่มีอะไรเปลี่ยน · เลิกฟังได้', async () => {
  const { repo } = setup();
  let count = 0;
  const stop = repo.watch(() => count++);
  await repo.confirmMeal({ meal, confirmedAt: at(8, 3) });
  await repo.confirmMeal({ meal, confirmedAt: at(8, 4) }); // ซ้ำ → ไม่เปลี่ยน
  await repo.markAlertSeen({ mealId: '2026-11-02_0800', kind: 'not_confirmed' });
  const id = await repo.saveMedicine(medicine);
  await repo.deleteMedicine(id);
  await repo.deleteMedicine(id); // ลบซ้ำ → ไม่เปลี่ยน
  stop();
  await repo.reportNotYet({ meal, at: at(8, 10) });
  assert.equal(count, 4);
});

test('seed: เริ่มจากข้อมูลตั้งต้น (เช่น core/demoData.js)', async () => {
  const clock = createClock({ start: at(6, 40) });
  const repo = createLocalRepo({ clock, seed: { mealTimes, medicines: [{ ...medicine, id: 'A' }] } });
  assert.deepEqual(await repo.getMealTimes(), mealTimes);
  assert.deepEqual((await repo.listMedicines()).map((m) => m.id), ['A']);
});

test('ต่อกับ logic ได้ตรงรูป: getDoses → dailyStatus · getSeen/getNotYet → alertFor (FR-05)', async () => {
  const { clock, repo } = setup(at(8, 16));
  const meals = [meal, { ...meal, reminderTime: '12:00' }];
  // 08:16 ยังไม่ยืนยัน → แจ้ง 1 ครั้ง แล้วบันทึกว่าเห็น
  let a = alertFor({ now: clock.now(), meal, dose: null, notYet: await repo.getNotYet(meal), seen: await repo.getSeen('2026-11-02_0800') });
  assert.deepEqual(a, { kind: 'not_confirmed' });
  await repo.markAlertSeen({ mealId: '2026-11-02_0800', kind: a.kind });
  // ยืนยันย้อนหลัง 08:40 → แจ้ง "ยืนยันแล้ว 08:40" แล้วสถานะรายวันเป็น taken_late
  clock.set(at(8, 40));
  const { dose } = await repo.confirmMeal({ meal, confirmedAt: clock.now() });
  a = alertFor({ now: clock.now(), meal, dose, notYet: null, seen: await repo.getSeen('2026-11-02_0800') });
  assert.deepEqual(a, { kind: 'confirmed_late', confirmedAt: at(8, 40) });
  const rows = dailyStatus({ now: clock.now(), meals, doses: await repo.getDoses() });
  assert.deepEqual(rows.map((r) => [r.reminderTime, r.label]), [['08:00', 'taken_late'], ['12:00', 'not_due']]);
});
