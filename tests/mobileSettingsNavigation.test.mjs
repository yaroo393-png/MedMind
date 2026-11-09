// Mobile Settings/role navigation using the shipped Phone and an in-memory repo, never Firebase.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Phone } from '../public/js/features/phone.js';
import { createDemoContext } from '../public/js/features/demoControls.js';
import { setLanguage } from '../public/js/features/i18n.js';

const choose = (lang) => setLanguage(lang, { persist: false });
beforeEach(() => choose('th'));
afterEach(() => choose('th'));
const routes = (role) => role === 'senior'
  ? { home: 'senior-home', settings: 'senior-settings', pair: 'senior-pair' }
  : { home: 'cg-status', settings: 'cg-settings', pair: 'cg-pair' };
const stored = async (repo) => ({
  pairing: await repo.getPairing(), medicines: await repo.listMedicines(),
  mealTimes: await repo.getMealTimes(), doses: await repo.getDoses(),
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

async function setup(t, role, preset = 'sample') {
  const ctx = await createDemoContext(preset);
  // Exercise real-page presentation while keeping the actual repo local and network-free.
  ctx.name = 'real';
  ctx.seniorRepo = ctx.repo; // The live shell uses one repo for both role views (no Demo offline queue wrapper).
  const r = routes(role), events = [];
  ctx.refresh = () => { events.push('refresh'); };
  if (preset === 'sample') await ctx.repo.confirmMeal({
    meal: { dateKey: '2026-11-03', reminderTime: '08:00' },
    confirmedAt: new Date('2026-11-03T08:05:00').getTime(),
  });
  const phone = Object.assign(Object.create(Phone.prototype), {
    role, ctx, route: r.home, pref: { size: 'normal', theme: 'light' }, sound: false,
    seq: 0, hadOverlay: false, lastRoute: null, inbox: [], ringKeys: new Set(), wasOpen: false,
  });
  phone.resetUi();
  // Avoid timer/toast DOM machinery while retaining the actual action ordering.
  phone.toast = () => { events.push('toast'); };
  ctx.onUnpaired = () => { events.push('unpaired'); phone.bind(ctx, r.pair); };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: null } });
  t.after(() => {
    phone.disposeWeekly(); phone.cancelLater();
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  const screen = { scrollTop: 0 };
  phone.view = { innerHTML: '', contains: () => false, querySelector: (selector) => selector === '.screen' ? screen : null };
  phone.el = { setAttribute() {} }; phone.live = { innerHTML: '' };
  return { phone, ctx, r, events };
}

function findButton(phone, attribute, value) {
  const tag = [...phone.view.innerHTML.matchAll(/<button\b[^>]*>/g)].map(([tag]) => tag).find((tag) => tag.includes(`data-${attribute}="${value}"`));
  assert.ok(tag, `Rendered data-${attribute}="${value}" button is reachable`);
  assert.doesNotMatch(tag, /\sdisabled(?:[\s>]|=)/);
  return Object.fromEntries([...tag.matchAll(/data-([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}
async function press(phone, attribute, value) {
  const data = findButton(phone, attribute, value);
  await phone.run(data.act, data);
  await phone.render();
}
function noRoleSwitch(phone) {
  assert.doesNotMatch(phone.view.innerHTML, /href="index\.html\?choose=1"/);
  assert.doesNotMatch(phone.view.innerHTML, /class="role-navigation"/);
}
function hasRoleSwitch(phone) {
  assert.match(phone.view.innerHTML, /href="index\.html\?choose=1"/);
}
function hasLanguage(phone, language) {
  assert.equal([...phone.view.innerHTML.matchAll(/data-language=/g)].length, 2);
  assert.match(phone.view.innerHTML, new RegExp(`data-language="${language}"[^>]*aria-pressed="true"`));
  const beforeMain = phone.view.innerHTML.split('<main class="screen"')[0];
  assert.doesNotMatch(beforeMain, /data-language=/, 'language controls belong to Settings content');
}

for (const role of ['senior', 'caregiver']) {
  test(`${role}: connected users see Language only in Settings and no role switch in TH/EN`, async (t) => {
    const { phone, ctx, r } = await setup(t, role);
    const before = await stored(ctx.repo);
    assert.ok(before.medicines.length > 0); assert.equal(Object.keys(before.doses).length, 1);
    for (const language of ['th', 'en', 'th']) {
      choose(language); phone.go(r.home); await phone.render();
      assert.equal(phone.snap.pairState, 'connected');
      noRoleSwitch(phone); assert.doesNotMatch(phone.view.innerHTML, /data-language=/);
      await press(phone, 'to', r.settings);
      assert.equal(phone.route, r.settings); noRoleSwitch(phone); hasLanguage(phone, language);
      assert.match(phone.view.innerHTML, /data-act="unpair-ask"/);
      assert.deepEqual(await stored(ctx.repo), before, 'opening Settings/changing language must preserve pair and records');
    }
  });

  test(`${role}: unpaired users can open Settings and return to pairing without changing their pair`, async (t) => {
    const { phone, ctx, r } = await setup(t, role, 'fresh');
    phone.go(r.pair); await phone.render();
    // A senior's first render legitimately creates their initial QR pair; measure after that initialization.
    for (const waitingForCaregiver of [false, true]) {
      if (waitingForCaregiver) {
        if (!(await ctx.repo.getPairing())) await ctx.repo.createPairing({ seniorId: ctx.ids.seniorId });
        await ctx.repo.recordConsent();
      }
      const before = await stored(ctx.repo);
      for (const language of ['th', 'en']) {
        choose(language); await phone.render();
        assert.equal(phone.snap.pairState, waitingForCaregiver ? 'waiting_caregiver' : 'waiting_consent');
        hasRoleSwitch(phone); assert.doesNotMatch(phone.view.innerHTML, /data-language=/);
        assert.doesNotMatch(phone.view.innerHTML, /class="tabs"/);
        await press(phone, 'to', r.settings);
        assert.equal(phone.route, r.settings); hasRoleSwitch(phone); hasLanguage(phone, language);
        assert.doesNotMatch(phone.view.innerHTML, /data-act="unpair-ask"|class="tabs"/);
        await press(phone, 'to', r.pair);
        assert.equal(phone.route, r.pair); hasRoleSwitch(phone);
        assert.deepEqual(await stored(ctx.repo), before, 'navigation must not create/delete pairs or sign the user out');
      }
    }
  });

  test(`${role}: declining either cancellation dialog keeps the connected pair and records`, async (t) => {
    const { phone, ctx, r, events } = await setup(t, role);
    let cancelCalls = 0;
    ctx.repo.cancelPairing = async () => { cancelCalls += 1; throw new Error('Cancellation must require the final confirmation'); };
    const before = await stored(ctx.repo);
    phone.go(r.settings); await phone.render();
    for (const finalDialog of [false, true]) {
      await press(phone, 'act', 'unpair-ask');
      assert.equal(phone.ui.dialog, 'unpair1');
      assert.doesNotMatch(phone.view.innerHTML, /data-act="unpair-yes"/);
      if (finalDialog) {
        await press(phone, 'act', 'unpair-next');
        assert.equal(phone.ui.dialog, 'unpair2');
        findButton(phone, 'act', 'unpair-yes');
      }
      await press(phone, 'act', 'unpair-no');
      assert.equal(phone.ui.dialog, null); noRoleSwitch(phone);
      assert.deepEqual(await stored(ctx.repo), before);
    }
    assert.equal(cancelCalls, 0); assert.equal(events.includes('unpaired'), false);
  });

  test(`${role}: rejected cancellation cannot unlock role selection or run the success callback`, async (t) => {
    const { phone, ctx, r, events } = await setup(t, role);
    const pending = deferred();
    ctx.repo.cancelPairing = () => pending.promise;
    const before = await stored(ctx.repo);
    phone.go(r.settings); await phone.render();
    await press(phone, 'act', 'unpair-ask'); await press(phone, 'act', 'unpair-next');
    events.length = 0;
    const cancel = phone.run('unpair-yes', {});
    assert.equal(events.includes('unpaired'), false);
    const rejected = assert.rejects(cancel, { code: 'permission-denied' });
    pending.reject(Object.assign(new Error('Rejected by the test repo'), { code: 'permission-denied' }));
    await rejected; await phone.render();
    assert.equal(phone.route, r.settings); assert.equal(phone.snap.pairState, 'connected');
    noRoleSwitch(phone); assert.deepEqual(await stored(ctx.repo), before);
    assert.deepEqual(events, [], 'no success navigation/toast/refresh may run on rejection');
  });

  test(`${role}: successful cancellation offers role selection only after the repo confirms success`, async (t) => {
    const { phone, ctx, r, events } = await setup(t, role);
    const pending = deferred(), originalCancel = ctx.repo.cancelPairing.bind(ctx.repo);
    ctx.repo.cancelPairing = async () => {
      events.push('cancel-start'); await pending.promise;
      const result = await originalCancel(); events.push('cancel-confirmed'); return result;
    };
    phone.go(r.settings); await phone.render();
    await press(phone, 'act', 'unpair-ask'); await press(phone, 'act', 'unpair-next');
    const before = await stored(ctx.repo); events.length = 0;
    const cancel = phone.run('unpair-yes', {});
    await phone.render();
    noRoleSwitch(phone); assert.deepEqual(events, ['cancel-start']);
    assert.deepEqual(await stored(ctx.repo), before, 'awaiting cancellation must leave the pair intact');
    pending.resolve(); await cancel;
    assert.deepEqual(events, ['cancel-start', 'cancel-confirmed', 'unpaired', 'toast', 'refresh']);
    assert.equal(phone.route, r.pair); await phone.render();
    assert.equal(phone.snap.pairState, 'waiting_consent'); hasRoleSwitch(phone);
    assert.equal((await ctx.repo.getPairing()).pair.caregiverId, null);
    assert.deepEqual(await ctx.repo.listMedicines(), []); assert.deepEqual(await ctx.repo.getDoses(), {});
    // LocalRepo regenerates the older adult's QR on either side; the live caregiver repo returns null instead.
    assert.ok((await ctx.repo.getPairing()).invite.code);
    await press(phone, 'to', r.settings); hasLanguage(phone, 'th');
  });
}

test('unpaired Demo keeps Settings navigation but does not offer the real Site role chooser', async (t) => {
  const { phone, ctx, r } = await setup(t, 'caregiver', 'fresh');
  ctx.name = 'fresh'; phone.go(r.pair); await phone.render();
  assert.doesNotMatch(phone.view.innerHTML, /href="index\.html\?choose=1"/);
  await press(phone, 'to', r.settings);
  hasLanguage(phone, 'th');
  assert.doesNotMatch(phone.view.innerHTML, /href="index\.html\?choose=1"/);
});
