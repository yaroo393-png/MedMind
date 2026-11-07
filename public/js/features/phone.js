// จอมือถือ 1 เครื่อง (ผู้สูงอายุหรือผู้ดูแล): วาดหน้า, คืนโฟกัส, ข้อความสถานะ, แถบล่าง, เสียงเตือน, ส่งการกดไปยังหน้าจอของแต่ละ FR
// เจ้าของ: Nichanan (Demo mode, E-5) · หน้าจอของแต่ละ FR อยู่ในไฟล์ features/<ชื่อ>.js ของเจ้าของ · ทุกหน้าจอมีป้าย "Covers: FR-xx" (กติกา M3)
// ไฟล์นี้เป็นไฟล์เดียวที่แตะ DOM — ตัวหน้าจอ (screens) เป็นฟังก์ชันล้วนที่ทดสอบด้วย node ได้ (DL-26)
import { loadSnapshot } from './model.js';
import { collectAlerts, openNotConfirmedCount } from './alerts.js';
import { esc, icon, mascot, SIZES } from './ui.js';
import { fmtHM } from './format.js';
import * as pairing from './pairing.js';
import * as medicine from './medicineSetup.js';
import * as home from './home.js';
import * as reminder from './reminder.js';
import * as status from './caregiverStatus.js';
import { attachRedact } from './redactTool.js';
import { openScanner } from './qrScan.js';
import { inviteCodeFromScan } from './qr.js';

const FEATURES = [pairing, medicine, home, reminder, status];
export const SCREENS = Object.assign({}, ...FEATURES.map((f) => f.screens));
export const ACTIONS = Object.assign({}, ...FEATURES.map((f) => f.actions));

