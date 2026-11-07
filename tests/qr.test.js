// features/qr.js — QR จริงของลิงก์เชิญ (FR-01 ข้อ 1) เทียบกับผลของไลบรารีอ้างอิง (tests/fixtures/qr-golden.json — สร้างจาก npm qrcode โหมด byte ระดับ M)
// ตอนพัฒนาตรวจเพิ่มด้วยตัวอ่าน QR (jsQR) ว่าอ่านได้ข้อความเดิมทุกเวอร์ชัน 1–10 — บันทึกใน AI log
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeQr, qrSvg } from '../public/js/features/qr.js';

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
