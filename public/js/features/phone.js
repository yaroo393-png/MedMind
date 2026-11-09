// จอมือถือ 1 เครื่อง (ผู้สูงอายุหรือผู้ดูแล): วาดหน้า, คืนโฟกัส, ข้อความสถานะ, แถบล่าง, เสียงเตือน, ส่งการกดไปยังหน้าจอของแต่ละ FR
// เจ้าของ: Nichanan (Demo mode, E-5) · หน้าจอของแต่ละ FR อยู่ในไฟล์ features/<ชื่อ>.js ของเจ้าของ · ทุกหน้าจอมีป้าย "Covers: FR-xx" (กติกา M3)
// ไฟล์นี้เป็นไฟล์เดียวที่แตะ DOM — ตัวหน้าจอ (screens) เป็นฟังก์ชันล้วนที่ทดสอบด้วย node ได้ (DL-26)
import { loadSnapshot } from './model.js';
import { collectAlerts, openNotConfirmedCount } from './alerts.js';
import { esc, icon, mascot, SIZES, sizeName } from './ui.js';
import { localizeUiMessage, tr } from './i18n.js';
import { fmtHM } from './format.js';
import * as pairing from './pairing.js';
import * as medicine from './medicineSetup.js';
import * as home from './home.js';
import * as reminder from './reminder.js';
import * as status from './caregiverStatus.js';
import * as weekly from './weeklySummaryPanel.js';
import { attachRedact } from './redactTool.js';
import { openScanner } from './qrScan.js';
import { inviteCodeFromScan } from './qr.js';

const FEATURES = [pairing, medicine, home, reminder, status, weekly];
export const SCREENS = Object.assign({}, ...FEATURES.map((f) => f.screens));
export const ACTIONS = Object.assign({}, ...FEATURES.map((f) => f.actions));

// หน้าที่ต้องจับคู่แล้วถึงเข้าได้ (FR-01) — ยังไม่จับคู่ให้กลับหน้าจับคู่
const NEEDS_PAIR = new Set(['senior-home', 'senior-reminder', 'cg-status', 'cg-alerts', 'cg-meals', 'cg-photo', 'cg-cover', 'cg-ai', 'cg-draft', 'cg-meds', 'cg-weekly']);
const FOCUS_ATTRS = ['act', 'action', 'v', 'dir', 'to', 'meal', 'key', 'path', 'region', 'field', 'live', 'time', 'i', 'id', 'language'];
const SIZE_ORDER = SIZES.map((s) => s[0]);

