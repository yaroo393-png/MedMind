// ตรวจต้นแบบ M3 (prototype/) ตามเกณฑ์อาจารย์ (M4 §2) และ README ของต้นแบบ
// ส่วนที่ 1: ไฟล์/ป้าย Covers/ไม่มีสีลอย/ไม่มีเครือข่าย/ไม่มีคำต้องห้าม · ส่วนที่ 2: กฎเวลาที่ต้นแบบคัดมา ต้องตรง SRS v1.5 (BR-14, BR-20, BR-21)
// ต้นแบบใช้ข้อมูลสมมติ — กฎจริงอยู่ที่ public/js/logic/ (เทสต์แยกของเจ้าของแต่ละ FR)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../prototype/', import.meta.url));
const read = (f) => readFileSync(dir + f, 'utf8');
const htmlFiles = ['index.html', 'app.html', 'demo.html'];
const screenFiles = ['js/screens/pairing.js', 'js/screens/senior-home.js', 'js/screens/senior-reminder.js', 'js/screens/status.js', 'js/screens/medicine.js'];
const codeFiles = ['css/proto.css', 'js/mock.js', 'js/store.js', 'js/ui.js', 'js/phone.js', ...screenFiles, 'js/shell.js', ...htmlFiles];

// ---------- ส่วนที่ 1: เกณฑ์ของต้นแบบ ----------
for (const f of [...codeFiles, 'NOTES.md']) {
  test(`ต้นแบบมีไฟล์ ${f}`, () => assert.ok(existsSync(dir + f), `ไม่พบ ${f}`));
}

test('M3: ทุกหน้า HTML มีแถบ "Covers: FR-xx"', () => {
  for (const f of htmlFiles) assert.match(read(f), /Covers: FR-0\d/, `${f} ไม่มีแถบ Covers`);
});

test('M3: ทุกหน้าจอในต้นแบบมี Covers (เรียก SCREENS แต่ละหน้า)', () => {
  const src = screenFiles.map(read).join('\n');
  const screens = [...src.matchAll(/SCREENS\['([a-z-]+)'\] = function/g)].map((m) => m[1]);
  assert.ok(screens.length >= 14, `พบหน้าจอเพียง ${screens.length}`);
  for (const name of screens) {
    const block = src.slice(src.indexOf(`SCREENS['${name}'] = function`)).split(/\n  SCREENS\['/)[0];
    assert.match(block, /covers: '[^']*FR-0\d/, `หน้า ${name} ไม่มี covers ที่ชี้ FR`);
  }
});

test('M3: ครอบทุก Must FR (FR-01 ถึง FR-05) ในแถบ Covers', () => {
  const all = codeFiles.map(read).join('\n');
  for (let i = 1; i <= 5; i++) assert.ok(all.includes(`FR-0${i}`), `ไม่มี FR-0${i}`);
});

test('M3: ใช้ token เท่านั้น ไม่มีสี #hex ลอย (นอก tokens.css)', () => {
  for (const f of codeFiles) {
    const bad = read(f).match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g);
    assert.equal(bad, null, `${f} มีสีลอย ${bad}`);
  }
});

