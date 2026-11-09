// FR-09 ในหน้าผู้ดูแล: controller/facts ของ Demo ไม่ดึง Firebase หรือบริการอ่านฉลาก
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bootWeeklySummaryController, exampleWeek, localDateKey } from '../public/js/features/weeklySummaryController.js';
import { bootWeeklySummary, exampleWeek as wrapperExample, localDateKey as wrapperDateKey } from '../public/js/features/weeklySummaryPage.js';
import { buildWeeklySummary, toWeeklyAiPayload } from '../public/js/logic/weeklySummary.js';
import { cleanPayload, summaryChoices, weeklyRequestData, demoWeeklySummary } from '../public/js/services/weeklySummaryFacts.js';
import { createAiWeeklySummary, summaryChoices as serviceChoices, weeklyRequestData as serviceRequest } from '../public/js/services/aiWeeklySummary.js';
import { AiUnavailableError } from '../public/js/services/aiLabel.js';

const NOW = new Date('2026-11-08T10:00:00').getTime();
const clock = { now: () => NOW };
const defer = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const recordedWeek = () => {
  const scheduledTime = new Date('2026-11-07T08:00:00').getTime();
  return buildWeeklySummary({ anchorDateKey: '2026-11-08', now: NOW,
    doses: { '2026-11-07_0800': { scheduledTime, confirmedAt: scheduledTime + 2 * 60000, status: 'taken' } } });
};

test('FR-09: pure controller/view/facts import graph excludes Firebase, AI backend and label service', () => {
  const seen = new Set();
  const walk = (url) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const source = readFileSync(url, 'utf8');
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) walk(new URL(match[1], url));
  };
  walk(new URL('../public/js/features/weeklySummaryController.js', import.meta.url));
  assert.ok([...seen].some((file) => file.endsWith('/weeklySummaryFacts.js')));
  assert.ok([...seen].some((file) => file.endsWith('/weeklySummary.js')));
  for (const file of seen) assert.doesNotMatch(file, /\/(?:firebase|firestoreRepo|aiLabel|aiWeeklySummary|weeklySummaryPage)\.js$/, file);
});

test('FR-09: live initialization never flashes 21 demo records; ready loads history without creating AI', async () => {
  const pending = defer(), backend = { uid: 'existing-caregiver' }, draws = [];
  let connects = 0, histories = 0, loads = 0, aiFactories = 0;
  const app = bootWeeklySummaryController({ clock, initialMode: 'live', viewOptions: { embedded: true },
    configuredModelName: 'configured-model', draw: (html) => draws.push(html),
    connect: () => { connects += 1; return pending.promise; },
    makeHistory: (fb) => { assert.equal(fb, backend); histories += 1; return {
      load: async () => { loads += 1; return { pairId: 'existing-pair', summary: recordedWeek() }; },
      watchAccess: () => () => {}, checkAccess: async () => {},
    }; },
    makeAi: () => { aiFactories += 1; return {}; },
  });
  try {
    assert.equal(app.state.mode, 'live'); assert.equal(app.state.summary, null); assert.equal(app.state.busy, true);
    assert.equal(app.state.result, null); assert.equal(app.state.aiModel, null);
    assert.ok(draws.length > 0); assert.ok(draws.every((html) => !html.includes('<strong>21</strong>')));
    await app.act('consent', true); assert.equal(app.state.consent, false, 'loading does not accept stale consent');
    pending.resolve(backend); await app.ready;
    assert.equal(connects, 1); assert.equal(histories, 1); assert.equal(loads, 1); assert.equal(aiFactories, 0);
    assert.equal(app.state.summary.totals.confirmed, 1); assert.equal(app.state.busy, false);
    assert.equal(app.state.configuredModelName, 'configured-model');
  } finally { app.dispose(); }
});

test('FR-09: reused backend connects once; AI needs consent and actual successful requested model is distinct from configured', async () => {
  const backend = { uid: 'existing-caregiver' };
  let connects = 0, loads = 0, checks = 0, aiFactories = 0, requests = 0;
  const app = bootWeeklySummaryController({ clock, initialMode: 'live', configuredModelName: 'configured-first',
    connect: async () => { connects += 1; return backend; },
    makeHistory: (fb) => { assert.equal(fb, backend); return {
      load: async () => { loads += 1; return { pairId: 'existing-pair', summary: recordedWeek() }; },
      watchAccess: () => () => {}, checkAccess: async (id) => { assert.equal(id, 'existing-pair'); checks += 1; },
    }; },
    makeAi: (fb) => { assert.equal(fb, backend); aiFactories += 1; return {
      get lastModel() { return 'successful-fallback-name'; },
      summariseWeek: async (summary) => { requests += 1; return demoWeeklySummary(summary); },
    }; },
  });
  try {
    await app.ready; await app.act('summarise');
    assert.equal(aiFactories, 0); assert.equal(requests, 0); assert.equal(app.state.aiModel, null);
    await app.act('consent', true); await app.act('summarise');
    assert.equal(aiFactories, 1); assert.equal(requests, 1); assert.equal(checks, 2);
    assert.equal(app.state.aiModel, 'successful-fallback-name'); assert.equal(app.state.configuredModelName, 'configured-first');
    await app.act('refresh');
    assert.equal(connects, 1); assert.equal(loads, 2); assert.equal(requests, 1);
    assert.equal(app.state.result, null); assert.equal(app.state.aiModel, null); assert.equal(app.state.consent, false);
    await app.act('summarise'); assert.equal(requests, 1, 'refresh cannot reuse consent');
    await app.act('demo'); assert.equal(app.state.mode, 'demo'); assert.equal(app.state.aiModel, null);
    await app.act('consent', true); await app.act('summarise');
    assert.deepEqual(Object.keys(app.state.result), ['items', 'text']);
    assert.equal(app.state.aiModel, null); assert.equal(requests, 1, 'Demo must not call the real service');
  } finally { app.dispose(); }
});