// หน้าที่ต้องจับคู่แล้วถึงเข้าได้ (FR-01) — ยังไม่จับคู่ให้กลับหน้าจับคู่
const NEEDS_PAIR = new Set(['senior-home', 'senior-reminder', 'senior-settings', 'cg-status', 'cg-alerts', 'cg-meals', 'cg-photo', 'cg-cover', 'cg-ai', 'cg-draft', 'cg-meds', 'cg-settings']);
const FOCUS_ATTRS = ['act', 'v', 'dir', 'to', 'meal', 'key', 'path', 'region', 'field', 'live', 'time', 'i', 'id'];
const SIZE_ORDER = SIZES.map((s) => s[0]);
const SIZE_NAMES = Object.fromEntries(SIZES);

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
    el.addEventListener('input', (e) => { if (e.target.dataset?.live) this.ui[e.target.dataset.live] = e.target.value; });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.ui.dialog) { this.ui.dialog = null; this.render(); return; }
      if (e.key === 'Tab') this.trapTab(e);
    });
    // แตะครั้งแรกบนเครื่องผู้สูงอายุ = ปลดล็อกเสียง (SRS §2.2) · ไม่วาดใหม่ระหว่างกดค้าง (ปุ่มที่กำลังกดจะหาย คลิกไม่ติด)
    el.addEventListener('pointerdown', () => { if (this.role === 'senior' && !this.sound) { this.unlockSound(); this.pendingRender = true; } });
  }

  resetUi() { this.ui = { cover: {}, tick: false, codeInput: '', error: null, dialog: null, draft: null }; }
  /** ผูกกับชุดข้อมูลใหม่ (เริ่มสถานการณ์ใหม่) */
  bind(ctx, route) {
    this.ctx = ctx; this.resetUi(); this.inbox = []; this.ringKeys = new Set(); this.wasOpen = false; this.cancelLater();
    if (route) this.route = route;
  }
  isOpen() { return this.role === 'senior' ? this.ctx.flags.seniorOpen : this.ctx.flags.cgOpen; } // หน้าเว็บปิด = ไม่มีเตือน/แจ้ง (SRS §2.2)
  repo() { return this.role === 'senior' ? this.ctx.seniorRepo : this.ctx.repo; }

  go(route) { this.route = route; this.ui.error = null; this.ui.dialog = null; }
  toast(msg) { // ค้าง 10 วินาที และมีปุ่มปิด — ผู้สูงอายุอ่านทัน (WCAG 2.2.1)
    this.live.innerHTML = `<div class="toast"><span>${esc(msg)}</span><button type="button" class="toast-close" data-act="toast-close">ปิด</button></div>`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.live.innerHTML = ''; }, 10000);
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
  restoreFocus(key, routeChanged, overlay) {
    let target = null;
    if (overlay && !this.hadOverlay) target = this.view.querySelector('.modal [data-act]');
    else if (key && !routeChanged) target = this.view.querySelector(key);
    if (!target && key) target = this.view.querySelector('.screen h1, .screen h2');
    this.hadOverlay = overlay;
    if (!target) return;
    if (/^H[12]$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    target.focus();
  }

  // ---------- การวาด ----------
  async render() {
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

    const model = { role: this.role, snap, ui: this.ui, pref: this.pref, sound: this.sound, inbox: this.inbox, flags: ctx.flags, real: ctx.name === 'real', ctx };
    const scr = SCREENS[this.route](model);
    const showTabs = scr.tabs !== false;
    const inert = scr.overlay ? ' inert' : ''; // กล่องยืนยันเปิด → ส่วนอื่นกด/โฟกัสไม่ได้
    this.el.setAttribute('data-size', this.pref.size);
    this.el.setAttribute('data-theme', this.pref.theme);
    const key = this.focusKey();
    const routeChanged = this.lastRoute !== null && this.lastRoute !== this.route;
    const closedNote = this.role === 'caregiver'
      ? '<h1>หน้า MedMind ของผู้ดูแลถูกปิดอยู่</h1><p>ระบบแจ้งเตือนเฉพาะตอนเปิดหน้าเว็บ (ข้อจำกัดของเว็บแอป) เอาติ๊ก "ผู้ดูแลปิดหน้า MedMind" ออกเพื่อดูแจ้งเตือนที่ค้างอยู่ (BR-18)</p>'
      : '<h1>หน้า MedMind ของผู้สูงอายุถูกปิดอยู่</h1><p>ระบบเตือนเฉพาะตอนเปิดหน้าเว็บ ไม่มีเสียงและไม่มีรอบเตือนจนกว่าจะเปิดหน้า เอาติ๊ก "ผู้สูงอายุปิดหน้า MedMind" ออก แล้วหน้าเตือนจะแสดงมื้อทันที รอบที่ผ่านไปแล้วไม่เล่นซ้ำ (FR-03 ข้อ 5, BR-18)</p>';
    const html = `<div class="phone-inner${open ? '' : ' is-closed'}">` +
      `<header class="appbar"${inert}><span class="role-chip">${this.role === 'senior' ? 'ผู้สูงอายุ' : 'ผู้ดูแล'}</span><span class="appbar-title">${esc(scr.title)}</span><span class="appbar-time">${fmtHM(snap.now)}</span></header>` +
      `<p class="covers"${inert}>Covers: ${esc(scr.covers)}</p>` +
      `<main class="screen"${inert}>${open ? scr.body : `<div class="closed-note">${mascot('concern', 96)}${closedNote}</div>`}</main>` +
      (showTabs && open ? this.tabs(snap, inert) : '') + (scr.overlay ?? '') + '</div>';
    // แอปจริงวาดใหม่ทุกวินาที: ถ้าหน้าตาเหมือนเดิมไม่ต้องแตะ DOM (ไม่กระพริบ ไม่ทิ้งสิ่งที่กำลังพิมพ์)
    // ถ้าเปลี่ยนแต่ยังหน้าเดิม ให้คงตำแหน่งเลื่อนไว้ — เดิมเด้งกลับบนสุดทุกวินาที กดปุ่มด้านล่างไม่ได้
    if (html !== this.lastHtml || routeChanged) {
      const keepScroll = routeChanged ? 0 : (this.view.querySelector('.screen')?.scrollTop ?? 0);
      this.view.innerHTML = html;
      this.lastHtml = html;
      const screen = this.view.querySelector('.screen');
      if (screen && keepScroll) screen.scrollTop = keepScroll;
      this.restoreFocus(key, routeChanged, Boolean(scr.overlay));
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
      ? [['senior-home', 'หน้าหลัก', 0, 'home'], ['senior-reminder', 'เตือน', ringing, 'bell'], ['senior-settings', 'ตั้งค่า', 0, 'gear']]
      : [['cg-status', 'สถานะ', 0, 'status'], ['cg-alerts', 'แจ้งเตือน', openNotConfirmedCount(this.inbox, snap), 'bell'], ['cg-meds', 'ยา', 0, 'pill'], ['cg-settings', 'ตั้งค่า', 0, 'gear']];
    return `<nav${inert} class="tabs" aria-label="เมนู">` + items.map(([to, label, n, ico]) => {
      const on = this.route === to || (to === 'cg-meds' && /^cg-(meals|photo|cover|ai|draft)$/.test(this.route));
      return `<button type="button" class="tab${on ? ' is-on' : ''}" data-act="go" data-to="${to}" aria-label="${esc(label + (n ? ` (${n} รายการ)` : ''))}" title="${esc(label)}"${on ? ' aria-current="page"' : ''}>` +
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
      ai: this.ctx.ai ?? null, photo: this.ctx.photo ?? null, render: () => this.render(),
    };
  }
  async run(act, data) {
    const env = this.env();
    if (act === 'go') this.go(data.to);
    else if (act === 'size-step') { // ปุ่ม − / + (ที่ขอบสุดไม่ทำอะไร: ปุ่มยังโฟกัสได้ ใช้ aria-disabled)
      const i = SIZE_ORDER.indexOf(this.pref.size) + Number(data.dir);
      if (i < 0 || i >= SIZE_ORDER.length) this.toast(i < 0 ? 'เล็กที่สุดแล้ว (ปกติ)' : 'ใหญ่ที่สุดแล้ว');
      else { this.pref.size = SIZE_ORDER[i]; this.toast(`ขนาดตัวอักษร: ${SIZE_NAMES[SIZE_ORDER[i]]}`); }
    } else if (act === 'set-theme') { this.pref.theme = data.v; this.toast(`โหมดสี: ${data.v === 'dark' ? 'มืด' : 'สว่าง'}`); }
    else if (act === 'scan-qr') {   // FR-01 ข้อ 1, 3: ผู้ดูแลสแกน QR ด้วยกล้องในแอป → ได้รหัสแล้วเชื่อมต่อให้เลย
      this.stopScan?.();
      this.stopScan = openScanner({
        onText: (text) => { const code = inviteCodeFromScan(text); if (!code) return false; this.ui.codeInput = code; this.run('join'); return true; },
        onFail: (msg) => this.toast(msg),
      });
      return;
    }
    else if (act === 'toast-close') { clearTimeout(this.toastTimer); this.live.innerHTML = ''; }
    else if (ACTIONS[act]) await ACTIONS[act](env, data);
    this.ctx.refresh();
  }
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    this.run(el.dataset.act, { ...el.dataset });
  }
  onChange(e) {
    const t = e.target, d = t.dataset;
    if (d.field === 'sample') this.run('set-sample', { value: t.value });
    else if (d.field === 'aiproblem') this.run('set-ai-problem', { value: t.value });
    else if (d.field === 'tick') this.run('set-tick', { checked: t.checked });
    else if (d.field === 'photo') this.run('set-photo', { file: t.files?.[0] ?? null });
    else if (d.time) this.run('set-time', { time: d.time, value: t.value });
    else if (d.path) this.run('edit-field', { path: d.path, value: t.value });
  }
}