test('M3: ไม่ต้องมี server/DB — ไม่มีการเรียกเครือข่ายหรือลิงก์ภายนอก', () => {
  for (const f of codeFiles) {
    const s = read(f);
    assert.doesNotMatch(s, /\bfetch\(|XMLHttpRequest|WebSocket|https?:\/\//, `${f} อ้างเครือข่าย`);
  }
});

test('M3: ไม่ใช้ ES module (เปิดด้วยดับเบิลคลิกได้) และโหลดสคริปต์ครบ', () => {
  for (const f of ['app.html', 'demo.html']) {
    const s = read(f);
    assert.doesNotMatch(s, /type="module"/);
    for (const j of ['mock', 'store', 'ui', 'phone', 'screens/pairing', 'screens/senior-home', 'screens/senior-reminder', 'screens/status', 'screens/medicine', 'shell']) assert.ok(s.includes(`js/${j}.js`), `${f} ไม่โหลด ${j}.js`);
  }
});

test('SRS: ข้อความถึงผู้ดูแลไม่ใช้ "ไม่ได้กิน" / "not taken" (ยกเว้นประโยคห้ามใช้)', () => {
  for (const f of codeFiles) {
    const s = read(f);
    for (const m of s.matchAll(/ไม่ได้กิน|not taken/gi)) {
      assert.match(s.slice(Math.max(0, m.index - 24), m.index), /คำว่า\s*[“"]?\s*$/, `${f} ใช้คำต้องห้ามในข้อความจริง`);
    }
  }
});

test('NFR-03: ปุ่มกินแล้ว/ยังไม่กิน สูง ≥ 64px และตัวอักษรตาม token', () => {
  const css = read('css/proto.css');
  assert.match(css, /\.btn \{[^}]*min-height: var\(--btn-h\)/);
  assert.match(css, /\.med-name \{[^}]*font-size: var\(--fs-med-name\)/);
  assert.match(css, /body \{[^}]*font-size: var\(--fs-body\)/);
  const tokens = readFileSync(dir + 'css/tokens.css', 'utf8');
  assert.match(tokens, /--btn-h:\s*64px/);
  assert.match(tokens, /--fs-med-name:\s*24px/);
  assert.match(tokens, /--fs-body:\s*18px/);
});

test('ข้อมูลสมมติ: ไม่มีรูปฉลากจริงในโฟลเดอร์ต้นแบบ', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + e.name + '/') : [d + e.name]));
  const imgs = walk(dir).filter((f) => /\.(png|jpe?g|heic|webp|gif)$/i.test(f));
  assert.deepEqual(imgs, []);
});

test('WCAG 1.4.11: ขอบช่องกรอก/ตัวเลือกใช้สีที่เห็นชัด (--text-muted 7.4:1) ไม่ใช่ --accent-soft (1.2:1)', () => {
  const css = read('css/proto.css');
  assert.match(css, /\.field input, \.field select \{[^}]*border: 2px solid var\(--text-muted\)/);
});

test('WCAG 2.4.3/4.1.2: กล่องยืนยันเป็น aria-modal, ส่วนอื่น inert, Tab วนในกล่อง, คืนโฟกัสหลังวาดใหม่', () => {
  const js = ['js/phone.js', ...screenFiles, 'js/ui.js'].map(read).join('\n');
  assert.ok(js.includes('aria-modal="true"'), 'ไม่มี aria-modal');
  assert.ok(js.includes("' inert'"), 'ไม่ได้ทำส่วนอื่นเป็น inert');
  assert.ok(js.includes('P.trapTab') && js.includes('P.restoreFocus') && js.includes('P.focusKey'), 'ไม่มีการจัดการโฟกัส');
});

test('WCAG 2.2.1/4.1.3: ข้อความสถานะอยู่ใน live region ที่ไม่ถูกวาดทับ ค้าง ≥ 10 วินาที และมีปุ่มปิด', () => {
  const js = ['js/phone.js', ...screenFiles, 'js/ui.js'].map(read).join('\n');
  assert.match(js, /class="toast-region" role="status" aria-live="polite"/);
  assert.match(js, /setTimeout\(function \(\) \{ self\.live\.innerHTML = ''; \}, 10000\)/);
  assert.ok(js.includes('data-act="toast-close"'));
});

test('ฟอนต์ Sarabun เป็นไฟล์ในเครื่องพร้อมใบอนุญาต OFL · มาสคอตใช้สีจาก token และซ่อนจาก screen reader', () => {
  for (const f of ['fonts/Sarabun-Regular.ttf', 'fonts/Sarabun-SemiBold.ttf', 'fonts/Sarabun-Bold.ttf', 'fonts/OFL.txt']) assert.ok(existsSync(dir + f), `ไม่พบ ${f}`);
  assert.match(read('fonts/OFL.txt'), /SIL Open Font License/);
  const js = ['js/phone.js', ...screenFiles, 'js/ui.js'].map(read).join('\n');
  assert.match(js, /class="mascot"[^>]*aria-hidden="true"/);
  assert.ok(js.includes('var(--mascot-body)'));
});

