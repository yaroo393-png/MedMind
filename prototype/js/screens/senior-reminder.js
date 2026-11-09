/* FR-03 เตือนกินยา: S-03 หน้าเตือน (ยาทั้งมื้อ ปุ่มกินแล้ว/ยังไม่กิน กล่องเปิดเสียง) + การเปิดเสียงหลังแตะครั้งแรก
 * เจ้าของ: Rossatorn (FR-03) · BR-08, BR-09, BR-16, BR-21, ADR-13 · ปุ่มกินแล้ว/ยังไม่กิน เรียกการกดของ FR-04 (screens/senior-home.js) · ต้นแบบ ข้อมูลสมมติ */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store, U = root.MM.ui;
  var esc = U.esc, btn = U.btn, chip = U.chip, icon = U.icon, logo = U.logo, mascot = U.mascot, hero = U.hero, flag = U.flag, clone = U.clone,
      medList = U.medList, mealCard = U.mealCard, medSummary = U.medSummary, heroCard = U.heroCard, focusMeal = U.focusMeal, dialog = U.dialog, qrGrid = U.qrGrid;
  var SCREENS = root.MM.screens, ACTS = root.MM.acts;
  void M; void S; void esc; void btn; void chip; void icon; void logo; void mascot; void hero; void flag; void clone;
  void medList; void mealCard; void medSummary; void heroCard; void focusMeal; void dialog; void qrGrid;

  SCREENS['senior-reminder'] = function (p, st) { // S-03
    var meals = S.meals(), body = '', done = '';
    var ring = meals.filter(function (m) { return S.stateFor(m, 'senior', meals).state === 'reminding'; });
    meals.forEach(function (m) {
      var s = S.stateFor(m, 'senior', meals), dose = S.doseFor(m.id, 'senior');
      if (s.state === 'reminding') {
        body += '<section class="remind" aria-label="มื้อ ' + M.fmtHM(m.T) + '">' +
          '<p class="round-pill">' + icon('bell') + 'เตือนรอบที่ ' + (s.round + 1) + ' จาก 3</p>' +
          '<h2>มื้อ ' + M.fmtHM(m.T) + '</h2>' +
          '<div class="card card-alert"><p class="hint">ยาทั้งมื้อ · ' + m.medicines.length + ' รายการ</p>' + medList(m) + '</div>' +
          '<div class="choice">' + btn('taken', icon('check') + 'กินแล้ว', 'confirm', { meal: m.id }) + btn('notyet', 'ยังไม่กิน', 'notyet', { meal: m.id }) + '</div>' +
          '<p class="hint center">กด "กินแล้ว" ครั้งเดียว ยืนยันยาทั้งมื้อนี้</p></section>';
      } else if (dose && (s.state === 'taken' || s.state === 'taken_late')) {
        done += '<section class="card"><div class="card-head"><h2 class="h-card">มื้อ ' + M.fmtHM(m.T) + '</h2>' + chip(M.statusLabel(s.state, dose.confirmedAt)) + '</div>' +
          (dose.pending ? '<p class="hint">รอส่งให้ผู้ดูแล — จะส่งเมื่อกลับมาออนไลน์</p>' : '') +
          btn('ghost', 'กด "กินแล้ว" ซ้ำ (ทดสอบ BR-12)', 'confirm', { meal: m.id }) + '</section>';
      }
    });
    if (ring.length) {
      body = '<div class="hero-row">' + mascot('encourage', 84) + '<div><h1>ถึงเวลามื้อยาแล้ว</h1>' +
        (ring.length > 1 ? '<p class="lead">มี ' + ring.length + ' มื้อพร้อมกัน — เรียงตามเวลา แต่ละมื้อมีปุ่มของตัวเอง เสียงดังครั้งเดียว (BR-16)</p>' : '') + '</div></div>' + body;
    } else {
      body = '<div class="card empty">' + mascot(done ? 'celebrate' : 'greeting', 96) + '<h1 class="h-section">ยังไม่มีมื้อที่ต้องกินตอนนี้</h1><p class="hint">กดปุ่มเวลาจำลองด้านบนเพื่อไปถึงเวลาเตือน</p></div>';
    }
    if (done) body += '<div class="sec-head"><h2>ยืนยันแล้ววันนี้</h2></div>' + done;
    var bar = '', overlay = '';
    if (ring.length && !st.sound) {
      bar = '<button type="button" class="sound-bar" data-act="unlock-sound">' + icon('bell') + 'แตะหน้าจอเพื่อเปิดเสียง</button>';
      overlay = '<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="snd-' + p.role + '"><div class="modal-box">' + mascot('encourage', 96) +
        '<h2 id="snd-' + p.role + '">ถึงเวลากินยา</h2><p>มี ' + ring.length + ' มื้อที่ต้องกิน</p>' + btn('primary', 'เปิดเสียงและดูยา', 'unlock-sound') + '</div></div>';
    }
    return { title: 'เตือนกินยา', covers: 'FR-03, FR-04 · BR-08, BR-09, BR-10, BR-11, BR-12, BR-16', body: bar + body, overlay: overlay };
  };

  ACTS['unlock-sound'] = function (p) { p.unlockAudio(); S.unlockSound(); };
})(window);
