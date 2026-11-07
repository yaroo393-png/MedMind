// features/demoControls.js — สถานการณ์เริ่มต้นและนาฬิกาจำลองของ Demo mode (ADR-8) บน core/ จริง
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, createDemoContext, advance, jumpNextReminder, jumpAtDeadline, jumpPastDeadline, setClockTo, setSeniorOnline } from '../public/js/features/demoControls.js';
import { fmtHMSms } from '../public/js/features/format.js';

const hms = (ctx) => fmtHMSms(ctx.clock.now());

test('ทุกสถานการณ์สร้างได้ และเวลาเริ่มตรงชื่อ', async () => {
  const expected = { fresh: '06:40', sample: '06:40', reminding: '07:00', round2: '07:10', notconfirmed: '07:16', late: '07:40', offline: '07:05', syncdelay: '06:59' };
  for (const name of Object.keys(PRESETS)) {
    const ctx = await createDemoContext(name);
    assert.equal(hms(ctx).slice(0, 5), expected[name], name);
    assert.equal(ctx.name, name);
  }
});

test('สถานการณ์ที่ไม่รู้จัก → ใช้ sample', async () => assert.equal((await createDemoContext('nope')).name, 'sample'));

test('fresh: ยังไม่มีคู่/ยา · sample: จับคู่แล้วและมีเวลามื้อ+ยาตัวอย่าง', async () => {
  const f = await createDemoContext('fresh');
  assert.equal(await f.repo.getPairing(), null);
  assert.equal(await f.repo.getMealTimes(), null);
  const s = await createDemoContext('sample');
  assert.equal((await s.repo.getPairing()).pair.caregiverId, 'demo-caregiver');
  assert.equal((await s.repo.listMedicines()).length, 4);
});

test('offline / syncdelay: เริ่มโดยผู้สูงอายุออฟไลน์', async () => {
  for (const name of ['offline', 'syncdelay']) assert.equal((await createDemoContext(name)).queue.isOnline(), false, name);
  assert.equal((await createDemoContext('sample')).queue.isOnline(), true);
});

test('นาฬิกา: +1 มิลลิวินาที / +5 นาที / ตั้งเวลาละเอียด เดินหน้าอย่างเดียว', async () => {
  const ctx = await createDemoContext('sample');
  advance(ctx, 1); assert.equal(hms(ctx), '06:40:00.001');
  advance(ctx, 5 * 60 * 1000); assert.equal(hms(ctx), '06:45:00.001');
  assert.deepEqual(setClockTo(ctx, '12:00:00.001').ok, true);
  assert.equal(hms(ctx), '12:00:00.001');
  assert.deepEqual(setClockTo(ctx, '12:00:00.000'), { ok: false, reason: 'back' });
  assert.deepEqual(setClockTo(ctx, 'abc'), { ok: false, reason: 'format' });
  assert.equal(hms(ctx), '12:00:00.001');                    // ผิดแล้วเวลาไม่เปลี่ยน
});

test('"ไปเวลาเตือนถัดไป": 06:45 → 06:50 → 06:55 → 07:00 → … → ไม่มีแล้วหลังรอบสุดท้ายของวัน', async () => {
  const ctx = await createDemoContext('sample');
  const seen = [];
  for (let i = 0; i < 6; i++) { const r = await jumpNextReminder(ctx); seen.push(hms(ctx).slice(0, 5)); assert.ok(r.ok); }
  assert.deepEqual(seen, ['06:45', '06:50', '06:55', '07:00', '07:05', '07:10']);
  ctx.clock.set(new Date(2026, 10, 4, 23, 0).getTime());
  assert.deepEqual(await jumpNextReminder(ctx), { ok: false, reason: 'no_more' });
});

test('"ไป T+15 พอดี" และ "ไปหลัง T+15": ขอบ BR-21 ของมื้อที่ใกล้ที่สุด (06:45 → 07:00)', async () => {
  const ctx = await createDemoContext('sample');
  await jumpAtDeadline(ctx); assert.equal(hms(ctx), '07:00:00.000');
  await jumpAtDeadline(ctx); assert.equal(hms(ctx), '07:00:00.000');         // อยู่ที่ขอบแล้ว ไม่เลื่อนไปมื้อถัดไปเอง
  await jumpPastDeadline(ctx); assert.equal(hms(ctx), '07:00:00.001');
  await jumpAtDeadline(ctx); assert.equal(hms(ctx), '07:15:00.000');         // เส้นตายถัดไป (มื้อ 07:00)
});

test('ยังไม่ตั้งเวลามื้อ → ปุ่มข้ามเวลาแจ้งว่าไม่มี ไม่ล้ม', async () => {
  const ctx = await createDemoContext('fresh');
  assert.deepEqual(await jumpNextReminder(ctx), { ok: false, reason: 'no_more' });
  assert.deepEqual(await jumpAtDeadline(ctx), { ok: false, reason: 'no_more' });
  assert.deepEqual(await jumpPastDeadline(ctx), { ok: false, reason: 'no_more' });
});

test('setSeniorOnline สลับคิวออฟไลน์', async () => {
  const ctx = await createDemoContext('sample');
  await setSeniorOnline(ctx, false); assert.equal(ctx.queue.isOnline(), false);
  await setSeniorOnline(ctx, true); assert.equal(ctx.queue.isOnline(), true);
});

test('ctx แต่ละชุดแยกกัน (เริ่มสถานการณ์ใหม่ไม่ปนข้อมูลเดิม)', async () => {
  const a = await createDemoContext('sample'), b = await createDemoContext('sample');
  await a.repo.deleteMedicine('demo-a');
  assert.equal((await b.repo.listMedicines()).length, 4);
});
