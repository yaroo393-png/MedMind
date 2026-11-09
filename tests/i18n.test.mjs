// ทดสอบภาษา UI ของ Site copy ด้วยโมดูลจริงและข้อมูลในหน่วยความจำเท่านั้น ไม่เชื่อม backend
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getLanguage, setLanguage, tr, subscribeLanguage, languageControls, localizeUiMessage } from '../public/js/features/i18n.js';
import { MEAL_NAMES, TIMING_NAMES, REASON_TEXT, JOIN_TEXT, AI_PROBLEMS, thaiDate, statusLabel } from '../public/js/features/format.js';
import { SIZES, sizeName, prefsCard, medList, medSummary } from '../public/js/features/ui.js';
import { Phone, SCREENS, ACTIONS } from '../public/js/features/phone.js';
import { createDemoContext } from '../public/js/features/demoControls.js';
import { loadSnapshot } from '../public/js/features/model.js';

const choose = (language) => setLanguage(language, { persist: false });
const hasThai = (value) => /[\u0E00-\u0E7F]/.test(value);
let freshModuleIndex = 0;
const freshLanguageModule = () => import(`../public/js/features/i18n.js?test-isolation=${++freshModuleIndex}`);
beforeEach(() => choose('th'));
afterEach(() => choose('th'));

test('เริ่มภาษาไทย และสลับ labels/status/date เป็นอังกฤษโดยไม่ใช้ปี พ.ศ. ในภาษาอังกฤษ', async () => {
  const cold = await freshLanguageModule();
  assert.equal(cold.getLanguage(), 'th');
  assert.equal(cold.tr('ภาษาไทย', 'English'), 'ภาษาไทย');
  assert.equal(MEAL_NAMES.breakfast, 'เช้า');
  assert.equal(SIZES[0][1], 'ปกติ');
  assert.equal(thaiDate('2026-11-04'), '4 พ.ย. 2569');
  choose('en');
  assert.equal(MEAL_NAMES.breakfast, 'Breakfast');
  assert.equal(TIMING_NAMES.before_meal, 'Before a meal');
  assert.equal(SIZES[0][1], 'Normal');
  assert.equal(sizeName('xlarge'), 'Extra large');
  assert.equal(thaiDate('2026-11-04'), '4 Nov 2026');
  assert.equal(thaiDate('2026-01-01'), '1 Jan 2026');
  assert.doesNotMatch(thaiDate('2026-11-04'), /2569/);
  for (const state of ['not_confirmed', 'reminding', 'missed']) {
    const label = statusLabel(state);
    assert.equal(label.text, 'Not yet confirmed');
    assert.equal(label.kind, 'notyet');
    assert.doesNotMatch(label.text, /not taken/i, 'ขาดการยืนยันไม่ใช่ข้อสรุปว่าไม่ได้กินยา');
  }
  assert.equal(statusLabel('taken', 0).kind, 'taken');
  assert.equal(statusLabel('taken_late', 0).kind, 'late');
  for (const dictionary of [MEAL_NAMES, TIMING_NAMES, REASON_TEXT, JOIN_TEXT, AI_PROBLEMS]) {
    for (const text of Object.values(dictionary)) assert.equal(hasThai(text), false, text);
  }
  assert.equal(hasThai(prefsCard({ size: 'large', theme: 'dark' })), false);
  choose('th');
  assert.equal(MEAL_NAMES.breakfast, 'เช้า');
  assert.equal(sizeName('xlarge'), 'ใหญ่มาก');
});

test('ไม่รับ locale ที่ไม่รองรับ และแจ้งผู้ฟังเฉพาะการเปลี่ยนภาษาจริง', () => {
  const changes = [];
  const unsubscribe = subscribeLanguage((language) => changes.push(language));
  try {
    for (const invalid of ['fr', 'EN', '', null, undefined, 1]) {
      assert.equal(choose(invalid), false);
      assert.equal(getLanguage(), 'th');
    }
    assert.deepEqual(changes, []);
    assert.equal(choose('en'), true);
    assert.equal(choose('en'), false);
    assert.deepEqual(changes, ['en']);
    unsubscribe();
    choose('th');
    assert.deepEqual(changes, ['en']);
  } finally { unsubscribe(); }
});

