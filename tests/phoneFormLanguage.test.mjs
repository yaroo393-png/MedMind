// Regression: input event ต้องเก็บร่างก่อนสลับภาษา โดยไม่ต้องรอ change/blur หรือบันทึกลง repo
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Phone, ACTIONS, SCREENS } from '../public/js/features/phone.js';
import { createDemoContext } from '../public/js/features/demoControls.js';
import { loadSnapshot } from '../public/js/features/model.js';
import { canSave } from '../public/js/logic/labelDraft.js';
import { setLanguage } from '../public/js/features/i18n.js';
import { esc } from '../public/js/features/ui.js';

const choose = (language) => setLanguage(language, { persist: false });
beforeEach(() => choose('th'));
afterEach(() => choose('th'));

async function setup(t, preset = 'sample') {
  const ctx = await createDemoContext(preset);
  let refreshCalls = 0, repoChanges = 0;
  ctx.refresh = () => { refreshCalls += 1; };
  const stop = ctx.repo.watch(() => { repoChanges += 1; });
  t.after(stop);
  const snap = await loadSnapshot({ repo: ctx.repo, clock: ctx.clock, dateKey: ctx.dateKey });
  const phone = Object.assign(Object.create(Phone.prototype), {
    role: 'caregiver', ctx, snap, inbox: [], sound: true,
    pref: { size: 'normal', theme: 'light' }, route: 'cg-draft',
    ui: { codeInput: '', error: null, dialog: null, draft: null, cover: {}, tick: false },
  });
  const input = (dataset, value) => {
    // เรียก handler จริงโดยไม่มี change/blur; โค้ดเก่าที่ไม่มี onInput จะล้มเหลวตรงนี้
    Phone.prototype.onInput.call(phone, { target: { dataset, value } });
  };
  const render = (route) => SCREENS[route]({
    role: phone.role, snap: phone.snap, ui: phone.ui, pref: phone.pref, sound: phone.sound,
    inbox: phone.inbox, flags: ctx.flags, ctx, real: false,
  });
  const stored = async () => ({ medicines: await ctx.repo.listMedicines(), mealTimes: await ctx.repo.getMealTimes(), pairing: await ctx.repo.getPairing(), doses: await ctx.repo.getDoses() });
  return { phone, input, render, stored, activity: () => ({ refreshCalls, repoChanges }) };
}

function inputTag(body, attribute, value) {
  return [...body.matchAll(/<input\b[^>]*>/g)].map((match) => match[0]).find((tag) => tag.includes(`${attribute}="${value}"`));
}
function selectedOption(body, path, value) {
  const select = [...body.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/g)].map((match) => match[0]).find((tag) => tag.includes(`data-path="${path}"`));
  return Boolean(select?.includes(`<option value="${value}" selected>`));
}

// DOM จำลองเฉพาะส่วนที่ Phone.render ใช้: node ใหม่เริ่ม caret ใหม่ และ setSelectionRange ถูกจำกัดด้วยความยาว value จริง
function attachFormDom(t, phone) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const document = { activeElement: null };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  const fields = new Map(), screen = { scrollTop: 0 };
  let html = '';
  const decode = (value) => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const field = (dataset, value, type = 'text') => {
    const supportsSelection = type === 'text';
    return {
      dataset, value, tagName: 'INPUT', type,
      selectionStart: supportsSelection ? 0 : null, selectionEnd: supportsSelection ? 0 : null, selectionDirection: 'none',
      focus() { document.activeElement = this; if (supportsSelection) this.selectionStart = this.selectionEnd = 0; },
      setSelectionRange(start, end, direction = 'none') {
        if (!supportsSelection) throw new DOMException('Unsupported selection', 'InvalidStateError');
        this.selectionStart = Math.min(start, this.value.length); this.selectionEnd = Math.min(end, this.value.length); this.selectionDirection = direction;
      },
    };
  };
  const heading = { tagName: 'H1', setAttribute() {}, focus() { document.activeElement = this; } };
  phone.view = {
    contains: (node) => [...fields.values()].includes(node),
    querySelector(selector) {
      if (selector === '.screen') return screen;
      if (selector === '.screen h1, .screen h2') return heading;
      const match = /\[data-(path|time|live)="([^"]+)"\]/.exec(selector);
      return match ? fields.get(`${match[1]}:${match[2]}`) ?? null : null;
    },
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value; fields.clear();
      for (const [tag] of value.matchAll(/<input\b[^>]*>/g)) {
        const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
        for (const key of ['path', 'time', 'live']) if (attrs[`data-${key}`]) fields.set(`${key}:${attrs[`data-${key}`]}`, field({ [key]: attrs[`data-${key}`] }, attrs.value ?? '', attrs.type ?? 'text'));
      }
    },
  };
  phone.el = { setAttribute() {} }; phone.live = { innerHTML: '' };
  phone.seq = 0; phone.hadOverlay = false; phone.lastRoute = phone.route;
  return { document, fields };
}