// ---------- ส่วนที่ 2: กฎเวลาของต้นแบบต้องตรง SRS v1.5 ----------
await import(new URL('../prototype/js/mock.js', import.meta.url));
const M = globalThis.MM.mock;
const T = M.hm(8, 0); // มื้อ 08:00
const at = (h, m, s = 0, ms = 0) => M.hm(h, m) + s * 1000 + ms;
const meal = { id: '0800', T };
const state = (now, dose, next) => M.mealState({ now, meal, dose, nextMealStart: next === undefined ? at(12, 0) : next });

test('BR-20/21 (A5-T01..T03): กดที่ T+15 พอดี = taken · เกิน 1 ms = taken_late', () => {
  assert.equal(M.confirmStatus(T, at(8, 14, 59)), 'taken');
  assert.equal(M.confirmStatus(T, at(8, 15, 0, 0)), 'taken');
  assert.equal(M.confirmStatus(T, at(8, 15, 0, 1)), 'taken_late');
  assert.equal(M.confirmStatus(T, at(8, 40)), 'taken_late');
});

test('BR-21: ผู้ดูแลถูกแจ้งเมื่อ T+15 ผ่านไปแล้วเท่านั้น (08:15:00.000 ยังไม่แจ้ง)', () => {
  assert.equal(state(at(8, 15, 0, 0), null).state, 'reminding');
  assert.equal(state(at(8, 15, 0, 0), null).caregiverAlert, null);
  assert.equal(state(at(8, 15, 0, 1), null).state, 'not_confirmed');
  assert.equal(state(at(8, 15, 0, 1), null).caregiverAlert, 'not_confirmed');
});

test('FR-03 AC2/AC5: รอบเตือน T, T+5, T+10 (ไม่มีรอบ 4)', () => {
  assert.equal(state(at(8, 0), null).round, 0);
  assert.equal(state(at(8, 5), null).round, 1);
  assert.equal(state(at(8, 10), null).round, 2);
  assert.equal(state(at(8, 14, 59), null).round, 2);
});

test('C-T01/C-T02 (FR-04 AC10): กดได้ถึงเวลามื้อถัดไปพอดี เลย 1 ms กดไม่ได้', () => {
  assert.equal(state(at(12, 0, 0, 0), null).canConfirm, true);
  assert.equal(state(at(12, 0, 0, 0), null).state, 'not_confirmed');
  assert.equal(state(at(12, 0, 0, 1), null).canConfirm, false);
  assert.equal(state(at(12, 0, 0, 1), null).state, 'missed');
});

test('C-T04: ไม่มีมื้อถัดไป หน้าต่างสิ้นสุด 23:59:59.999', () => {
  assert.equal(state(at(23, 59, 59, 999), null, null).canConfirm, true);
  assert.equal(state(at(23, 59, 59, 999) + 1, null, null).canConfirm, false);
});

test('BR-11 (FR-04 AC4): กด "ยังไม่กิน" รอบ T+10 → แจ้งผู้ดูแลทันที', () => {
  const r = M.mealState({ now: at(8, 11), meal, dose: null, nextMealStart: at(12, 0), notYetLastRound: true });
  assert.equal(r.state, 'reminding');
  assert.equal(r.caregiverAlert, 'not_confirmed');
});

test('BR-14 / C-T03 (FR-05 AC10): ป้ายสถานะผู้ดูแล — ช่วง T..T+15 = "ยังไม่ยืนยัน" ไม่ใช่ "ยังไม่ถึงเวลา"', () => {
  assert.equal(M.statusLabel('not_due').text, 'ยังไม่ถึงเวลา');
  for (const s of ['reminding', 'not_confirmed', 'missed']) assert.equal(M.statusLabel(s).text, 'ยังไม่ยืนยัน');
  assert.equal(M.statusLabel('taken', at(8, 3)).text, 'กินแล้ว 08:03');
  assert.equal(M.statusLabel('taken_late', at(8, 40)).text, 'กินแล้ว (ยืนยันย้อนหลัง) 08:40');
});

