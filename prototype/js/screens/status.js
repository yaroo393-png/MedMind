/* หน้าจอผู้ดูแลฝั่งติดตาม: C-07 สถานะรายวัน · C-08 แจ้งเตือน
 * เจ้าของ: Rossatorn (UX/UI) ตามตารางผู้ออกแบบ design-system.md §4.1 (DL-05) · FR-05, BR-13, BR-14, BR-18 · ต้นแบบ ข้อมูลสมมติ */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store, U = root.MM.ui;
  var esc = U.esc, btn = U.btn, chip = U.chip, icon = U.icon, logo = U.logo, mascot = U.mascot, hero = U.hero, flag = U.flag, clone = U.clone,
      medList = U.medList, mealCard = U.mealCard, medSummary = U.medSummary, heroCard = U.heroCard, focusMeal = U.focusMeal, dialog = U.dialog, qrGrid = U.qrGrid;
  var SCREENS = root.MM.screens, ACTS = root.MM.acts;
  void M; void S; void esc; void btn; void chip; void icon; void logo; void mascot; void hero; void flag; void clone;
  void medList; void mealCard; void medSummary; void heroCard; void focusMeal; void dialog; void qrGrid;

  SCREENS['cg-status'] = function (p, st) { // C-07
    var meals = S.meals(), al = S.alerts().filter(function (a) { return a.kind === 'not_confirmed'; });
    var due = 0, conf = 0, next = null;
    meals.forEach(function (m) {
      var s = S.stateFor(m, 'cg', meals);
      if (s.state !== 'not_due') due++;
      if (s.state === 'taken' || s.state === 'taken_late') conf++;
      if (s.state === 'not_due' && !next) next = m;
    });
    var pct = due ? Math.round(conf / due * 100) : 0;
    var ringHtml = '<div class="ring" role="img" aria-label="ยืนยันแล้ว ' + conf + ' จาก ' + due + ' มื้อที่ถึงเวลา" style="--p:' + pct + '"><span><b>' + conf + '/' + due + '</b>ยืนยัน</span></div>';
    var big = al.length ? 'มี ' + al.length + ' มื้อยังไม่ยืนยัน' : due ? 'ยืนยันแล้ว ' + conf + ' จาก ' + due + ' มื้อ' : 'ยังไม่ถึงเวลามื้อแรก';
    var body = '<div class="greet">' + logo('logo-sm') + '<div><h1>สถานะยาวันนี้</h1><p>' + esc(M.DAY_LABEL) + '</p></div></div>';
    if (meals.length) body += heroCard('', 'ติดตามการยืนยันของผู้สูงอายุ', big, next ? '<span class="hero-chip">' + icon('clock') + 'มื้อถัดไป · ' + M.fmtHM(next.T) + '</span>' : '', '', ringHtml);
    if (al.length) body += '<div class="banner" role="alert"><strong>ยังไม่ยืนยันการกินยา</strong><p>' + al.map(function (a) { return 'มื้อ ' + M.fmtHM(a.meal.T); }).join(', ') + '</p>' + btn('ghost', icon('bell') + 'ดูแจ้งเตือน', 'go', { to: 'cg-alerts' }) + '</div>';
    if (!meals.length) body += '<div class="card empty">' + mascot('greeting', 96) + '<h2 class="h-card">วันนี้ไม่มีมื้อยา</h2></div>';
    else body += '<div class="sec-head"><h2>ทุกมื้อวันนี้</h2><span class="count">' + meals.length + ' มื้อ</span></div>';
    meals.forEach(function (m) {
      var s = S.stateFor(m, 'cg', meals), dose = S.doseFor(m.id, 'cg');
      body += '<section class="card"><div class="card-head"><h3 class="h-card">มื้อ ' + M.fmtHM(m.T) + '</h3>' + chip(M.statusLabel(s.state, dose && dose.confirmedAt)) + '</div>' +
        '<p class="hint">' + medSummary(m) + '</p></section>';
    });
    body += '<p class="disclaimer">การกดยืนยันเป็นการรายงานด้วยตนเอง ไม่ใช่หลักฐานว่ากินยาจริง</p>';
    return { title: 'สถานะรายวัน', covers: 'FR-05, BR-13, BR-14, BR-18', body: body };
  };

  SCREENS['cg-alerts'] = function (p, st) { // C-08
    var list = S.alerts(), open = list.filter(function (a) { return a.kind === 'not_confirmed'; }).length;
    var body = '<div class="hero-row">' + mascot(open ? 'concern' : 'greeting', 84) + '<div><h1>การแจ้งเตือน</h1><p class="lead">แจ้งเฉพาะมื้อที่ยังไม่ยืนยัน และแจ้งครั้งเดียวต่อมื้อ</p></div></div>';
    if (!list.length) body += '<div class="card empty"><h2 class="h-card">ไม่มีการแจ้งเตือน</h2><p class="hint">ระบบแจ้งเมื่อเลยเวลาเตือน 15 นาทีแล้วยังไม่มีการยืนยัน หรือเมื่อผู้สูงอายุกด "ยังไม่กิน" รอบสุดท้าย</p></div>';
    list.forEach(function (a) {
      var t = M.fmtHM(a.meal.T);
      if (a.kind === 'not_confirmed') {
        var why = st.notYet[a.meal.id] ? 'ผู้สูงอายุกด "ยังไม่กิน" ในรอบเตือนสุดท้าย' : 'เลยเวลา ' + M.fmtHM(a.meal.T + 15 * M.MIN) + ' แล้ว ยังไม่มีการยืนยัน';
        body += '<section class="alert-card" role="alert"><div class="alert-head"><span class="alert-ico">' + icon('bell') + '</span><div><h2 class="h-card">ยังไม่ยืนยันการกินยา</h2><p class="hint">มื้อ ' + t + ' · ' + why + '</p></div></div>' +
          btn('ghost', icon('status') + 'ดูสถานะวันนี้', 'go', { to: 'cg-status' }) + btn('ghost', 'ปิดการแจ้งนี้', 'dismiss', { key: a.key }) + '</section>';
      } else {
        var late = M.confirmStatus(a.meal.T, a.confirmedAt) === 'taken_late';
        body += '<section class="alert-card alert-ok" role="status"><div class="alert-head"><span class="alert-ico ok">' + icon('check') + '</span><div><h2 class="h-card">ยืนยันการกินยาแล้ว เวลา ' + M.fmtHM(a.confirmedAt) + '</h2><p class="hint">มื้อ ' + t + ' · ' +
          (late ? 'ยืนยันย้อนหลัง' : 'กดทันเวลา แต่ข้อมูลมาถึงช้า (เช่น ตอนออฟไลน์)') + '</p></div></div>' + btn('ghost', 'ปิดการแจ้งนี้', 'dismiss', { key: a.key }) + '</section>';
      }
    });
    return { title: 'แจ้งเตือน', covers: 'FR-05, BR-13, BR-15, BR-18', body: body };
  };

  ACTS['dismiss'] = function (p, d) { S.dismiss(d.key); };
})(window);
