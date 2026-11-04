/* จอมือถือของต้นแบบ MedMind — ตัวควบคุม: วาดหน้า, คืนโฟกัส, ข้อความสถานะ, แถบล่าง, เสียงเตือน, ส่งการกดไปยังหน้าจอแต่ละกลุ่ม
 * เจ้าของ: Nichanan (Prototype Dev, E-5) · หน้าจอแต่ละกลุ่มอยู่ใน js/screens/ ของเจ้าของหน้านั้น · ทุกหน้าจอมีป้าย "Covers: FR-xx" (กติกา M3) */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store, U = root.MM.ui;
  var esc = U.esc, clone = U.clone, icon = U.icon, mascot = U.mascot;
  var SCREENS = root.MM.screens = {}, ACTS = root.MM.acts = {};

  // ---------- ตัวจอ ----------
  function Phone(el, role, opts) {
    this.el = el; this.role = role; this.opts = opts || {};
    this.route = this.opts.route || (role === 'senior' ? 'senior-home' : 'cg-status');
    this.ui = { times: clone(S.s.mealTimes), sample: 'ok', cover: {}, tick: false, codeInput: '', error: null };
    this.toastTimer = null; this.aiTimer = null; this.audio = null;
    // view = ส่วนที่วาดใหม่ทุกครั้ง · live = กล่องข้อความสถานะที่ไม่ถูกวาดทับ screen reader จึงอ่านได้ (WCAG 4.1.3)
    el.innerHTML = '<div class="view"></div><div class="toast-region" role="status" aria-live="polite"></div>';
    this.view = el.firstChild; this.live = el.lastChild; this.hadOverlay = false; this.lastRoute = null;
    var self = this;
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.ui.dialog) { self.ui.dialog = null; self.render(); return; }
      if (e.key === 'Tab') self.trapTab(e); // กล่องยืนยันเปิดอยู่ → Tab วนอยู่ในกล่อง
    });
    el.addEventListener('click', function (e) {
      self.onClick(e);
      if (self.pendingRender) { self.pendingRender = false; S.notify(); } // วาดใหม่หลังคลิก เพื่อไม่ให้ปุ่มหายก่อนปล่อยนิ้ว
    });
    el.addEventListener('change', function (e) { self.onChange(e); });
    el.addEventListener('input', function (e) { if (e.target.dataset.live) self.ui[e.target.dataset.live] = e.target.value; });
    // แตะครั้งแรกบนเครื่องผู้สูงอายุ = ปลดล็อกเสียง (SRS §2.2) · ตั้งค่าเงียบ ๆ ไม่วาดหน้าใหม่ระหว่างกดค้าง
    el.addEventListener('pointerdown', function () {
      if (self.role === 'senior' && !S.s.sound) { self.unlockAudio(); S.s.sound = true; self.pendingRender = true; }
    });
    S.subscribe(function () { self.render(); });
    this.render();
  }
  var P = Phone.prototype;

  P.go = function (route) { this.route = route; this.ui.error = null; this.ui.dialog = null; this.render(); };
  // ข้อความสถานะ: ค้าง 10 วินาที และมีปุ่มปิด — ผู้สูงอายุอ่านทัน (WCAG 2.2.1)
  P.toast = function (msg) {
    var self = this;
    this.live.innerHTML = '<div class="toast"><span>' + esc(msg) + '</span><button type="button" class="toast-close" data-act="toast-close">ปิด</button></div>';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(function () { self.live.innerHTML = ''; }, 10000);
  };

  // ---------- โฟกัส (WCAG 2.4.3) ----------
  P.trapTab = function (e) {
    var m = this.view.querySelector('.modal'); if (!m) return;
    var f = m.querySelectorAll('button:not([disabled])'); if (!f.length) return;
    var first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (!m.contains(cur)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  };
  var FOCUS_ATTRS = ['act', 'to', 'meal', 'key', 'path', 'region', 'role', 'field', 'live', 'time', 'i', 'id'];
  // จำว่ากำลังโฟกัสปุ่มไหน (จาก data-*) เพื่อคืนโฟกัสหลังวาดหน้าใหม่
  P.focusKey = function () {
    var a = document.activeElement;
    if (!a || !this.view.contains(a)) return null;
    var sel = a.tagName.toLowerCase();
    FOCUS_ATTRS.forEach(function (k) { if (a.dataset && a.dataset[k] !== undefined) sel += '[data-' + k + '="' + String(a.dataset[k]).replace(/["\\]/g, '') + '"]'; });
    return sel;
  };
  // กล่องยืนยันเพิ่งเปิด → โฟกัสปุ่มแรกในกล่อง · หน้าเดิม → ปุ่มเดิม · ปุ่มหาย/เปลี่ยนหน้า → หัวข้อของหน้า
  P.restoreFocus = function (key, routeChanged, overlay) {
    var target = null;
    if (overlay && !this.hadOverlay) target = this.view.querySelector('.modal [data-act]');
    else if (key && !routeChanged) target = this.view.querySelector(key);
    if (!target && key) target = this.view.querySelector('.screen h1, .screen h2');
    this.hadOverlay = overlay;
    if (!target) return;
    if (/^H[12]$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    target.focus();
  };
  P.unlockAudio = function () {
    try { if (!this.audio) this.audio = new (root.AudioContext || root.webkitAudioContext)(); if (this.audio.state === 'suspended') this.audio.resume(); } catch (e) { this.audio = null; }
  };
  P.beep = function () { // เสียงเตือนด้วย Web Audio (ADR-13) — ไม่มีไฟล์เสียง
    var ctx = this.audio; if (!ctx) return;
    [0, 0.35].forEach(function (d) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.25);
    });
  };

  var NEEDS_PAIR = { 'senior-settings': 1, 'cg-settings': 1, 'senior-home': 1, 'senior-reminder': 1, 'cg-meals': 1, 'cg-photo': 1, 'cg-cover': 1, 'cg-ai': 1, 'cg-draft': 1, 'cg-meds': 1, 'cg-status': 1, 'cg-alerts': 1 };

  P.render = function () {
    var st = S.s;
    if (NEEDS_PAIR[this.route] && !st.pair.joined) this.route = this.role === 'senior' ? 'senior-pair' : 'cg-pair';
    var fn = SCREENS[this.route] || SCREENS['role'];
    var scr = fn(this, st);
    var tabs = this.role === 'senior' ? tabsSenior(this, st) : tabsCaregiver(this, st);
    var showTabs = scr.tabs !== false && this.route !== 'role';
    var closed = this.role === 'caregiver' ? !st.flags.cgOpen : !st.flags.seniorOpen; // หน้าเว็บปิดอยู่ = ไม่มีการเตือน/แจ้ง (SRS §2.2)
    var key = this.focusKey(), routeChanged = this.lastRoute !== null && this.lastRoute !== this.route;
    var inert = scr.overlay ? ' inert' : ''; // กล่องยืนยันเปิด → ส่วนอื่นกด/โฟกัสไม่ได้ (WCAG 2.4.3)
    this.view.innerHTML =
      '<div class="phone-inner' + (closed ? ' is-closed' : '') + '">' +
      '<header class="appbar"' + inert + '><span class="role-chip">' + (this.route === 'role' ? 'MedMind' : (this.role === 'senior' ? 'ผู้สูงอายุ' : 'ผู้ดูแล')) + '</span>' +
      '<span class="appbar-title">' + esc(scr.title) + '</span><span class="appbar-time">' + M.fmtHM(st.now) + '</span></header>' +
      '<p class="covers"' + inert + '>Covers: ' + esc(scr.covers) + '</p>' +
      '<main class="screen"' + inert + '>' + (closed ? '<div class="closed-note">' + mascot('concern', 96) + (this.role === 'caregiver'
        ? '<h1>หน้า MedMind ของผู้ดูแลถูกปิดอยู่</h1><p>ระบบแจ้งเตือนเฉพาะตอนเปิดหน้าเว็บ (ข้อจำกัดของเว็บแอป) เอาติ๊ก "ผู้ดูแลปิดหน้า MedMind" ออกเพื่อดูแจ้งเตือนที่ค้างอยู่ (BR-18)</p>'
        : '<h1>หน้า MedMind ของผู้สูงอายุถูกปิดอยู่</h1><p>ระบบเตือนเฉพาะตอนเปิดหน้าเว็บ ไม่มีเสียงและไม่มีรอบเตือนจนกว่าจะเปิดหน้า เอาติ๊ก "ผู้สูงอายุปิดหน้า MedMind" ออก แล้วหน้าเตือนจะแสดงมื้อทันที รอบที่ผ่านไปแล้วไม่เล่นซ้ำ (FR-03 ข้อ 5, BR-18)</p>') + '</div>' : scr.body) + '</main>' +
      (showTabs && !closed ? tabs.replace('<nav ', '<nav' + inert + ' ') : '') +
      (scr.overlay || '') + '</div>';
    this.restoreFocus(key, routeChanged, !!scr.overlay);
    this.lastRoute = this.route;
    if (this.role === 'senior' && st.pendingBeep && st.sound) { st.pendingBeep = false; this.beep(); }
  };

  P.onChange = function (e) {
    var t = e.target, d = t.dataset;
    if (d.field === 'sample') { this.ui.sample = t.value; return; }
    if (d.field === 'aiproblem') { S.setAiProblem(t.value); return; }
    if (d.field === 'tick') { this.ui.tick = t.checked; this.render(); return; }
    if (d.time) { this.ui.times[d.time] = t.value; return; }
    if (d.path && this.editDraft) { this.editDraft(d.path, t); } // editDraft อยู่ใน screens/medicine.js
  };

  P.onClick = function (e) {
    var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    var fn = ACTS[el.dataset.act]; if (fn) fn(this, el.dataset, el);
  };


  // ---------- การกระทำกลาง ----------
  ACTS['go'] = function (p, d) { p.go(d.to); };
  ACTS['toast-close'] = function (p) { clearTimeout(p.toastTimer); p.live.innerHTML = ''; };

  // ---------- แถบล่าง ----------
  function tabsSenior(p, st) {
    var meals = S.meals(), n = meals.filter(function (m) { return S.stateFor(m, 'senior', meals).state === 'reminding'; }).length;
    return tabsHtml(p, [['senior-home', 'หน้าหลัก', 0, 'home'], ['senior-reminder', 'เตือน', n, 'bell'], ['senior-settings', 'ตั้งค่า', 0, 'gear']]);
  }
  function tabsCaregiver(p, st) {
    return tabsHtml(p, [['cg-status', 'สถานะ', 0, 'status'], ['cg-alerts', 'แจ้งเตือน', S.alerts().filter(function (a) { return a.kind === 'not_confirmed'; }).length, 'bell'],
      ['cg-meds', 'ยา', 0, 'pill'], ['cg-settings', 'ตั้งค่า', 0, 'gear']]);
  }
  function tabsHtml(p, items) {
    return '<nav class="tabs" aria-label="เมนู">' + items.map(function (t) {
      var on = p.route === t[0] || (t[0] === 'cg-meds' && /^cg-(meals|photo|cover|ai|draft)$/.test(p.route));
      return '<button type="button" class="tab' + (on ? ' is-on' : '') + '" data-act="go" data-to="' + t[0] + '"' + (on ? ' aria-current="page"' : '') + '>' +
        icon(t[3]) + esc(t[1]) + (t[2] ? '<span class="badge">' + t[2] + '</span>' : '') + '</button>';
    }).join('') + '</nav>';
  }

  root.MM.Phone = Phone;
})(window);
