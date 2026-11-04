/* เปลือกของหน้าต้นแบบ: แถบเวลาจำลอง + สถานการณ์ + เปิดจอมือถือ (app.html = 1 จอ, demo.html = 2 จอคู่กัน) */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store, Phone = root.MM.Phone;

  var PRESETS = [
    ['fresh', 'เริ่มใหม่ (ยังไม่จับคู่)'],
    ['sample', 'ข้อมูลตัวอย่าง 06:40 (จับคู่แล้ว)'],
    ['reminding', '07:00 — ถึงเวลาเตือน 2 มื้อพร้อมกัน'],
    ['round2', '07:10 — เตือนรอบที่ 3 (T+10)'],
    ['notconfirmed', '07:16 — เลย T+15 ยังไม่ยืนยัน'],
    ['late', '07:40 — ยืนยันย้อนหลังได้'],
    ['offline', '07:05 — ผู้สูงอายุออฟไลน์'],
    ['syncdelay', '06:59 — ออฟไลน์ กดทันเวลา แล้วข้อมูลมาถึงช้า (FR-04/05 ข้อ 8–9)']
  ];

  function mountToolbar(el) {
    el.innerHTML =
      '<div class="clockbar" role="group" aria-label="นาฬิกาจำลองและสถานการณ์">' +
      '<span>เวลาจำลอง</span><span class="time" id="tb-time">--:--:--.---</span>' +
      '<button type="button" class="tb" data-tb="m1">+1 นาที</button>' +
      '<button type="button" class="tb" data-tb="m5">+5 นาที</button>' +
      '<button type="button" class="tb" data-tb="m15">+15 นาที</button>' +
      '<button type="button" class="tb" data-tb="ms1">+1 มิลลิวินาที</button>' +
      '<button type="button" class="tb" data-tb="next">ไปเวลาเตือนถัดไป</button>' +
      '<button type="button" class="tb" data-tb="edge">ไป T+15 พอดี</button>' +
      '<button type="button" class="tb" data-tb="late">ไปหลัง T+15 (1 มิลลิวินาที)</button></div>' +
      '<form class="clockbar" id="tb-form" novalidate><label for="tb-set">ตั้งเวลาจำลอง</label>' +
      '<input type="text" id="tb-set" class="tb-input" inputmode="numeric" autocomplete="off" placeholder="12:00:00.000" aria-describedby="tb-msg">' +
      '<button type="submit" class="tb">ไปที่เวลา</button>' +
      '<span id="tb-msg" class="note" role="status">รูปแบบ HH:MM · HH:MM:SS · HH:MM:SS.mmm (เดินหน้าอย่างเดียว)</span></form>' +
      '<div class="clockbar"><label><input type="checkbox" id="tb-off"> ผู้สูงอายุออฟไลน์</label>' +
      '<label><input type="checkbox" id="tb-sr"> ผู้สูงอายุปิดหน้า MedMind</label>' +
      '<label><input type="checkbox" id="tb-cg"> ผู้ดูแลปิดหน้า MedMind</label>' +
      '<label><input type="checkbox" id="tb-ai"> AI ใช้ไม่ได้</label>' +
      '<label>สถานการณ์ <select id="tb-preset">' + PRESETS.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('') + '</select></label>' +
      '<button type="button" class="tb" data-tb="preset">ใช้สถานการณ์นี้</button></div>';
    var sel = el.querySelector('#tb-preset'), time = el.querySelector('#tb-time'), off = el.querySelector('#tb-off'), cg = el.querySelector('#tb-cg'), sr = el.querySelector('#tb-sr'), ai = el.querySelector('#tb-ai');
    function sync() {
      time.textContent = M.fmtHMSms(S.s.now);
      if (S.s.presetName && sel.value !== S.s.presetName && !sel.matches(':focus')) sel.value = S.s.presetName;
      off.checked = S.s.flags.seniorOffline; cg.checked = !S.s.flags.cgOpen; ai.checked = !!S.s.flags.aiProblem; sr.checked = !S.s.flags.seniorOpen;
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tb]'); if (!b) return;
      var k = b.dataset.tb;
      if (k === 'm1') S.advance(M.MIN);
      else if (k === 'm5') S.advance(5 * M.MIN);
      else if (k === 'm15') S.advance(15 * M.MIN);
      else if (k === 'ms1') S.advance(1);
      else if (k === 'next') S.jumpNextReminder();
      else if (k === 'edge') S.jumpAtDeadline();
      else if (k === 'late') S.jumpPastDeadline();
      else if (k === 'preset') S.preset(el.querySelector('#tb-preset').value);
    });
    var form = el.querySelector('#tb-form'), setIn = el.querySelector('#tb-set'), msg = el.querySelector('#tb-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = S.setClockTo(setIn.value);
      if (r.ok) { msg.textContent = 'ไปที่ ' + M.fmtHMSms(r.ms) + ' แล้ว'; setIn.setAttribute('aria-invalid', 'false'); }
      else {
        msg.textContent = r.reason === 'back' ? 'ย้อนเวลาไม่ได้ (เวลาตอนนี้ ' + M.fmtHMSms(S.s.now) + ') — เลือก "สถานการณ์" แล้วกด "ใช้สถานการณ์นี้" เพื่อเริ่มใหม่'
          : 'รูปแบบไม่ถูกต้อง — พิมพ์เช่น 12:00 หรือ 12:00:00.001';
        setIn.setAttribute('aria-invalid', 'true'); setIn.focus();
      }
    });
    off.addEventListener('change', function () { S.setOffline(off.checked); });
    cg.addEventListener('change', function () { S.setCgOpen(!cg.checked); });
    sr.addEventListener('change', function () { S.setSeniorOpen(!sr.checked); });
    ai.addEventListener('change', function () { S.setAiDown(ai.checked); });
    S.subscribe(sync); sync();
  }

  function query() {
    var o = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) o[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return o;
  }

  // หน้า 1 จอ: สลับบทบาทในจอเดียว (ข้อมูลชุดเดียวกัน) · #route เปิดหน้าตรง ๆ
  function bootApp() {
    var q = query();
    S.init({ key: 'mm-proto-app', preset: q.preset || null, defaultPreset: 'fresh' });
    mountToolbar(document.getElementById('toolbar'));
    var hash = location.hash.replace('#', ''), start = hash || (S.s.pair.joined ? 'senior-home' : 'role');
    var role = /^cg-/.test(start) ? 'caregiver' : 'senior';
    var bar = document.getElementById('rolebar');
    var phone;
    function markRole() { Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) { b.classList.toggle('is-on', b.dataset.role === phone.role); }); }
    phone = new Phone(document.getElementById('phone'), role, { route: start, onRole: function () { markRole(); } });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-role]'); if (!b) return;
      phone.role = b.dataset.role; phone.go(phone.role === 'senior' ? 'senior-home' : 'cg-status'); markRole();
    });
    window.addEventListener('hashchange', function () {
      var h = location.hash.replace('#', ''); if (!h) return;
      phone.role = /^cg-/.test(h) ? 'caregiver' : 'senior'; phone.go(h); markRole();
    });
    markRole();
    root.MM.phone = phone;
  }

  // หน้า 2 จอ (Demo mode): ผู้สูงอายุ + ผู้ดูแลคู่กัน ใช้ข้อมูลเดียวกัน
  function bootDemo() {
    var q = query();
    S.init({ key: 'mm-proto-demo', preset: q.preset || null, defaultPreset: 'sample' });
    mountToolbar(document.getElementById('toolbar'));
    root.MM.senior = new Phone(document.getElementById('phone-senior'), 'senior', { route: 'senior-reminder' });
    root.MM.caregiver = new Phone(document.getElementById('phone-cg'), 'caregiver', { route: 'cg-status' });
  }

  root.MM.bootApp = bootApp;
  root.MM.bootDemo = bootDemo;
})(window);
