// features/qr.js — QR จริงของลิงก์เชิญ (FR-01 ข้อ 1) เทียบกับผลของไลบรารีอ้างอิง (tests/fixtures/qr-golden.json — สร้างจาก npm qrcode โหมด byte ระดับ M)
// ตอนพัฒนาตรวจเพิ่มด้วยตัวอ่าน QR (jsQR) ว่าอ่านได้ข้อความเดิมทุกเวอร์ชัน 1–10 — บันทึกใน AI log
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeQr, qrSvg, inviteCodeFromScan } from '../public/js/features/qr.js';
import jsQR from '../public/js/vendor/jsqr.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/qr-golden.json', import.meta.url), 'utf8'));

test('ตรงกับไลบรารีอ้างอิงทุกโมดูล (เมื่อใช้ mask เดียวกัน) — รหัส ลิงก์เชิญ และข้อความภาษาไทย', () => {
  assert.ok(golden.cases.length >= 12);
  for (const c of golden.cases) {
    const mine = encodeQr(c.text, { mask: c.mask });
    assert.equal(mine.version, c.version, `${c.text} เวอร์ชัน`);
    const rows = mine.modules.map((r) => r.map((d) => (d ? '1' : '0')).join(''));
    assert.deepEqual(rows, c.rows, `${c.text.slice(0, 20)} mask ${c.mask}`);
  }
});

test('ลิงก์เชิญจริงใช้ได้ในเวอร์ชันเล็ก (สแกนง่าย) และเลือก mask อัตโนมัติ 0–7', () => {
  const q = encodeQr('https://yaroo393-png.github.io/MedMind/caregiver.html?code=123456');
  assert.equal(q.version, 5);
  assert.equal(q.size, 37);
  assert.ok(q.mask >= 0 && q.mask <= 7);
});

test('มีลวดลายหา (finder) ครบ 3 มุม และ dark module ตามมาตรฐาน', () => {
  const { size, modules } = encodeQr('123456');
  for (const [x, y] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let i = 0; i < 7; i += 1) { assert.equal(modules[y][x + i], true); assert.equal(modules[y + 6][x + i], true); }
    assert.equal(modules[y + 1][x + 1], false);
    assert.equal(modules[y + 3][x + 3], true);
  }
  assert.equal(modules[size - 8][8], true);
});

test('ข้อความยาวเกินเวอร์ชัน 10 → แจ้งข้อผิดพลาด ไม่สร้าง QR ผิด', () => {
  assert.throws(() => encodeQr('x'.repeat(300)), /ยาวเกินไป/);
});

test('qrSvg: ขอบขาว 4 โมดูล · สีจาก token ดำบนขาว (ไม่มีสีลอย) · มี aria-label · ข้อความป้ายถูกล้างอักขระ HTML', () => {
  const svg = qrSvg('123456', { label: 'QR <b>' });
  assert.match(svg, /viewBox="0 0 29 29"/);                      // 21 + 4×2
  assert.match(svg, /var\(--qr-dark\)/); assert.match(svg, /var\(--qr-light\)/);
  assert.doesNotMatch(svg, /#[0-9a-fA-F]{3,6}\b/);
  assert.match(svg, /aria-label="QR b"/);
});

test('FR-01 ข้อ 1, 3: ถอดรหัส 6 หลักจากลิงก์เชิญหรือรหัสล้วน — อย่างอื่นไม่รับ', () => {
  assert.equal(inviteCodeFromScan('https://yaroo393-png.github.io/MedMind/index.html?code=123456'), '123456');
  assert.equal(inviteCodeFromScan('https://x.test/caregiver.html?a=1&code=987654'), '987654');
  assert.equal(inviteCodeFromScan(' 123456 '), '123456');
  for (const bad of ['', null, undefined, '12345', '1234567', 'https://x.test/?code=12345', 'https://x.test/?code=1234567', 'hello']) assert.equal(inviteCodeFromScan(bad), null, String(bad));
});

test('FR-01 ข้อ 1, 3: ตัวอ่านที่แอปใช้สแกน (jsQR ใน vendor/) อ่าน QR ที่แอปสร้างได้ข้อความเดิม', () => {
  const link = 'https://yaroo393-png.github.io/MedMind/index.html?code=482916';
  const { size, modules } = encodeQr(link);
  const scale = 8, quiet = 4, side = (size + quiet * 2) * scale, data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    if (!modules[y][x]) continue;
    for (let dy = 0; dy < scale; dy += 1) for (let dx = 0; dx < scale; dx += 1) {
      const i = (((y + quiet) * scale + dy) * side + (x + quiet) * scale + dx) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  const hit = jsQR(data, side, side);
  assert.equal(hit?.data, link);
  assert.equal(inviteCodeFromScan(hit.data), '482916');
});
