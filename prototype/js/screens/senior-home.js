/* FR-04 ยืนยันมื้อยา: S-02 หน้าหลักวันนี้ (ยืนยันย้อนหลัง) + การกด "กินแล้ว" / "ยังไม่กิน" ที่หน้าเตือนและหน้าหลักเรียกใช้
 * เจ้าของ: Nichanan (FR-04) · BR-10, BR-11, BR-12, BR-14, BR-15, BR-21, NFR-07 · ต้นแบบ ข้อมูลสมมติ */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store, U = root.MM.ui;
  var esc = U.esc, btn = U.btn, chip = U.chip, icon = U.icon, logo = U.logo, mascot = U.mascot, hero = U.hero, flag = U.flag, clone = U.clone,
      medList = U.medList, mealCard = U.mealCard, medSummary = U.medSummary, heroCard = U.heroCard, focusMeal = U.focusMeal, dialog = U.dialog, qrGrid = U.qrGrid;
  var SCREENS = root.MM.screens, ACTS = root.MM.acts;
  void M; void S; void esc; void btn; void chip; void icon; void logo; void mascot; void hero; void flag; void clone;
  void medList; void mealCard; void medSummary; void heroCard; void focusMeal; void dialog; void qrGrid;

  SCREENS['senior-home'] = function (p, st) { // S-02
    var meals = S.meals(), f = focusMeal(meals, 'senior'), hero;
    var missed = meals.filter(function (m) { return S.stateFor(m, 'senior', meals).state === 'missed'; }).length;
    if (!meals.length) hero = '<div class="card empty">' + mascot('greeting', 96) + '<h2 class="h-card">วันนี้ไม่มีมื้อยา</h2></div>';
    else if (f && f.st.state === 'reminding') hero = heroCard('encourage', 'ถึงเวลามื้อยาแล้ว', 'มื้อ ' + M.fmtHM(f.meal.T), medSummary(f.meal), btn('light', icon('pill') + 'ดูมื้อนี้', 'go', { to: 'senior-reminder' }));
    else if (f && f.st.state === 'not_confirmed') hero = heroCard('concern', 'มื้อนี้ยังไม่ยืนยัน', 'มื้อ ' + M.fmtHM(f.meal.T), 'ถ้ากินแล้ว กดยืนยันย้อนหลังได้', btn('taken', 'กินแล้ว', 'confirm', { meal: f.meal.id }));
    else if (f) hero = heroCard('greeting', 'มื้อถัดไป', 'มื้อ ' + M.fmtHM(f.meal.T), medSummary(f.meal), '');
    else if (missed) hero = heroCard('concern', 'วันนี้', 'มีมื้อที่พ้นเวลายืนยันแล้ว', 'สถานะยังเป็น "ยังไม่ยืนยัน"', '');
    else hero = heroCard('celebrate', 'วันนี้', 'ยืนยันครบทุกมื้อที่ถึงเวลาแล้ว', '', '');
    var body = '<div class="greet">' + logo('logo-sm') + '<div><h1>สวัสดี</h1><p>' + esc(M.DAY_LABEL) + '</p></div></div>' + hero;
    if (meals.length) body += '<div class="sec-head"><h2>ทุกมื้อวันนี้</h2><span class="count">' + meals.length + ' มื้อ</span></div>';
    meals.forEach(function (m) {
      var s = S.stateFor(m, 'senior', meals), dose = S.doseFor(m.id, 'senior'), extra = '';
      if (s.state === 'not_confirmed') extra = '<p class="hint">ยังกดยืนยันย้อนหลังได้จนถึงเวลาเตือนของมื้อถัดไป</p>' + btn('taken', 'กินแล้ว', 'confirm', { meal: m.id });
      else if (s.state === 'reminding') extra = btn('primary', 'ไปหน้าเตือน', 'go', { to: 'senior-reminder' });
      else if (s.state === 'missed') extra = '<p class="hint">พ้นเวลายืนยันแล้ว — สถานะยังเป็น "ยังไม่ยืนยัน"</p>';
      body += mealCard(m, s, dose, extra);
    });
    return { title: 'หน้าหลัก', covers: 'FR-04, FR-03 · BR-14, BR-15, BR-09', body: body };
  };

  ACTS['confirm'] = function (p, d) {
      var r = S.confirm(d.meal);
      if (r.dup) p.toast('มีบันทึกอยู่แล้ว ไม่สร้างซ้ำ — เวลาเดิม ' + M.fmtHM(r.confirmedAt));
      else if (r.ok) p.toast(r.queued ? 'บันทึกแล้ว ' + M.fmtHM(r.confirmedAt) + ' — จะส่งให้ผู้ดูแลเมื่อออนไลน์' : 'บันทึกแล้ว ' + M.fmtHM(r.confirmedAt));
      else p.toast('พ้นเวลายืนยันแล้ว — กดไม่ได้ สถานะยังเป็น "ยังไม่ยืนยัน"');
    };
  ACTS['notyet'] = function (p, d) {
      var r = S.notYetTap(d.meal); if (!r) return;
      p.toast(r.last ? 'รับทราบ — แจ้งผู้ดูแลแล้ว' : 'จะเตือนอีกครั้งตอน ' + M.fmtHM(r.nextAt));
    };
})(window);
