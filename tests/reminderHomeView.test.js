// FR-03 หน้าเตือน (S-03) และ FR-04 หน้าหลัก/การยืนยัน (S-02) — AC ระดับหน้าจอ บน localRepo + นาฬิกาจำลองจริง
// เจ้าของ: Rossatorn (FR-03), Nichanan (FR-04) · กฎเวลา (T+15, มื้อถัดไป, รอบเตือน) ทดสอบละเอียดแล้วที่ mealTimeline.test.js / confirm.test.js — ที่นี่ตรวจว่าหน้าจอ "ใช้" กฎนั้นครบ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePair, textOf } from './helpers/harness.js';
import { setClockTo, setSeniorOnline } from '../public/js/features/demoControls.js';

// ตั้งเวลาจำลองเป็น 'HH:MM[:SS.mmm]' ของวันตัวอย่าง (เดินหน้าอย่างเดียว)
const at = (ctx, text) => { const r = setClockTo(ctx, text); assert.ok(r.ok, `ตั้งเวลา ${text} ไม่ได้: ${r.reason}`); };

test('FR-03 ข้อ 1: 07:00 มื้อมี 2 ยา → หน้าเดียวเห็นทั้งสองยา (ชื่อ เม็ด คำเตือน ข้อห้าม) มีปุ่ม กินแล้ว/ยังไม่กิน ไม่มีรูปยา', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:00');
  const v = await senior.view('senior-reminder');
  const t = textOf(v.body);
  assert.match(t, /มื้อ 07:00/);
  for (const s of ['ยาตัวอย่าง A', 'ยาตัวอย่าง B', 'คำเตือน: อาจทำให้ง่วงซึม', 'ข้อห้าม: ห้ามบดเม็ดยา']) assert.ok(t.includes(s), s);
  assert.match(v.body, /data-act="confirm"/);
  assert.match(v.body, /data-act="notyet"/);
  assert.doesNotMatch(v.body, /<img/);
  assert.match(v.covers, /FR-03/);
});

test('FR-03 ข้อ 1: เสียง — ยังไม่แตะหน้าจอ = มีกล่องให้เปิดเสียง · เปิดแล้วกล่องหาย', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:00');
  assert.match((await senior.view('senior-reminder')).overlay, /เปิดเสียงและดูยา/);
  await senior.act('unlock-sound');
  assert.equal((await senior.view('senior-reminder')).overlay, '');
});

test('FR-03 ข้อ 2: เตือนซ้ำรอบ 2 (T+5) และ 3 (T+10) แสดงรอบถูกต้อง', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:05');
  assert.match(textOf((await senior.view('senior-reminder')).body), /มื้อ 07:00[\s\S]*เตือนรอบที่ 2 จาก 3|เตือนรอบที่ 2 จาก 3[\s\S]*มื้อ 07:00/);
  at(ctx, '07:10');
  assert.match(textOf((await senior.view('senior-reminder')).body), /เตือนรอบที่ 3 จาก 3/);
});

test('FR-03 ข้อ 3: ยืนยันแล้ว → ไม่เตือนอีกในรอบถัดไป', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:00'); await senior.act('confirm', { meal: '2026-11-04_0700' });
  at(ctx, '07:05');
  const t = textOf((await senior.view('senior-reminder')).body);
  assert.doesNotMatch(t, /เตือนรอบที่ \d จาก 3[^|]*มื้อ 07:00/);
  assert.match(t, /ยืนยันแล้ววันนี้/);
});

test('FR-03 ข้อ 4: มื้อ 06:45 ยังไม่ยืนยัน + มื้อ 07:00 → หน้าเดียวแยกหัวข้อ/ปุ่มต่อมื้อ เรียงเวลา; ผู้ดูแลถูกแจ้งมื้อ 06:45 เมื่อเลย T+15 ตามไทม์ไลน์ของมื้อนั้น', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:00');
  const v = await senior.view('senior-reminder');
  assert.match(v.body, /aria-label="มื้อ 06:45"[\s\S]*aria-label="มื้อ 07:00"/);
  assert.equal((v.body.match(/data-act="confirm"/g) ?? []).length, 2, 'ปุ่มแยกต่อมื้อ');
  assert.match(textOf(v.body), /มี 2 มื้อพร้อมกัน/);
  await caregiver.load();
  assert.equal(caregiver.inbox.length, 0, 'ที่ 07:00:00.000 (ตรง T+15 ของ 06:45) ยังไม่แจ้ง — BR-21');
  at(ctx, '07:00:00.001');
  await caregiver.load();
  assert.deepEqual(caregiver.inbox.map((a) => a.reminderTime), ['06:45']);   // แจ้งเฉพาะมื้อ 06:45 ไม่แจ้งมื้อ 07:00
});

