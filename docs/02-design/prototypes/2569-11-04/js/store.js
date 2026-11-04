/* ที่เก็บสถานะของต้นแบบ (ข้อมูลสมมติ) — ผู้สูงอายุและผู้ดูแลในหน้าเดียวกันใช้ที่เก็บเดียวกัน
 * จำลองสิ่งที่ระบบจริงทำผ่าน Firestore: การยืนยัน (Dose) ถึงผู้ดูแลเมื่อออนไลน์เท่านั้น (FR-04 ข้อ 7–8) */
(function (root) {
  'use strict';
  var M = root.MM.mock;
  var CODES = ['482913', '715204', '390861', '264057'];

  function freshState() {
    return {
      now: M.hm(6, 40), // เวลาจำลอง (ms จากเที่ยงคืน)
      pair: { code: CODES[0], codeIdx: 0, codeAt: M.hm(6, 40), consent: false, joined: false },
      mealTimes: JSON.parse(JSON.stringify(M.DEFAULT_MEAL_TIMES)),
      meds: [],
      doses: {},      // การยืนยันที่ "ถึงผู้ดูแลแล้ว" { mealId: { confirmedAt, receivedAt } }
      queue: {},      // การยืนยันที่รอส่งตอนออฟไลน์ { mealId: { confirmedAt } }
      notYet: {},     // กด "ยังไม่กิน" รอบ T+10 { mealId: at }
      raised: {},     // มื้อที่ผู้ดูแลเคยเห็นการแจ้ง "ยังไม่ยืนยันการกินยา" แล้ว (BR-13)
      dismissed: {},  // ปิดแถบแจ้งแล้ว { mealId_kind: true }
      rung: {},       // รอบเตือนที่เล่นเสียงแล้ว { mealId_round: true }
      sound: false,   // แตะหน้าจอครั้งแรกแล้วหรือยัง (SRS §2.2, ADR-13)
      pendingBeep: false,
      flags: { seniorOffline: false, aiProblem: '', cgOpen: true, seniorOpen: true },
      seq: 1          // ตัวนับ id ยาที่บันทึกใหม่
    };
  }

  var Store = {
    s: null, subs: [], key: null,

    init: function (opts) {
      this.key = opts.key || null;
      var saved = null;
      try { saved = this.key && root.sessionStorage.getItem(this.key); } catch (e) { saved = null; }
      if (saved && !opts.preset) { try { this.s = JSON.parse(saved); } catch (e2) { this.s = null; } }
      if (!this.s) this.preset(opts.preset || opts.defaultPreset || 'fresh', true);
      this.refresh();
    },

    subscribe: function (fn) { this.subs.push(fn); },
    notify: function () {
      try { if (this.key) root.sessionStorage.setItem(this.key, JSON.stringify(this.s)); } catch (e) { /* ไม่มี storage ก็ใช้ต่อได้ */ }
      this.subs.forEach(function (fn) { fn(); });
    },
    update: function (fn) { fn(this.s); this.refresh(); this.notify(); },

    // ---------- สถานการณ์สำเร็จรูป (ทางลัดจากหน้าสารบัญ) ----------
    preset: function (name, silent) {
      var s = freshState();
      var sample = function () { s.pair.consent = true; s.pair.joined = true; s.meds = M.sampleMedicines(); };
      if (name !== 'fresh') sample();
      var at = { sample: [6, 40], reminding: [7, 0], round2: [7, 10], notconfirmed: [7, 16], late: [7, 40], offline: [7, 5], syncdelay: [6, 59] };
      if (at[name]) s.now = M.hm(at[name][0], at[name][1]);
      s.pair.codeAt = s.now;
      if (name === 'offline' || name === 'syncdelay') s.flags.seniorOffline = true;
      s.presetName = name;
      this.s = s;
      if (!silent) { this.refresh(); this.notify(); }
    },

    // ---------- ข้อมูลที่คำนวณ (ไม่เก็บ) ----------
    meals: function () { return M.groupMeals(this.s.meds, this.s.mealTimes); },
    problems: function () {
      var s = this.s;
      return s.meds.map(function (m) { return { med: m, list: M.medicineProblems(m, s.mealTimes) }; })
        .filter(function (x) { return x.list.length; });
    },
    // มุมมองของแต่ละเครื่อง: ผู้สูงอายุเห็นการกดของตัวเองทันที (รวมคิวออฟไลน์) · ผู้ดูแลเห็นเฉพาะที่ถึงแล้ว
    doseFor: function (mealId, view) {
      var s = this.s;
      if (s.doses[mealId]) return s.doses[mealId];
      if (view === 'senior' && s.queue[mealId]) return { confirmedAt: s.queue[mealId].confirmedAt, pending: true };
      return null;
    },
    stateFor: function (meal, view, meals) {
      var s = this.s;
      var all = meals || this.meals();
      return M.mealState({
        now: s.now, meal: meal, dose: this.doseFor(meal.id, view),
        nextMealStart: M.nextMealStartFor(all, meal), notYetLastRound: !!s.notYet[meal.id]
      });
    },

    // ผู้ดูแลเปิดหน้าอยู่: มื้อที่ต้องแจ้งถูกนับว่า "เห็นการแจ้งแล้ว" (BR-13, BR-18) · เครื่องผู้สูงอายุ: นับรอบเตือนใหม่
    refresh: function () {
      var s = this.s, meals = this.meals(), self = this;
      meals.forEach(function (meal) {
        var cg = self.stateFor(meal, 'cg', meals);
        if (s.flags.cgOpen && cg.caregiverAlert === 'not_confirmed') s.raised[meal.id] = true;
        var sr = self.stateFor(meal, 'senior', meals);
        if (s.flags.seniorOpen && sr.state === 'reminding') { // หน้าผู้สูงอายุปิดอยู่ → ไม่มีเสียง ไม่นับรอบ (BR-18)
          var k = meal.id + '_' + sr.round;
          if (!s.rung[k]) { s.rung[k] = true; s.pendingBeep = true; }
        }
      });
    },

    // ---------- เหตุการณ์ ----------
    advance: function (ms) { this.update(function (s) { s.now += ms; }); },
    // ไปที่เวลาที่ระบุ (เดินหน้าอย่างเดียว เหมือนนาฬิกาจริง — ย้อนไม่ได้ ให้ใช้ "ใช้สถานการณ์นี้" เริ่มใหม่)
    setClockTo: function (text) {
      var ms = M.parseClock(text);
      if (ms === null) return { ok: false, reason: 'format' };
      if (ms < this.s.now) return { ok: false, reason: 'back', ms: ms };
      this.update(function (s) { s.now = ms; });
      return { ok: true, ms: ms };
    },
    // ไปเวลาเตือนถัดไป: T, T+5, T+10 ของมื้อใดก็ได้ที่อยู่หลังเวลาปัจจุบัน
    jumpNextReminder: function () {
      var s = this.s, best = null;
      this.meals().forEach(function (m) {
        [0, 5, 10].forEach(function (o) { var t = m.T + o * M.MIN; if (t > s.now && (best === null || t < best)) best = t; });
      });
      if (best !== null) this.update(function (st) { st.now = best; });
      return best !== null;
    },
    // ไปเวลาที่ T+15 ผ่านไป 1 มิลลิวินาที ของมื้อที่กำลังเตือน (หรือมื้อถัดไป)
    jumpPastDeadline: function () {
      var s = this.s, target = null;
      this.meals().forEach(function (m) {
        var t = m.T + 15 * M.MIN + 1;
        if (t > s.now && (target === null || t < target)) target = t;
      });
      if (target !== null) this.update(function (st) { st.now = target; });
      return target !== null;
    },
    // ไปที่ T+15 พอดี (ขอบเวลา BR-21): ยังไม่แจ้งผู้ดูแล กดยืนยันได้ว่าทัน
    jumpAtDeadline: function () {
      var s = this.s, target = null;
      this.meals().forEach(function (m) {
        var t = m.T + 15 * M.MIN;
        if (t > s.now && (target === null || t < target)) target = t;
      });
      if (target !== null) this.update(function (st) { st.now = target; });
      return target !== null;
    },
    // ผู้สูงอายุกด "กินแล้ว" — กดซ้ำไม่สร้างรายการใหม่ (BR-12, NFR-07)
    confirm: function (mealId) {
      var res = { ok: false, dup: false };
      var meal = this.meals().filter(function (m) { return m.id === mealId; })[0];
      if (!meal) return res;
      var existing = this.doseFor(mealId, 'senior');
      if (existing) { res.dup = true; res.confirmedAt = existing.confirmedAt; return res; }
      if (!this.stateFor(meal, 'senior').canConfirm) return res; // พ้นหน้าต่างยืนยันย้อนหลัง (BR-15)
      this.update(function (s) {
        if (s.flags.seniorOffline) s.queue[mealId] = { confirmedAt: s.now };
        else s.doses[mealId] = { confirmedAt: s.now, receivedAt: s.now };
      });
      res.ok = true; res.confirmedAt = this.s.now; res.queued = this.s.flags.seniorOffline;
      return res;
    },
    notYetTap: function (mealId) {
      var meal = this.meals().filter(function (m) { return m.id === mealId; })[0];
      var st = meal && this.stateFor(meal, 'senior');
      if (!st || st.state !== 'reminding') return null;
      if (st.round === 2) { this.update(function (s) { s.notYet[mealId] = s.now; }); return { last: true }; }
      return { last: false, nextAt: meal.T + (st.round + 1) * 5 * M.MIN };
    },
    setOffline: function (v) {
      this.update(function (s) {
        s.flags.seniorOffline = v;
        if (!v) { // กลับมาออนไลน์ → ส่งคิว: เวลาที่กดคงเดิม เวลาที่ได้รับ = ตอนนี้ (FR-04 ข้อ 7–8)
          Object.keys(s.queue).forEach(function (id) {
            if (!s.doses[id]) s.doses[id] = { confirmedAt: s.queue[id].confirmedAt, receivedAt: s.now };
          });
          s.queue = {};
        }
      });
    },
    setCgOpen: function (v) { this.update(function (s) { s.flags.cgOpen = v; }); },
    // เปิดหน้าผู้สูงอายุกลับ: แสดงมื้อที่กำลังเตือนทันที รอบที่ผ่านไปแล้วไม่เล่นซ้ำ (FR-03 ข้อ 5, BR-18)
    setSeniorOpen: function (v) {
      this.update(function (s) {
        s.flags.seniorOpen = v;
        if (v) { var self = Store; self.meals().forEach(function (m) { var st = self.stateFor(m, 'senior'); if (st.state === 'reminding') s.rung[m.id + '_' + st.round] = true; }); s.pendingBeep = false; }
      });
    },
    setAiProblem: function (reason) { this.update(function (s) { s.flags.aiProblem = reason || ''; }); },
    setAiDown: function (v) { this.setAiProblem(v ? 'down' : ''); },
    unlockSound: function () { if (!this.s.sound) this.update(function (s) { s.sound = true; }); },

    // จับคู่ (FR-01) — ผลตรวจเรียงตาม AC ข้อ 2–5
    tryJoin: function (code) {
      var p = this.s.pair, now = this.s.now;
      if (code !== p.code) return { ok: false, msg: 'รหัสไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว — ตรวจรหัสอีกครั้ง' };
      if (p.joined) return { ok: false, msg: 'ผู้สูงอายุคนนี้มีผู้ดูแลแล้ว' };
      if (now > p.codeAt + 10 * M.MIN) return { ok: false, msg: 'รหัสไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว — ตรวจรหัสอีกครั้ง' };
      if (!p.consent) return { ok: false, msg: 'ผู้สูงอายุยังไม่กดยินยอม — รอผู้สูงอายุกด "ยินยอม" ก่อน' };
      this.update(function (s) { s.pair.joined = true; });
      return { ok: true };
    },
    consent: function () { this.update(function (s) { s.pair.consent = true; }); },
    newCode: function () {
      this.update(function (s) { s.pair.codeIdx = (s.pair.codeIdx + 1) % CODES.length; s.pair.code = CODES[s.pair.codeIdx]; s.pair.codeAt = s.now; s.pair.consent = s.pair.consent && !s.pair.joined; });
    },
    // ยกเลิกจับคู่: ตัดสิทธิ์ผู้ดูแลทันที และลบข้อมูลของคู่ (BR-17, NFR-10)
    unpair: function () {
      var keep = { sound: this.s.sound, flags: this.s.flags, now: this.s.now };
      this.s = freshState();
      this.s.now = keep.now; this.s.sound = keep.sound; this.s.flags = keep.flags;
      this.s.pair.codeAt = keep.now; this.s.pair.codeIdx = 1; this.s.pair.code = CODES[1];
      this.refresh(); this.notify();
    },
    saveMedicine: function (draft) {
      this.update(function (s) {
        s.meds.push({ id: 'm' + (s.seq++), name: draft.name.trim(), warnings: draft.warnings || null, contraindications: draft.contraindications || null,
          slots: draft.slots.map(function (x) { return { meal: x.meal, timing: x.timing, minutesBefore: x.timing === 'before_meal' ? x.minutesBefore : null, tabletsPerDose: x.tabletsPerDose }; }) });
      });
    },
    deleteMedicine: function (id) { this.update(function (s) { s.meds = s.meds.filter(function (m) { return m.id !== id; }); }); },
    setMealTimes: function (t) { this.update(function (s) { s.mealTimes = t; }); },

    // ---------- แถบแจ้งเตือนของผู้ดูแล (FR-05, BR-13) ----------
    alerts: function () {
      var s = this.s, self = this, out = [], meals = this.meals();
      meals.forEach(function (meal) {
        var st = self.stateFor(meal, 'cg', meals), dose = self.doseFor(meal.id, 'cg');
        if (s.raised[meal.id] && (st.state === 'not_confirmed' || st.state === 'missed' || st.caregiverAlert === 'not_confirmed') && !dose) {
          if (!s.dismissed[meal.id + '_not_confirmed']) out.push({ kind: 'not_confirmed', meal: meal, key: meal.id + '_not_confirmed' });
        }
        if (dose && (st.state === 'taken_late' || (st.state === 'taken' && s.raised[meal.id])) && !s.dismissed[meal.id + '_confirmed']) {
          out.push({ kind: 'confirmed', meal: meal, confirmedAt: dose.confirmedAt, key: meal.id + '_confirmed' });
        }
      });
      return out;
    },
    dismiss: function (key) { this.update(function (s) { s.dismissed[key] = true; }); }
  };

  root.MM.store = Store;
})(window);
