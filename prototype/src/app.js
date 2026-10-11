/*
 * MedMind prototype — หน้าจอ (ชั้น Presentation) · กฎทั้งหมดอยู่ใน logic.js
 * จำลองโทรศัพท์ 2 เครื่องในหน้าเดียว (ไม่มี server) และนาฬิกาจำลอง (ADR-02)
 * รหัสหน้าจอ S1–S3 / C1–C3 ตาม docs/03-design/design-system.md §2
 */
(function () {
  'use strict';
  const M = window.MedMind, LABEL = window.ReadLabelMock, I = window.Icons, fmt = M.fmt, T = M.parseTime;
  const CAREGIVER = 'caregiver-1';
  const MEAL_OPTIONS = [['breakfast', 'เช้า'], ['lunch', 'กลางวัน'], ['dinner', 'เย็น']];
  const DEFAULT_MEALS = { breakfast: T('07:00'), lunch: T('12:00'), dinner: T('18:00'), bedtime: T('21:00') };

  let S;
  function reset(startAt) {
    S = {
      store: M.createStore(), now: startAt === undefined ? T('07:30') : startAt,
      soundOn: false, reminderOpen: false, dismissed: {}, ringing: false,
      cgTab: 'C1', cgMsg: null, srMsg: null, cameraAllowed: true,
      draft: null, draftNote: null, unreadable: [], mealDraft: null, saved: null,
      dialog: null, log: [], autoTimer: null,
    };
    M.newInviteCode(S.store, S.now);
    M.tick(S.store, S.now);
    log('เริ่มใหม่ เวลา ' + fmt(S.now));
  }

  const esc = (t) => String(t === undefined || t === null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function log(text) { S.log.unshift(fmt(S.now) + ' · ' + text); S.log = S.log.slice(0, 30); }
  const paired = () => !!S.store.pairing;

  /* ---------- เวลาและ event ---------- */

  function advanceTo(target) {
    if (target <= S.now) return;
    target = Math.min(target, M.DAY_END);
    S.now = target;
    handleEvents(M.tick(S.store, S.now));
    render();
  }

  function handleEvents(events) {
    let remind = false;
    events.forEach(function (e) {
      if (e.type === 'remind') {
        remind = true;
        delete S.dismissed[e.sessionId];
        const sess = S.store.sessions.find((x) => x.id === e.sessionId);
        log('เตือนรอบ ' + e.round + ' มื้อ ' + fmt(sess.T) + (e.round > 1 ? ' (แจ้งซ้ำ)' : ''));
      }
      if (e.type === 'notify') log('แจ้ง Caregiver: "' + e.notification.message + '"');
    });
    if (remind) { S.reminderOpen = true; S.ringing = true; beep(); }   // เตือนพร้อมกันหลายมื้อ = เสียงครั้งเดียว (BR-16)
  }

  /* ---------- เสียง (เล่นได้หลังแตะหน้าจอครั้งแรก — SRS §2.2, ADR-01) ---------- */

  let audio = null;
  function enableSound() {
    if (S.soundOn) return;
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); S.soundOn = true; log('Senior แตะหน้าจอ — เปิดเสียงเตือนแล้ว'); }
    catch (e) { S.soundOn = false; }
  }
  function beep() {
    if (!S.soundOn || !audio) return;
    [0, 0.35, 0.7].forEach(function (t) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.25, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.3);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.3);
    });
  }

  /* ---------- QR จำลอง ---------- */

  function drawQR(canvas, code) {
    const n = 21, ctx = canvas.getContext('2d');
    canvas.width = n; canvas.height = n;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, n, n); ctx.fillStyle = '#111827';
    let h = 0; for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rnd() > 0.5) ctx.fillRect(x, y, 1, 1);
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
      ctx.fillStyle = '#111827'; ctx.fillRect(p[0], p[1], 7, 7);
      ctx.fillStyle = '#fff'; ctx.fillRect(p[0] + 1, p[1] + 1, 5, 5);
      ctx.fillStyle = '#111827'; ctx.fillRect(p[0] + 2, p[1] + 2, 3, 3);
    });
  }

  /* ---------- ส่วนประกอบ ---------- */

  const badge = (sess) => '<span class="badge ' + sess.status + '">' + esc(M.statusLabel(sess)) + '</span>';
  const msg = (m) => m ? '<div class="msg ' + m.kind + '">' + esc(m.text) + '</div>' : '';
  function medLines(sess, full) {
    return M.medsOf(S.store, sess).map(function (m) {
      return '<div class="med">' + I.svg('pill', full ? 26 : 22, 'med-ic') + '<div class="med-body"><div class="' + (full ? 'med-name' : 'med-title') + '">' + esc(m.name) + '</div>' +
        '<div>' + m.tabletsPerDose + ' เม็ด</div>' +
        (full && m.warnings ? '<div class="muted">ข้อควรระวัง: ' + esc(m.warnings) + '</div>' : '') +
        (full && m.contraindications ? '<div class="muted">ข้อห้ามใช้: ' + esc(m.contraindications) + '</div>' : '') +
        '</div></div>';
    }).join('');
  }
  const statusBar = () => '<div class="statusbar"><span>' + fmt(S.now) + '</span><span class="sb-ic">' + I.svg('signal', 16) + I.svg('battery', 20) + '</span></div>';
  const mealHead = (sess, right) => '<div class="meal-head"><span class="meal-time">' + I.svg('clock', 24) + ' ' + fmt(sess.T) + ' น.</span>' + right + '</div>';
  function unpairDialog(side) {
    if (S.dialog !== side) return '';
    return '<div class="dialog"><div class="card"><h3>ยกเลิกการจับคู่?</h3>' +
      '<p>ข้อมูลยาและประวัติการยืนยันของคู่นี้จะถูกลบ และผู้ดูแลจะดูข้อมูลไม่ได้อีก</p>' +
      '<button class="btn danger" data-act="unpair-confirm">ยืนยันยกเลิกการจับคู่</button>' +
      '<button class="btn ghost" data-act="unpair-cancel">ไม่ยกเลิก</button></div></div>';
  }

  /* ---------- Senior ---------- */

  function seniorScreen() {
    if (!paired()) return 'S1';
    const due = M.dueSessions(S.store, S.now).filter((x) => !S.dismissed[x.id]);
    return S.reminderOpen && due.length ? 'S2' : 'S3';
  }

  function renderSenior() {
    const el = document.getElementById('senior');
    const scr = seniorScreen();
    const covers = { S1: 'S1 · Covers: FR-01', S2: 'S2 · Covers: FR-03, FR-04', S3: 'S3 · Covers: FR-04 (BR-15)' }[scr];
    const hero = (title, sub, withMascot) => '<div class="hero">' + (withMascot ? '<div class="hero-mascot">' + I.mascot(76) + '</div>' : '') +
      '<h3>' + title + '</h3>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
    const soundBanner = !S.soundOn && scr !== 'S1' ? '<div class="banner" data-act="sound">' + I.svg('bell', 22) + ' แตะที่นี่เพื่อเปิดเสียงเตือน</div>' : '';
    let body = '';

    if (scr === 'S1') {
      const inv = S.store.invite, expired = S.now >= inv.expiresAt || inv.usedAt !== null;
      body += hero('เชื่อมต่อ<br>กับลูกหลาน', 'ให้ลูกหลานสแกน QR หรือใส่รหัส 6 หลัก', true) + '<div class="card center">' +
        '<canvas class="qr" id="qr"></canvas><div class="muted">(QR จำลอง)</div>' +
        '<div class="code">' + inv.code + '</div>' +
        '<div class="muted">' + (expired ? 'รหัสนี้หมดอายุแล้ว — กดสร้างรหัสใหม่' : 'ใช้ได้ 1 ครั้ง ถึงเวลา ' + fmt(inv.expiresAt)) + '</div></div>' +
        (S.store.senior.consentAt === null
          ? '<button class="btn taken" data-act="consent">ยินยอมให้ลูกหลานเชื่อมต่อ</button>'
          : '<div class="msg ok">ยินยอมแล้ว · รอลูกหลานสแกน QR หรือใส่รหัส</div>') +
        '<button class="btn ghost" data-act="new-code">สร้างรหัสใหม่</button>' + msg(S.srMsg);
    }

    if (scr === 'S2') {
      const due = M.dueSessions(S.store, S.now).filter((x) => !S.dismissed[x.id]);
      body += hero('ถึงเวลากินยา', 'เวลา ' + fmt(S.now) + ' น.') + soundBanner + due.map(function (sess) {
        const late = sess.status === 'unconfirmed';
        return '<div class="card">' + mealHead(sess, late ? badge(sess) : '<span class="muted">รอบ ' + sess.round + '/3</span>') + medLines(sess, true) +
          '<button class="btn taken" data-act="taken" data-id="' + sess.id + '">กินแล้ว</button>' +
          '<button class="btn not-yet" data-act="not-yet" data-id="' + sess.id + '">ยังไม่กิน</button></div>';
      }).join('');
    }

    if (scr === 'S3') {
      body += hero('วันนี้', 'เวลา ' + fmt(S.now) + ' น.') + soundBanner + msg(S.srMsg);
      if (!S.store.sessions.length) body += '<div class="card center muted">ยังไม่มีมื้อยาวันนี้</div>';
      S.store.sessions.forEach(function (sess) {
        const canLate = M.canConfirmLate(S.store, sess, S.now);
        body += '<div class="card">' + mealHead(sess, badge(sess)) +
          medLines(sess, false) +
          (sess.status === 'reminding' ? '<button class="btn" data-act="open-reminder">ดูหน้าเตือน</button>' : '') +
          (canLate ? '<div class="muted">ยืนยันช้าได้ถึง ' + fmt(Math.min(M.lateUntil(S.store, sess), M.DAY_END)) + '</div>' +
                     '<button class="btn taken" data-act="taken" data-id="' + sess.id + '">กินแล้ว</button>' : '') +
          '</div>';
      });
      body += '<button class="link" data-act="unpair-ask" data-side="senior">ยกเลิกการจับคู่</button>';
    }

    document.getElementById('senior-covers').textContent = covers;
    el.innerHTML = statusBar() + '<div class="screen' + (S.ringing && scr === 'S2' ? ' ring' : '') + '">' +
      body + '</div>' + unpairDialog('senior');
    if (scr === 'S1') drawQR(document.getElementById('qr'), S.store.invite.code);
  }

  /* ---------- Caregiver ---------- */

  function renderCaregiver() {
    const el = document.getElementById('caregiver');
    if (!paired()) S.cgTab = 'C1';
    const tab = S.cgTab;
    const covers = { C1: 'C1 · Covers: FR-01', C2: 'C2 · Covers: FR-02', C3: 'C3 · Covers: FR-05' }[tab];
    let tabs = '';
    if (paired()) {
      tabs = '<nav class="tabs">' + [['C3', 'วันนี้', 'home'], ['C2', 'เพิ่มยา', 'plus'], ['C1', 'การจับคู่', 'link']].map(function (t) {
        return '<button class="' + (t[0] === tab ? 'active' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + I.svg(t[2], 24) + '<span>' + t[1] + '</span></button>';
      }).join('') + '</nav>';
    }
    let body = '';
    if (tab === 'C1') body = caregiverPairing();
    if (tab === 'C2') body = caregiverAddMedication();
    if (tab === 'C3') body = caregiverStatus();
    const bottom = tab === 'C2' && S.draft
      ? '<div class="bottom-bar"><button class="btn taken" id="save-btn" data-act="save">บันทึก</button>' +
        '<button class="btn ghost" data-act="cancel-draft">ยกเลิก</button></div>' : '';
    document.getElementById('caregiver-covers').textContent = covers;
    el.innerHTML = statusBar() + '<div class="screen">' + body + '</div>' + bottom + tabs + unpairDialog('caregiver');
  }

  function caregiverPairing() {
    if (paired()) {
      return cgHero('การจับคู่', 'โทรศัพท์ของผู้สูงอายุ') + '<div class="msg ok">เชื่อมต่อแล้ว กับโทรศัพท์ของผู้สูงอายุ</div>' + msg(S.cgMsg) +
        '<button class="btn danger" data-act="unpair-ask" data-side="caregiver">ยกเลิกการจับคู่</button>';
    }
    return cgHero('เชื่อมต่อ<br>กับผู้สูงอายุ', 'สแกน QR หรือใส่รหัสจากโทรศัพท์ผู้สูงอายุ') +
      (S.cameraAllowed
        ? '<button class="btn" data-act="scan-qr">' + I.svg('qr', 26) + ' สแกน QR (จำลอง)</button><p class="center muted">หรือใส่รหัส 6 หลัก</p>'
        : '<div class="msg info">ไม่ได้รับอนุญาตใช้กล้อง — ใส่รหัส 6 หลักแทน</div>') +
      '<div class="field"><label for="code-in">รหัส 6 หลัก</label><input id="code-in" inputmode="numeric" maxlength="6" placeholder="000000"></div>' +
      '<button class="btn" data-act="pair-code">เชื่อมต่อ</button>' + msg(S.cgMsg);
  }

  function cgHero(title, sub, withMascot) {
    return '<div class="hero">' + (withMascot ? '<div class="hero-mascot">' + I.mascot(76) + '</div>' : '') +
      '<h3>' + title + '</h3><div class="sub">' + sub + '</div></div>';
  }

  const PAIR_ERRORS = {
    NO_CONSENT: 'รอผู้สูงอายุกดยินยอมก่อน ยังไม่เชื่อมต่อ',
    INVALID_CODE: 'รหัสไม่ถูกต้องหรือหมดอายุ ขอรหัสใหม่จากผู้สูงอายุ',
    ALREADY_PAIRED: 'ผู้สูงอายุท่านนี้มีผู้ดูแลแล้ว',
  };
  function tryPair(caregiverId, code) {
    const r = M.pair(S.store, caregiverId, code, S.now);
    if (r.ok) { S.cgMsg = null; S.srMsg = null; S.cgTab = 'C2'; log('จับคู่สำเร็จ (FR-01 ✓3)'); }
    else { log('จับคู่ไม่สำเร็จ: ' + PAIR_ERRORS[r.error]); }
    return r;
  }

  function caregiverAddMedication() {
    let h = cgHero('เพิ่มยาจากฉลาก', S.draft ? 'ตรวจและแก้ร่างก่อนบันทึก' : 'ถ่ายรูปฉลากยา แล้วตรวจก่อนบันทึก', true) + msg(S.cgMsg);
    if (S.saved) {
      h += '<div class="card"><div class="section-label">ยาที่บันทึกแล้ว</div>' + S.store.medications.map(function (m) {
        return '<div class="med">' + esc(m.name) + ' · ' + m.tabletsPerDose + ' เม็ด · เตือน ' + fmt(m.reminderTime) + '</div>';
      }).join('') + '</div>';
    }
    if (!S.draft) {
      return h + (S.cameraAllowed
        ? '<p>ถ่ายรูปฉลากยา (จำลอง: เลือกฉลากตัวอย่าง)</p><div class="samples">' + LABEL.SAMPLES.map(function (x) {
            return '<button data-act="scan-label" data-id="' + x.id + '">' + I.svg('camera', 26) + '<span>' + esc(x.label) + '<small>' + x.covers + '</small></span></button>';
          }).join('') + '</div>'
        : '<div class="msg info">ไม่ได้รับอนุญาตใช้กล้อง — กรอกข้อมูลยาเอง</div>') +
        '<button class="btn ghost" data-act="manual">กรอกข้อมูลเอง</button>';
    }
    const d = S.draft, t = d.timing;
    const flag = (f) => S.unreadable.includes(f) && isEmptyField(f) ? ' check' : '';
    const tag = (f) => flag(f) ? '<span class="check-tag">กรุณาตรวจสอบ</span>' : '';
    h += (S.draftNote ? msg(S.draftNote) : '') + '<div class="card">' +
      '<div class="field' + flag('name') + '"><label>ชื่อยา' + tag('name') + '</label><input data-f="name" value="' + esc(d.name) + '"></div>' +
      '<div class="field' + flag('tabletsPerDose') + '"><label>จำนวนเม็ดต่อครั้ง' + tag('tabletsPerDose') + '</label><input data-f="tabletsPerDose" type="number" min="1" value="' + esc(d.tabletsPerDose) + '"></div>' +
      '<div class="field"><label>เวลากินตามฉลาก</label><select data-f="type">' +
        [['after', 'หลังอาหาร'], ['before', 'ก่อนอาหาร'], ['bedtime', 'ก่อนนอน']].map((o) => '<option value="' + o[0] + '"' + (t.type === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select></div>' +
      (t.type !== 'bedtime' ? '<div class="field"><label>มื้อ</label><select data-f="meal">' +
        MEAL_OPTIONS.map((o) => '<option value="' + o[0] + '"' + (t.meal === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' : '') +
      (t.type === 'before' ? '<div class="field' + flag('minutes') + '"><label>ก่อนอาหารกี่นาที' + tag('minutes') + '</label><input data-f="minutes" type="number" min="1" value="' + esc(t.minutes) + '"></div>' : '') +
      '<div class="field"><label>ข้อควรระวัง (ถ้าฉลากมี)</label><input data-f="warnings" value="' + esc(d.warnings) + '"></div>' +
      '<div class="field"><label>ข้อห้ามใช้ (ถ้าฉลากมี)</label><input data-f="contraindications" value="' + esc(d.contraindications) + '"></div>' +
      '</div>';
    if (!S.store.mealTimes) {
      const md = S.mealDraft;
      h += '<div class="card"><b>ตั้งเวลามื้อ (ครั้งแรก)</b><div class="grid2">' +
        [['breakfast', 'มื้อเช้า'], ['lunch', 'มื้อกลางวัน'], ['dinner', 'มื้อเย็น'], ['bedtime', 'เข้านอน']].map(function (k) {
          return '<div class="field"><label>' + k[1] + '</label><input type="time" data-meal="' + k[0] + '" value="' + fmt(md[k[0]]) + '"></div>';
        }).join('') + '</div></div>';
    }
    h += '<div class="msg info" id="preview"></div>';
    return h;
  }

  function isEmptyField(f) {
    const d = S.draft;
    if (f === 'minutes') return !(Number(d.timing.minutes) > 0);
    if (f === 'tabletsPerDose') return !(Number(d.tabletsPerDose) > 0);
    return !String(d[f] || '').trim();
  }

  // อัปเดตปุ่มบันทึกและเวลาเตือนโดยไม่วาดฟอร์มใหม่ (ไม่ให้ช่องที่กำลังพิมพ์หลุด)
  function refreshDraft() {
    const btn = document.getElementById('save-btn'); if (!btn) return;
    const problems = M.validateDraft(S.draft);
    btn.disabled = problems.length > 0;
    const mt = S.store.mealTimes || S.mealDraft;
    document.getElementById('preview').textContent = problems.length
      ? 'กรอกช่องที่จำเป็นให้ครบก่อนบันทึก (ชื่อยา, จำนวนเม็ด, มื้อ/เวลา)'
      : 'เวลาเตือน: ' + fmt(M.reminderTime(S.draft.timing, mt));
  }

  function caregiverStatus() {
    const st = M.dailyStatus(S.store, CAREGIVER);
    if (!st.ok) return '<div class="msg error">ไม่มีสิทธิ์ดูข้อมูลนี้</div>';
    let h = cgHero('วันนี้', 'สถานะการกินยาของผู้สูงอายุ');
    const notes = S.store.notifications.slice().reverse();
    if (notes.length) {
      h += '<div class="section-label">การแจ้งเตือน</div>' + notes.map(function (n) {
        return '<div class="note ' + n.type + '">' + I.svg('bell', 20, 'note-ic') + esc(n.message) + '<div class="muted">' + fmt(n.sentAt) + '</div></div>';
      }).join('');
    }
    if (!S.store.sessions.length) return h + '<div class="card center muted">ยังไม่มีมื้อยาวันนี้</div>';
    return h + S.store.sessions.map(function (sess) {
      return '<div class="card">' + mealHead(sess, badge(sess)) +
        medLines(sess, false) + '</div>';
    }).join('');
  }

  /* ---------- แถบ demo ---------- */

  function renderDemo() {
    document.getElementById('demo').innerHTML =
      '<h1>MedMind — Clickable Prototype</h1>' +
      '<div class="row"><span>เวลาจำลอง</span><span class="clock">' + fmt(S.now) + '</span>' +
      '<button data-act="adv" data-min="1">+1 นาที</button><button data-act="adv" data-min="5">+5 นาที</button>' +
      '<button data-act="adv" data-min="15">+15 นาที</button>' +
      '<input type="time" id="goto" value="' + fmt(Math.min(S.now + 30, M.DAY_END)) + '"><button data-act="goto">ไปที่เวลา</button>' +
      '<button data-act="auto">' + (S.autoTimer ? '⏸ หยุดเดินเวลา' : '▶ เดินเวลา 1 นาที/วินาที') + '</button></div>' +
      '<div class="row"><span>สถานการณ์:</span>' +
      '<button data-act="scenario" data-s="basic">มื้อ 08:00 มียา 2 ตัว (FR-03 ✓1)</button>' +
      '<button data-act="scenario" data-s="overlap">มื้อซ้อน 06:45 + 07:00 (FR-03 ✗4)</button>' +
      '<button data-act="caregiver2">Caregiver คนที่ 2 ใส่รหัส (FR-01 ✗5)</button>' +
      '<label><input type="checkbox" data-act="camera"' + (S.cameraAllowed ? '' : ' checked') + '> ไม่อนุญาตกล้อง</label>' +
      '<button data-act="reset">เริ่มใหม่</button></div>' +
      '<div class="hint">ข้อมูลอยู่ในหน้าเว็บนี้เท่านั้น (ไม่มี server) · รีเฟรชหน้า = เริ่มใหม่</div>' +
      '<ul class="log">' + S.log.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>';
  }

  function render() { renderDemo(); renderSenior(); renderCaregiver(); refreshDraft(); S.ringing = false; }

  /* ---------- สถานการณ์ตัวอย่าง ---------- */

  function scenario(name) {
    stopAuto();
    const basic = name === 'basic';
    reset(basic ? T('07:55') : T('06:40'));
    M.consent(S.store, S.now); tryPair(CAREGIVER, S.store.invite.code);
    M.setMealTimes(S.store, basic ? { breakfast: T('08:00'), lunch: T('12:00'), dinner: T('18:00'), bedtime: T('21:00') }
                                  : { breakfast: T('07:00'), lunch: T('12:00'), dinner: T('18:00'), bedtime: T('21:00') });
    const meds = basic
      ? [{ name: 'ยาตัวอย่าง A', tabletsPerDose: 1, timing: { type: 'after', meal: 'breakfast' }, warnings: 'อาจทำให้ง่วงซึม', contraindications: 'ห้ามใช้ร่วมกับแอลกอฮอล์' },
         { name: 'ยาตัวอย่าง B', tabletsPerDose: 2, timing: { type: 'after', meal: 'breakfast' }, warnings: 'กินพร้อมน้ำเปล่า 1 แก้ว', contraindications: '' },
         { name: 'ยาตัวอย่าง C', tabletsPerDose: 1, timing: { type: 'after', meal: 'lunch' }, warnings: '', contraindications: '' }]
      : [{ name: 'ยาก่อนอาหาร', tabletsPerDose: 1, timing: { type: 'before', meal: 'breakfast', minutes: 15 }, warnings: '', contraindications: '' },
         { name: 'ยาหลังอาหาร', tabletsPerDose: 1, timing: { type: 'after', meal: 'breakfast' }, warnings: '', contraindications: '' }];
    meds.forEach((d) => M.saveMedication(S.store, d, S.now));
    S.saved = true; S.cgTab = 'C3';
    log('โหลดสถานการณ์: ' + (basic ? 'มื้อ 08:00 มียา 2 ตัว + มื้อกลางวัน 12:00' : 'มื้อ 06:45 และ 07:00 ซ้อนกัน'));
    render();
  }

  function stopAuto() { if (S && S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; } }

  /* ---------- การกด ---------- */

  document.addEventListener('click', function (ev) {
    const t = ev.target.closest('[data-act]');
    if (ev.target.closest('#senior')) enableSound();     // แตะหน้าจอ Senior ครั้งแรก = เปิดเสียงได้
    if (!t) { if (ev.target.closest('#senior')) render(); return; }
    const act = t.dataset.act, id = t.dataset.id;
    switch (act) {
      case 'adv': advanceTo(S.now + Number(t.dataset.min)); return;
      case 'goto': { const v = T(document.getElementById('goto').value); if (v !== null) advanceTo(v); return; }
      case 'auto':
        if (S.autoTimer) stopAuto();
        else S.autoTimer = setInterval(function () { if (S.now >= M.DAY_END) stopAuto(); advanceTo(S.now + 1); }, 1000);
        break;
      case 'scenario': scenario(t.dataset.s); return;
      case 'reset': stopAuto(); reset(); break;
      case 'camera': S.cameraAllowed = !t.checked; break;
      case 'caregiver2': {
        const r = tryPair('caregiver-2', S.store.invite.code);
        log('Caregiver คนที่ 2 → ' + (r.ok ? 'จับคู่สำเร็จ' : PAIR_ERRORS[r.error]));
        break;
      }
      case 'sound': enableSound(); break;
      case 'consent': M.consent(S.store, S.now); log('Senior กดยินยอม'); break;
      case 'new-code': M.newInviteCode(S.store, S.now); S.srMsg = { kind: 'info', text: 'สร้างรหัสใหม่แล้ว' }; log('สร้างรหัสเชิญใหม่'); break;
      case 'scan-qr': { const r = tryPair(CAREGIVER, S.store.invite.code); S.cgMsg = r.ok ? null : { kind: 'error', text: PAIR_ERRORS[r.error] }; break; }
      case 'pair-code': { const r = tryPair(CAREGIVER, document.getElementById('code-in').value); S.cgMsg = r.ok ? null : { kind: 'error', text: PAIR_ERRORS[r.error] }; break; }
      case 'unpair-ask': S.dialog = t.dataset.side; break;
      case 'unpair-cancel': S.dialog = null; break;
      case 'unpair-confirm':
        M.unpair(S.store, S.now); S.dialog = null; S.draft = null; S.saved = null; S.reminderOpen = false;
        S.cgMsg = { kind: 'info', text: 'ยกเลิกการจับคู่แล้ว · ข้อมูลยาและประวัติถูกลบ' };
        log('ยกเลิกการจับคู่ — ลบข้อมูลยาและประวัติ, Senior ได้ QR ใหม่ (FR-01 ✗6)');
        break;
      case 'tab': S.cgTab = t.dataset.tab; S.cgMsg = null; break;
      case 'scan-label': {
        const r = LABEL.readLabel(id); S.cgMsg = null;
        S.mealDraft = Object.assign({}, DEFAULT_MEALS);
        if (!r.ok) { startDraft(null); S.draftNote = { kind: 'error', text: 'อ่านรูปไม่ได้ — กรอกข้อมูลเองในฟอร์มด้านล่าง' }; log('สแกนล้มเหลว → ฟอร์มว่าง (FR-02 ✗5)'); break; }
        if (r.draft.timing.type === 'asNeeded') { S.cgMsg = { kind: 'error', text: 'ระบบยังไม่รองรับยาเมื่อมีอาการ — ไม่ได้สร้างตาราง' }; log('ยาเมื่อมีอาการ → ไม่สร้างตาราง (FR-02 ✗4)'); break; }
        startDraft(r.draft); log('ได้ร่างจากฉลาก — ยังไม่บันทึก (FR-02 ✓1)');
        break;
      }
      case 'manual': S.mealDraft = Object.assign({}, DEFAULT_MEALS); startDraft(null); break;
      case 'cancel-draft': S.draft = null; S.draftNote = null; S.cgMsg = { kind: 'info', text: 'ยกเลิกแล้ว · ไม่ได้บันทึกอะไร' }; log('ยกเลิกร่าง — ไม่บันทึก (FR-02 ✗7)'); break;
      case 'save': {
        if (!S.store.mealTimes) M.setMealTimes(S.store, S.mealDraft);
        const r = M.saveMedication(S.store, S.draft, S.now);
        if (!r.ok) { S.cgMsg = { kind: 'error', text: 'บันทึกไม่ได้ — กรอกช่องที่จำเป็นให้ครบ' }; break; }
        S.draft = null; S.draftNote = null; S.saved = true;
        const late = r.medication.reminderTime < S.now;
        S.cgMsg = { kind: 'ok', text: 'บันทึกแล้ว · เตือน ' + fmt(r.medication.reminderTime) + (late ? ' (เลยเวลาวันนี้แล้ว เริ่มพรุ่งนี้)' : '') };
        log('บันทึกยา "' + r.medication.name + '" เตือน ' + fmt(r.medication.reminderTime));
        handleEvents(M.tick(S.store, S.now));
        break;
      }
      case 'taken': {
        const r = M.confirm(S.store, id, S.now);
        const sess = S.store.sessions.find((x) => x.id === id);
        if (r.ok) log('Senior กด "กินแล้ว" มื้อ ' + fmt(sess.T) + ' → ' + M.statusLabel(sess));
        else if (r.error === 'ALREADY_CONFIRMED') log('กดซ้ำ — ไม่บันทึกซ้ำ (FR-04 ✗2)');
        else if (r.error === 'LATE_WINDOW_CLOSED') { S.srMsg = { kind: 'error', text: 'เลยช่วงยืนยันแล้ว' }; log('เลยช่วงยืนยันช้า (FR-04 ✗6)'); }
        handleEvents(r.events);
        break;
      }
      case 'not-yet': {
        const sess = S.store.sessions.find((x) => x.id === id);
        const r = M.notYet(S.store, id, S.now);
        S.dismissed[id] = true;
        log('Senior กด "ยังไม่กิน" มื้อ ' + fmt(sess.T) + (r.events.length ? ' ในรอบสุดท้าย' : ' — รอรอบถัดไป'));
        handleEvents(r.events);
        break;
      }
      case 'open-reminder': S.reminderOpen = true; S.dismissed = {}; break;
    }
    render();
  });

  function startDraft(draft) {
    S.draft = draft || { name: '', tabletsPerDose: '', timing: { type: 'after', meal: 'breakfast', minutes: '' }, warnings: '', contraindications: '' };
    S.unreadable = draft ? ['name', 'tabletsPerDose', 'minutes'].filter(isEmptyField) : [];
    S.draftNote = S.unreadable.length ? { kind: 'info', text: 'บางช่องอ่านจากฉลากไม่ได้ — กรุณาตรวจสอบและกรอกเอง' } : null;
  }

  document.addEventListener('input', function (ev) {
    const f = ev.target.dataset.f, meal = ev.target.dataset.meal;
    if (!S.draft) return;
    if (meal) { const v = T(ev.target.value); if (v !== null) S.mealDraft[meal] = v; }
    else if (f === 'type' || f === 'meal' || f === 'minutes') S.draft.timing[f] = ev.target.value;
    else if (f) S.draft[f] = ev.target.value;
    refreshDraft();
  });
  document.addEventListener('change', function (ev) {   // เปลี่ยนชนิดเวลาหรือมื้อ = วาดฟอร์มใหม่ (ช่องนาทีโผล่/หาย)
    if (S.draft && (ev.target.dataset.f === 'type' || ev.target.dataset.f === 'meal')) render();
  });

  reset();
  render();
})();