test('FR-03 ข้อ 5: เปิดหน้าตอน 07:07 → เห็นมื้อทันทีที่รอบปัจจุบัน ไม่เล่นรอบที่ผ่านไปแล้วซ้ำ', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:07');
  const t = textOf((await senior.view('senior-reminder')).body);
  assert.match(t, /มื้อ 07:00/);
  assert.deepEqual(t.match(/เตือนรอบที่ \d จาก 3/g), ['เตือนรอบที่ 2 จาก 3'], 'แสดงเฉพาะรอบปัจจุบัน (รอบ 2) ไม่ย้อนเล่นรอบ 1');
});

test('FR-04 ข้อ 1: กด "กินแล้ว" 07:03 → สถานะ กินแล้ว บันทึกเวลา 07:03 และเตือนหยุด', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:03');
  const toast = await senior.act('confirm', { meal: '2026-11-04_0700' });
  assert.match(toast, /บันทึกแล้ว 07:03/);
  const dose = (await ctx.repo.getDoses())['2026-11-04_0700'];
  assert.equal(dose.status, 'taken');
  const home = textOf((await senior.view('senior-home')).body);
  assert.match(home, /มื้อ 07:00 กินแล้ว 07:03/);
});

test('FR-04 ข้อ 2: กด "กินแล้ว" ซ้ำ → ไม่สร้างบันทึกซ้ำ เวลาเดิม', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:03'); await senior.act('confirm', { meal: '2026-11-04_0700' });
  at(ctx, '07:04');
  const toast = await senior.act('confirm', { meal: '2026-11-04_0700' });
  assert.match(toast, /ไม่สร้างซ้ำ — เวลาเดิม 07:03/);
  assert.equal(Object.keys(await ctx.repo.getDoses()).length, 1);
});

test('FR-04 ข้อ 3: กด "ยังไม่กิน" รอบแรก → จะเตือนอีกตอน 07:05 และยังไม่แจ้งผู้ดูแล', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:00');
  const toast = await senior.act('notyet', { meal: '2026-11-04_0700' });
  assert.match(toast, /จะเตือนอีกครั้งตอน 07:05/);
  assert.equal(await ctx.repo.getNotYet({ dateKey: '2026-11-04', reminderTime: '07:00' }), null);
  await caregiver.load();
  assert.equal(caregiver.inbox.filter((a) => a.reminderTime === '07:00').length, 0);
});

test('FR-04 ข้อ 4: กด "ยังไม่กิน" รอบสุดท้าย (07:10) → ผู้ดูแลถูกแจ้งทันที ไม่รอ 07:15', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  at(ctx, '07:10');
  const toast = await senior.act('notyet', { meal: '2026-11-04_0700' });
  assert.match(toast, /แจ้งผู้ดูแลแล้ว/);
  await caregiver.load();
  const alert = caregiver.inbox.find((a) => a.reminderTime === '07:00');
  assert.ok(alert, 'ต้องมีการแจ้งของมื้อ 07:00 ทันที');
  assert.equal(alert.kind, 'not_confirmed'); assert.equal(alert.reason, 'not_yet');
});

test('FR-04 ข้อ 5: ไม่ยืนยันถึง T+15 แล้วกด "กินแล้ว" 07:40 → "กินแล้ว (ยืนยันย้อนหลัง)" เวลา 07:40', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '07:40');
  const home = await senior.view('senior-home');
  assert.match(textOf(home.body), /ยังกดยืนยันย้อนหลังได้/);
  await senior.act('confirm', { meal: '2026-11-04_0700' });
  assert.match(textOf((await senior.view('senior-home')).body), /กินแล้ว \(ยืนยันย้อนหลัง\) 07:40/);
});

