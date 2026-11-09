// FR-09 Site copy: เปลี่ยนเฉพาะภาษาแสดงผล ไม่เปลี่ยนหลักฐาน สิทธิ์ ความยินยอม หรือคำขอ AI
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage } from '../public/js/features/i18n.js';
import { bootWeeklySummary, exampleWeek } from '../public/js/features/weeklySummaryPage.js';
import { weeklySummaryView } from '../public/js/features/weeklySummary.js';
import { weeklyRequestData } from '../public/js/services/aiWeeklySummary.js';

const NOW = new Date('2026-11-08T10:00:00').getTime();
const changeLanguage = (language) => setLanguage(language, { persist: false });
const preview = (html) => JSON.parse(html.match(/<pre>([\s\S]*?)<\/pre>/)[1]
  .replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));

test('FR-09: Thai/English redraw preserves consent, dates, records, counts and exact AI request', async () => {
  changeLanguage('th');
  let html, connects = 0;
  const app = bootWeeklySummary({ clock: { now: () => NOW }, draw: (value) => { html = value; },
    connect: async () => { connects += 1; throw Error('demo must not connect'); } });
  try {
    assert.match(html, /สำหรับผู้ดูแล/);
    assert.match(html, /2569/);
    const summary = app.state.summary;
    const before = structuredClone(summary);
    const request = weeklyRequestData(summary);
    const thaiRequest = preview(html);
    await app.act('consent', true);
    changeLanguage('en');
    assert.match(html, /For caregivers/);
    assert.match(html, /1 Nov 2026/);
    assert.match(html, /7 Nov 2026/);
    assert.match(html, /aria-label="Data source"/);
    assert.equal(app.state.consent, true);
    assert.equal(app.state.summary, summary);
    assert.deepEqual(app.state.summary, before);
    assert.deepEqual(preview(html), request);
    assert.deepEqual(preview(html), thaiRequest);
    assert.deepEqual(request.candidates.map((item) => item.id), ['overview', 'late_1800']);
    assert.equal(Object.hasOwn(preview(html), 'language'), false);
    assert.equal(Object.hasOwn(preview(html), 'locale'), false);
    assert.equal(connects, 0);
  } finally { app.dispose(); changeLanguage('th'); }
});

test('FR-09: controlled summary changes language with identical IDs/counts and no new AI request', async () => {
  changeLanguage('th');
  let html;
  const app = bootWeeklySummary({ clock: { now: () => NOW }, draw: (value) => { html = value; } });
  try {
    await app.act('consent', true); await app.act('summarise'); await app.act('review');
    const result = structuredClone(app.state.result);
    const request = weeklyRequestData(app.state.summary);
    assert.match(html, /พบทั้งหมด 21 มื้อ/);
    changeLanguage('en');
    assert.match(html, /21 recorded confirmations: 17 on time and 4 late/);
    assert.match(html, /Reminders at 18:00 have 4 late confirmations out of 7 recorded confirmations/);
    assert.match(html, /Reviewed by you/);
    assert.equal(app.state.reviewed, true);
    assert.deepEqual(app.state.result, result);
    assert.deepEqual(weeklyRequestData(app.state.summary), request);
    changeLanguage('th');
    assert.match(html, /พบทั้งหมด 21 มื้อ/);
    assert.deepEqual(app.state.result.items.map((item) => item.id), ['overview', 'late_1800']);
  } finally { app.dispose(); changeLanguage('th'); }
});

test('FR-09: language switch during live AI wait keeps busy/data and does not repeat access or AI calls', async () => {
  changeLanguage('th');
  let html, finish;
  let calls = 0, checks = 0;
  const pending = new Promise((resolve) => { finish = resolve; });
  const app = bootWeeklySummary({ clock: { now: () => NOW }, draw: (value) => { html = value; }, connect: async () => ({}),
    makeHistory: () => ({ load: async () => ({ pairId: 'paired', summary: exampleWeek(NOW) }),
      checkAccess: async () => { checks += 1; }, watchAccess: () => () => {} }),
    makeAi: () => ({ summariseWeek: async () => { calls += 1; return pending; } }),
  });
  try {
    await app.act('live'); await app.act('consent', true);
    const work = app.act('summarise'); await Promise.resolve();
    const summary = app.state.summary;
    assert.equal(calls, 1); assert.equal(checks, 1); assert.equal(app.state.busy, true);
    changeLanguage('en');
    assert.match(html, /Creating a draft summary/);
    assert.match(html, /Working…/);
    assert.equal(app.state.busy, true); assert.equal(app.state.summary, summary);
    assert.equal(calls, 1); assert.equal(checks, 1);
    finish({ items: [{ id: 'overview', text: 'จากบันทึกยืนยันในช่วง 7 วัน พบทั้งหมด 21 มื้อ: ยืนยันทันเวลา 17 มื้อ และยืนยันช้า 4 มื้อ' }] });
    await work;
    assert.equal(calls, 1); assert.equal(checks, 2); assert.equal(app.state.busy, false);
    assert.match(html, /21 recorded confirmations: 17 on time and 4 late/);
  } finally { app.dispose(); changeLanguage('th'); }
});

test('FR-09: stored access error and empty-data states translate without retrying or changing access', async () => {
  changeLanguage('th');
  let html, loads = 0, draws = 0;
  const app = bootWeeklySummary({ clock: { now: () => NOW }, draw: (value) => { html = value; draws += 1; }, connect: async () => ({}),
    makeHistory: () => ({ load: async () => { loads += 1; throw { code: 'not_caregiver' }; } }), makeAi: () => ({}) });
  try {
    await app.act('live');
    const error = app.state.error;
    assert.match(html, /เปิดจากเครื่องผู้ดูแลที่จับคู่ไว้ก่อน/);
    changeLanguage('en');
    assert.match(html, /Open this page on the paired caregiver device/);
    assert.match(html, /History not loaded/);
    assert.equal(app.state.summary, null); assert.equal(app.state.error, error); assert.equal(loads, 1);
    await app.act('empty');
    assert.match(html, /No confirmation records/);
    assert.match(html, /Empty-data example/);
    assert.equal(app.state.summary.hasData, false);
    app.dispose(); const count = draws;
    changeLanguage('th'); assert.equal(draws, count, 'disposed pages must stop observing language');
  } finally { app.dispose(); changeLanguage('th'); }
});

test('FR-09: language change does not translate arbitrary text or expose it as HTML', () => {
  changeLanguage('en');
  try {
    const input = '<img src=x onerror=alert(1)> ข้อความของผู้ใช้';
    const html = weeklySummaryView({ mode: 'demo', summary: exampleWeek(NOW, true), consent: false,
      result: { items: [{ id: 'unknown', text: input }] }, error: input, notice: input });
    assert.match(html, /ข้อความของผู้ใช้/);
    assert.match(html, /&lt;img src=x/);
    assert.ok(!html.includes('<img src=x'));
  } finally { changeLanguage('th'); }
});
