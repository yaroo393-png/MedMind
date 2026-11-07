// ตรวจหน้าเว็บจริงใน public/ ตามเกณฑ์ M3/M4: ป้าย Covers ทุกหน้า · ใช้ token ไม่มีสีลอย · ไม่เรียกเครือข่าย · ทุกปุ่มมีตัวจัดการ · NFR-03 (ขนาด/ความคมชัด) · ไม่มีข้อมูลจริง
// เจ้าของ: Rossatorn (ดีไซน์), Nichanan (Demo mode) · ส่วนคำนวณ logic อยู่ในเทสต์ของแต่ละ FR
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makePair } from './helpers/harness.js';
import { SCREENS, ACTIONS } from '../public/js/features/phone.js';
import { setClockTo } from '../public/js/features/demoControls.js';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const read = (f) => readFileSync(root + f, 'utf8');
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}${e.name}/`) : [`${d}${e.name}`]));
const files = walk(root).map((f) => f.slice(root.length));
const featureFiles = files.filter((f) => f.startsWith('js/features/') && f.endsWith('.js'));
const codeFiles = files.filter((f) => /\.(js|html|css)$/.test(f) && !f.startsWith('js/vendor/'));   // vendor/ = ไลบรารีภายนอกที่ไม่แก้ (jsQR · Apache-2.0)

test('มีไฟล์หน้าเว็บและไฟล์สไตล์ครบ', () => {
  for (const f of ['index.html', 'demo.html', 'css/tokens.css', 'css/app.css', 'fonts/OFL.txt', 'fonts/Sarabun-Regular.ttf', 'fonts/Sarabun-SemiBold.ttf', 'fonts/Sarabun-Bold.ttf',
    'js/features/phone.js', 'js/features/demoShell.js', 'js/features/demoControls.js', 'js/features/ui.js', 'js/features/format.js', 'js/features/model.js', 'js/features/alerts.js',
    'js/features/pairing.js', 'js/features/medicineSetup.js', 'js/features/reminder.js', 'js/features/home.js', 'js/features/caregiverStatus.js', 'js/core/offlineQueue.js']) {
    assert.ok(existsSync(root + f), `ไม่พบ public/${f}`);
  }
});

test('M3: ทุกหน้า HTML มีแถบ "Covers: FR-xx" และชี้ไฟล์สไตล์/สคริปต์ที่มีอยู่จริง', () => {
  for (const f of ['index.html', 'demo.html', 'senior.html', 'caregiver.html']) {
    const s = read(f);
    assert.match(s, /Covers: FR-0\d/, `${f} ไม่มี Covers`);
    for (const m of s.matchAll(/(?:href|src)="(?!https?:|#)([^"]+)"/g)) assert.ok(existsSync(root + m[1].split('?')[0]), `${f} ชี้ไฟล์ที่ไม่มี: ${m[1]}`);
    for (const m of s.matchAll(/from '\.\/([^']+)'/g)) assert.ok(existsSync(root + m[1]), `${f} import ไฟล์ที่ไม่มี: ${m[1]}`);
  }
});

test('M3: ทุกหน้าจอ (ทั้ง 14 route) มี Covers ที่ชี้ FR และวาดได้ทั้งสองบทบาท', async () => {
  const names = Object.keys(SCREENS);
  assert.ok(names.length >= 14, `พบเพียง ${names.length} หน้า`);
  const { senior, caregiver } = await makePair('sample');
  for (const name of names) {
    const phone = name.startsWith('senior') ? senior : caregiver;
    const v = await phone.view(name);
    assert.match(v.covers, /FR-0\d/, `หน้า ${name} ไม่มี covers ที่ชี้ FR`);
    assert.ok(v.title && typeof v.body === 'string', name);
  }
});

test('ครอบทุก Must FR (FR-01…FR-05) ในป้าย Covers ของหน้าจอ', async () => {
  const { senior, caregiver } = await makePair('sample');
  const covers = [];
  for (const name of Object.keys(SCREENS)) covers.push((await (name.startsWith('senior') ? senior : caregiver).view(name)).covers);
  for (let i = 1; i <= 5; i++) assert.ok(covers.join(' ').includes(`FR-0${i}`), `ไม่มีหน้าที่ครอบ FR-0${i}`);
});

test('ทุกปุ่ม (data-act) ที่หน้าจอสร้างมีตัวจัดการจริง — ไม่มีปุ่มที่กดแล้วไม่เกิดอะไร', async () => {
  const builtin = new Set(['go', 'size-step', 'set-theme', 'toast-close']);
  const { ctx, senior, caregiver } = await makePair('sample');
  const used = new Set();
  const collect = async (phone, name) => { const v = await phone.view(name); for (const m of (v.body + (v.overlay ?? '')).matchAll(/data-act="([a-z-]+)"/g)) used.add(m[1]); };
  for (const t of ['07:00', '07:16']) { // ครอบทั้งหน้าเตือน/หน้าหลัก/แจ้งเตือน ในช่วงเวลาที่ต่างกัน
    setClockTo(ctx, t);
    for (const name of Object.keys(SCREENS)) await collect(name.startsWith('senior') ? senior : caregiver, name);
  }
  caregiver.ui.dialog = 'unpair1'; await collect(caregiver, 'cg-settings'); caregiver.ui.dialog = 'unpair2'; await collect(caregiver, 'cg-settings');
  caregiver.ui.draft = null; caregiver.ui.sample = 'asNeeded'; await collect(caregiver, 'cg-draft');
  caregiver.ui.sample = 'complete'; await collect(caregiver, 'cg-draft');
  const missing = [...used].filter((a) => !builtin.has(a) && !ACTIONS[a]);
  assert.deepEqual(missing, [], `ปุ่มที่ไม่มีตัวจัดการ: ${missing}`);
  assert.ok(used.size >= 20, `พบปุ่มเพียง ${used.size}`);
});

test('M3: ใช้ token เท่านั้น ไม่มีสี #hex ลอยนอก tokens.css', () => {
  assert.equal(/--fresh:\s*#8DBA62/i.test(read('css/tokens.css')), true, 'theme-color ใน HTML ต้องตรงกับ --fresh');
  for (const f of codeFiles.filter((x) => x !== 'css/tokens.css')) {
    // ยกเว้น <meta name="theme-color"> (ใส่ var() ไม่ได้ — ต้องตรงกับ --fresh ใน tokens.css)
    const bad = read(f).replace(/<meta name="theme-color"[^>]*>/g, '').match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g);
    assert.equal(bad, null, `public/${f} มีสีลอย ${bad}`);
  }
});

test('ADR-8 / NFR-09: Demo mode ไม่ต้องมี server — ไม่มีการเรียกเครือข่าย ลิงก์ภายนอก หรือที่เก็บถาวรของเบราว์เซอร์ · ใช้งานจริงโหลดได้เฉพาะ SDK ของ Firebase จาก CDN', () => {
  for (const f of codeFiles) {
    const s = read(f);
    if (f === 'js/core/firebase.js') {
      for (const m of s.matchAll(/https?:\/\/[^\s'"`]+/g)) assert.match(m[0], /^https:\/\/www\.gstatic\.com\/firebasejs\/|^http:\/\/127\.0\.0\.1:9099$/, `firebase.js อ้าง ${m[0]}`);
    } else {
      // sw.js (PWA) เรียก self.fetch เฉพาะไฟล์ของเว็บเอง (same-origin) เพื่อแคชสำรอง — ตรวจด้านล่างว่าไม่ยุ่งกับโดเมนอื่น
      const body = f === 'sw.js' ? s.replace('self.fetch(req)', '') : s;
      assert.doesNotMatch(body, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\//, `public/${f} อ้างเครือข่าย`);
      if (f === 'sw.js') assert.match(s, /origin !== self\.location\.origin\) return/, 'sw.js ต้องไม่แคช/ยุ่งกับคำขอข้ามโดเมน');
    }
    // ข้อยกเว้นเดียว: จำ "บทบาท" ของเครื่อง (คีย์ mm-role = senior|caregiver ไม่ใช่ข้อมูลส่วนตัว) ให้เปิดลิงก์เดียวแล้วเข้าหน้าเดิม
    const allowRoleMemory = f === 'index.html' || f === 'js/features/realShell.js';
    const stripped = allowRoleMemory ? s.replace(/localStorage\??\.(?:get|set)Item\(([^)]*)\)/g, (m, a) => { assert.match(a, /KEY|'mm-role'/, `${f} เก็บอย่างอื่นนอกบทบาท: ${m}`); return ''; }) : s;
    assert.doesNotMatch(stripped, /localStorage|sessionStorage|indexedDB|document\.cookie/, `public/${f} เก็บข้อมูลลงเบราว์เซอร์เอง (ใช้ที่เก็บของแอปเท่านั้น)`);
  }
});

