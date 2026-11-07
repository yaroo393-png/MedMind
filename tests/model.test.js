// features/model.js — ภาพรวมข้อมูล ณ เวลานี้ที่หน้าจอใช้ (loadSnapshot, focusMeal) บน localRepo + นาฬิกาจำลอง
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCtx } from './helpers/harness.js';
import { loadSnapshot, focusMeal } from '../public/js/features/model.js';
import { setClockTo } from '../public/js/features/demoControls.js';

const snap = (ctx) => loadSnapshot({ repo: ctx.repo, clock: ctx.clock, dateKey: ctx.dateKey });

test('06:40 ข้อมูลตัวอย่าง: 5 มื้อเรียงเวลา (06:45, 07:00, 11:30, 12:00, 18:00) ทุกมื้อยังไม่ถึงเวลา', async () => {
  const s = await snap(await makeCtx('sample'));
  assert.deepEqual(s.meals.map((m) => m.reminderTime), ['06:45', '07:00', '11:30', '12:00', '18:00']);
  assert.ok(s.meals.every((m) => m.st.state === 'not_due'));
  assert.equal(s.pairState, 'connected');
  assert.deepEqual(s.skipped, []);
});

test('มื้อ 07:00 รวมยา A และ B ไว้ด้วยกัน (จัดกลุ่มด้วยเวลาเตือน) และ id ตรง doseId', async () => {
  const s = await snap(await makeCtx('sample'));
  const m = s.meals.find((x) => x.reminderTime === '07:00');
  assert.deepEqual(m.medicines.map((x) => x.name), ['ยาตัวอย่าง A', 'ยาตัวอย่าง B']);
  assert.equal(m.id, '2026-11-04_0700');
});

test('ไม่มีเวลามื้อ (เริ่มใหม่) → ไม่มีมื้อ ไม่ล้ม · ยังไม่จับคู่ = waiting_consent หลังสร้างคู่', async () => {
  const ctx = await makeCtx('fresh');
  let s = await snap(ctx);
  assert.deepEqual(s.meals, []);
  assert.equal(s.pairing, null);                                  // ยังไม่มีคู่ (เครื่องผู้สูงอายุสร้างตอนเปิดแอป)
  await ctx.repo.createPairing({ seniorId: 'x' });
  s = await snap(ctx);
  assert.equal(s.pairState, 'waiting_consent');
});

test('สถานะของมื้อตามเวลา: 07:00 reminding · 07:16 not_confirmed · 11:30:00.001 missed', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:00');
  assert.equal((await snap(ctx)).meals[1].st.state, 'reminding');
  setClockTo(ctx, '07:16');
  assert.equal((await snap(ctx)).meals[1].st.state, 'not_confirmed');
  setClockTo(ctx, '11:30:00.001');
  assert.equal((await snap(ctx)).meals[1].st.state, 'missed');
});

test('focusMeal: กำลังเตือน → ยืนยันย้อนหลังได้ → มื้อถัดไป → ไม่มี', async () => {
  const ctx = await makeCtx('sample');
  assert.equal(focusMeal((await snap(ctx)).meals).reminderTime, '06:45');           // มื้อถัดไป
  setClockTo(ctx, '07:00');
  assert.equal(focusMeal((await snap(ctx)).meals).st.state, 'reminding');
  setClockTo(ctx, '07:16');
  assert.equal(focusMeal((await snap(ctx)).meals).st.state, 'not_confirmed');
  assert.equal(focusMeal([]), null);
});

test('ยืนยันแล้วมี dose ในมื้อ · ข้อมูลที่อ่านเป็นสำเนา (แก้แล้วไม่กระทบที่เก็บ)', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:03');
  await ctx.repo.confirmMeal({ meal: { dateKey: '2026-11-04', reminderTime: '07:00' }, confirmedAt: ctx.clock.now() });
  const s = await snap(ctx);
  const m = s.meals.find((x) => x.reminderTime === '07:00');
  assert.equal(m.dose.status, 'taken');
  m.dose.status = 'hacked';
  assert.equal((await ctx.repo.getDoses())['2026-11-04_0700'].status, 'taken');
});

test('กด "ยังไม่กิน" รอบสุดท้าย (07:10) → สถานะของมื้อบอกให้แจ้งผู้ดูแลทันที ก่อน T+15 (BR-11)', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:10');
  assert.equal((await snap(ctx)).meals[1].st.caregiverAlert, null);
  await ctx.repo.reportNotYet({ meal: { dateKey: '2026-11-04', reminderTime: '07:00' }, at: ctx.clock.now() });
  const m = (await snap(ctx)).meals[1];
  assert.equal(m.notYet, ctx.clock.now());
  assert.equal(m.st.state, 'reminding');
  assert.equal(m.st.caregiverAlert, 'not_confirmed');
});