test('อ่านภาษาอังกฤษที่บันทึกไว้ได้ตอนเริ่มหน้า และไม่ initialize ทับภาษาที่เริ่มแล้ว', async () => {
  const isolated = await freshLanguageModule();
  const calls = [];
  assert.equal(isolated.initializeLanguage({ getItem(key) { calls.push(key); return 'en'; } }), 'en');
  assert.deepEqual(calls, ['mm-language']);
  assert.equal(isolated.tr('ไทย', 'English'), 'English');
  assert.equal(isolated.initializeLanguage({ getItem() { throw new Error('must not initialize twice'); } }), 'en');
  const unsupportedStored = await freshLanguageModule();
  assert.equal(unsupportedStored.initializeLanguage({ getItem: () => 'fr' }), 'th');
});

test('storage ถูกบล็อกยังเปิดด้วยภาษาไทยและเปลี่ยนภาษาในหน้านี้ได้โดยไม่ throw', async (t) => {
  const blockedStorage = { getItem() { throw new DOMException('Blocked', 'SecurityError'); }, setItem() { throw new DOMException('Blocked', 'SecurityError'); } };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: blockedStorage });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
  const isolated = await freshLanguageModule();
  assert.equal(isolated.initializeLanguage(blockedStorage), 'th');
  assert.doesNotThrow(() => isolated.setLanguage('en'));
  assert.equal(isolated.getLanguage(), 'en');
  assert.equal(isolated.tr('ภาษาไทย', 'English'), 'English');
});

test('ปุ่มภาษาแสดง aria-pressed ตรงภาษาที่เลือก และเก็บรหัส th/en เดิม', () => {
  const pressed = (html, language) => new RegExp(`<button\\b[^>]*data-language="${language}"[^>]*aria-pressed="(true|false)"`).exec(html)?.[1];
  let controls = languageControls();
  assert.equal(pressed(controls, 'th'), 'true');
  assert.equal(pressed(controls, 'en'), 'false');
  choose('en'); controls = languageControls();
  assert.equal(pressed(controls, 'th'), 'false');
  assert.equal(pressed(controls, 'en'), 'true');
  assert.match(controls, /aria-label="Language"/);
  assert.match(controls, /lang="th">ไทย/);
  assert.match(controls, /lang="en">English/);
});

test('ข้อความแจ้งที่ค้างเปลี่ยนเฉพาะคู่ข้อความ UI ตรงตัว ไม่แทนข้อความบางส่วนหรือแปล HTML/ข้อมูลที่ไม่รู้จัก', () => {
  const thai = 'บันทึกแล้ว 07:00', english = 'Recorded at 07:00';
  assert.equal(tr(thai, english), thai);
  choose('en');
  assert.equal(localizeUiMessage(thai), english);
  assert.equal(localizeUiMessage(english), english);
  for (const unchanged of ['ยาไทย <A>', `${thai} — user note`, `<p>${thai}</p>`]) assert.equal(localizeUiMessage(unchanged), unchanged);
  choose('th');
  assert.equal(localizeUiMessage(english), thai);
});