test('FR-04 ข้อ 6 + 10: ยืนยัน 07:00 ได้ถึงมื้อถัดไป 11:30:00.000 พอดี (ย้อนหลัง) · 11:30:00.001 กดไม่ได้ สถานะยัง "ยังไม่ยืนยัน"', async () => {
  const { ctx, senior } = await makePair('sample');
  at(ctx, '11:30:00.001');
  const toast = await senior.act('confirm', { meal: '2026-11-04_0700' });
  assert.match(toast, /พ้นเวลายืนยันแล้ว/);
  assert.equal(Object.keys(await ctx.repo.getDoses()).length, 0);
  assert.match(textOf((await senior.view('senior-home')).body), /พ้นเวลายืนยันแล้ว — สถานะยังเป็น "ยังไม่ยืนยัน"/);

  const edge = await makePair('sample');
  at(edge.ctx, '11:30:00.000');
  await edge.senior.act('confirm', { meal: '2026-11-04_0700' });
  assert.equal((await edge.ctx.repo.getDoses())['2026-11-04_0700'].status, 'taken_late');
});

test('FR-04 ข้อ 8: กดที่ T+15 พอดี (07:15:00.000) = "กินแล้ว" ไม่ใช่ย้อนหลัง · 07:15:00.001 = ย้อนหลัง', async () => {
  const a = await makePair('sample'); at(a.ctx, '07:15:00.000');
  await a.senior.act('confirm', { meal: '2026-11-04_0700' });
  assert.equal((await a.ctx.repo.getDoses())['2026-11-04_0700'].status, 'taken');
  const b = await makePair('sample'); at(b.ctx, '07:15:00.001');
  await b.senior.act('confirm', { meal: '2026-11-04_0700' });
  assert.equal((await b.ctx.repo.getDoses())['2026-11-04_0700'].status, 'taken_late');
});

test('FR-04 ข้อ 7 + 9: ออฟไลน์กด 06:59 → จอผู้สูงอายุเปลี่ยนทันที ผู้ดูแลยังไม่เห็น · ข้อมูลมาถึง 07:16 ได้ "กินแล้ว" เวลา 06:59 ตัดสินจากเวลาที่กด ส่งซ้ำก็ 1 รายการ', async () => {
  const { ctx, senior, caregiver } = await makePair('syncdelay');
  const toast = await senior.act('confirm', { meal: '2026-11-04_0645' });
  assert.match(toast, /จะส่งให้ผู้ดูแลเมื่อออนไลน์/);
  assert.match(textOf((await senior.view('senior-home')).body), /รอส่งให้ผู้ดูแล/);
  assert.equal(Object.keys(await ctx.repo.getDoses()).length, 0, 'ที่เก็บกลางยังไม่มี');
  at(ctx, '07:16');
  await senior.act('confirm', { meal: '2026-11-04_0645' });                    // กดซ้ำระหว่างออฟไลน์
  await setSeniorOnline(ctx, true);
  const doses = await ctx.repo.getDoses();
  assert.equal(Object.keys(doses).length, 1);
  const dose = doses['2026-11-04_0645'];
  assert.equal(dose.status, 'taken');                                           // ไม่ใช่ taken_late แม้ข้อมูลมาถึงหลัง T+15 (BR-20)
  assert.ok(dose.confirmedAt < dose.serverReceivedAt);
  assert.match(textOf((await caregiver.view('cg-status')).body), /มื้อ 06:45 กินแล้ว 06:59/);
});

test('FR-04: ทุกหน้ามีป้าย Covers และชื่อยาถูก escape', async () => {
  const { ctx, senior } = await makePair('sample');
  await ctx.repo.saveMedicine({ name: '<b>x</b>', slots: [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }] });
  at(ctx, '07:00');
  for (const name of ['senior-home', 'senior-reminder']) {
    const v = await senior.view(name);
    assert.match(v.covers, /FR-0[34]/);
    assert.doesNotMatch(v.body, /<b>x<\/b>/);
  }
});
