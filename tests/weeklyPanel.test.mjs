// Phone integration for the caregiver-only weekly panel. All records stay in local memory.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Phone } from '../public/js/features/phone.js';
import { createDemoContext } from '../public/js/features/demoControls.js';
import { bootWeeklySummaryController } from '../public/js/features/weeklySummaryController.js';
import { setLanguage } from '../public/js/features/i18n.js';

const choose = (lang) => setLanguage(lang, { persist: false });
beforeEach(() => choose('th'));
afterEach(() => choose('th'));

async function phoneFor(t, { role = 'caregiver', preset = 'sample', route = 'cg-weekly' } = {}) {
  const ctx = await createDemoContext(preset);
  let refreshes = 0;
  ctx.refresh = () => { refreshes += 1; };
  const phone = Object.assign(Object.create(Phone.prototype), {
    role, ctx, route, pref: { size: 'normal', theme: 'light' }, sound: false,
    seq: 0, hadOverlay: false, lastRoute: null, inbox: [], ringKeys: new Set(), wasOpen: false,
  });
  phone.resetUi();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: null } });
  t.after(() => {
    phone.disposeWeekly();
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  const screen = { scrollTop: 0 }, contained = new Set();
  phone.view = {
    innerHTML: '', contains: (node) => contained.has(node),
    querySelector: (selector) => selector === '.screen' ? screen : null,
  };
  phone.el = { setAttribute() {} }; phone.live = { innerHTML: '' };
  return { phone, ctx, contained, refreshes: () => refreshes };
}

function spyFactory(ctx) {
  const pages = [];
  ctx.createWeeklySummary = ({ draw }) => {
    const page = { draw, actions: [], disposed: 0,
      act(...args) { this.actions.push(args); },
      dispose() { this.disposed += 1; },
    };
    pages.push(page);
    draw(`<section data-panel="${pages.length}">Weekly panel ${pages.length}</section>`);
    return page;
  };
  return pages;
}

function button(html, attribute, value) {
  const tag = [...html.matchAll(/<button\b[^>]*>/g)].map(([tag]) => tag).find((tag) => tag.includes(`data-${attribute}="${value}"`));
  assert.ok(tag, `Rendered button data-${attribute}="${value}" must exist`);
  return {
    dataset: Object.fromEntries([...tag.matchAll(/data-([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]])),
    disabled: /\sdisabled(?:[\s>]|=)/.test(tag),
  };
}
function click(phone, node) {
  phone.onClick({ target: { closest: (selector) => selector === 'button[data-action]' ? (node.dataset.action ? node : null) : selector === '[data-act]' ? (node.dataset.act ? node : null) : null } });
}
const stored = async (ctx) => ({
  pairing: await ctx.repo.getPairing(), medicines: await ctx.repo.listMedicines(),
  mealTimes: await ctx.repo.getMealTimes(), doses: await ctx.repo.getDoses(),
});

test('caregiver can enter the Summary tab in TH and EN; the older adult has no Summary tab', async (t) => {
  const { phone, ctx, contained } = await phoneFor(t, { route: 'cg-status' });
  const pages = spyFactory(ctx);
  for (const [lang, label] of [['th', 'สรุป'], ['en', 'Summary']]) {
    choose(lang);
    phone.go('cg-status');
    await phone.render();
    assert.match(phone.view.innerHTML, new RegExp(`data-to="cg-weekly"[^>]*aria-label="${label}"`));
    const tab = button(phone.view.innerHTML, 'to', 'cg-weekly');
    contained.add(tab);
    click(phone, tab); // Use the same navigation dispatch as a real tab press.
    assert.equal(phone.route, 'cg-weekly');
    await phone.render();
    assert.match(phone.view.innerHTML, /data-panel=/);
    assert.match(phone.view.innerHTML, lang === 'en' ? /Weekly summary/ : /สรุปรายสัปดาห์/);
  }
  assert.equal(pages.length, 2, 'leaving then returning opens one new panel per visit');
  phone.disposeWeekly();
  phone.role = 'senior'; phone.go('senior-home');
  for (const lang of ['th', 'en']) {
    choose(lang); await phone.render();
    assert.doesNotMatch(phone.view.innerHTML, /data-to="cg-weekly"/);
  }
});

test('repeated rendering/ensure reuses one weekly instance and synchronous first draw does not schedule a render loop', async (t) => {
  const { phone, ctx, refreshes } = await phoneFor(t);
  const pages = spyFactory(ctx);
  await phone.render();
  const page = phone.weeklyPage;
  assert.equal(refreshes(), 0);
  for (let i = 0; i < 3; i += 1) { phone.ensureWeekly(); await phone.render(); }
  assert.equal(pages.length, 1); assert.equal(phone.weeklyPage, page);
  page.draw('<section>Loaded confirmation records</section>');
  assert.equal(refreshes(), 1);
  await phone.render();
  assert.match(phone.view.innerHTML, /Loaded confirmation records/);
  assert.equal(pages.length, 1);
});

test('leaving the route disposes once and an old draw cannot replace a newly opened weekly panel', async (t) => {
  const { phone, ctx, refreshes } = await phoneFor(t);
  const pages = spyFactory(ctx);
  await phone.render(); const old = pages[0];
  phone.go('cg-status'); await phone.render(); phone.go('cg-status');
  assert.equal(old.disposed, 1); assert.equal(phone.weeklyPage, null); assert.equal(phone.weeklyHtml, null);
  const refreshBefore = refreshes();
  old.draw('<section>Stale private result</section>');
  assert.equal(phone.weeklyHtml, null); assert.equal(refreshes(), refreshBefore);
  phone.go('cg-weekly'); await phone.render();
  assert.equal(pages.length, 2); assert.equal(phone.weeklyPage, pages[1]);
  old.draw('<section>Late result from the previous visit</section>');
  await phone.render();
  assert.match(phone.view.innerHTML, /Weekly panel 2/);
  assert.doesNotMatch(phone.view.innerHTML, /Stale private|Late result/);
  assert.equal(old.disposed, 1); assert.equal(refreshes(), refreshBefore);
});

test('binding a new context disposes the previous weekly panel and ignores its late callback', async (t) => {
  const { phone, ctx, refreshes } = await phoneFor(t);
  const pages = spyFactory(ctx); await phone.render(); const old = pages[0];
  const next = await createDemoContext('sample');
  let nextRefreshes = 0; next.refresh = () => { nextRefreshes += 1; };
  const nextPages = spyFactory(next);
  phone.bind(next, 'cg-weekly');
  assert.equal(old.disposed, 1); assert.equal(phone.weeklyHtml, null);
  await phone.render();
  old.draw('<section>Result for the previous context</section>');
  assert.equal(phone.weeklyPage, nextPages[0]); assert.equal(nextPages.length, 1);
  assert.doesNotMatch(phone.weeklyHtml, /previous context/);
  assert.equal(refreshes(), 0); assert.equal(nextRefreshes, 0);
  phone.bind(next, 'cg-status'); phone.bind(next, 'cg-status');
  assert.equal(old.disposed, 1); assert.equal(nextPages[0].disposed, 1);
});

test('weekly button and consent events reach only the active panel; disabled/outside buttons are ignored', async (t) => {
  const { phone, ctx, contained } = await phoneFor(t);
  const pages = spyFactory(ctx); await phone.render(); const page = pages[0];
  const submit = { dataset: { action: 'summarise' }, disabled: false };
  contained.add(submit); click(phone, submit);
  phone.onChange({ target: { dataset: { action: 'consent' }, checked: true } });
  phone.onChange({ target: { dataset: { action: 'consent' }, checked: false } });
  assert.deepEqual(page.actions, [['summarise'], ['consent', true], ['consent', false]]);
  submit.disabled = true; click(phone, submit);
  click(phone, { dataset: { action: 'refresh' }, disabled: false });
  assert.equal(page.actions.length, 3);
  phone.go('cg-status');
  submit.disabled = false; click(phone, submit);
  phone.onChange({ target: { dataset: { action: 'consent' }, checked: true } });
  assert.equal(page.actions.length, 3);
  phone.go('cg-weekly'); await phone.render(); click(phone, submit);
  assert.deepEqual(pages[1].actions, [['summarise']]);
  assert.equal(page.actions.length, 3, 'the disposed instance must not receive new events');
});

test('render blocks weekly initialization for older adults and unpaired caregivers before any factory call', async (t) => {
  const { phone, ctx } = await phoneFor(t);
  const cases = [
    ['senior', 'sample', 'senior-home'], ['senior', 'fresh', 'senior-pair'], ['caregiver', 'fresh', 'cg-pair'],
  ];
  for (const [role, preset, expected] of cases) {
    const context = preset === 'sample' ? ctx : await createDemoContext(preset);
    const pages = spyFactory(context);
    phone.role = role; phone.bind(context, 'cg-weekly'); await phone.render();
    assert.equal(phone.route, expected); assert.equal(pages.length, 0);
    assert.equal(phone.weeklyPage, null); assert.doesNotMatch(phone.view.innerHTML, /data-panel=/);
  }
});

test('actual Demo controller keeps consent/result across Phone rerenders and language switches without repo writes or network', async (t) => {
  const { phone, ctx, contained } = await phoneFor(t);
  const before = await stored(ctx); let factories = 0, networkCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => { networkCalls += 1; throw new Error('Demo must not use the network'); };
  t.after(() => { globalThis.fetch = previousFetch; });
  ctx.createWeeklySummary = ({ draw }) => {
    factories += 1;
    return bootWeeklySummaryController({ draw, clock: ctx.clock, initialMode: 'demo',
      viewOptions: { embedded: true, allowLive: false },
      connect: () => { throw new Error('Demo must not initialize Firebase'); },
      makeAi: () => { throw new Error('Demo must not initialize AI'); },
    });
  };
  await phone.render(); await phone.weeklyPage.ready;
  assert.equal(phone.weeklyPage.state.summary.totals.confirmed, 21);
  assert.doesNotMatch(phone.view.innerHTML, /data-action="live"/);
  phone.onChange({ target: { dataset: { action: 'consent' }, checked: true } });
  choose('en'); await phone.render();
  assert.equal(phone.weeklyPage.state.consent, true);
  const submit = button(phone.view.innerHTML, 'action', 'summarise');
  assert.equal(submit.disabled, false); contained.add(submit); click(phone, submit);
  assert.ok(phone.weeklyPage.state.result?.items.length);
  const result = structuredClone(phone.weeklyPage.state.result);
  for (const lang of ['th', 'en', 'th']) {
    choose(lang); await phone.render(); phone.ensureWeekly();
    assert.deepEqual(phone.weeklyPage.state.result, result);
    assert.match(phone.view.innerHTML, lang === 'en' ? /Sample summary/ : /ผลสรุปจำลอง/);
  }
  assert.equal(factories, 1); assert.equal(networkCalls, 0);
  assert.deepEqual(await stored(ctx), before);
});
