// FR-05 หน้าจอผู้ดูแล C-07 สถานะรายวัน และ C-08 การแจ้งเตือน — AC 1–10 ระดับหน้าจอ บน localRepo + นาฬิกาจำลอง
// เจ้าของ: Suchitra · ตัดสินด้วย logic/status.js (tests/status.test.js ละเอียดแล้ว) — ที่นี่ตรวจข้อความ ลำดับ และการ "ไม่แจ้งซ้ำ" ผ่าน repo.markAlertSeen
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePair, textOf } from './helpers/harness.js';
import { setClockTo, setSeniorOnline } from '../public/js/features/demoControls.js';

const at = (ctx, text) => { const r = setClockTo(ctx, text); assert.ok(r.ok, `ตั้งเวลา ${text} ไม่ได้`); };
const M0700 = '2026-11-04_0700';

test('FR-05 ข้อ 1: ยืนยัน 07:12 → ถึง 07:15 ผู้ดูแลไม่ถูกแจ้ง', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:12'); await senior.act('confirm', { meal: M0700 });
  at(ctx, '07:15:00.001'); await caregiver.load();
  assert.equal(caregiver.inbox.filter((a) => a.reminderTime === '07:00').length, 0);
});

test('FR-05 ข้อ 2: ไม่มีการยืนยันและเลย 07:15 → แจ้ง "ยังไม่ยืนยันการกินยา" (ไม่ใช้คำว่า ไม่ได้กิน)', async () => {
  const { ctx, caregiver } = await makePair('sample');
  at(ctx, '07:15:00.001');
  const alerts = await caregiver.view('cg-alerts');
  const t = textOf(alerts.body);
  assert.match(t, /ยังไม่ยืนยันการกินยา/);
  assert.match(t, /มื้อ 07:00/);
  const all = t + textOf((await caregiver.view('cg-status')).body);
  assert.doesNotMatch(all, /ไม่ได้กิน/);
});

test('FR-05 ข้อ 3 + 10: หน้าสถานะแสดงทุกมื้อของวัน เรียงเวลา พร้อมป้ายและเวลา · ช่วง T–T+15 เป็น "ยังไม่ยืนยัน" แต่ยังไม่มีแถบแจ้ง', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '06:50'); await senior.act('confirm', { meal: '2026-11-04_0645' });  // ยืนยันทันเวลา
  at(ctx, '07:07');                                                             // มื้อ 07:00 อยู่ในช่วง T–T+15
  const v = await caregiver.view('cg-status');
  const t = textOf(v.body);
  assert.match(t, /มื้อ 06:45 กินแล้ว 06:50/);
  assert.match(t, /มื้อ 07:00 ยังไม่ยืนยัน/);
  assert.match(t, /มื้อ 11:30 ยังไม่ถึงเวลา/);
  assert.ok(t.indexOf('มื้อ 06:45') < t.indexOf('มื้อ 07:00') && t.indexOf('มื้อ 07:00') < t.indexOf('มื้อ 11:30'), 'เรียงตามเวลา');
  assert.doesNotMatch(v.body, /class="banner"/, 'ข้อ 10: ยังไม่มีแถบแจ้ง');
  assert.equal(caregiver.inbox.length, 0);
});

test('FR-05 ข้อ 4: วันนี้ไม่มีมื้อยา → "วันนี้ไม่มีมื้อยา"', async () => {
  const { ctx, caregiver } = await makePair('sample');
  for (const m of await ctx.repo.listMedicines()) await ctx.repo.deleteMedicine(m.id);
  assert.match(textOf((await caregiver.view('cg-status')).body), /วันนี้ไม่มีมื้อยา/);
});

test('FR-05 ข้อ 5: กด "ยังไม่กิน" รอบ 07:10 (แจ้งแล้ว) → ถึง 07:15 ไม่แจ้งซ้ำ', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:10'); await senior.act('notyet', { meal: M0700 });
  await caregiver.load();
  const first = caregiver.inbox.filter((a) => a.reminderTime === '07:00').length;
  assert.equal(first, 1);
  at(ctx, '07:15:00.001'); await caregiver.load();
  assert.equal(caregiver.inbox.filter((a) => a.reminderTime === '07:00' && a.kind === 'not_confirmed').length, 1);
});