test('TH→EN→TH เปลี่ยนเฉพาะ UI ไม่แปลชื่อยา/คำเตือนหรือแก้ข้อมูลยา ตารางมื้อ และประวัติที่เก็บไว้', async () => {
  const ctx = await createDemoContext('sample');
  const originalMedicine = (await ctx.repo.listMedicines())[0];
  const medicine = { ...originalMedicine, id: 'i18n-user-data', name: 'สวัสดี', warnings: 'กินแล้ว', contraindications: 'ห้ามบด <ข้อความเดิม>', instructionText: 'หลังอาหารเช้า 1 เม็ด — คำสั่งจากฉลากเดิม' };
  await ctx.repo.saveMedicine(medicine);
  const stored = async () => ({ pairing: await ctx.repo.getPairing(), medicines: await ctx.repo.listMedicines(), mealTimes: await ctx.repo.getMealTimes(), doses: await ctx.repo.getDoses() });
  const before = await stored();
  for (const language of ['th', 'en', 'th']) {
    choose(language);
    const renderedMedicine = { ...medicine, tabletsPerDose: 1 };
    const html = medList({ medicines: [renderedMedicine] });
    assert.match(html, /class="med-name">สวัสดี<\/span>/);
    assert.ok(html.includes('กินแล้ว'));
    assert.ok(html.includes('ห้ามบด &lt;ข้อความเดิม&gt;'));
    if (language === 'en') {
      assert.ok(html.includes('Warning: กินแล้ว'));
      assert.ok(medSummary({ medicines: [renderedMedicine] }).includes('สวัสดี 1 tablet'));
    }
    const snap = await loadSnapshot({ repo: ctx.repo, clock: ctx.clock, dateKey: ctx.dateKey });
    SCREENS['senior-home']({ snap, ui: {}, pref: { size: 'normal', theme: 'light' }, sound: true, flags: ctx.flags, ctx, inbox: [], role: 'senior' });
    assert.deepEqual(await stored(), before);
  }
});

test('ภาษาไม่เปลี่ยน selector ของช่องรหัส action IDs หรือเส้นทางเมนูของ Phone', async () => {
  const ctx = await createDemoContext('sample');
  const snap = await loadSnapshot({ repo: ctx.repo, clock: ctx.clock, dateKey: ctx.dateKey });
  const model = { snap, ui: { codeInput: '', cover: {}, tick: false, error: null, dialog: null, draft: null }, pref: { size: 'normal', theme: 'light' }, sound: true, flags: ctx.flags, ctx, inbox: [], real: false };
  const contracts = (html) => [...html.matchAll(/data-(?:act|to|field|live|path|time|meal|key|id|region|v|dir)="[^"]*"/g)].map((match) => match[0]);
  const renderContracts = () => Object.fromEntries(Object.entries(SCREENS).map(([route, render]) => {
    const view = render({ ...model, role: route.startsWith('senior') ? 'senior' : 'caregiver' });
    return [route, contracts(view.body + (view.overlay ?? ''))];
  }));
  const thaiContracts = renderContracts(), actionIds = Object.keys(ACTIONS);
  const thaiSeniorMenu = Phone.prototype.tabs.call({ role: 'senior', route: 'senior-home', inbox: [] }, snap, '');
  const thaiCaregiverMenu = Phone.prototype.tabs.call({ role: 'caregiver', route: 'cg-status', inbox: [] }, snap, '');
  choose('en');
  assert.deepEqual(renderContracts(), thaiContracts);
  assert.deepEqual(Object.keys(ACTIONS), actionIds);
  const englishSeniorMenu = Phone.prototype.tabs.call({ role: 'senior', route: 'senior-home', inbox: [] }, snap, '');
  const englishCaregiverMenu = Phone.prototype.tabs.call({ role: 'caregiver', route: 'cg-status', inbox: [] }, snap, '');
  assert.deepEqual(contracts(englishSeniorMenu), contracts(thaiSeniorMenu));
  assert.deepEqual(contracts(englishCaregiverMenu), contracts(thaiCaregiverMenu));
  assert.match(englishSeniorMenu, />Home<\/span>/);
  assert.match(englishCaregiverMenu, />Medicines<\/span>/);
  const fresh = await createDemoContext('fresh');
  await fresh.repo.createPairing({ seniorId: fresh.ids.seniorId });
  const freshSnap = await loadSnapshot({ repo: fresh.repo, clock: fresh.clock, dateKey: fresh.dateKey });
  const view = SCREENS['cg-pair']({ ...model, snap: freshSnap, ui: { ...model.ui, codeInput: '000 424' }, role: 'caregiver' });
  assert.match(view.body, /data-live="codeInput"/);
  assert.match(view.body, /value="000 424"/);
  assert.match(view.body, /data-act="join"/);
});