test('ADR-8: demo.html และไฟล์ที่มัน import ทั้งหมดไม่แตะ Firebase (เปิดได้โดยไม่มีเครือข่าย)', () => {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
    for (const m of read(file).matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = new URL(m[1], `file:///${dir}`).pathname.slice(1);
      if (existsSync(root + target)) visit(target);
    }
  };
  visit('demo.html');
  assert.ok(seen.has('js/features/phone.js') && seen.has('js/core/repo.js'), 'ไล่ import ไม่ครบ');
  for (const bad of ['js/core/firebase.js', 'js/core/firestoreRepo.js', 'js/features/realShell.js', 'js/services/aiLabel.js']) assert.equal(seen.has(bad), false, `demo.html ดึง ${bad}`);
});

test('สถาปัตยกรรม: เฉพาะ phone.js, demoShell.js, realShell.js, redactTool.js และ qrScan.js แตะ DOM · logic/ และ core/ ไม่แตะ DOM · Date.now() อยู่ที่ clock.js ที่เดียว', () => {
  const domWords = /\b(document|window|localStorage|innerHTML|addEventListener)\b/;
  for (const f of featureFiles.filter((x) => !/phone\.js$|demoShell\.js$|realShell\.js$|redactTool\.js$|qrScan\.js$/.test(x))) {
    assert.doesNotMatch(read(f).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''), domWords, `public/${f} แตะ DOM`);
  }
  for (const f of files.filter((x) => /^js\/(logic|core)\//.test(x) && x.endsWith('.js'))) {
    const code = read(f).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(code, domWords, `public/${f} แตะ DOM`);
    if (f !== 'js/core/clock.js') assert.doesNotMatch(code, /Date\.now\(/, `public/${f} เรียก Date.now()`);
  }
});

test('RULES §3: ข้อมูลทดสอบทั้งหมดสมมติ — ไม่มีไฟล์รูปใน public/ และข้อความที่ผู้ใช้เห็นไม่ใช้ "ไม่ได้กิน" (BR-14)', () => {
  // อนุญาตเฉพาะไอคอนแอป (PWA) ที่วาดจากมาสคอต ไม่ใช่รูปถ่าย/รูปฉลาก
  assert.deepEqual(files.filter((f) => /\.(png|jpe?g|heic|webp|gif)$/i.test(f) && !/^img\/(icon-[a-z0-9-]+|apple-touch-icon)\.png$/.test(f)), []);
  for (const f of codeFiles) {
    for (const m of read(f).matchAll(/ไม่ได้กิน|not taken/gi)) {
      assert.match(read(f).slice(Math.max(0, m.index - 24), m.index), /คำว่า\s*[“"]?\s*$/, `public/${f} ใช้คำต้องห้ามในข้อความจริง`);
    }
  }
});

test('RULES §3: ข้อความจากผู้ใช้/AI ใน features ผ่าน esc() — ไม่มีการต่อค่าตัวแปรลง HTML โดยไม่ผ่าน esc (ตรวจแบบหยาบ)', () => {
  for (const f of featureFiles.filter((x) => /(pairing|medicineSetup|home|reminder|caregiverStatus)\.js$/.test(x))) {
    const src = read(f);
    // ค่าที่มาจากข้อมูลผู้ใช้ต้องอยู่ใน esc(...) — ห้ามมี ${m.name} / ${draft.name} / ${a.xxx} ที่ไม่ผ่าน esc
    for (const m of src.matchAll(/\$\{([^}]*\b(?:\.name|\.warnings|\.contraindications|\.instructionText|codeInput|\.error)\b[^}]*)\}/g)) {
      assert.match(m[1], /esc\(/, `public/${f}: \${${m[1]}} ไม่ผ่าน esc()`);
    }
  }
});

// ---------- NFR-03: ขนาดและความคมชัด ----------
const tokens = read('css/tokens.css');
const tok = (name) => new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1].trim();
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('NFR-03: ตัวอักษร ≥ 18px · ชื่อยา ≥ 24px · ปุ่มกินแล้ว/ยังไม่กิน ≥ 64px (ทุกระดับขนาด)', () => {
  assert.match(tokens, /--fs-body:\s*18px/); assert.match(tokens, /--fs-med-name:\s*24px/); assert.match(tokens, /--btn-h:\s*64px/);
  for (const m of tokens.matchAll(/--fs-(?:body|tab):\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 18, `ตัวอักษร ${m[0]} < 18px`);
  for (const m of tokens.matchAll(/--btn-h:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 64, `ปุ่ม ${m[0]} < 64px`);
  for (const m of tokens.matchAll(/--fs-med-name:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 24, `ชื่อยา ${m[0]} < 24px`);
  const css = read('css/app.css');
  assert.match(css, /\.btn \{[^}]*min-height: var\(--btn-h\)/);
  assert.match(css, /\.med-name \{[^}]*font-size: var\(--fs-med-name\)/);
  assert.match(css, /body \{[^}]*font-size: var\(--fs-body\)/);
});

test('NFR-03: ความคมชัดของสีหลัก ≥ 4.5 : 1 (โหมดสว่าง)', () => {
  const pairs = [['text', 'bg'], ['text-muted', 'bg'], ['text', 'surface'], ['on-color', 'primary'], ['on-color', 'taken'], ['on-color', 'notyet'], ['hero-text', 'hero-bg'], ['warn-text', 'warn-bg'], ['accent', 'bg']];
  for (const [fg, bg] of pairs) {
    const a = tok(fg), b = tok(bg);
    assert.match(a, /^#[0-9a-fA-F]{6}$/, fg); assert.match(b, /^#[0-9a-fA-F]{6}$/, bg);
    assert.ok(contrast(a, b) >= 4.5, `${fg} บน ${bg} = ${contrast(a, b).toFixed(2)} < 4.5`);
  }
});

test('NFR-03: ธีมน่ารัก — ตัวอักษรบนพื้นสีสถานะ (ยืนยันแล้ว/ยังไม่ยืนยัน/รอเวลา/มื้อเย็น/แจ้งเตือน) ≥ 4.5 : 1 · ขอบช่องกรอก ≥ 3 : 1', () => {
  const pairs = [['ok-text', 'ok-bg'], ['no-text', 'no-bg'], ['wait-text', 'wait-bg'], ['eve-text', 'eve-bg'], ['text-muted', 'ok-bg'], ['text-muted', 'no-bg'], ['text-muted', 'wait-bg'],
    ['text-muted', 'eve-bg'], ['text', 'late-bg'], ['alert-text', 'alert-bg'], ['ok-text', 'bg'], ['no-text', 'bg'], ['wait-text', 'bg'], ['text-muted', 'bg-grad-1']];
  for (const [fg, bg] of pairs) assert.ok(contrast(tok(fg), tok(bg)) >= 4.5, `${fg} บน ${bg} = ${contrast(tok(fg), tok(bg)).toFixed(2)} < 4.5`);
  assert.ok(contrast(tok('field-line'), tok('bg')) >= 3, 'ขอบช่องกรอกต้อง ≥ 3:1 (WCAG 1.4.11)');
});

test('WCAG 2.4.3/4.1.2: กล่องยืนยันเป็น aria-modal ส่วนอื่น inert Tab วนในกล่อง · ข้อความสถานะอยู่ใน live region ค้าง ≥ 10 วินาที มีปุ่มปิด', () => {
  const phone = read('js/features/phone.js'), ui = read('js/features/ui.js'), reminder = read('js/features/reminder.js');
  assert.ok((ui + reminder).includes('aria-modal="true"'));
  assert.ok(phone.includes("' inert'") && phone.includes('trapTab') && phone.includes('restoreFocus'));
  assert.match(phone, /class="toast-region" role="status" aria-live="polite"/);
  assert.match(phone, /10000\)/);
  assert.ok(phone.includes('data-act="toast-close"'));
});