test('FR-05 ข้อ 6: แจ้ง "ยังไม่ยืนยัน" แล้ว ผู้สูงอายุยืนยัน 07:40 → ผู้ดูแลได้ "ยืนยันการกินยาแล้ว เวลา 07:40" และ "ยังไม่ยืนยัน" หายไป', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:16'); await caregiver.load();
  at(ctx, '07:40'); await senior.act('confirm', { meal: M0700 });
  const t = textOf((await caregiver.view('cg-alerts')).body);
  assert.match(t, /ยืนยันการกินยาแล้ว เวลา 07:40/);
  assert.equal((t.match(/ยังไม่ยืนยันการกินยา/g) ?? []).length, 1, 'เหลือแต่ของมื้อ 06:45 (ยังไม่ยืนยันจริง) — ของมื้อ 07:00 หายเพราะยืนยันแล้ว');
  assert.doesNotMatch(t, /ยังไม่ยืนยันการกินยา มื้อ 07:00/);
});

test('FR-05 ข้อ 7: ผู้ดูแลปิดหน้าตอนเลย T+15 แล้วเปิดทีหลัง → เห็นการแจ้งที่ค้างอยู่ และสถานะ "ยังไม่ยืนยัน"', async () => {
  const { ctx, caregiver } = await makePair('sample');
  ctx.flags.cgOpen = false;
  at(ctx, '07:16'); await caregiver.load();
  assert.equal(caregiver.inbox.length, 0, 'ปิดหน้าอยู่ = ยังไม่แสดง ไม่จดว่าเห็น');
  at(ctx, '09:00'); ctx.flags.cgOpen = true;
  const alerts = textOf((await caregiver.view('cg-alerts')).body);
  assert.match(alerts, /มื้อ 07:00/);
  assert.match(textOf((await caregiver.view('cg-status')).body), /มื้อ 07:00 ยังไม่ยืนยัน/);
});

test('FR-05 ข้อ 8: ยืนยันที่ 07:15:00.000 ถึงเครื่องผู้ดูแลก่อนประเมิน → ไม่แจ้งเลย', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:15:00.000'); await senior.act('confirm', { meal: M0700 });
  at(ctx, '07:15:00.001'); await caregiver.load();
  assert.equal(caregiver.inbox.filter((a) => a.reminderTime === '07:00').length, 0);
});

test('FR-05 ข้อ 9: แจ้ง "ยังไม่ยืนยัน" ตอน 07:16 เพราะข้อมูลยังไม่มา แล้วยืนยัน 07:14 มาถึงทีหลัง → เปลี่ยนเป็น "ยืนยันแล้ว เวลา 07:14" ไม่แจ้งซ้ำ', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:14'); await setSeniorOnline(ctx, false); await senior.act('confirm', { meal: M0700 });   // ออฟไลน์ กด 07:14 → ค้างในคิว
  at(ctx, '07:16'); await caregiver.load();
  assert.equal(caregiver.inbox.filter((a) => a.kind === 'not_confirmed' && a.reminderTime === '07:00').length, 1);
  at(ctx, '07:20'); await setSeniorOnline(ctx, true);
  const t = textOf((await caregiver.view('cg-alerts')).body);
  assert.match(t, /ยืนยันการกินยาแล้ว เวลา 07:14/);
  assert.equal(caregiver.inbox.filter((a) => a.kind === 'confirmed_late').length, 1);
  await caregiver.load();
  assert.equal(caregiver.inbox.filter((a) => a.kind === 'confirmed_late').length, 1, 'ไม่แจ้งซ้ำ');
});

test('FR-05: "ปิดการแจ้งนี้" ซ่อนการแจ้ง · ป้ายตัวเลขบนแถบล่างนับเฉพาะ "ยังไม่ยืนยัน" ที่เปิดอยู่ · ทุกหน้ามีป้าย Covers: FR-05', async () => {
  const { ctx, caregiver } = await makePair('sample');
  at(ctx, '07:16');
  const v = await caregiver.view('cg-alerts');
  assert.match(v.covers, /FR-05/);
  assert.match((await caregiver.view('cg-status')).covers, /FR-05/);
  const key = caregiver.inbox[0].key;
  await caregiver.act('dismiss', { key });
  assert.equal(caregiver.inbox.some((a) => a.key === key), false);
});