test('BR-15/16: nextMealStartFor ใช้มื้อที่เริ่ม "หลัง T+15" · มื้อสุดท้าย = null', () => {
  const meals = [{ T: at(6, 45) }, { T: at(7, 0) }, { T: at(12, 0) }];
  assert.equal(M.nextMealStartFor(meals, meals[0]), at(12, 0)); // 07:00 = T+15 พอดี ยังไม่ "หลัง"
  assert.equal(M.nextMealStartFor(meals, meals[2]), null);
});

test('A1-T01..T06 (BR-06): ยา 1 ตัวหลาย slot, จัดกลุ่มตามเวลาเตือน, slot ผิด/ซ้ำไม่เข้ามื้อ', () => {
  const mt = M.DEFAULT_MEAL_TIMES;
  const meals = M.groupMeals(M.sampleMedicines(), mt);
  assert.deepEqual(meals.map((m) => M.fmtHM(m.T)), ['06:45', '07:00', '12:00', '18:00']);
  assert.deepEqual(meals[1].medicines.map((x) => [x.name, x.tablets]), [['ยาตัวอย่าง A', 1], ['ยาตัวอย่าง B', 1]]);
  assert.equal(meals[3].medicines[0].tablets, 2); // จำนวนเม็ดต่อ slot ไม่รวมกัน
  const dup = { id: 'x', name: 'ยาซ้ำ', slots: [
    { meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 },
    { meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }] };
  assert.equal(M.groupMeals([dup], mt)[0].medicines.length, 1); // เตือนซ้ำไม่ได้
  assert.equal(M.medicineProblems(dup, mt)[0].reason, 'duplicate_slot');
  const conflict = { id: 'y', name: 'ยาขัดกัน', slots: [
    { meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 },
    { meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 2 }] };
  assert.equal(M.medicineProblems(conflict, mt)[0].reason, 'conflicting_tablets');
  assert.equal(M.validateSlot({ meal: 'lunch', timing: 'before_meal', minutesBefore: null, tabletsPerDose: 1 }), 'minutesBefore_required');
  assert.equal(M.validateSlot({ meal: 'lunch', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1.5 }), 'invalid_tablets');
});

test('TC-02.7 (BR-06): ก่อนอาหารเช้า 30 นาที, เช้า 07:00 → เตือน 06:30', () => {
  const slot = { meal: 'breakfast', timing: 'before_meal', minutesBefore: 30, tabletsPerDose: 1 };
  assert.equal(M.fmtHM(M.reminderMs(slot, M.DEFAULT_MEAL_TIMES)), '06:30');
});

// ---------- ทางถูก/ทางผิดครบทุก AC ----------
test('AC ทุกข้อของ FR-01 ถึง FR-05 (ตาม TRACEABILITY) มีวิธีดูในสารบัญต้นแบบ', () => {
  const trace = readFileSync(fileURLToPath(new URL('../docs/TRACEABILITY.md', import.meta.url)), 'utf8');
  const index = read('index.html');
  for (let fr = 1; fr <= 5; fr++) {
    const id = `FR-0${fr}`;
    const a = trace.indexOf(`\n## ${id} `);
    const b = trace.indexOf('\n## ', a + 5);
    const nums = [...trace.slice(a, b).matchAll(/^\| (\d+) \| /gm)].map((m) => Number(m[1]));
    assert.ok(nums.length >= 5, `อ่าน AC ของ ${id} ไม่ได้`);
    for (const n of nums) assert.match(index, new RegExp(`${id} ข้อ ${n}(?!\\d)`), `สารบัญไม่มีวิธีดู ${id} ข้อ ${n}`);
  }
});

