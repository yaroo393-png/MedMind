// C-10: consent, Demo ไม่ส่งข้อมูล, สิทธิ์ถูกถอนระหว่าง AI และ escape หน้าจอ
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootWeeklySummary, exampleWeek } from '../public/js/features/weeklySummaryPage.js';
import { weeklySummaryView } from '../public/js/features/weeklySummary.js';
import { weeklyRequestData, createAiWeeklySummary } from '../public/js/services/aiWeeklySummary.js';

const NOW = new Date('2026-11-08T10:00:00').getTime();
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

test('FR-09 Demo: เริ่มไม่เชื่อม Firebase; ต้องติ๊กก่อนสรุป; ตัวอย่าง/ไม่มีข้อมูลไม่เรียก AI จริง', async () => {
  let connections = 0;
  let html;
  const app = bootWeeklySummary({ draw: (view) => { html = view; }, clock: { now: () => NOW }, connect: async () => { connections++; throw Error('must not connect'); } });
  assert.equal(app.state.summary.totals.confirmed, 21);
  assert.ok(html.includes('โหมดสาธิต'));
  await app.act('summarise'); assert.equal(app.state.result, null);
  await app.act('consent', true); await app.act('summarise');
  assert.ok(app.state.result.items.length > 0);
  assert.equal(app.state.reviewed, false);
  await app.act('review'); assert.equal(app.state.reviewed, true);
  await app.act('empty'); assert.equal(app.state.summary.hasData, false);
  await app.act('consent', true); await app.act('summarise');
  assert.equal(app.state.consent, false); assert.equal(app.state.result, null); assert.equal(connections, 0);
  app.dispose();
});

function liveFixture() {
  let revoked;
  let reads = 0, requests = 0;
  const aiDone = deferred();
  const app = bootWeeklySummary({ clock: { now: () => NOW }, connect: async () => ({}),
    makeHistory: () => ({
      async load() { reads++; return { pairId: 'paired', summary: exampleWeek(NOW) }; },
      async checkAccess() {},
      watchAccess(_id, fn) { revoked = fn; return () => {}; },
    }),
    makeAi: () => ({ async summariseWeek() { requests++; return aiDone.promise; } }),
  });
  return { app, aiDone, revoke: () => revoked(), reads: () => reads, requests: () => requests };
}

test('FR-09 Live: โหลดอย่างเดียวไม่ส่ง AI; ถอนสิทธิ์ระหว่างรอ → ล้างตารางและไม่แสดงคำตอบที่มาช้า', async () => {
  const f = liveFixture();
  await f.app.act('live'); assert.equal(f.reads(), 1); assert.equal(f.requests(), 0);
  await f.app.act('consent', true);
  const pending = f.app.act('summarise');
  await Promise.resolve(); assert.equal(f.requests(), 1);
  f.revoke(); assert.equal(f.app.state.summary, null);
  f.aiDone.resolve({ items: [{ id: 'overview', text: 'old result' }] });
  await pending; assert.equal(f.app.state.result, null); assert.equal(f.app.state.busy, false);
  f.app.dispose();
});

test('เปลี่ยนกลับ Demo ระหว่างรอข้อมูลจริง → ผลเก่าต้องไม่ทับตัวอย่าง', async () => {
  const wait = deferred();
  const app = bootWeeklySummary({ clock: { now: () => NOW }, connect: async () => ({}),
    makeHistory: () => ({ load: () => wait.promise }), makeAi: () => ({}) });
  const pending = app.act('live'); await Promise.resolve(); await Promise.resolve();
  await app.act('demo');
  wait.resolve({ pairId: 'old', summary: exampleWeek(NOW, true) }); await pending;
  assert.equal(app.state.mode, 'demo'); assert.equal(app.state.summary.hasData, true); app.dispose();
});

test('ช่วงวันเปลี่ยน → ต้องโหลดใหม่และตรวจข้อมูลก่อนส่ง ไม่ใช้ความยินยอมของสัปดาห์เก่า', async () => {
  let now = NOW;
  const app = bootWeeklySummary({ clock: { now: () => now } });
  await app.act('consent', true); now += 24 * 3600 * 1000;
  await app.act('summarise');
  assert.equal(app.state.result, null); assert.equal(app.state.consent, false);
  assert.equal(app.state.summary.dates.at(-1), '2026-11-08'); app.dispose();
});

test('C-10: วันว่างคงเป็นไม่มีบันทึก; ข้อความผล/ข้อผิดพลาด escape ป้องกัน HTML แทรก', () => {
  const html = weeklySummaryView({ mode: 'demo', summary: exampleWeek(NOW, true), consent: false,
    result: { items: [{ text: '<img src=x onerror=alert(1)>' }] }, error: '<script>oops</script>', notice: '<b>fake</b>' });
  assert.ok(html.includes('ไม่มีบันทึกยืนยัน'));
  assert.ok(html.includes('&lt;img')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img src=x')); assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/<th scope="row">/g) ?? []).length, 7);
});

test('AI ตอบข้ามเที่ยงคืน → ทิ้งผลเก่าและโหลดช่วงวันใหม่โดยไม่ถือความยินยอมเก่า', async () => {
  let now = new Date('2026-11-08T23:59:59').getTime();
  const done = deferred();
  const app = bootWeeklySummary({ clock: { now: () => now }, connect: async () => ({}),
    makeHistory: () => ({ async load({ now: loadedAt }) { return { pairId: 'test', summary: exampleWeek(loadedAt) }; },
      async checkAccess() {}, watchAccess() { return () => {}; } }),
    makeAi: () => ({ summariseWeek: () => done.promise }),
  });
  await app.act('live'); await app.act('consent', true);
  const pending = app.act('summarise'); await Promise.resolve();
  now += 2000; done.resolve({ items: [{ text: 'old' }] }); await pending;
  assert.equal(app.state.result, null); assert.equal(app.state.consent, false);
  assert.equal(app.state.summary.dates.at(-1), '2026-11-08'); assert.equal(app.state.busy, false); app.dispose();
});

test('preview แสดงข้อมูลและ candidate ตรงกับ request ที่ส่งจริง ไม่มีช่องส่วนตัวแฝง', async () => {
  const summary = exampleWeek(NOW);
  summary.patient = 'DO NOT SEND'; summary.days[0].hn = 'DO NOT SEND';
  const expected = weeklyRequestData(summary);
  let sent;
  const service = createAiWeeklySummary({ models: ['test'], getModel: async () => ({ generateContent: async (parts) => {
    sent = JSON.parse(parts[1]); return { response: { text: () => '{"selectedIds":["overview"]}' } };
  } }) });
  await service.summariseWeek(summary);
  assert.deepEqual(sent, expected);
  const html = weeklySummaryView({ mode: 'demo', summary, consent: false });
  const preview = html.match(/<pre>([\s\S]*?)<\/pre>/)[1]
    .replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.deepEqual(JSON.parse(preview), sent);
  assert.ok(!preview.includes('DO NOT SEND'));
});