test('ชื่อยา คำเตือน ข้อห้าม และ slot ที่ยังไม่บันทึกอยู่ครบหลัง TH→EN→TH โดยไม่ต้อง blur', async (t) => {
  const { phone, input, render, stored, activity } = await setup(t);
  const before = await stored();
  ACTIONS['manual-entry'](phone.env());
  const text = { name: 'ยาไทย <A> & "dose"', warnings: 'กินแล้ว & คำเตือนจากผู้ใช้', contraindications: 'ห้ามบด <ข้อความเดิม>' };
  for (const [path, value] of Object.entries(text)) input({ path }, value);
  input({ path: 'slots[0].meal' }, 'breakfast');
  input({ path: 'slots[0].timing' }, 'before_meal');
  input({ path: 'slots[0].minutesBefore' }, '30');
  input({ path: 'slots[0].tabletsPerDose' }, '2');
  // ตรวจทันทีหลัง input เพื่อยืนยันว่าไม่ต้องพึ่ง promise/change event ภายหลัง
  assert.equal(phone.ui.draft.name, text.name);
  assert.deepEqual(phone.ui.draft.slots, [{ meal: 'breakfast', timing: 'before_meal', minutesBefore: 30, tabletsPerDose: 2 }]);
  assert.deepEqual(phone.ui.draft.checks, []);
  assert.equal(canSave(phone.ui.draft), true);
  const draft = structuredClone(phone.ui.draft);
  for (const language of ['th', 'en', 'th']) {
    choose(language);
    const view = render('cg-draft');
    for (const [path, value] of Object.entries(text)) assert.ok(inputTag(view.body, 'data-path', path)?.includes(`value="${esc(value)}"`));
    assert.ok(selectedOption(view.body, 'slots[0].meal', 'breakfast'));
    assert.ok(selectedOption(view.body, 'slots[0].timing', 'before_meal'));
    assert.ok(inputTag(view.body, 'data-path', 'slots[0].minutesBefore')?.includes('value="30"'));
    assert.ok(inputTag(view.body, 'data-path', 'slots[0].tabletsPerDose')?.includes('value="2"'));
    assert.deepEqual(phone.ui.draft, draft);
    assert.deepEqual(await stored(), before);
  }
  assert.deepEqual(activity(), { refreshCalls: 0, repoChanges: 0 });
});

