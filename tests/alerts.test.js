// features/alerts.js — กล่องแจ้งเตือนผู้ดูแล: เรียก alertFor แล้วจด "เห็นแล้ว" ผ่าน repo (FR-05 · BR-13, BR-18)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCtx } from './helpers/harness.js';
import { loadSnapshot } from '../public/js/features/model.js';
import { collectAlerts, dismissAlert, visibleAlerts, openNotConfirmedCount } from '../public/js/features/alerts.js';
import { setClockTo } from '../public/js/features/demoControls.js';

const snap = (ctx) => loadSnapshot({ repo: ctx.repo, clock: ctx.clock, dateKey: ctx.dateKey });
const meal = { dateKey: '2026-11-04', reminderTime: '07:00' };

test('เลย T+15: เพิ่มการแจ้ง "ไม่ยืนยัน" ของมื้อนั้นครั้งเดียว — รอบถัดไปไม่เพิ่มซ้ำ (BR-13)', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:15:00.001');
  let inbox = await collectAlerts({ repo: ctx.repo, snapshot: await snap(ctx), inbox: [] });
  const mine = inbox.filter((a) => a.reminderTime === '07:00');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].kind, 'not_confirmed');
  assert.equal(mine[0].reason, 'deadline');
  inbox = await collectAlerts({ repo: ctx.repo, snapshot: await snap(ctx), inbox });
  assert.equal(inbox.filter((a) => a.reminderTime === '07:00').length, 1);
  assert.deepEqual(await ctx.repo.getSeen('2026-11-04_0700'), ['not_confirmed']);
});

test('ตรง T+15 พอดียังไม่แจ้ง (BR-21)', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:15:00.000');
  const inbox = await collectAlerts({ repo: ctx.repo, snapshot: await snap(ctx), inbox: [] });
  assert.equal(inbox.filter((a) => a.reminderTime === '07:00').length, 0);
});

test('ไม่แก้กล่องเดิม (คืนกล่องใหม่) และ dismiss ซ่อนรายการ', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:16');
  const before = [];
  const after = await collectAlerts({ repo: ctx.repo, snapshot: await snap(ctx), inbox: before });
  assert.equal(before.length, 0);
  assert.ok(after.length >= 1);
  assert.equal(dismissAlert(after, after[0].key).length, after.length - 1);
});

test('ยืนยันหลังแจ้ง: "ยังไม่ยืนยัน" ของมื้อนั้นถูกซ่อน (visibleAlerts) และเพิ่ม "ยืนยันแล้ว เวลา …" (BR-13)', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:16');
  let inbox = await collectAlerts({ repo: ctx.repo, snapshot: await snap(ctx), inbox: [] });
  setClockTo(ctx, '07:40');
  await ctx.repo.confirmMeal({ meal, confirmedAt: ctx.clock.now() });
  const s = await snap(ctx);
  inbox = await collectAlerts({ repo: ctx.repo, snapshot: s, inbox });
  const shown = visibleAlerts(inbox, s);
  assert.ok(shown.some((a) => a.kind === 'confirmed_late' && a.reminderTime === '07:00'));
  assert.equal(shown.some((a) => a.kind === 'not_confirmed' && a.reminderTime === '07:00'), false);
  assert.equal(openNotConfirmedCount(inbox, s), shown.filter((a) => a.kind === 'not_confirmed').length);
});

test('ยืนยันทันเวลาและไม่เคยแจ้ง → ไม่มีการแจ้งเลย', async () => {
  const ctx = await makeCtx('sample');
  setClockTo(ctx, '07:03');
  await ctx.repo.confirmMeal({ meal, confirmedAt: ctx.clock.now() });
  setClockTo(ctx, '07:30');
  const inbox = await collectAlerts({ repo: ctx.repo, snapshot: await snap(ctx), inbox: [] });
  assert.equal(inbox.filter((a) => a.reminderTime === '07:00').length, 0);
});