export class Phone {
  /** @param {HTMLElement} el @param {{ role: 'senior'|'caregiver', ctx: object, route?: string }} options */
  constructor(el, { role, ctx, route }) {
    this.el = el; this.role = role; this.ctx = ctx;
    this.route = route ?? (role === 'senior' ? 'senior-reminder' : 'cg-status');
    this.pref = { size: 'normal', theme: 'light' };
    this.sound = false; this.inbox = []; this.snap = null;
    this.seq = 0; this.hadOverlay = false; this.lastRoute = null; this.ringKeys = new Set(); this.wasOpen = false;
    this.toastTimer = null; this.laterTimer = null; this.audio = null; this.pendingRender = false;
    this.resetUi();
    el.innerHTML = '<div class="view"></div><div class="toast-region" role="status" aria-live="polite"></div>';
    this.view = el.firstChild; this.live = el.lastChild;

    el.addEventListener('click', (e) => {
      this.onClick(e);
      if (this.pendingRender) { this.pendingRender = false; this.ctx.refresh(); } // วาดใหม่หลังคลิก เพื่อไม่ให้ปุ่มหายก่อนปล่อยนิ้ว
    });
    el.addEventListener('change', (e) => this.onChange(e));
    el.addEventListener('input', (e) => this.onInput(e));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.ui.dialog) { this.ui.dialog = null; this.render(); return; }
      if (e.key === 'Tab') this.trapTab(e);
    });
    // แตะครั้งแรกบนเครื่องผู้สูงอายุ = ปลดล็อกเสียง (SRS §2.2) · ไม่วาดใหม่ระหว่างกดค้าง (ปุ่มที่กำลังกดจะหาย คลิกไม่ติด)
    el.addEventListener('pointerdown', () => { if (this.role === 'senior' && !this.sound) { this.unlockSound(); this.pendingRender = true; } });
  }

  resetUi() { this.ui = { cover: {}, tick: false, codeInput: '', error: null, dialog: null, draft: null }; this.editingValues = new Map(); }
  /** ผูกกับชุดข้อมูลใหม่ (เริ่มสถานการณ์ใหม่) */
  bind(ctx, route) {
    this.disposeWeekly();
    this.ctx = ctx; this.resetUi(); this.inbox = []; this.ringKeys = new Set(); this.wasOpen = false; this.cancelLater();
    if (route) this.route = route;
  }
  isOpen() { return this.role === 'senior' ? this.ctx.flags.seniorOpen : this.ctx.flags.cgOpen; } // หน้าเว็บปิด = ไม่มีเตือน/แจ้ง (SRS §2.2)
  repo() { return this.role === 'senior' ? this.ctx.seniorRepo : this.ctx.repo; }

  go(route) { if (route !== 'cg-weekly') this.disposeWeekly(); this.route = route; this.ui.error = null; this.ui.dialog = null; this.editingValues?.clear(); }
  disposeWeekly() {
    this.weeklyGeneration = (this.weeklyGeneration ?? 0) + 1;
    this.weeklyPage?.dispose();
    this.weeklyPage = null;
    this.weeklyHtml = null;
  }
  ensureWeekly() {
    if (this.weeklyPage || typeof this.ctx.createWeeklySummary !== 'function') return;
    const ctx = this.ctx, generation = this.weeklyGeneration ?? 0;
    let opening = true;
    this.weeklyPage = ctx.createWeeklySummary({ draw: (html) => {
      if (this.ctx !== ctx || (this.weeklyGeneration ?? 0) !== generation) return;
      this.weeklyHtml = html;
      if (!opening && this.route === 'cg-weekly') ctx.refresh();
    } });
    opening = false;
  }
  toast(msg) { // ค้าง 10 วินาที และมีปุ่มปิด — ผู้สูงอายุอ่านทัน (WCAG 2.2.1)
    this.toastMessage = msg;
    this.paintToast();
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.live.innerHTML = ''; this.lastToastHtml = ''; this.toastMessage = null; }, 10000);
  }
  paintToast() {
    if (!this.toastMessage) return;
    const msg = typeof this.toastMessage === 'function' ? this.toastMessage() : localizeUiMessage(this.toastMessage);
    const html = `<div class="toast"><span>${esc(msg)}</span><button type="button" class="toast-close" data-act="toast-close">${tr('ปิด', 'Close')}</button></div>`;
    if (html !== this.lastToastHtml) { this.live.innerHTML = html; this.lastToastHtml = html; }
  }
  later(fn, ms) { this.cancelLater(); this.laterTimer = setTimeout(() => { fn(); this.ctx.refresh(); }, ms); }
  cancelLater() { clearTimeout(this.laterTimer); this.laterTimer = null; }

  // ---------- เสียง (Web Audio — ไม่มีไฟล์เสียง) ----------
  unlockSound() {
    try {
      const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!this.audio) this.audio = new AC();
      if (this.audio.state === 'suspended') this.audio.resume();
    } catch { this.audio = null; }
    this.sound = true;
  }
  beep() {
    const ctx = this.audio; if (!ctx) return;
    [0, 0.35].forEach((d) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.25);
    });
  }

  // ---------- โฟกัส (WCAG 2.4.3) ----------
  trapTab(e) {
    const m = this.view.querySelector('.modal'); if (!m) return;
    const f = m.querySelectorAll('button:not([disabled])'); if (!f.length) return;
    const first = f[0], last = f[f.length - 1], cur = globalThis.document.activeElement;
    if (!m.contains(cur)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  }
  focusKey() {
    const a = globalThis.document.activeElement;
    if (!a || !this.view.contains(a)) return null;
    let sel = a.tagName.toLowerCase();
    for (const k of FOCUS_ATTRS) if (a.dataset?.[k] !== undefined) sel += `[data-${k}="${String(a.dataset[k]).replace(/["\\]/g, '')}"]`;
    return sel;
  }
  focusSelection() {
    const a = globalThis.document.activeElement;
    if (!a || !this.view.contains(a) || typeof a.selectionStart !== 'number' || typeof a.selectionEnd !== 'number') return null;
    return { start: a.selectionStart, end: a.selectionEnd, direction: a.selectionDirection ?? 'none' };
  }
  restoreFocus(key, routeChanged, overlay, selection = null) {
    let target = null;
    if (overlay && !this.hadOverlay) target = this.view.querySelector('.modal [data-act]');
    else if (key && !routeChanged) target = this.view.querySelector(key);
    if (!target && key) target = this.view.querySelector('.screen h1, .screen h2');
    this.hadOverlay = overlay;
    if (!target) return;
    if (/^H[12]$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    target.focus();
    // การวาดทุกวินาทีต้องไม่ย้ายเคอร์เซอร์กลับต้นช่องหรือทำช่วงข้อความที่เลือกหาย
    if (!routeChanged && selection && key && target === this.view.querySelector(key) && typeof target.setSelectionRange === 'function') {
      try { target.setSelectionRange(selection.start, selection.end, selection.direction); } catch { /* input บางชนิดไม่รองรับ selection */ }
    }
  }

  // ---------- การวาด ----------
  async render() {
    this.paintToast();
    const seq = ++this.seq;
    const { ctx } = this;
    const repo = this.repo();
    if (this.role === 'senior' && !(await repo.getPairing())) await repo.createPairing({ seniorId: ctx.ids.seniorId }); // FR-01 ข้อ 1: เปิดแอปครั้งแรก = ได้ QR + รหัสทันที
    const snap = await loadSnapshot({ repo, clock: ctx.clock, dateKey: ctx.dateKey });
    if (seq !== this.seq) return; // มีการวาดที่ใหม่กว่าแล้ว
    const open = this.isOpen();
    if (this.role === 'caregiver' && open && snap.pairState === 'connected') {
      this.inbox = await collectAlerts({ repo: ctx.repo, snapshot: snap, inbox: this.inbox }); // เห็นแล้วจดครั้งเดียว (BR-13)
      if (seq !== this.seq) return;
    }
    this.snap = snap;
    if (!(this.route in SCREENS) || (NEEDS_PAIR.has(this.route) && snap.pairState !== 'connected')) this.route = this.role === 'senior' ? 'senior-pair' : 'cg-pair';
    if (this.route === 'cg-weekly' && this.role !== 'caregiver') this.route = snap.pairState === 'connected' ? 'senior-home' : 'senior-pair';
    if (this.route === 'cg-weekly') this.ensureWeekly();
    else if (this.weeklyPage) this.disposeWeekly();

    const model = { role: this.role, snap, ui: this.ui, pref: this.pref, sound: this.sound, inbox: this.inbox, flags: ctx.flags, real: ctx.name === 'real', ctx, weeklyHtml: this.weeklyHtml };
    const scr = SCREENS[this.route](model);
    const showTabs = scr.tabs !== false;
    const inert = scr.overlay ? ' inert' : ''; // กล่องยืนยันเปิด → ส่วนอื่นกด/โฟกัสไม่ได้
    this.el.setAttribute('data-size', this.pref.size);
    this.el.setAttribute('data-theme', this.pref.theme);
    const key = this.focusKey();
    const selection = this.focusSelection();
    const routeChanged = this.lastRoute !== null && this.lastRoute !== this.route;
    const closedNote = this.role === 'caregiver'
      ? `<h1>${tr('หน้า MedMind ของผู้ดูแลถูกปิดอยู่', 'The caregiver’s MedMind page is closed')}</h1><p>${tr('ระบบแจ้งเตือนเฉพาะตอนเปิดหน้าเว็บ (ข้อจำกัดของเว็บแอป) เอาติ๊ก "ผู้ดูแลปิดหน้า MedMind" ออกเพื่อดูแจ้งเตือนที่ค้างอยู่ (BR-18)', 'Alerts work only while the page is open. Clear “Caregiver page closed” to view pending alerts. (BR-18)')}</p>`
      : `<h1>${tr('หน้า MedMind ของผู้สูงอายุถูกปิดอยู่', 'The older adult’s MedMind page is closed')}</h1><p>${tr('ระบบเตือนเฉพาะตอนเปิดหน้าเว็บ ไม่มีเสียงและไม่มีรอบเตือนจนกว่าจะเปิดหน้า เอาติ๊ก "ผู้สูงอายุปิดหน้า MedMind" ออก แล้วหน้าเตือนจะแสดงมื้อทันที รอบที่ผ่านไปแล้วไม่เล่นซ้ำ (FR-03 ข้อ 5, BR-18)', 'Reminders work only while this page is open. Clear “Older adult page closed” to see current doses. Earlier reminder sounds will not replay. (FR-03, BR-18)')}</p>`;
    const settingsRoute = this.role === 'senior' ? 'senior-settings' : 'cg-settings';
    const atSettings = this.route === settingsRoute;
    const pairingRoute = this.role === 'senior' ? 'senior-pair' : 'cg-pair';
    // Switching roles is offered only before pairing or after cancellation succeeds.
    // Unpaired users can still reach Language in Settings without creating a pair.
    const navigation = snap.pairState !== 'connected'
      ? `<nav class="role-navigation" aria-label="${tr('การนำทาง', 'Navigation')}"${inert}>` +
        (model.real ? `<a href="index.html?choose=1">${tr('← กลับไปเลือกบทบาท', '← Choose role')}</a>` : '') +
        `<button type="button" class="btn btn-ghost btn-small" data-act="go" data-to="${atSettings ? pairingRoute : settingsRoute}">${icon(atSettings ? 'link' : 'gear')}${atSettings ? tr('กลับไปจับคู่', 'Back to pairing') : tr('ตั้งค่า', 'Settings')}</button></nav>`
      : '';
    const html = `<div class="phone-inner${open ? '' : ' is-closed'}">` + navigation +
      `<header class="appbar"${inert}><span class="role-chip">${this.role === 'senior' ? tr('ผู้สูงอายุ', 'Older adult') : tr('ผู้ดูแล', 'Caregiver')}</span><span class="appbar-title">${esc(scr.title)}</span><span class="appbar-time">${fmtHM(snap.now)}</span></header>` +
      `<p class="covers"${inert}>Covers: ${esc(scr.covers)}</p>` +
      `<main class="screen"${inert}>${open ? scr.body : `<div class="closed-note">${mascot('concern', 96)}${closedNote}</div>`}</main>` +
      (showTabs && open ? this.tabs(snap, inert) : '') + (scr.overlay ?? '') + '</div>';
    // แอปจริงวาดใหม่ทุกวินาที: ถ้าหน้าตาเหมือนเดิมไม่ต้องแตะ DOM (ไม่กระพริบ ไม่ทิ้งสิ่งที่กำลังพิมพ์)
    // ถ้าเปลี่ยนแต่ยังหน้าเดิม ให้คงตำแหน่งเลื่อนไว้ — เดิมเด้งกลับบนสุดทุกวินาที กดปุ่มด้านล่างไม่ได้
    if (html !== this.lastHtml || routeChanged) {
      const keepScroll = routeChanged ? 0 : (this.view.querySelector('.screen')?.scrollTop ?? 0);
      this.view.innerHTML = html;
      this.lastHtml = html;
      this.restoreEditingValues();
      const screen = this.view.querySelector('.screen');
      if (screen && keepScroll) screen.scrollTop = keepScroll;
      this.restoreFocus(key, routeChanged, Boolean(scr.overlay), selection);
      attachRedact(this.view.querySelector('[data-redact]'), (r) => this.run('add-rect', r));   // C-04 ใช้งานจริง
    }
    this.lastRoute = this.route;

    // เสียงเตือน: ดังครั้งเดียวเมื่อมีรอบเตือนใหม่ (หลายมื้อพร้อมกันก็ครั้งเดียว — BR-16) · เปิดหน้ากลับไม่เล่นรอบที่ผ่านไปแล้ว (BR-18)
    if (this.role === 'senior') {
      if (!open) { this.wasOpen = false; return; }
      const keys = new Set(snap.meals.filter((m) => m.st.state === 'reminding').map((m) => `${m.id}:${m.st.round}`));
      const fresh = [...keys].some((k) => !this.ringKeys.has(k));
      if (fresh && this.wasOpen && this.sound) this.beep();
      this.ringKeys = keys; this.wasOpen = true;
    }
  }

  tabs(snap, inert) {
    const ringing = snap.meals.filter((m) => m.st.state === 'reminding').length;
    const items = this.role === 'senior'
      ? [['senior-home', tr('หน้าหลัก', 'Home'), 0, 'home'], ['senior-reminder', tr('เตือน', 'Reminders'), ringing, 'bell'], ['senior-settings', tr('ตั้งค่า', 'Settings'), 0, 'gear']]
      : [['cg-status', tr('สถานะ', 'Status'), 0, 'check'], ['cg-alerts', tr('แจ้งเตือน', 'Alerts'), openNotConfirmedCount(this.inbox, snap), 'bell'], ['cg-meds', tr('ยา', 'Medicines'), 0, 'pill'], ['cg-weekly', tr('สรุป', 'Summary'), 0, 'status'], ['cg-settings', tr('ตั้งค่า', 'Settings'), 0, 'gear']];
    return `<nav${inert} class="tabs${this.role === 'caregiver' ? ' tabs-caregiver' : ''}" aria-label="${tr('เมนู', 'Menu')}">` + items.map(([to, label, n, ico]) => {
      const on = this.route === to || (to === 'cg-meds' && /^cg-(meals|photo|cover|ai|draft)$/.test(this.route));
      return `<button type="button" class="tab${on ? ' is-on' : ''}" data-act="go" data-to="${to}" aria-label="${esc(label + (n ? tr(` (${n} รายการ)`, ` (${n} items)`) : ''))}" title="${esc(label)}"${on ? ' aria-current="page"' : ''}>` +
        icon(ico) + `<span class="tab-label">${esc(label)}</span>` +   // ทั้งสองบทบาทมีชื่อใต้ไอคอน (แคนวาส 7 พ.ย.)
         (n ? `<span class="badge" aria-hidden="true">${n}</span>` : '') + '</button>';
    }).join('') + '</nav>';
  }

  // ---------- การกด ----------
  env() {
    return {
      role: this.role, repo: this.repo(), clock: this.ctx.clock, ids: this.ctx.ids, flags: this.ctx.flags, ui: this.ui, snap: this.snap, inbox: this.inbox,
      toast: (m) => this.toast(m), go: (r) => this.go(r), later: (fn, ms) => this.later(fn, ms), cancelLater: () => this.cancelLater(),
      setFlag: (k, v) => { this.ctx.flags[k] = v; }, setInbox: (box) => { this.inbox = box; }, unlockSound: () => this.unlockSound(),
      onUnpaired: () => this.ctx.onUnpaired?.(),
      ai: this.ctx.ai ?? null, ocr: this.ctx.ocr ?? null, photo: this.ctx.photo ?? null, render: () => this.render(),
    };
  }
  async run(act, data) {
    const env = this.env();
    if (act === 'go') this.go(data.to);
    else if (act === 'size-step') { // ปุ่ม − / + (ที่ขอบสุดไม่ทำอะไร: ปุ่มยังโฟกัสได้ ใช้ aria-disabled)
      const i = SIZE_ORDER.indexOf(this.pref.size) + Number(data.dir);
      if (i < 0 || i >= SIZE_ORDER.length) this.toast(() => i < 0 ? tr('เล็กที่สุดแล้ว (ปกติ)', 'Smallest text size (normal)') : tr('ใหญ่ที่สุดแล้ว', 'Largest text size'));
      else { this.pref.size = SIZE_ORDER[i]; this.toast(() => `${tr('ขนาดตัวอักษร', 'Text size')}: ${sizeName(this.pref.size)}`); }
    } else if (act === 'set-theme') { this.pref.theme = data.v; this.toast(() => `${tr('โหมดสี', 'Theme')}: ${data.v === 'dark' ? tr('มืด', 'Dark') : tr('สว่าง', 'Light')}`); }
    else if (act === 'scan-qr') {   // FR-01 ข้อ 1, 3: ผู้ดูแลสแกน QR ด้วยกล้องในแอป → ได้รหัสแล้วเชื่อมต่อให้เลย
      this.stopScan?.();
      this.stopScan = openScanner({
        onText: (text) => { const code = inviteCodeFromScan(text); if (!code) return false; this.ui.codeInput = code; this.run('join'); return true; },
        onFail: (msg) => this.toast(msg),
      });
      return;
    }
    else if (act === 'toast-close') { clearTimeout(this.toastTimer); this.live.innerHTML = ''; this.lastToastHtml = ''; this.toastMessage = null; }
    else if (ACTIONS[act]) await ACTIONS[act](env, data);
    this.ctx.refresh();
  }
  onClick(e) {
    const weeklyButton = e.target.closest('button[data-action]');
    if (this.route === 'cg-weekly' && this.weeklyPage && weeklyButton && this.view.contains(weeklyButton) && !weeklyButton.disabled) {
      void this.weeklyPage.act(weeklyButton.dataset.action);
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    this.run(el.dataset.act, { ...el.dataset });
  }
  onInput(e) {
    const t = e.target, d = t.dataset ?? {};
    if (d.live) this.ui[d.live] = t.value;
    // Keep unsaved edits before a language/timer render, without saving to the repo.
    else if (d.path) {
      (this.editingValues ??= new Map()).set(`path:${d.path}`, t.value);
      ACTIONS['edit-field'](this.env(), { path: d.path, value: t.value });
    } else if (d.time) {
      (this.editingValues ??= new Map()).set(`time:${d.time}`, t.value);
      ACTIONS['set-time'](this.env(), { time: d.time, value: t.value });
    }
  }
  restoreEditingValues() {
    for (const [key, value] of this.editingValues ?? []) {
      const split = key.indexOf(':'), attr = key.slice(0, split), name = key.slice(split + 1).replace(/["\\]/g, '');
      const input = this.view.querySelector(`[data-${attr}="${name}"]`);
      if (input) input.value = value;
    }
  }
  onChange(e) {
    const t = e.target, d = t.dataset;
    if (this.route === 'cg-weekly' && this.weeklyPage && d.action === 'consent') { void this.weeklyPage.act('consent', t.checked); return; }
    if (d.field === 'sample') this.run('set-sample', { value: t.value });
    else if (d.field === 'aiproblem') this.run('set-ai-problem', { value: t.value });
    else if (d.field === 'tick') this.run('set-tick', { checked: t.checked });
    else if (d.field === 'photo') this.run('set-photo', { file: t.files?.[0] ?? null });
    else if (d.time) { this.editingValues?.delete(`time:${d.time}`); this.run('set-time', { time: d.time, value: t.value }); }
    else if (d.path) { this.editingValues?.delete(`path:${d.path}`); this.run('edit-field', { path: d.path, value: t.value }); }
  }
}
