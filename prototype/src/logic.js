/*
 * MedMind — กฎของระบบ (ชั้น Logic ใน docs/03-design/architecture.md §1)
 * ไม่รู้จักหน้าจอ และไม่อ่านเวลาเครื่องเอง: ทุกฟังก์ชันรับเวลาปัจจุบัน `now` (นาทีนับจาก 00:00) — ADR-02
 * ใช้ได้ทั้งในเบราว์เซอร์ (window.MedMind) และใน Node สำหรับ automated test (module.exports)
 */
(function (root) {
  'use strict';

  const DAY_END = 23 * 60 + 59;           // 23:59 (BR-15: ไม่มีมื้อถัดไป = ยืนยันช้าได้ถึง 23:59)
  const CODE_TTL = 10;                    // BR-01: รหัสเชิญหมดอายุใน 10 นาที
  const REPEAT = [5, 10];                 // BR-08: แจ้งซ้ำที่ T+5, T+10
  const ESCALATE_AT = 15;                 // BR-13: ถึง T+15 ยังไม่ยืนยัน → แจ้ง Caregiver
  const MEALS = { breakfast: 'เช้า', lunch: 'กลางวัน', dinner: 'เย็น' };

  function fmt(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function parseTime(text) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(text || '').trim());
    if (!m) return null;
    const h = +m[1], mm = +m[2];
    return h < 24 && mm < 60 ? h * 60 + mm : null;
  }

  function createStore(seniorId) {
    return {
      senior: { id: seniorId || 'senior-1', consentAt: null },
      invite: null,          // INVITE_CODE ปัจจุบัน
      pairing: null,         // PAIRING (1 Senior : 1 Caregiver — BR-02)
      mealTimes: null,       // MEAL_TIMES
      medications: [],       // MEDICATION
      sessions: [],          // DOSE_SESSION (+ items = DOSE_ITEM)
      notifications: [],     // NOTIFICATION_LOG
      today: null,           // วันที่จำลอง 'YYYY-MM-DD' (ใช้กับความถี่ / วันเริ่ม–สิ้นสุดของยา)
      lastTick: null,
      seq: 0,
    };
  }
  function nextId(s, prefix) { s.seq += 1; return prefix + '-' + s.seq; }

  /* ---------- pairing (FR-01) ---------- */

  function newInviteCode(s, now, random) {
    const r = random || Math.random;
    const code = String(Math.floor(r() * 1e6)).padStart(6, '0');
    s.invite = { code: code, createdAt: now, expiresAt: now + CODE_TTL, usedAt: null };
    return s.invite;
  }

  function consent(s, now) { s.senior.consentAt = now; }

  function pair(s, caregiverId, code, now) {
    if (s.pairing) return { ok: false, error: 'ALREADY_PAIRED' };                    // FR-01 ✗5
    const inv = s.invite;
    const valid = inv && inv.code === String(code).trim() && inv.usedAt === null && now < inv.expiresAt;
    if (!valid) return { ok: false, error: 'INVALID_CODE' };                          // FR-01 ✗4
    if (s.senior.consentAt === null) return { ok: false, error: 'NO_CONSENT' };      // FR-01 ✗2
    inv.usedAt = now;
    s.pairing = { id: nextId(s, 'pair'), seniorId: s.senior.id, caregiverId: caregiverId,
                  consentAt: s.senior.consentAt, pairedAt: now };
    return { ok: true, pairing: s.pairing };
  }

  // BR-17: ยกเลิกได้ทั้งสองฝั่ง → ลบข้อมูลยาและประวัติของคู่นี้ · Senior เห็น QR ใหม่
  function unpair(s, now, random) {
    s.pairing = null;
    s.mealTimes = null;
    s.medications = [];
    s.sessions = [];
    s.notifications = [];
    s.senior.consentAt = null;
    newInviteCode(s, now, random);
  }

  // NFR-04: Caregiver เห็นเฉพาะ Senior ที่จับคู่ไว้
  function canAccess(s, caregiverId) {
    return !!s.pairing && s.pairing.caregiverId === caregiverId;
  }

  /* ---------- medication (FR-02) ---------- */

  const REQUIRED = ['name', 'tabletsPerDose', 'timing'];   // BR-05

  // ตรวจร่างก่อนบันทึก — คืนรายการปัญหา (ว่าง = บันทึกได้)
  function validateDraft(d) {
    const problems = [];
    if (!d.name || !String(d.name).trim()) problems.push('name');
    if (!(Number(d.tabletsPerDose) > 0)) problems.push('tabletsPerDose');
    const t = d.timing || {};
    if (t.type === 'asNeeded') return ['asNeeded'];                                   // FR-02 ✗4, BR-07
    if (!['after', 'before', 'bedtime'].includes(t.type)) problems.push('timing');
    if ((t.type === 'after' || t.type === 'before') && !MEALS[t.meal]) problems.push('meal');
    if (t.type === 'before' && !(Number(t.minutes) > 0)) problems.push('minutes');   // FR-02 ✗10
    if (d.schedule && !validSchedule(d.schedule)) problems.push('schedule');
    return problems;
  }

  /* ---------- ความถี่ + วันเริ่ม–สิ้นสุดของยา ----------
   * schedule = { type: 'weekdays', days: [0..6] }   วันในสัปดาห์ (0 = อาทิตย์)
   *          | { type: 'interval', every: N }       ทุก N วัน นับจากวันเริ่ม
   *          | { type: 'cycle', on: N, off: M }      กิน N วัน หยุด M วัน วนซ้ำ
   *   + start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' | null (null = ไม่มีวันสิ้นสุด)
   * ยาที่ไม่มี schedule = กินทุกวัน */
  const dayNo = (iso) => Math.round(Date.parse(iso + 'T00:00:00Z') / 86400000);
  const isDate = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) && !isNaN(dayNo(iso));
  const posInt = (n) => Number.isInteger(Number(n)) && Number(n) >= 1;
  function validSchedule(sc) {
    if (!isDate(sc.start)) return false;
    if (sc.end !== null && sc.end !== undefined && (!isDate(sc.end) || sc.end < sc.start)) return false;
    if (sc.type === 'weekdays') return Array.isArray(sc.days) && sc.days.length > 0;
    if (sc.type === 'interval') return posInt(sc.every);
    if (sc.type === 'cycle') return posInt(sc.on) && posInt(sc.off);
    return false;
  }
  // วันนี้ต้องกินยาตัวนี้ไหม
  function takesOn(sc, iso) {
    if (!sc || !iso) return true;
    if (iso < sc.start || (sc.end && iso > sc.end)) return false;
    const n = dayNo(iso) - dayNo(sc.start);
    if (sc.type === 'weekdays') return sc.days.includes(new Date(iso + 'T00:00:00Z').getUTCDay());
    if (sc.type === 'interval') return n % Number(sc.every) === 0;
    if (sc.type === 'cycle') return n % (Number(sc.on) + Number(sc.off)) < Number(sc.on);
    return true;
  }

  // BR-06: เวลาเตือนตามคำสั่งบนฉลากเท่านั้น
  function reminderTime(timing, mealTimes) {
    if (timing.type === 'after') return mealTimes[timing.meal];
    if (timing.type === 'before') return mealTimes[timing.meal] - Number(timing.minutes);
    if (timing.type === 'bedtime') return mealTimes.bedtime;
    return null;
  }

  function setMealTimes(s, mt) {
    const keys = ['breakfast', 'lunch', 'dinner', 'bedtime'];
    if (!keys.every(function (k) { return Number.isInteger(mt[k]); })) return { ok: false, error: 'MEAL_TIMES_REQUIRED' };
    s.mealTimes = { breakfast: mt.breakfast, lunch: mt.lunch, dinner: mt.dinner, bedtime: mt.bedtime };
    return { ok: true };
  }

  // บันทึกเมื่อ Caregiver กดบันทึกเท่านั้น (BR-04, NFR-06)
  function saveMedication(s, draft, now) {
    if (!s.pairing) return { ok: false, error: 'NOT_PAIRED' };
    if (!s.mealTimes) return { ok: false, error: 'MEAL_TIMES_REQUIRED' };
    const problems = validateDraft(draft);
    if (problems.length) return { ok: false, error: problems[0] === 'asNeeded' ? 'AS_NEEDED' : 'MISSING_FIELDS', fields: problems };
    const t = reminderTime(draft.timing, s.mealTimes);
    const med = {
      id: nextId(s, 'med'), pairingId: s.pairing.id,
      name: String(draft.name).trim(), tabletsPerDose: Number(draft.tabletsPerDose),
      timing: Object.assign({}, draft.timing), reminderTime: t,
      warnings: draft.warnings || '', contraindications: draft.contraindications || '',
      schedule: draft.schedule ? JSON.parse(JSON.stringify(draft.schedule)) : null,
      savedAt: now,
    };
    s.medications.push(med);
    addToTodaySessions(s, med, now);
    return { ok: true, medication: med };
  }

  // ยาที่เวลาเตือนตรงกันรวมเป็นมื้อเดียว (BR-06) · prototype จำลองวันเดียว: มื้อที่เลยเวลาไปแล้วเริ่มพรุ่งนี้
  function addToTodaySessions(s, med, now) {
    const T = med.reminderTime;
    if (!takesOn(med.schedule, s.today)) return;                                     // วันนี้ไม่ใช่วันกินยาตามความถี่
    let sess = s.sessions.find(function (x) { return x.T === T; });
    if (sess) { if (sess.status === 'waiting') sess.items.push(med.id); return; }
    if (T < now) return;
    s.sessions.push({ id: nextId(s, 'dose'), T: T, status: 'waiting', round: 0,
                      items: [med.id], confirmedAt: null, alertedAt: null });
    s.sessions.sort(function (a, b) { return a.T - b.T; });
  }

  /* ---------- doseSession (FR-03, FR-04) + escalation (FR-05) ---------- */

  // BR-15: ยืนยันช้าได้ถึงเวลาเตือนของมื้อถัดไปที่เริ่มหลัง T+15 ของมื้อนี้ (ไม่มี = 23:59)
  function lateUntil(s, sess) {
    const next = s.sessions.filter(function (x) { return x.T > sess.T + ESCALATE_AT; })
                           .sort(function (a, b) { return a.T - b.T; })[0];
    return next ? next.T : DAY_END + 1;
  }

  function notify(s, sess, type, now, events) {
    const message = type === 'UNCONFIRMED'
      ? 'ยังไม่ยืนยันการกินยา (มื้อ ' + fmt(sess.T) + ')'
      : 'ยืนยันการกินยาแล้ว เวลา ' + fmt(now);
    const n = { id: nextId(s, 'note'), sessionId: sess.id, type: type, sentAt: now, message: message };
    s.notifications.push(n);
    events.push({ type: 'notify', notification: n });
  }

  // BR-13: แจ้ง 1 ครั้งต่อมื้อ
  function escalate(s, sess, now, events) {
    if (sess.alertedAt !== null) return;
    sess.alertedAt = now;
    notify(s, sess, 'UNCONFIRMED', now, events);
  }

  // เดินเวลาทีละนาทีจนถึง now — คืน event (remind / notify) ที่เกิดขึ้น
  function tick(s, now) {
    const events = [];
    const from = s.lastTick === null ? now : s.lastTick + 1;
    for (let m = from; m <= now; m++) {
      s.sessions.forEach(function (sess) {
        if (sess.status === 'waiting' && m >= sess.T) {
          sess.status = 'reminding'; sess.round = 1;
          events.push({ type: 'remind', sessionId: sess.id, round: 1, at: m });
        }
        if (sess.status !== 'reminding') return;
        REPEAT.forEach(function (d, i) {                                              // BR-08
          if (m >= sess.T + d && sess.round < i + 2) {
            sess.round = i + 2;
            events.push({ type: 'remind', sessionId: sess.id, round: sess.round, at: m });
          }
        });
        if (m >= sess.T + ESCALATE_AT) {                                              // BR-13
          sess.status = 'unconfirmed';
          escalate(s, sess, m, events);
        }
      });
    }
    s.lastTick = Math.max(s.lastTick === null ? now : s.lastTick, now);
    return events;
  }

  // "กินแล้ว" 1 แตะ = ยืนยันทั้งมื้อ (BR-10) · ซ้ำไม่บันทึกซ้ำ (BR-12) · ยืนยันช้า (BR-15)
  function confirm(s, sessionId, now) {
    const sess = s.sessions.find(function (x) { return x.id === sessionId; });
    if (!sess) return { ok: false, error: 'NOT_FOUND', events: [] };
    const events = [];
    if (sess.status === 'taken' || sess.status === 'takenLate') return { ok: false, error: 'ALREADY_CONFIRMED', events: events };
    if (sess.status === 'waiting') return { ok: false, error: 'NOT_DUE', events: events };
    if (sess.status === 'reminding') {
      sess.status = 'taken'; sess.confirmedAt = now;
      return { ok: true, events: events };
    }
    if (now >= lateUntil(s, sess)) return { ok: false, error: 'LATE_WINDOW_CLOSED', events: events };  // FR-04 ✗6
    sess.status = 'takenLate'; sess.confirmedAt = now;
    notify(s, sess, 'CONFIRMED_LATE', now, events);                                  // FR-05 ✓6
    return { ok: true, events: events };
  }

  // "ยังไม่กิน": รอบ 1–2 = รอรอบถัดไป · รอบ 3 = แจ้ง Caregiver ทันที (BR-11)
  function notYet(s, sessionId, now) {
    const sess = s.sessions.find(function (x) { return x.id === sessionId; });
    const events = [];
    if (sess && sess.status === 'reminding' && sess.round >= 3) escalate(s, sess, now, events);
    return { ok: !!sess, events: events };
  }

  function canConfirmLate(s, sess, now) {
    return sess.status === 'unconfirmed' && now < lateUntil(s, sess);
  }

  // มื้อที่ต้องแสดงบนหน้าเตือน: กำลังเตือน + ยังไม่ยืนยันที่ยังยืนยันช้าได้ เรียงตามเวลา (BR-16)
  function dueSessions(s, now) {
    return s.sessions.filter(function (x) { return x.status === 'reminding' || canConfirmLate(s, x, now); })
                     .sort(function (a, b) { return a.T - b.T; });
  }

  // BR-14: คำบนหน้าสถานะ
  function statusLabel(sess) {
    switch (sess.status) {
      case 'taken': return 'กินแล้ว ' + fmt(sess.confirmedAt);
      case 'takenLate': return 'กินแล้ว (ยืนยันช้า) ' + fmt(sess.confirmedAt);
      case 'reminding': return 'กำลังเตือน';
      case 'unconfirmed': return 'ยังไม่ยืนยัน';
      default: return 'รอถึงเวลา';
    }
  }

  // หน้าสถานะรายวัน (FR-05) — ผ่านการตรวจสิทธิ์ NFR-04
  function dailyStatus(s, caregiverId) {
    if (!canAccess(s, caregiverId)) return { ok: false, error: 'FORBIDDEN' };
    return { ok: true, sessions: s.sessions.map(function (x) {
      return { id: x.id, time: fmt(x.T), status: x.status, label: statusLabel(x), items: medsOf(s, x) };
    }) };
  }

  function medsOf(s, sess) {
    return sess.items.map(function (id) { return s.medications.find(function (m) { return m.id === id; }); })
                     .filter(Boolean);
  }

  const api = {
    DAY_END: DAY_END, MEALS: MEALS, fmt: fmt, parseTime: parseTime, createStore: createStore,
    newInviteCode: newInviteCode, consent: consent, pair: pair, unpair: unpair, canAccess: canAccess,
    validateDraft: validateDraft, reminderTime: reminderTime, setMealTimes: setMealTimes, saveMedication: saveMedication,
    tick: tick, confirm: confirm, notYet: notYet, lateUntil: lateUntil, canConfirmLate: canConfirmLate,
    dueSessions: dueSessions, statusLabel: statusLabel, dailyStatus: dailyStatus, medsOf: medsOf,
    validSchedule: validSchedule, takesOn: takesOn,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MedMind = api;
})(this);