test('FR-02 ข้อ 3/11: ฉลากตัวอย่างที่ไม่ครบ/ซ้ำ/ขัดกัน ต้องมีปัญหาที่ระบบจับได้ (ไม่เดา ไม่รวม ไม่บวกเม็ด)', () => {
  const mt = M.DEFAULT_MEAL_TIMES, S2 = M.LABEL_SAMPLES;
  const problems = (k) => M.medicineProblems(S2[k].draft, mt).map((x) => x.reason);
  assert.deepEqual(problems('ok'), []);
  assert.deepEqual(problems('before30'), []);
  assert.ok(problems('partial').includes('minutesBefore_required'));
  assert.ok(problems('timesaday').includes('invalid_meal'));
  assert.ok(problems('every6h').includes('invalid_timing') || problems('every6h').includes('invalid_meal'));
  assert.ok(problems('noname').includes('invalid_tablets') && S2.noname.draft.name === null);
  assert.ok(problems('dup').includes('duplicate_slot'));
  assert.ok(problems('conflict').includes('conflicting_tablets'));
  assert.ok(problems('notablets').includes('invalid_tablets'));
  assert.equal(S2.asneeded.draft, null); // ยากินเมื่อมีอาการ ไม่สร้างตารางเตือน (ข้อ 4)
  assert.equal(M.fmtHM(M.reminderMs(S2.before30.draft.slots[0], mt)), '06:30'); // ข้อ 7
});

test('FR-02 ข้อ 5: ปัญหาของบริการ AI มีเหตุผลครบ 4 แบบ (ออฟไลน์ ล่ม โควตาหมด อ่านรูปไม่ออก)', () => {
  assert.deepEqual(Object.keys(M.AI_PROBLEMS).sort(), ['down', 'offline', 'quota', 'unreadable']);
  for (const v of Object.values(M.AI_PROBLEMS)) assert.ok(v.length > 8);
});

test('ช่องตั้งเวลาจำลอง: อ่าน HH:MM[:SS[.mmm]] ได้ถึงมิลลิวินาที และปฏิเสธรูปแบบ/ช่วงที่ผิด (ใช้ทดสอบขอบ BR-21)', () => {
  assert.equal(M.parseClock('12:00'), M.hm(12, 0));
  assert.equal(M.parseClock('12:00:00.000'), M.hm(12, 0));
  assert.equal(M.parseClock('12:00:00.001'), M.hm(12, 0) + 1);
  assert.equal(M.parseClock('7:05:09.5'), M.hm(7, 5) + 9000 + 500);
  assert.equal(M.parseClock(' 23:59:59.999 '), M.END_OF_DAY);
  for (const bad of ['', 'abc', '24:00', '12:60', '12:00:60', '12:00:00.1234', '12', '12:0', '-1:00']) assert.equal(M.parseClock(bad), null, bad);
  assert.equal(M.fmtHMSms(M.hm(12, 0) + 1), '12:00:00.001');
  assert.equal(M.fmtHMSms(M.END_OF_DAY), '23:59:59.999');
});

