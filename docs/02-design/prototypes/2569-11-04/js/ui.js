/* คอมโพเนนต์กลางของต้นแบบ (design-system.md §3): ไอคอน SVG, โลโก้, มาสคอต, ปุ่ม, ป้ายสถานะ, การ์ดมื้อยา, การ์ดฮีโร่, กล่องยืนยัน
 * เจ้าของ: Rossatorn (UX/UI) — ทุกหน้าจอเรียกใช้จากที่นี่ เพื่อให้หน้าตาเป็นชุดเดียวกัน · ข้อความจากผู้ใช้ผ่าน esc() ก่อนใส่ HTML ทุกครั้ง */
(function (root) {
  'use strict';
  var M = root.MM.mock, S = root.MM.store;

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------- ไอคอน SVG วาดเอง (ไม่มีลิขสิทธิ์ภายนอก) สีมาจาก currentColor ----------
  // ไอคอน home/bell/gear/plus/minus/sun/moon มาจากชุด medmind-icons (SVG เส้นมน stroke 1.8, currentColor) · gear ขยายให้ขนาดเท่าไอคอนอื่น (ไฟล์ต้นฉบับมีรูปเล็กกว่ากรอบ)
  var ICON_PATHS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    gear: '<g transform="translate(12 12) scale(1.42) translate(-12.7 -11.05)"><g fill="none" stroke="currentColor" stroke-width="1.27" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19.4 13.5 1.1.9-1.5 2.6-1.4-.5a7.9 7.9 0 0 1-1.6.9l-.3 1.5h-3l-.3-1.5a7.9 7.9 0 0 1-1.6-.9l-1.4.5-1.5-2.6 1.1-.9a7.2 7.2 0 0 1 0-1.9l-1.1-.9 1.5-2.6 1.4.5a7.9 7.9 0 0 1 1.6-.9l.3-1.5h3l.3 1.5a7.9 7.9 0 0 1 1.6.9l1.4-.5 1.5 2.6-1.1.9a7.2 7.2 0 0 1 0 1.9Z" transform="translate(-1.5 -1.5)"/></g></g>',
    pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l7-7a5 5 0 0 1 7 7z"/><path d="M8.5 8.5l7 7"/>',
    status: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3L2 6M22 6l-3-3"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    senior: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    family: '<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M15 20v-1a4 4 0 0 1 6-3.5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
    plus: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></g>',
    minus: '<path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    sun: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></g>',
    moon: '<path d="M20.2 15.3A8.6 8.6 0 0 1 8.7 3.8 8.8 8.8 0 1 0 20.2 15.3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>'
  };
  function icon(name, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON_PATHS[name] || '') + '</svg>'; }
  // โลโก้ หัวใจ + เม็ดยา — ไล่สีจาก --primary ไป --accent
  var logoSeq = 0;
  function logo(cls) {
    var id = 'mmg' + (logoSeq++);
    var a11y = cls === 'logo-sm' ? 'aria-hidden="true" focusable="false"' : 'role="img" aria-label="โลโก้ MedMind"'; // โลโก้เล็กซ้ำชื่อแอป → ซ่อนจาก screen reader
    return '<svg class="' + (cls || 'logo') + '" viewBox="0 0 64 64" ' + a11y + '>' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--primary)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient></defs>' +
      '<path d="M32 56S6 41 6 22a13 13 0 0 1 26-6 13 13 0 0 1 26 6c0 19-26 34-26 34z" style="fill:url(#' + id + ')"/>' +
      '<g transform="rotate(-40 32 30)"><rect x="17" y="23" width="30" height="14" rx="7" style="fill:var(--on-color)"/><rect x="32" y="23" width="15" height="14" rx="7" style="fill:var(--accent-soft)"/><path d="M32 23v14" style="stroke:var(--accent);stroke-width:2"/></g></svg>';
  }
  // มาสคอต "เมล็ดพีช" — ตัวละครต้นฉบับของ Rossatorn (ต้นแบบ SE-Project 26 ต.ค. 2569) · สีจาก token --mascot-* · ตกแต่งเท่านั้น (aria-hidden)
  function mascot(pose, size) {
    var line = 'stroke:var(--mascot-line)';
    var arms = pose === 'celebrate' ? '<path d="M51 101 30 73m96 28 23-29"/>' : pose === 'concern' ? '<path d="m51 111-15 9m91-8 14 10"/>'
      : pose === 'encourage' ? '<path d="m51 108-17 8m93-7 17-16"/>' : '<path d="m51 108-17 9m94-14 19-19m-2 0 0-14m0 14 12-5"/>';
    var face = pose === 'concern' ? '<path d="m72 99 9-3m20 0 9 3"/><circle cx="78" cy="108" r="3"/><circle cx="104" cy="108" r="3"/><path d="M84 125q7-5 14 0"/>'
      : '<path d="M75 104v5m28-5v5"/><path d="M82 121q9 12 18 0"/>';
    var confetti = pose === 'celebrate' ? '<g style="stroke:var(--mascot-leaf);stroke-width:3;stroke-linecap:round"><path d="m23 44 5 8m122-9-5 7M51 25l-3 9m82-6 3 8"/></g>' +
      '<g style="fill:var(--mascot-leaf-2)"><circle cx="21" cy="84" r="4"/><circle cx="158" cy="110" r="4"/><path d="m44 54 4 5-4 5-4-5z"/></g>' : '';
    return '<svg class="mascot" width="' + size + '" height="' + size + '" viewBox="0 0 180 180" fill="none" aria-hidden="true" focusable="false">' + confetti +
      '<ellipse cx="90" cy="161" rx="46" ry="6" style="fill:var(--mascot-shadow)"/>' +
      '<g style="' + line + ';stroke-width:4;stroke-linecap:round;stroke-linejoin:round">' + arms + '<path d="m72 148-7 11m40-11 8 11"/></g>' +
      '<path d="M91 49C65 44 47 62 47 94c0 40 17 58 42 59 26 0 45-16 45-53 0-34-19-52-43-51Z" style="fill:var(--mascot-body);' + line + ';stroke-width:3.5"/>' +
      '<path d="M62 83c1-10 6-17 13-20" style="stroke:var(--mascot-shine);stroke-width:5;stroke-linecap:round"/>' +
      '<path d="M90 51c-15-1-30-12-26-27 18-2 32 5 32 19" style="fill:var(--mascot-leaf);' + line + ';stroke-width:3"/>' +
      '<path d="M93 50c-2-15 9-29 28-27 2 17-10 27-28 27Z" style="fill:var(--mascot-leaf-2);' + line + ';stroke-width:3"/>' +
      '<path d="m93 48 15-13" style="' + line + ';stroke-width:2.5;stroke-linecap:round"/>' +
      '<g style="' + line + ';stroke-width:3.5;stroke-linecap:round">' + face + '</g>' +
      '<ellipse cx="66" cy="117" rx="6" ry="4" style="fill:var(--mascot-cheek)"/><ellipse cx="115" cy="117" rx="6" ry="4" style="fill:var(--mascot-cheek)"/></svg>';
  }
  function hero(iconName, title, sub) {
    return '<div class="hero"><span class="icon-circle">' + icon(iconName) + '</span><h1>' + title + '</h1>' + (sub ? '<p class="lead">' + sub + '</p>' : '') + '</div>';
  }

  // ---------- ชิ้นส่วนที่ใช้ซ้ำ (คอมโพเนนต์ตาม design-system §3) ----------
  function btn(kind, label, act, data) {
    var d = '';
    Object.keys(data || {}).forEach(function (k) { d += ' data-' + k + '="' + esc(data[k]) + '"'; });
    return '<button type="button" class="btn btn-' + kind + '" data-act="' + act + '"' + d + '>' + label + '</button>';
  }
  function chip(label) { return '<span class="chip chip-' + label.kind + '">' + esc(label.text) + '</span>'; }

  function medList(meal) {
    return '<ul class="meds">' + meal.medicines.map(function (m) {
      return '<li><span class="med-name">' + esc(m.name) + '</span>' +
        '<span class="med-qty">จำนวน ' + m.tablets + ' เม็ด</span>' +
        (m.warnings ? '<span class="med-warn">' + icon('alert') + '<span>คำเตือน: ' + esc(m.warnings) + '</span></span>' : '') +
        (m.contraindications ? '<span class="med-warn">' + icon('alert') + '<span>ข้อห้าม: ' + esc(m.contraindications) + '</span></span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function mealCard(meal, st, dose, extra) {
    var lab = M.statusLabel(st.state, dose && dose.confirmedAt);
    return '<section class="card"><div class="card-head"><h2 class="h-card">มื้อ ' + M.fmtHM(meal.T) + '</h2>' + chip(lab) + '</div>' +
      medList(meal) + (dose && dose.pending ? '<p class="hint">รอส่งให้ผู้ดูแล — จะส่งเมื่อกลับมาออนไลน์</p>' : '') + (extra || '') + '</section>';
  }
  function flag() { return '<span class="flag">โปรดตรวจสอบ</span>'; }
  function qrGrid(code) {
    var n = 13, seed = 0, i, j, out = '';
    for (i = 0; i < code.length; i++) seed += Number(code[i]) * (i + 3);
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      var finder = (i < 4 && j < 4) || (i < 4 && j >= n - 4) || (i >= n - 4 && j < 4);
      var on = finder ? !((i % 3 === 1 && j % 3 === 1) && false) : ((i * 7 + j * 13 + seed) % 3 !== 0);
      out += '<i class="' + (on ? 'on' : '') + '"></i>';
    }
    return '<div class="qr" role="img" aria-label="QR ตัวอย่าง">' + out + '</div>';
  }

  // มื้อที่ควรชี้ให้ผู้ใช้เห็นก่อน: กำลังเตือน → ยังยืนยันย้อนหลังได้ → มื้อถัดไป
  function focusMeal(meals, view) {
    var order = ['reminding', 'not_confirmed', 'not_due'], found = null;
    order.some(function (want) {
      meals.some(function (m) { var st = S.stateFor(m, view, meals); if (st.state === want) { found = { meal: m, st: st }; return true; } return false; });
      return !!found;
    });
    return found;
  }
  function medSummary(meal) { return meal.medicines.map(function (x) { return esc(x.name) + ' ' + x.tablets + ' เม็ด'; }).join(' · '); }
  function heroCard(pose, label, big, sub, action, side) {
    return '<section class="hero-card"><div class="hero-body"><div class="hero-text"><p class="hero-label">' + label + '</p><p class="hero-big">' + big + '</p>' +
      (sub ? '<p class="hero-sub">' + sub + '</p>' : '') + '</div>' + (side || mascot(pose, 92)) + '</div>' + (action || '') + '</section>';
  }

  function dialog(id, title, text, yesLabel, yesAct) {
    return '<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="' + id + '"><div class="modal-box"><h2 id="' + id + '">' + esc(title) + '</h2><p>' + esc(text) + '</p>' +
      btn('notyet', esc(yesLabel), yesAct) + btn('ghost', 'ไม่ยกเลิก', 'unpair-no') + '</div></div>';
  }

  // การ์ด "การแสดงผล" ในหน้าตั้งค่า: ขนาดตัวอักษร (ปุ่ม − / +) + โหมดสว่าง/มืด (ตั้งรายเครื่อง เก็บใน p.pref)
  var SIZES = [['normal', 'ปกติ'], ['large', 'ใหญ่'], ['xlarge', 'ใหญ่มาก']], THEMES = [['light', 'สว่าง', 'sun'], ['dark', 'มืด', 'moon']];
  function stepBtn(dir, label, ico, disabled) {
    return '<button type="button" class="step-btn" data-act="size-step" data-dir="' + dir + '" aria-label="' + esc(label) + '"' + (disabled ? ' aria-disabled="true"' : '') + '>' + icon(ico) + '</button>';
  }
  function prefsCard(p) {
    var pr = p.pref || { size: 'normal', theme: 'light' };
    var i = SIZES.map(function (s) { return s[0]; }).indexOf(pr.size);
    return '<div class="card"><h2 class="h-card">' + icon('gear') + 'การแสดงผล</h2><p class="hint">ตั้งค่าเฉพาะเครื่องนี้ · ตัวอักษรทุกระดับไม่เล็กกว่าเกณฑ์ NFR-03</p>' +
      '<p class="pref-label">ขนาดตัวอักษร</p><div class="stepper" role="group" aria-label="ขนาดตัวอักษร">' +
      stepBtn(-1, 'ลดขนาดตัวอักษร', 'minus', i <= 0) + '<span class="step-val">' + esc(SIZES[i][1]) + '</span>' + stepBtn(1, 'เพิ่มขนาดตัวอักษร', 'plus', i >= SIZES.length - 1) + '</div>' +
      '<p class="pref-label">โหมดสี</p><div class="seg" role="group" aria-label="โหมดสี">' + THEMES.map(function (t) {
        return '<button type="button" class="seg-btn' + (t[0] === pr.theme ? ' is-on' : '') + '" data-act="set-theme" data-v="' + t[0] + '" aria-pressed="' + (t[0] === pr.theme) + '">' + icon(t[2]) + esc(t[1]) + '</button>';
      }).join('') + '</div></div>';
  }

  root.MM.ui = { prefsCard: prefsCard, esc: esc, clone: clone, icon: icon, logo: logo, mascot: mascot, hero: hero, btn: btn, chip: chip, medList: medList, mealCard: mealCard, flag: flag,
    qrGrid: qrGrid, focusMeal: focusMeal, medSummary: medSummary, heroCard: heroCard, dialog: dialog };
  root.MM.esc = esc;
})(window);
