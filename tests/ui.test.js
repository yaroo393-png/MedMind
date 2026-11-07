// features/ui.js — ชิ้นส่วน HTML กลาง (ฟังก์ชันล้วน) · RULES §3: ข้อความจากผู้ใช้ต้อง escape ก่อนใส่ HTML
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, btn, chip, flag, icon, logo, mascot, medList, mealCard, medSummary, qrGrid, prefsCard, dialog, hero, heroCard } from '../public/js/features/ui.js';

test('esc: escape < > & " \' และรับค่าว่าง/ตัวเลขได้', () => {
  assert.equal(esc('<a href="x" onclick=\'y\'>&</a>'), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  assert.equal(esc(null), ''); assert.equal(esc(undefined), ''); assert.equal(esc(0), '0');
});

test('btn: data-* ผ่าน esc และปุ่มเป็น type="button"', () => {
  const html = btn('taken', 'กินแล้ว', 'confirm', { meal: '"><x>' });
  assert.match(html, /^<button type="button" class="btn btn-taken" data-act="confirm"/);
  assert.match(html, /data-meal="&quot;&gt;&lt;x&gt;"/);
  assert.doesNotMatch(html, /<x>/);
});

test('chip / flag: ป้ายสถานะและ "โปรดตรวจสอบ"', () => {
  assert.equal(chip({ text: 'ยังไม่ยืนยัน', kind: 'notyet' }), '<span class="chip chip-notyet">ยังไม่ยืนยัน</span>');
  assert.equal(flag(), '<span class="flag">โปรดตรวจสอบ</span>');
});

test('ไอคอน/โลโก้/มาสคอต: ซ่อนจาก screen reader (ตกแต่งเท่านั้น) และใช้สีจาก token', () => {
  assert.match(icon('bell'), /aria-hidden="true"/);
  assert.equal(icon('ไม่มีไอคอนนี้'), '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"></svg>');
  assert.match(logo('logo-sm'), /aria-hidden="true"/);
  assert.match(logo(), /role="img" aria-label="โลโก้ MedMind"/);
  for (const pose of ['greeting', 'celebrate', 'concern', 'encourage']) { const m = mascot(pose, 80); assert.match(m, /aria-hidden="true"/); assert.match(m, /var\(--mascot-body\)/); }
  assert.notEqual(logo('logo-sm'), logo('logo-sm'), 'id ของ gradient ต้องไม่ซ้ำเมื่อวาดหลายโลโก้');
});

const meal = { reminderTime: '07:00', st: { state: 'reminding' }, dose: null, pending: false,
  medicines: [{ name: '<b>ยา</b>', tabletsPerDose: 2, warnings: 'ง่วง', contraindications: 'ห้ามบด' }, { name: 'ยา B', tabletsPerDose: 1, warnings: null, contraindications: null }] };

test('medList: ชื่อยา/คำเตือนผ่าน esc · แสดงจำนวนเม็ดของมื้อนี้ · ไม่มีรูป', () => {
  const html = medList(meal);
  assert.doesNotMatch(html, /<b>ยา<\/b>/);
  assert.match(html, /จำนวน 2 เม็ด/);
  assert.match(html, /คำเตือน: ง่วง/); assert.match(html, /ข้อห้าม: ห้ามบด/);
  assert.doesNotMatch(html, /<img/);
  assert.equal((html.match(/<li>/g) ?? []).length, 2);
});

test('mealCard: ป้ายสถานะตาม BR-14 และข้อความ "รอส่ง" เมื่อ pending', () => {
  assert.match(mealCard(meal), /chip-notyet">ยังไม่ยืนยัน/);
  assert.doesNotMatch(mealCard(meal), /รอส่งให้ผู้ดูแล/);
  const pending = { ...meal, st: { state: 'taken' }, dose: { confirmedAt: new Date(2026, 10, 4, 7, 3).getTime() }, pending: true };
  assert.match(mealCard(pending, '<i>extra</i>'), /กินแล้ว 07:03[\s\S]*รอส่งให้ผู้ดูแล[\s\S]*<i>extra<\/i>/);
  assert.equal(medSummary(meal), '&lt;b&gt;ยา&lt;/b&gt; 2 เม็ด · ยา B 1 เม็ด');
});

test('qrGrid: ผลคงที่ตามรหัส (ภาพประกอบ ไม่ใช่ QR จริง) และอธิบายด้วย aria-label', () => {
  assert.equal(qrGrid('123456'), qrGrid('123456'));
  assert.notEqual(qrGrid('123456'), qrGrid('654321'));
  assert.equal((qrGrid('123456').match(/<i /g) ?? []).length, 169);
  assert.match(qrGrid('123456'), /role="img" aria-label="QR ตัวอย่าง"/);
});

test('prefsCard: ปุ่ม − ที่ขอบล่าง/+ ที่ขอบบนใช้ aria-disabled และโหมดสีมี aria-pressed', () => {
  const small = prefsCard({ size: 'normal', theme: 'light' });
  assert.match(small, /data-dir="-1"[^>]*aria-disabled="true"/);
  assert.doesNotMatch(small, /data-dir="1"[^>]*aria-disabled/);
  assert.match(small, /data-v="light"[^>]*aria-pressed="true"/); assert.match(small, /data-v="dark"[^>]*aria-pressed="false"/);
  assert.match(prefsCard({ size: 'xlarge', theme: 'dark' }), /data-dir="1"[^>]*aria-disabled="true"/);
  assert.match(prefsCard(undefined), /ปกติ/);
});

test('dialog: aria-modal มี id หัวข้อ และปุ่มยืนยัน/ไม่ยกเลิก · hero/heroCard ใช้งานได้', () => {
  const d = dialog('dlg-x', 'ยืนยัน?', 'รายละเอียด', 'ตกลง', 'unpair-yes');
  assert.match(d, /role="alertdialog" aria-modal="true" aria-labelledby="dlg-x"/);
  assert.match(d, /data-act="unpair-yes"[\s\S]*data-act="unpair-no"/);
  assert.match(hero('link', 'หัวข้อ', 'ย่อย'), /<h1>หัวข้อ<\/h1><p class="lead">ย่อย<\/p>/);
  assert.match(heroCard('greeting', 'ป้าย', 'ใหญ่', 'รอง', '<b>ปุ่ม</b>'), /hero-big">ใหญ่<[\s\S]*<b>ปุ่ม<\/b>/);
});