// ---------- ตั้งค่าการแสดงผล: ขนาดตัวอักษร 3 ระดับ + โหมดมืด (หน้าตั้งค่า S-04 / C-09) ----------
const tokensCss = readFileSync(fileURLToPath(new URL('../prototype/css/tokens.css', import.meta.url)), 'utf8');
const block = (sel) => { const m = tokensCss.match(new RegExp(sel.replace(/[[\]"=]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); return m ? m[1] : ''; };
const tokenOf = (css, name) => { const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6}|[0-9.]+px)')); return m ? m[1] : null; };
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('NFR-03: ขนาดตัวอักษร/ปุ่มทุกระดับ (ปกติ ใหญ่ ใหญ่มาก) ไม่ต่ำกว่าเกณฑ์ และเรียงจากเล็กไปใหญ่', () => {
  const levels = [tokensCss.match(/:root\s*\{([^}]*)\}/)[1], block('[data-size="large"]'), block('[data-size="xlarge"]')];
  let prev = 0;
  for (const css of levels) {
    const body = parseFloat(tokenOf(css, 'fs-body')), med = parseFloat(tokenOf(css, 'fs-med-name')), btn = parseFloat(tokenOf(css, 'btn-h'));
    assert.ok(body >= 18 && med >= 24 && btn >= 64, `ต่ำกว่าเกณฑ์ NFR-03: ${body}/${med}/${btn}`);
    assert.ok(body > prev, 'ระดับต้องใหญ่ขึ้นเรื่อย ๆ');
    prev = body;
  }
});

test('WCAG 1.4.3: โหมดมืด — ทุกคู่สีที่ใช้จริง contrast ≥ 4.5 : 1', () => {
  const d = block('[data-theme="dark"]'), c = (n) => tokenOf(d, n);
  const pairs = [['text', 'bg'], ['text', 'surface'], ['text', 'bg-grad-1'], ['text', 'bg-grad-2'], ['text-muted', 'bg'], ['text-muted', 'surface'], ['text-muted', 'bg-grad-1'],
    ['primary', 'bg'], ['primary', 'accent-soft'], ['on-color', 'primary'], ['on-color', 'taken'], ['on-color', 'notyet'], ['accent', 'bg'], ['accent', 'accent-soft'],
    ['text', 'accent-soft'], ['hero-text', 'hero-bg'], ['warn-text', 'warn-bg'], ['taken', 'bg'], ['taken', 'surface'], ['notyet', 'bg']];
  for (const [fg, bg] of pairs) {
    assert.ok(c(fg) && c(bg), `โหมดมืดขาด token ${fg}/${bg}`);
    assert.ok(contrast(c(fg), c(bg)) >= 4.5, `โหมดมืด ${fg} บน ${bg} = ${contrast(c(fg), c(bg)).toFixed(1)} (< 4.5)`);
  }
});

test('ตั้งค่าการแสดงผล: หน้าตั้งค่าทั้งผู้สูงอายุ (S-04) และผู้ดูแล (C-09) มีตัวเลือกขนาดตัวอักษรและโหมดสี · ปุ่มบอกสถานะด้วย aria-pressed', () => {
  assert.match(read('js/screens/pairing.js'), /senior-settings[\s\S]*prefsCard\(p\)[\s\S]*cg-settings[\s\S]*prefsCard\(p\)/);
  const ui = read('js/ui.js');
  for (const s of ["'ปกติ'", "'ใหญ่'", "'ใหญ่มาก'", "'สว่าง'", "'มืด'", 'aria-pressed']) assert.ok(ui.includes(s), `ui.js ไม่มี ${s}`);
  const ph = read('js/phone.js');
  assert.ok(ph.includes("ACTS['size-step']") && ph.includes("ACTS['set-theme']") && ph.includes('data-size') && ph.includes('data-theme'));
  for (const k of ["'minus'", "'plus'", "'sun'", "'moon'", "icon('gear')"]) assert.ok(ui.includes(k), `ui.js ไม่ได้ใช้ไอคอน ${k}`);
});

test('แถบล่าง: ผู้สูงอายุมีข้อความใต้ไอคอน (fs-tab ≥ 18px ทุกระดับ, NFR-03) · ผู้ดูแลไอคอนอย่างเดียว · ทุกปุ่มมี aria-label', () => {
  const tabs = read('js/phone.js').match(/function tabsHtml[\s\S]*?\n  }/)[0];
  assert.ok(tabs.includes('aria-label'), 'ปุ่มแถบล่างต้องมี aria-label');
  assert.match(tabs, /p\.role === 'senior' \? '<span class="tab-label">'/);
  const levels = [tokensCss.match(/:root\s*\{([^}]*)\}/)[1], block('[data-size="large"]'), block('[data-size="xlarge"]')];
  for (const css of levels) assert.ok(parseFloat(tokenOf(css, 'fs-tab')) >= 18, 'ข้อความแถบล่างต่ำกว่า 18px');
});