test('FR-09: live empty history and access failure never initialize AI or show sample history', async () => {
  for (const unavailable of [false, true]) {
    let madeAi = 0;
    const app = bootWeeklySummaryController({ clock, initialMode: 'live', connect: async () => ({}),
      makeHistory: () => ({ load: async () => {
        if (unavailable) throw { code: 'not_caregiver' };
        return { pairId: 'empty-pair', summary: exampleWeek(NOW, true) };
      }, watchAccess: () => () => {} }), makeAi: () => { madeAi += 1; return {}; },
    });
    try {
      await app.ready; await app.act('consent', true); await app.act('summarise');
      assert.equal(madeAi, 0); assert.equal(app.state.result, null); assert.equal(app.state.consent, false);
      assert.equal(app.state.aiModel, null); assert.equal(app.state.summary?.hasData ?? false, false);
      assert.equal(app.state.mode, 'live');
    } finally { app.dispose(); }
  }
});

test('FR-09: switching to Demo discards a late live result and model without further access calls', async () => {
  const answer = defer(); let checks = 0;
  const app = bootWeeklySummaryController({ clock, initialMode: 'live', connect: async () => ({}),
    makeHistory: () => ({ load: async () => ({ pairId: 'old-pair', summary: recordedWeek() }),
      checkAccess: async () => { checks += 1; }, watchAccess: () => () => {} }),
    makeAi: () => ({ lastModel: 'old-live-model', summariseWeek: () => answer.promise }),
  });
  try {
    await app.ready; await app.act('consent', true);
    const pending = app.act('summarise'); await Promise.resolve();
    assert.equal(checks, 1); await app.act('demo');
    answer.resolve(demoWeeklySummary(recordedWeek())); await pending;
    assert.equal(app.state.mode, 'demo'); assert.equal(app.state.result, null); assert.equal(app.state.aiModel, null);
    assert.equal(checks, 1, 'stale result does not check a null or different pair');
  } finally { app.dispose(); }
});

test('FR-09: pure facts preserve exact service payload/IDs and controlled Demo result; service errors retain old type', () => {
  const summary = exampleWeek(NOW);
  summary.patient = 'PRIVATE'; summary.days[0].records[0].medicine = 'PRIVATE';
  const before = structuredClone(summary);
  assert.deepEqual(weeklyRequestData(summary), serviceRequest(summary));
  assert.deepEqual(summaryChoices(toWeeklyAiPayload(summary)), serviceChoices(toWeeklyAiPayload(summary)));
  assert.deepEqual(demoWeeklySummary(summary).items.map((item) => item.id), ['overview', 'late_1800']);
  assert.doesNotMatch(JSON.stringify(weeklyRequestData(summary)), /PRIVATE|2026-11|patient|medicine/);
  assert.deepEqual(summary, before);
  assert.throws(() => cleanPayload({ days: [] }), (error) => error instanceof TypeError && error.code === 'invalid_data');
  assert.throws(() => serviceChoices({ days: [] }), (error) => error instanceof AiUnavailableError && error.code === 'invalid_data');
  assert.equal(wrapperExample, exampleWeek); assert.equal(wrapperDateKey, localDateKey);
  const app = bootWeeklySummary({ clock }); app.dispose();
  assert.throws(() => bootWeeklySummaryController({ initialMode: 'invalid' }), TypeError);
});

test('FR-09: service.lastModel reports only the requested name of a validated success, including fallback', async () => {
  let calls = 0;
  const service = createAiWeeklySummary({ models: ['retired-name', 'successful-name'], getModel: async (name) => ({
    generateContent: async () => {
      calls += 1;
      if (name === 'retired-name') throw Object.assign(new Error('404 Not Found'), { status: 404 });
      return { response: { text: () => '{"selectedIds":["overview"]}' } };
    },
  }) });
  assert.equal(service.lastModel, null);
  await service.summariseWeek(recordedWeek());
  assert.equal(calls, 2); assert.equal(service.lastModel, 'successful-name');
  const invalid = createAiWeeklySummary({ models: ['invalid-response-name'], getModel: async () => ({ generateContent: async () => ({ response: { text: () => 'untrusted free text' } }) }) });
  await assert.rejects(invalid.summariseWeek(recordedWeek()), (error) => error.code === 'invalid_response');
  assert.equal(invalid.lastModel, null);
});