test('ค่าที่กรอกผิดและ validation checks ไม่หายเมื่อสลับภาษา และยังบันทึกไม่ได้', async (t) => {
  const { phone, input, render, stored, activity } = await setup(t);
  const before = await stored();
  ACTIONS['manual-entry'](phone.env());
  input({ path: 'name' }, 'ยาเดิมที่กรอกเอง');
  input({ path: 'slots[0].meal' }, 'breakfast');
  input({ path: 'slots[0].timing' }, 'before_meal');
  input({ path: 'slots[0].minutesBefore' }, '30');
  input({ path: 'slots[0].tabletsPerDose' }, '0');
  assert.equal(phone.ui.draft.slots[0].tabletsPerDose, 0);
  assert.ok(phone.ui.draft.checks.some((check) => check.path === 'slots[0].tabletsPerDose' && check.reason === 'invalid_tablets'));
  assert.equal(canSave(phone.ui.draft), false);
  const draft = structuredClone(phone.ui.draft);
  for (const language of ['th', 'en', 'th']) {
    choose(language);
    const view = render('cg-draft'), invalidInput = inputTag(view.body, 'data-path', 'slots[0].tabletsPerDose');
    assert.ok(invalidInput.includes('value="0"'));
    assert.ok(invalidInput.includes('aria-invalid="true"'));
    assert.match(view.body, /data-act="save-draft" disabled/);
    assert.ok(view.body.includes(language === 'en' ? 'Please check' : 'โปรดตรวจสอบ'));
    assert.deepEqual(phone.ui.draft, draft);
  }
  assert.deepEqual(await stored(), before);
  assert.deepEqual(activity(), { refreshCalls: 0, repoChanges: 0 });
});

test('เวลามื้อที่พิมพ์แต่ยังไม่กดบันทึกแสดงค่าเดิมข้ามภาษา โดยไม่เปลี่ยนเวลาที่เก็บไว้', async (t) => {
  const { phone, input, render, stored, activity } = await setup(t);
  const before = await stored();
  const times = { breakfast: '08:05', lunch: '13:20', dinner: '19:10', bedtime: '22:45' };
  for (const [time, value] of Object.entries(times)) input({ time }, value);
  assert.deepEqual(phone.ui.times, times);
  for (const language of ['th', 'en', 'th']) {
    choose(language);
    const view = render('cg-meals');
    for (const [key, value] of Object.entries(times)) assert.ok(inputTag(view.body, 'data-time', key)?.includes(`value="${value}"`));
    assert.deepEqual(phone.ui.times, times);
    assert.deepEqual(await stored(), before);
  }
  assert.deepEqual(activity(), { refreshCalls: 0, repoChanges: 0 });
});

test('input รหัสจับคู่ยังเก็บเลขศูนย์นำหน้าและช่องว่างตรงตัว ไม่สร้างร่างหรือเขียน repo', async (t) => {
  const { phone, input, render, stored, activity } = await setup(t, 'fresh');
  const before = await stored();
  for (const code of ['000424', '000 424', '0000424']) {
    input({ live: 'codeInput' }, code);
    assert.equal(phone.ui.codeInput, code);
    for (const language of ['th', 'en', 'th']) {
      choose(language);
      const view = render('cg-pair');
      assert.ok(inputTag(view.body, 'data-live', 'codeInput')?.includes(`value="${code}"`));
      assert.equal(phone.ui.codeInput, code);
      assert.equal(phone.ui.draft, null);
    }
  }
  assert.deepEqual(await stored(), before);
  assert.deepEqual(activity(), { refreshCalls: 0, repoChanges: 0 });
});

test('ช่องว่างท้ายคำยังอยู่ใน DOM หลัง Phone.render สลับภาษา จึงพิมพ์คำถัดไปได้โดยคำไม่ติดกัน', async (t) => {
  const { phone, stored, activity } = await setup(t);
  const before = await stored();
  ACTIONS['manual-entry'](phone.env());
  const { document, fields } = attachFormDom(t, phone);
  await Phone.prototype.render.call(phone);
  let name = fields.get('path:name');
  name.value = 'Medicine '; name.selectionStart = name.selectionEnd = name.value.length;
  document.activeElement = name;
  Phone.prototype.onInput.call(phone, { target: name });
  assert.equal(phone.ui.draft.name, 'Medicine', 'ตรรกะยังทำความสะอาดข้อความตามเดิม');
  choose('en');
  await Phone.prototype.render.call(phone);
  name = fields.get('path:name');
  assert.equal(name.value, 'Medicine ', 'DOM ต้องได้ข้อความดิบรวมช่องว่างที่ยังพิมพ์ไม่จบ');
  assert.equal(document.activeElement, name);
  assert.equal(name.selectionStart, 9);
  name.value = name.value.slice(0, name.selectionStart) + 'dose' + name.value.slice(name.selectionEnd);
  name.selectionStart = name.selectionEnd = name.value.length;
  Phone.prototype.onInput.call(phone, { target: name });
  choose('th');
  await Phone.prototype.render.call(phone);
  assert.equal(fields.get('path:name').value, 'Medicine dose');
  assert.equal(phone.ui.draft.name, 'Medicine dose');
  assert.deepEqual(await stored(), before);
  assert.deepEqual(activity(), { refreshCalls: 0, repoChanges: 0 });
});

