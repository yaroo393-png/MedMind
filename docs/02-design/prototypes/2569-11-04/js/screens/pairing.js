/* FR-01 จับคู่และยกเลิกจับคู่ ทั้งสองเครื่อง: S-00 เลือกบทบาท · S-01 จับคู่+ยินยอม · S-04 ตั้งค่า/ยกเลิกจับคู่ (ผู้สูงอายุ) · C-01 จับคู่ · C-09 ตั้งค่า/ยกเลิกจับคู่ (ผู้ดูแล)
 * + การกดของ FR-01 (เลือกบทบาท ยินยอม สร้างรหัสใหม่ กรอกรหัส ผู้ดูแลคนที่สอง ยกเลิก 2 ขั้น)
 * เจ้าของ: Takkan (FR-01) · BR-01, BR-02, BR-17, NFR-05 · ต้นแบบ ข้อมูลสมมติ */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store, U = root.MM.ui;
  var esc = U.esc, btn = U.btn, chip = U.chip, icon = U.icon, logo = U.logo, mascot = U.mascot, hero = U.hero, flag = U.flag, clone = U.clone,
      medList = U.medList, mealCard = U.mealCard, medSummary = U.medSummary, heroCard = U.heroCard, focusMeal = U.focusMeal, dialog = U.dialog, qrGrid = U.qrGrid;
  var SCREENS = root.MM.screens, ACTS = root.MM.acts;
  void M; void S; void esc; void btn; void chip; void icon; void logo; void mascot; void hero; void flag; void clone;
  void medList; void mealCard; void medSummary; void heroCard; void focusMeal; void dialog; void qrGrid;

  SCREENS['role'] = function () { // S-00
    return { title: 'เริ่มใช้ MedMind', covers: 'FR-01 (เลือกบทบาทก่อนจับคู่)', tabs: false, body:
      '<div class="hero">' + mascot('greeting', 132) + '<p class="brand">' + logo('logo-sm') + 'MedMind</p>' +
      '<p class="lead">ดูแลมื้อยาอย่างอุ่นใจ — เตือนทุกมื้อ และบอกผู้ดูแลว่ายืนยันแล้วหรือยัง</p></div>' +
      '<h1 class="h-section">ใช้เครื่องนี้เป็นใคร</h1><p class="lead">ไม่ต้องสมัคร ไม่ต้องมีรหัสผ่าน — เลือกอย่างใดอย่างหนึ่ง</p>' +
      '<button type="button" class="role-card" data-act="pick-role" data-role="senior" data-to="senior-pair">' + icon('senior') + '<span><strong>ผู้สูงอายุ</strong>ใช้เครื่องนี้รับการเตือนกินยา</span></button>' +
      '<button type="button" class="role-card" data-act="pick-role" data-role="caregiver">' + icon('family') + '<span><strong>ผู้ดูแล / ลูกหลาน</strong>ใช้เครื่องนี้ดูสถานะและเพิ่มยา</span></button>' +
      '<p class="hint">ถ้าตั้งค่าให้พ่อแม่ ให้เลือก "ผู้สูงอายุ" บนมือถือของท่าน · เปลี่ยนบทบาทได้ในหน้าตั้งค่า เฉพาะตอนยังไม่จับคู่</p>' +
      '<p class="disclaimer">ไม่ใช่คำแนะนำทางการแพทย์ · การกดยืนยันเป็นการรายงานด้วยตนเอง</p>' };
  };

  SCREENS['senior-pair'] = function (p, st) { // S-01
    var pr = st.pair, expired = st.now > pr.codeAt + 10 * M.MIN, left = Math.max(0, pr.codeAt + 10 * M.MIN - st.now);
    var body;
    if (pr.joined) {
      body = '<h1>เชื่อมต่อแล้ว</h1><p class="lead">ผู้ดูแลเชื่อมต่อกับเครื่องนี้แล้ว</p>' + btn('primary', 'ไปหน้าหลัก', 'go', { to: 'senior-home' });
    } else {
      body = hero('link', 'ให้ลูกหลานสแกน หรือบอกรหัสนี้', 'ไม่ต้องสมัคร ไม่ต้องพิมพ์') +
        '<div class="card center">' + qrGrid(pr.code) + '<p class="hint">QR ตัวอย่าง (ระบบจริง = ลิงก์ที่สแกนด้วยแอปกล้อง)</p>' +
        '<p class="code" aria-label="รหัส 6 หลัก">' + esc(pr.code.slice(0, 3) + ' ' + pr.code.slice(3)) + '</p>' +
        (expired ? '<p class="error">รหัสหมดอายุแล้ว (เกิน 10 นาที)</p>' : '<p class="hint">ใช้ได้ครั้งเดียว · หมดอายุใน ' + M.fmtHMS(left).slice(3) + '</p>') +
        btn('ghost', 'สร้างรหัสใหม่', 'new-code') + '</div>' +
        (pr.consent ? '<div class="card ok-box"><strong>ยินยอมแล้ว</strong><p>รอผู้ดูแลเชื่อมต่อ</p></div>' :
          '<div class="card"><h2>ก่อนยินยอม โปรดอ่าน</h2><ol class="consent"><li>ผู้ดูแลจะเห็น: <b>ยา เวลามื้อ และสถานะการยืนยัน</b></li>' +
          '<li>เพื่ออะไร: <b>แจ้งผู้ดูแลเมื่อมื้อยังไม่ยืนยัน</b></li>' +
          '<li>ฝ่ายใดก็ยกเลิกจับคู่ได้ทุกเมื่อ และ <b>ข้อมูลของคู่นี้จะถูกลบ</b></li></ol>' + btn('taken', 'ยินยอม', 'consent') + '</div>');
    }
    return { title: 'จับคู่ + ยินยอม', covers: 'FR-01, BR-01, BR-02 · NFR-05', body: body };
  };

  SCREENS['senior-settings'] = function (p, st) { // S-04
    var overlay = '';
    if (p.ui.dialog === 'unpair1') overlay = dialog('dlg-' + p.role + '-1', 'ยกเลิกจับคู่?', 'ผู้ดูแลจะเห็นข้อมูลของคุณไม่ได้ทันที และข้อมูลของคู่นี้จะถูกลบ', 'ต่อไป', 'unpair-next');
    if (p.ui.dialog === 'unpair2') overlay = dialog('dlg-' + p.role + '-2', 'ยืนยันอีกครั้ง', 'ยาและประวัติการยืนยันจะถูกลบ ย้อนกลับไม่ได้', 'ยืนยันยกเลิกจับคู่', 'unpair-yes');
    return { title: 'ตั้งค่า', covers: 'FR-01, BR-17 (ยกเลิกจับคู่ 2 ขั้น)', overlay: overlay, body:
      '<h1>ตั้งค่า</h1><div class="card"><p>เสียงเตือน: <b>' + (st.sound ? 'เปิดแล้ว' : 'ยังไม่เปิด (แตะหน้าจอ 1 ครั้ง)') + '</b></p></div>' +
      '<div class="card"><h2>จับคู่</h2><p>' + (st.pair.joined ? 'เชื่อมต่อกับผู้ดูแลแล้ว' : 'ยังไม่ได้จับคู่') + '</p>' + (st.pair.joined ? btn('notyet', 'ยกเลิกจับคู่', 'unpair-ask') : '') + '</div>' };
  };

  SCREENS['cg-pair'] = function (p, st) { // C-01
    var body;
    if (st.pair.joined) {
      body = '<h1>เชื่อมต่อแล้ว</h1><div class="card ok-box"><p>ได้รับข้อมูลหลังผู้สูงอายุยินยอมแล้ว</p></div>' + btn('primary', 'ไปหน้าสถานะ', 'go', { to: 'cg-status' }) +
        '<div class="card"><p class="hint">ทดสอบ: ผู้ดูแลคนที่สองใช้รหัสเดิม</p>' + btn('ghost', 'ลองเชื่อมต่อด้วยรหัสเดิม', 'join-second') + '</div>' + (p.ui.error ? '<p class="error">' + esc(p.ui.error) + '</p>' : '');
    } else {
      body = hero('link', 'เชื่อมต่อกับพ่อแม่', 'สแกน QR ด้วยแอปกล้องของมือถือ หรือกรอกรหัส 6 หลัก') +
        '<label class="field"><span>รหัส 6 หลัก</span><input type="text" inputmode="numeric" maxlength="6" data-live="codeInput" value="' + esc(p.ui.codeInput) + '" autocomplete="off"></label>' +
        (p.ui.error ? '<p class="error" role="alert">' + esc(p.ui.error) + '</p>' : '') +
        btn('primary', 'เชื่อมต่อ', 'join') + btn('ghost', 'เปิดจากลิงก์ QR (เติมรหัสให้)', 'fill-code') +
        '<p class="hint">รหัสตัวอย่างของเครื่องผู้สูงอายุตอนนี้: <b>' + esc(st.pair.code) + '</b></p>';
    }
    return { title: 'จับคู่', covers: 'FR-01, BR-01, BR-02 · NFR-05', tabs: st.pair.joined, body: body };
  };

  SCREENS['cg-settings'] = function (p, st) { // C-09
    var overlay = '';
    if (p.ui.dialog === 'unpair1') overlay = dialog('dlg-' + p.role + '-1', 'ยกเลิกจับคู่?', 'คุณจะเห็นข้อมูลของผู้สูงอายุไม่ได้ทันที และข้อมูลของคู่นี้จะถูกลบ', 'ต่อไป', 'unpair-next');
    if (p.ui.dialog === 'unpair2') overlay = dialog('dlg-' + p.role + '-2', 'ยืนยันอีกครั้ง', 'ยาและประวัติการยืนยันจะถูกลบ ย้อนกลับไม่ได้', 'ยืนยันยกเลิกจับคู่', 'unpair-yes');
    return { title: 'ตั้งค่า', covers: 'FR-01, BR-17 (ยกเลิกจับคู่ 2 ขั้น)', overlay: overlay, body: '<h1>ตั้งค่า</h1>' +
      '<div class="card"><h2>จับคู่</h2><p>' + (st.pair.joined ? 'เชื่อมต่อกับผู้สูงอายุแล้ว' : 'ยังไม่ได้จับคู่') + '</p>' + (st.pair.joined ? btn('notyet', 'ยกเลิกจับคู่', 'unpair-ask') : '') + '</div>' };
  };

  ACTS['pick-role'] = function (p, d) { p.role = d.role; p.go(d.role === 'senior' ? 'senior-pair' : 'cg-pair'); if (p.opts.onRole) p.opts.onRole(d.role); };
  ACTS['consent'] = function (p) { S.consent(); };
  ACTS['new-code'] = function (p) { S.newCode(); p.toast('สร้างรหัสใหม่แล้ว — รหัสเดิมใช้ไม่ได้'); };
  ACTS['fill-code'] = function (p) { p.ui.codeInput = S.s.pair.code; p.render(); };
  ACTS['join'] = function (p) {
      var inp = p.el.querySelector('input[data-live="codeInput"]'); if (inp) p.ui.codeInput = inp.value;
      var r = S.tryJoin(String(p.ui.codeInput).trim());
      p.ui.error = r.ok ? null : r.msg; if (r.ok) p.toast('เชื่อมต่อแล้ว'); p.render();
    };
  ACTS['join-second'] = function (p) { var r = S.tryJoin(S.s.pair.code); p.ui.error = r.ok ? null : r.msg; p.render(); };
  ACTS['unpair-ask'] = function (p) { p.ui.dialog = 'unpair1'; p.render(); };
  ACTS['unpair-next'] = function (p) { p.ui.dialog = 'unpair2'; p.render(); };
  ACTS['unpair-no'] = function (p) { p.ui.dialog = null; p.render(); };
  ACTS['unpair-yes'] = function (p) { p.ui.dialog = null; S.unpair(); p.toast('ยกเลิกจับคู่แล้ว — ข้อมูลของคู่นี้ถูกลบ'); };
})(window);
