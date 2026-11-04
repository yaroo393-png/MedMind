/* ต้นแบบ MedMind (M3) — ข้อมูลสมมติ + กฎเวลาแบบย่อ
 * ไฟล์นี้เป็น "ต้นแบบ" ไม่ใช่โค้ดจริงของระบบ: กฎด้านล่างคัดมาจาก architecture.md §5.1 / SRS v1.5 (BR-06, BR-08, BR-13–15, BR-20, BR-21)
 * เพื่อให้คลิกเดินได้ในเบราว์เซอร์เดียว — ตรรกะจริงอยู่ใน public/js/logic/ (เจ้าของแต่ละ FR เขียนและมีเทสต์)
 * ไม่ใช้ framework ไม่ใช้ module (ดับเบิลคลิกเปิดได้) ข้อมูลทั้งหมดสมมติ ไม่มีชื่อ/HN ผู้ป่วยจริง */
(function (root) {
  'use strict';

  var MIN = 60000;
  var DAY_LABEL = '4 พ.ย. 2569 (วันตัวอย่าง)';

  // ---------- เวลา (ms นับจากเที่ยงคืนของวันตัวอย่าง) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(h, m) { return (h * 60 + m) * MIN; }
  function parseHM(s) { var p = String(s).split(':'); return hm(Number(p[0]), Number(p[1])); }
  function fmtHM(ms) { var t = Math.floor(ms / MIN); return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
  function fmtHMS(ms) {
    var s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }
  // เวลามิลลิวินาที: "HH:MM:SS.mmm" (แสดงบนแถบเวลาจำลอง)
  function fmtHMSms(ms) { var r = ((ms % 1000) + 1000) % 1000; return fmtHMS(ms) + '.' + (r < 10 ? '00' : r < 100 ? '0' : '') + r; }
  // อ่านเวลาที่ผู้ใช้พิมพ์ "H:MM" · "HH:MM" · "HH:MM:SS" · "HH:MM:SS.mmm" → ms จากเที่ยงคืน หรือ null ถ้าผิดรูปแบบ/เกินช่วง
  function parseClock(str) {
    var m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*$/.exec(String(str));
    if (!m) return null;
    var h = Number(m[1]), mi = Number(m[2]), sec = m[3] === undefined ? 0 : Number(m[3]);
    var ms = m[4] === undefined ? 0 : Number((m[4] + '00').slice(0, 3));
    if (h > 23 || mi > 59 || sec > 59) return null;
    return ((h * 60 + mi) * 60 + sec) * 1000 + ms;
  }
  var END_OF_DAY = hm(23, 59) + 59 * 1000 + 999; // 23:59:59.999 (BR-21)

  // ---------- ข้อมูลตัวอย่าง ----------
  var MEAL_NAMES = { breakfast: 'เช้า', lunch: 'กลางวัน', dinner: 'เย็น', bedtime: 'ก่อนนอน' };
  var TIMING_NAMES = { after_meal: 'หลังอาหาร', before_meal: 'ก่อนอาหาร', at_bedtime: 'ก่อนนอน' };
  var DEFAULT_MEAL_TIMES = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' };

  // ยาสมมติ (ไม่ใช่ชื่อยาจริง) — ยา 1 ตัวมีได้หลาย slot จำนวนเม็ดต่างกัน (A1)
  function sampleMedicines() {
    return [
      { id: 'mA', name: 'ยาตัวอย่าง A', warnings: 'ระวังง่วงซึม', contraindications: null, slots: [
        { meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 },
        { meal: 'lunch', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 },
        { meal: 'dinner', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 2 } ] },
      { id: 'mB', name: 'ยาตัวอย่าง B', warnings: 'ทานพร้อมน้ำเปล่า', contraindications: 'ห้ามบดเม็ดยา', slots: [
        { meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 } ] },
      { id: 'mC', name: 'ยาตัวอย่าง C', warnings: null, contraindications: null, slots: [
        { meal: 'breakfast', timing: 'before_meal', minutesBefore: 15, tabletsPerDose: 1 } ] }
    ];
  }

  // ฉลากสมมติที่ "AI" ส่งกลับ (null = อ่านไม่ได้ → โปรดตรวจสอบ ไม่เดา, BR-04) · labelText = สิ่งที่ฉลากเขียนไว้ (แสดงในหน้าร่าง)
  // ครอบ FR-02 ข้อ 1–4, 7, 10, 11 (ข้อ 5 = ปัญหาของบริการ AI ด้านล่าง)
  function slot(meal, timing, minutes, tablets) { return { meal: meal, timing: timing, minutesBefore: minutes, tabletsPerDose: tablets }; }
  var LABEL_SAMPLES = {
    ok: { title: 'อ่านครบ 3 ช่องเวลากิน (ข้อ 1, 2, 10)', labelText: 'หลังอาหารเช้า 1 เม็ด · หลังอาหารกลางวัน 1 เม็ด · หลังอาหารเย็น 2 เม็ด',
      draft: { name: 'ยาตัวอย่าง D', warnings: 'ระวังง่วงซึม', contraindications: null, slots: [slot('breakfast', 'after_meal', null, 1), slot('lunch', 'after_meal', null, 1), slot('dinner', 'after_meal', null, 2)] } },
    before30: { title: 'ก่อนอาหารเช้า 30 นาที → เตือน 06:30 (ข้อ 7)', labelText: 'ก่อนอาหารเช้า 30 นาที 1 เม็ด',
      draft: { name: 'ยาตัวอย่าง G', warnings: null, contraindications: null, slots: [slot('breakfast', 'before_meal', 30, 1)] } },
    partial: { title: 'ก่อนอาหารแต่ไม่บอกกี่นาที (ข้อ 3)', labelText: 'ก่อนอาหารกลางวัน 1 เม็ด',
      draft: { name: 'ยาตัวอย่าง E', warnings: null, contraindications: null, slots: [slot('lunch', 'before_meal', null, 1)] } },
    timesaday: { title: 'เขียนแค่ "วันละ 3 ครั้ง" ไม่บอกมื้อ (ข้อ 3)', labelText: 'วันละ 3 ครั้ง ครั้งละ 1 เม็ด',
      draft: { name: 'ยาตัวอย่าง F', warnings: null, contraindications: null, slots: [slot(null, null, null, 1)] } },
    every6h: { title: 'เขียนว่า "ทุก 6 ชั่วโมง" ไม่ผูกกับมื้อ (ข้อ 3)', labelText: 'ทุก 6 ชั่วโมง ครั้งละ 1 เม็ด',
      draft: { name: 'ยาตัวอย่าง H', warnings: null, contraindications: null, slots: [slot(null, null, null, 1)] } },
    noname: { title: 'อ่านชื่อยากับจำนวนเม็ดไม่ออก (ข้อ 3)', labelText: '(ตัวอักษรเลือน) หลังอาหารกลางวัน',
      draft: { name: null, warnings: null, contraindications: null, slots: [slot('lunch', 'after_meal', null, null)] } },
    dup: { title: 'ช่องเวลากินซ้ำกัน 2 ช่อง (ข้อ 11)', labelText: 'หลังอาหารเช้า 1 เม็ด · หลังอาหารเช้า 1 เม็ด',
      draft: { name: 'ยาตัวอย่าง J', warnings: null, contraindications: null, slots: [slot('breakfast', 'after_meal', null, 1), slot('breakfast', 'after_meal', null, 1)] } },
    conflict: { title: 'เวลาเตือนเดียวกันแต่จำนวนเม็ดต่างกัน (ข้อ 11)', labelText: 'หลังอาหารเช้า 1 เม็ด · หลังอาหารเช้า 2 เม็ด',
      draft: { name: 'ยาตัวอย่าง K', warnings: null, contraindications: null, slots: [slot('breakfast', 'after_meal', null, 1), slot('breakfast', 'after_meal', null, 2)] } },
    notablets: { title: 'ช่องที่ไม่มีจำนวนเม็ด (ข้อ 11)', labelText: 'หลังอาหารเช้า (ไม่ระบุจำนวนเม็ด)',
      draft: { name: 'ยาตัวอย่าง L', warnings: null, contraindications: null, slots: [slot('breakfast', 'after_meal', null, null)] } },
    asneeded: { title: 'ยากินเมื่อมีอาการ (ข้อ 4)', labelText: 'เมื่อมีอาการปวด ครั้งละ 1 เม็ด', draft: null }
  };
  // ปัญหาของบริการ AI (FR-02 ข้อ 5) — ระบบบอกเหตุผลแล้วเปิดฟอร์มกรอกเอง
  var AI_PROBLEMS = {
    offline: 'ไม่มีอินเทอร์เน็ต ส่งให้ AI ไม่ได้',
    down: 'บริการ AI ใช้ไม่ได้ตอนนี้',
    quota: 'โควตา AI ของวันนี้หมดแล้ว',
    unreadable: 'อ่านรูปไม่ออก (ภาพเบลอหรือมืดเกินไป)'
  };

  // ---------- กฎ slot / มื้อ ----------
  function isPosInt(n) { return typeof n === 'number' && isFinite(n) && n > 0 && Math.floor(n) === n; }

  // คืน null ถ้า slot ถูก ไม่เช่นนั้นคืนเหตุผล (architecture §5.2)
  function validateSlot(s) {
    if (!MEAL_NAMES[s.meal]) return 'invalid_meal';
    if (!TIMING_NAMES[s.timing]) return 'invalid_timing';
    if (s.timing === 'before_meal' && !isPosInt(s.minutesBefore)) return 'minutesBefore_required';
    if (!isPosInt(s.tabletsPerDose)) return 'invalid_tablets';
    if ((s.timing === 'at_bedtime') !== (s.meal === 'bedtime')) return 'meal_timing_mismatch';
    return null;
  }
  var REASON_TEXT = {
    invalid_meal: 'ยังไม่ได้เลือกมื้อ', invalid_timing: 'ยังไม่ได้เลือกวิธีกิน',
    minutesBefore_required: 'ก่อนอาหารต้องระบุจำนวนนาที', invalid_tablets: 'จำนวนเม็ดต้องเป็นจำนวนเต็มบวก (ไม่รองรับครึ่งเม็ด)',
    meal_timing_mismatch: 'ก่อนนอนต้องเลือกมื้อ "ก่อนนอน" คู่กัน', duplicate_slot: 'ช่องเวลากินซ้ำกัน',
    conflicting_tablets: 'เวลาเตือนเดียวกันแต่จำนวนเม็ดต่างกัน', no_slot: 'ยังไม่มีช่องเวลากิน'
  };

  // BR-06: เวลาเตือนตามฉลากเท่านั้น (ms) — ไม่เดา
  function reminderMs(slot, mealTimes) {
    var base = parseHM(mealTimes[slot.meal]);
    return slot.timing === 'before_meal' ? base - slot.minutesBefore * MIN : base;
  }

  // ตรวจทั้งยา: คืน [{slot: index, reason}] (ว่าง = ใช้ได้)
  function medicineProblems(med, mealTimes) {
    var out = [];
    if (!med.slots || !med.slots.length) return [{ slot: -1, reason: 'no_slot' }];
    var seen = {};
    med.slots.forEach(function (s, i) {
      var r = validateSlot(s);
      if (r) { out.push({ slot: i, reason: r }); return; }
      var t = reminderMs(s, mealTimes);
      var key = String(t);
      if (seen[key] !== undefined) {
        var same = med.slots[seen[key]].tabletsPerDose === s.tabletsPerDose;
        out.push({ slot: i, reason: same ? 'duplicate_slot' : 'conflicting_tablets' });
      } else { seen[key] = i; }
    });
    return out;
  }

  // จัดกลุ่มด้วยเวลาเตือนเท่านั้น (BR-06, A1) → มื้อเรียงเวลา
  function groupMeals(meds, mealTimes) {
    var byTime = {};
    meds.forEach(function (m) {
      var bad = {};
      medicineProblems(m, mealTimes).forEach(function (p) { bad[p.slot] = true; });
      m.slots.forEach(function (s, i) {
        if (bad[i]) return;
        var t = reminderMs(s, mealTimes);
        var g = byTime[t] || (byTime[t] = { id: pad(Math.floor(t / 3600000)) + pad(Math.floor(t / MIN) % 60), T: t, medicines: [] });
        g.medicines.push({ medicineId: m.id, name: m.name, tablets: s.tabletsPerDose, warnings: m.warnings, contraindications: m.contraindications });
      });
    });
    return Object.keys(byTime).map(function (k) { return byTime[k]; }).sort(function (a, b) { return a.T - b.T; });
  }

  // ---------- กฎไทม์ไลน์ (architecture §5.1, BR-21) ----------
  function confirmStatus(T, confirmedAt) { return confirmedAt <= T + 15 * MIN ? 'taken' : 'taken_late'; }

  // มื้อถัดไปที่เริ่ม "หลัง T+15" (BR-15, BR-16) · ไม่มี = null
  function nextMealStartFor(meals, meal) {
    var best = null;
    meals.forEach(function (m) {
      if (m !== meal && m.T > meal.T + 15 * MIN && (best === null || m.T < best)) best = m.T;
    });
    return best;
  }

  // คืน { state, round, canConfirm, caregiverAlert }
  function mealState(a) {
    var T = a.meal.T, now = a.now, late = T + 15 * MIN;
    if (a.dose) {
      var st = confirmStatus(T, a.dose.confirmedAt);
      return { state: st, round: null, canConfirm: false, caregiverAlert: st === 'taken_late' ? 'confirmed_late' : null };
    }
    if (now < T) return { state: 'not_due', round: null, canConfirm: false, caregiverAlert: null };
    if (now <= late) { // รวมตรง T+15 พอดี — ยังไม่แจ้งผู้ดูแล (BR-21) เว้นแต่กด "ยังไม่กิน" รอบ T+10 (BR-11)
      return { state: 'reminding', round: Math.min(2, Math.floor((now - T) / (5 * MIN))), canConfirm: true,
        caregiverAlert: a.notYetLastRound ? 'not_confirmed' : null };
    }
    var edge = a.nextMealStart === null || a.nextMealStart === undefined ? END_OF_DAY : a.nextMealStart;
    if (now <= edge) return { state: 'not_confirmed', round: null, canConfirm: true, caregiverAlert: 'not_confirmed' };
    return { state: 'missed', round: null, canConfirm: false, caregiverAlert: 'not_confirmed' };
  }

  // BR-14: ป้ายสถานะที่ผู้ดูแล/ผู้สูงอายุเห็น (ห้ามใช้คำว่า "ไม่ได้กิน")
  function statusLabel(st, confirmedAt) {
    switch (st) {
      case 'not_due': return { text: 'ยังไม่ถึงเวลา', kind: 'none' };
      case 'taken': return { text: 'กินแล้ว ' + fmtHM(confirmedAt), kind: 'taken' };
      case 'taken_late': return { text: 'กินแล้ว (ยืนยันย้อนหลัง) ' + fmtHM(confirmedAt), kind: 'late' };
      default: return { text: 'ยังไม่ยืนยัน', kind: 'notyet' }; // reminding, not_confirmed, missed
    }
  }

  var API = {
    MIN: MIN, DAY_LABEL: DAY_LABEL, END_OF_DAY: END_OF_DAY, MEAL_NAMES: MEAL_NAMES, TIMING_NAMES: TIMING_NAMES,
    DEFAULT_MEAL_TIMES: DEFAULT_MEAL_TIMES, LABEL_SAMPLES: LABEL_SAMPLES, AI_PROBLEMS: AI_PROBLEMS, REASON_TEXT: REASON_TEXT,
    pad: pad, hm: hm, parseHM: parseHM, fmtHM: fmtHM, fmtHMS: fmtHMS, fmtHMSms: fmtHMSms, parseClock: parseClock,
    sampleMedicines: sampleMedicines, validateSlot: validateSlot, reminderMs: reminderMs,
    medicineProblems: medicineProblems, groupMeals: groupMeals, confirmStatus: confirmStatus,
    nextMealStartFor: nextMealStartFor, mealState: mealState, statusLabel: statusLabel
  };
  root.MM = root.MM || {};
  root.MM.mock = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