test('raw buffer ไม่ทำให้เลขทศนิยมที่ผิดกฎผ่าน validation หรือบันทึกได้หลังวาดใหม่', async (t) => {
  const { phone, input, stored } = await setup(t);
  const before = await stored();
  ACTIONS['manual-entry'](phone.env());
  input({ path: 'name' }, 'Medicine draft');
  input({ path: 'slots[0].meal' }, 'breakfast');
  input({ path: 'slots[0].timing' }, 'after_meal');
  input({ path: 'slots[0].tabletsPerDose' }, '1.5');
  const { fields } = attachFormDom(t, phone);
  choose('en'); await Phone.prototype.render.call(phone);
  assert.equal(fields.get('path:slots[0].tabletsPerDose').value, '1.5');
  assert.equal(phone.ui.draft.slots[0].tabletsPerDose, 1.5);
  assert.ok(phone.ui.draft.checks.some((check) => check.reason === 'invalid_tablets'));
  assert.equal(canSave(phone.ui.draft), false);
  assert.match(phone.view.innerHTML, /data-act="save-draft" disabled/);
  await ACTIONS['save-draft'](phone.env());
  assert.deepEqual(await stored(), before);
});

test('commit ล้างเฉพาะ raw buffer ของช่องนั้น และเปลี่ยนฟอร์มใหม่ไม่เอาข้อความดิบเก่ากลับมา', async (t) => {
  const { phone, input, stored } = await setup(t);
  const before = await stored();
  ACTIONS['manual-entry'](phone.env());
  input({ path: 'name' }, 'Medicine ');
  input({ path: 'warnings' }, 'Warning ');
  input({ time: 'breakfast' }, '08:30');
  let pending;
  phone.run = function (action, data) { pending = Phone.prototype.run.call(this, action, data); return pending; };
  Phone.prototype.onChange.call(phone, { target: { dataset: { path: 'name' }, value: 'Medicine ' } });
  await pending;
  assert.equal(phone.editingValues.has('path:name'), false);
  assert.equal(phone.editingValues.get('path:warnings'), 'Warning ');
  assert.equal(phone.editingValues.get('time:breakfast'), '08:30');
  assert.equal(phone.ui.draft.name, 'Medicine');
  const { fields } = attachFormDom(t, phone);
  await Phone.prototype.render.call(phone);
  assert.equal(fields.get('path:name').value, 'Medicine');
  assert.equal(fields.get('path:warnings').value, 'Warning ');
  ACTIONS['start-add'](phone.env());
  assert.equal(phone.route, 'cg-photo');
  assert.equal(phone.editingValues.size, 0);
  ACTIONS['manual-entry'](phone.env());
  await Phone.prototype.render.call(phone);
  assert.equal(fields.get('path:name').value, '');
  assert.equal(fields.get('path:warnings').value, '');
  input({ path: 'name' }, 'Another unfinished ');
  Phone.prototype.resetUi.call(phone);
  assert.equal(phone.editingValues.size, 0);
  assert.equal(phone.ui.draft, null);
  assert.deepEqual(await stored(), before);
});
