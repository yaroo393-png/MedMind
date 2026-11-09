/* เพิ่มยาจากฉลาก: C-02 ตั้งเวลามื้อ · C-03 ถ่ายรูปฉลาก · C-04 ปิดชื่อ/HN · C-05 AI อ่าน/ตรวจร่าง/กรอกเอง · C-06 รายการยา
 * เจ้าของ: Yar Oo (PM, FR-02) ตาม design-system.md §4.1 (DL-05, PD-10) · BR-04–BR-07, BR-19, NFR-06, NFR-14 · ต้นแบบ ข้อมูลสมมติ (ไม่มีรูปฉลากจริง) */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store, U = root.MM.ui;
  var esc = U.esc, btn = U.btn, chip = U.chip, icon = U.icon, logo = U.logo, mascot = U.mascot, hero = U.hero, flag = U.flag, clone = U.clone,
      medList = U.medList, mealCard = U.mealCard, medSummary = U.medSummary, heroCard = U.heroCard, focusMeal = U.focusMeal, dialog = U.dialog, qrGrid = U.qrGrid;
  var SCREENS = root.MM.screens, ACTS = root.MM.acts;
  void M; void S; void esc; void btn; void chip; void icon; void logo; void mascot; void hero; void flag; void clone;
  void medList; void mealCard; void medSummary; void heroCard; void focusMeal; void dialog; void qrGrid;

  function labelMock(cover) {
    function part(region, text) { return '<span class="lm-part' + (cover && cover[region] ? ' is-covered' : '') + '">' + (cover && cover[region] ? '&nbsp;' : esc(text)) + '</span>'; }
    return '<div class="label-mock" aria-label="ฉลากสมมติ"><p class="lm-title">โรงพยาบาลตัวอย่าง (ฉลากสมมติ)</p>' +
      '<p>ชื่อ: ' + part('name', 'นามสมมติ ตัวอย่างใจดี') + ' &nbsp; HN: ' + part('hn', '0000000') + '</p>' +
      '<p>ยาตัวอย่าง · วันละ 3 ครั้ง หลังอาหาร</p><p>' + part('barcode', '||| |||| || |||') + '</p></div>';
  }

  var P = root.MM.Phone.prototype;
  P.startDraft = function () {
    var sm = M.LABEL_SAMPLES[this.ui.sample] || M.LABEL_SAMPLES.ok;
    this.ui.manualReason = null;
    if (!sm.draft) { this.ui.draft = null; this.ui.asNeeded = true; } else { this.ui.draft = clone(sm.draft); this.ui.asNeeded = false; }
    this.go('cg-draft');
  };
  P.startManual = function (why) {
    this.ui.asNeeded = false; this.ui.manualReason = why;
    this.ui.draft = { name: '', warnings: null, contraindications: null, slots: [{ meal: null, timing: null, minutesBefore: null, tabletsPerDose: null }] };
    this.go('cg-draft');
  };
  P.editDraft = function (path, t) {
    var dr = this.ui.draft; if (!dr) return;
    var parts = path.split('.'), v = t.value;
    if (parts[0] === 'slot') {
      var s = dr.slots[Number(parts[1])], k = parts[2];
      if (k === 'meal' || k === 'timing') s[k] = v === '' ? null : v;
      else s[k === 'minutes' ? 'minutesBefore' : 'tabletsPerDose'] = v === '' ? null : Number(v);
      if (k === 'timing' && v !== 'before_meal') s.minutesBefore = null;
      if (k === 'timing' && v === 'at_bedtime') s.meal = 'bedtime';
    } else dr[parts[0]] = v === '' ? null : v;
    this.render();
  };

  SCREENS['cg-meals'] = function (p, st) { // C-02
    var rows = ['breakfast', 'lunch', 'dinner', 'bedtime'].map(function (k) {
      return '<label class="field"><span>มื้อ' + M.MEAL_NAMES[k] + '</span><input type="time" data-time="' + k + '" value="' + esc(p.ui.times[k]) + '"></label>';
    }).join('');
    return { title: 'ตั้งเวลามื้อ', covers: 'FR-02, BR-06', body: '<h1>เวลามื้ออาหาร</h1><p class="lead">ตั้งตอนเพิ่มยาตัวแรก — เวลาเตือนของยาคำนวณจากฉลากเท่านั้น ไม่เดา</p>' +
      rows + btn('primary', 'บันทึกเวลามื้อ', 'save-meals') + btn('ghost', 'เพิ่มยาจากฉลาก', 'start-add') };
  };

  SCREENS['cg-photo'] = function (p, st) { // C-03
    var opts = Object.keys(M.LABEL_SAMPLES).map(function (k) { return '<option value="' + k + '"' + (p.ui.sample === k ? ' selected' : '') + '>' + esc(M.LABEL_SAMPLES[k].title) + '</option>'; }).join('');
    return { title: 'ถ่ายรูปฉลาก', covers: 'FR-02, BR-19', body: hero('camera', 'ถ่ายรูปฉลากยา', 'ถ่ายเฉพาะฉลาก ให้ตัวหนังสือชัด') +
      '<div class="card warn"><strong>ปิดชื่อและ HN ก่อนส่ง</strong><p>ขั้นต่อไปจะให้ลากปิดชื่อ HN และบาร์โค้ด ก่อนส่งให้ AI</p></div>' + labelMock(null) +
      '<label class="field"><span>ฉลากตัวอย่างที่ AI จะ "อ่าน" (จำลอง)</span><select data-field="sample">' + opts + '</select></label>' +
      '<label class="field"><span>จำลองปัญหาของบริการ AI (FR-02 ข้อ 5)</span><select data-field="aiproblem"><option value=""' + (st.flags.aiProblem ? '' : ' selected') + '>ไม่มีปัญหา</option>' +
        Object.keys(M.AI_PROBLEMS).map(function (k) { return '<option value="' + k + '"' + (st.flags.aiProblem === k ? ' selected' : '') + '>' + esc(M.AI_PROBLEMS[k]) + '</option>'; }).join('') + '</select></label>' +
      btn('primary', 'ถ่ายรูป (ตัวอย่าง)', 'go', { to: 'cg-cover' }) };
  };

  SCREENS['cg-cover'] = function (p, st) { // C-04
    var c = p.ui.cover, all = c.name && c.hn && c.barcode;
    function tog(r, label) { return '<button type="button" class="btn btn-ghost btn-small' + (c[r] ? ' is-on' : '') + '" data-act="cover-toggle" data-region="' + r + '">' + (c[r] ? 'เปิดคืน ' : 'ปิด ') + label + '</button>'; }
    return { title: 'ปิดชื่อ/HN', covers: 'FR-02, BR-19, NFR-14', body: hero('shield', 'ปิดชื่อ HN และบาร์โค้ด', 'ก่อนส่งให้ AI ทุกครั้ง') + labelMock(c) +
      '<div class="row">' + tog('name', 'ชื่อ') + tog('hn', 'HN') + tog('barcode', 'บาร์โค้ด') + '</div>' +
      (all ? '' : '<p class="error">ในภาพที่จะส่ง ยังเห็นข้อมูลส่วนตัวอยู่</p>') +
      '<p class="hint">ภาพข้างบนคือภาพที่จะส่งจริง · ระบบวาดภาพใหม่ ลบข้อมูลไฟล์ และไม่เก็บต้นฉบับ</p>' +
      '<div class="card warn"><p>ถ้าใช้บริการ AI แบบฟรี ผู้ให้บริการอาจนำข้อมูลที่ส่งไปปรับปรุงผลิตภัณฑ์ จึงต้องปิดชื่อและ HN ก่อนส่งทุกครั้ง</p></div>' +
      '<label class="check"><input type="checkbox" data-field="tick"' + (p.ui.tick ? ' checked' : '') + '> ปิดชื่อและ HN แล้ว</label>' +
      '<button type="button" class="btn btn-primary" data-act="send-ai"' + (p.ui.tick ? '' : ' disabled') + '>ส่งให้ AI</button>' +
      (p.ui.tick ? '' : '<p class="hint">ยังไม่ติ๊ก — ปุ่มส่งปิดอยู่ จะไม่มีอะไรถูกส่งออก</p>') + btn('ghost', 'ยกเลิก', 'cancel-draft') };
  };

  SCREENS['cg-ai'] = function () { // C-05 (กำลังอ่าน)
    return { title: 'AI กำลังอ่าน', covers: 'FR-02, ADR-3, NFR-08', tabs: false, body: hero('sparkle', 'AI กำลังอ่านฉลาก…', '') + '<div class="spinner" aria-hidden="true"></div><p class="hint">AI แค่ร่าง — คุณต้องตรวจทุกช่องก่อนบันทึก</p>' + btn('ghost', 'ยกเลิก', 'cancel-draft') };
  };

  SCREENS['cg-draft'] = function (p, st) { // C-05 (ร่าง / กรอกเอง / ยาเมื่อมีอาการ)
    if (p.ui.asNeeded) {
      return { title: 'ตรวจร่าง', covers: 'FR-02, BR-07 · AC ข้อ 4', body: '<h1>ยังไม่รองรับ</h1><div class="card warn"><strong>ยาที่กินเมื่อมีอาการยังไม่รองรับ</strong><p>ระบบไม่สร้างเวลาเตือนให้ยาแบบนี้</p></div>' +
        btn('ghost', 'กรอกเอง (ยาเวลาตายตัว)', 'manual') + btn('ghost', 'ยกเลิก', 'cancel-draft') };
    }
    var dr = p.ui.draft; // เปิดหน้านี้ตรง ๆ (ลิงก์จากสารบัญ) → ใช้ร่างตัวอย่างที่เลือกไว้
    if (!dr) { var sm = M.LABEL_SAMPLES[p.ui.sample] || M.LABEL_SAMPLES.ok; dr = p.ui.draft = clone(sm.draft || M.LABEL_SAMPLES.ok.draft); }
    var problems = M.medicineProblems(dr, st.mealTimes), byIdx = {};
    problems.forEach(function (x) { byIdx[x.slot] = x.reason; });
    function sel(path, cur, map, ph) {
      return '<select data-path="' + path + '"' + (cur ? '' : ' aria-invalid="true"') + '><option value="">' + ph + '</option>' + Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + esc(map[k]) + '</option>'; }).join('') + '</select>';
    }
    var rows = dr.slots.map(function (s, i) {
      var bad = M.validateSlot(s), t = bad ? null : M.reminderMs(s, st.mealTimes);
      return '<fieldset class="slot"><legend>ช่องเวลากิน ' + (i + 1) + '</legend>' +
        '<label class="field"><span>มื้อ ' + (s.meal ? '' : flag()) + '</span>' + sel('slot.' + i + '.meal', s.meal, M.MEAL_NAMES, '— เลือก —') + '</label>' +
        '<label class="field"><span>วิธีกิน ' + (s.timing ? '' : flag()) + '</span>' + sel('slot.' + i + '.timing', s.timing, M.TIMING_NAMES, '— เลือก —') + '</label>' +
        (s.timing === 'before_meal' ? '<label class="field"><span>ก่อนอาหารกี่นาที ' + (M.validateSlot(s) === 'minutesBefore_required' ? flag() : '') + '</span><input type="number" min="1" step="1" data-path="slot.' + i + '.minutes"' + (M.validateSlot(s) === 'minutesBefore_required' ? ' aria-invalid="true"' : '') + ' value="' + esc(s.minutesBefore == null ? '' : s.minutesBefore) + '"></label>' : '') +
        '<label class="field"><span>จำนวนเม็ดต่อครั้ง ' + (M.validateSlot(s) === 'invalid_tablets' ? flag() : '') + '</span><input type="number" min="1" step="1" data-path="slot.' + i + '.tablets"' + (M.validateSlot(s) === 'invalid_tablets' ? ' aria-invalid="true"' : '') + ' value="' + esc(s.tabletsPerDose == null ? '' : s.tabletsPerDose) + '"></label>' +
        (byIdx[i] && byIdx[i] !== 'invalid_meal' && byIdx[i] !== 'invalid_timing' && byIdx[i] !== 'invalid_tablets' && byIdx[i] !== 'minutesBefore_required' ? '<p class="error">' + flag() + ' ' + esc(M.REASON_TEXT[byIdx[i]]) + '</p>' : '') +
        (t !== null && !byIdx[i] ? '<p class="hint ok">เวลาเตือนที่คำนวณได้: <b>' + M.fmtHM(t) + '</b></p>' : '') +
        (dr.slots.length > 1 ? btn('ghost', 'ลบช่องนี้', 'del-slot', { i: i }) : '') + '</fieldset>';
    }).join('');
    var nameOk = !!(dr.name && dr.name.trim()), canSave = nameOk && !problems.length;
    return { title: p.ui.manualReason ? 'กรอกเอง' : 'ตรวจร่าง', covers: 'FR-02, BR-04, BR-05, BR-06, BR-07 · NFR-06', body:
      '<h1>' + (p.ui.manualReason ? 'กรอกข้อมูลยาเอง' : 'ร่างจาก AI — ยังไม่ได้บันทึก') + '</h1>' +
      (p.ui.manualReason ? '<div class="card warn" role="alert"><p>' + esc(p.ui.manualReason) + '</p></div>' : '<p class="hint">AI อ่านผิดได้ — ตรวจทุกช่องก่อนบันทึก · ช่องที่อ่านไม่ได้ปล่อยว่างไว้ ไม่เดา</p>' +
        ((M.LABEL_SAMPLES[p.ui.sample] || {}).labelText ? '<p class="label-says">ฉลากเขียนว่า: “' + esc(M.LABEL_SAMPLES[p.ui.sample].labelText) + '”</p>' : '')) +
      '<label class="field"><span>ชื่อยา ' + (nameOk ? '' : flag()) + '</span><input type="text" data-path="name"' + (nameOk ? '' : ' aria-invalid="true"') + ' value="' + esc(dr.name || '') + '"></label>' + rows +
      btn('ghost', '+ เพิ่มช่องเวลากิน', 'add-slot') +
      '<label class="field"><span>คำเตือน (ถ้ามีบนฉลาก)</span><input type="text" data-path="warnings" value="' + esc(dr.warnings || '') + '"></label>' +
      '<button type="button" class="btn btn-taken" data-act="save-draft"' + (canSave ? '' : ' disabled') + '>บันทึกยา</button>' +
      (canSave ? '' : '<p class="hint">ช่องบังคับยังไม่ครบ — บันทึกไม่ได้</p>') + btn('ghost', 'ยกเลิก (ไม่บันทึก)', 'cancel-draft') };
  };

  SCREENS['cg-meds'] = function (p, st) { // C-06
    var body = '<h1>รายการยา</h1>';
    if (!st.meds.length) body += '<div class="card empty"><strong>ยังไม่มียา</strong></div>';
    st.meds.forEach(function (m) {
      body += '<section class="card"><h2 class="h-card">' + esc(m.name) + '</h2><ul class="plain">' + m.slots.map(function (s) {
        return '<li>' + esc(M.MEAL_NAMES[s.meal]) + ' · ' + esc(M.TIMING_NAMES[s.timing]) + (s.timing === 'before_meal' ? ' ' + s.minutesBefore + ' นาที' : '') + ' · ' + s.tabletsPerDose + ' เม็ด → เตือน ' + M.fmtHM(M.reminderMs(s, st.mealTimes)) + '</li>';
      }).join('') + '</ul>' + btn('ghost', 'ลบยา', 'del-med', { id: m.id }) + '</section>';
    });
    body += btn('primary', 'เพิ่มยาจากฉลาก', 'start-add') + btn('ghost', 'ตั้งเวลามื้อ', 'go', { to: 'cg-meals' });
    return { title: 'ยา', covers: 'FR-02, BR-03 (เฉพาะผู้ดูแลแก้ยาได้)', body: body };
  };

  ACTS['save-meals'] = function (p) { S.setMealTimes(clone(p.ui.times)); p.toast('บันทึกเวลามื้อแล้ว — เวลาเตือนคำนวณจากฉลากเท่านั้น'); };
  ACTS['start-add'] = function (p) { p.ui.cover = {}; p.ui.tick = false; p.go('cg-photo'); };
  ACTS['cover-toggle'] = function (p, d) { p.ui.cover[d.region] = !p.ui.cover[d.region]; p.render(); };
  ACTS['send-ai'] = function (p) {
      if (!p.ui.tick) return; // BR-19: ยังไม่ติ๊ก = ไม่ส่ง
      if (S.s.flags.aiProblem) { p.startManual(M.AI_PROBLEMS[S.s.flags.aiProblem] + ' — กรอกข้อมูลยาด้วยตัวเองได้เลย ไม่มีอะไรถูกบันทึกให้'); return; } // ข้อ 5: บอกเหตุผล + เปิดฟอร์มกรอกเอง
      p.go('cg-ai');
      clearTimeout(p.aiTimer);
      p.aiTimer = setTimeout(function () { if (p.route === 'cg-ai') p.startDraft(); }, 1300);
    };
  ACTS['cancel-draft'] = function (p) { clearTimeout(p.aiTimer); p.ui.draft = null; p.go('cg-meds'); p.toast('ยกเลิก — ไม่ได้บันทึกอะไร'); };
  ACTS['manual'] = function (p) { p.startManual('ยาที่กินเมื่อมีอาการยังไม่รองรับ — ถ้าเป็นยาเวลาตายตัว กรอกเองได้'); };
  ACTS['add-slot'] = function (p) { p.ui.draft.slots.push({ meal: null, timing: null, minutesBefore: null, tabletsPerDose: null }); p.render(); };
  ACTS['del-slot'] = function (p, d) { p.ui.draft.slots.splice(Number(d.i), 1); p.render(); };
  ACTS['save-draft'] = function (p) {
      var dr = p.ui.draft;
      if (!dr || !dr.name || !dr.name.trim() || M.medicineProblems(dr, S.s.mealTimes).length) return; // BR-04: ช่องบังคับไม่ครบ = บันทึกไม่ได้
      S.saveMedicine(dr); p.ui.draft = null; p.go('cg-meds'); p.toast('บันทึกยาแล้ว');
    };
  ACTS['del-med'] = function (p, d) { S.deleteMedicine(d.id); };
})(window);
