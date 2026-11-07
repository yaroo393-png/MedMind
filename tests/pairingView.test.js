// FR-01 หน้าจอจับคู่ (S-01, C-01, S-04, C-09) — AC 1–6 ระดับหน้าจอ · ใช้ localRepo จริง ไม่ใช่ของจำลอง
// เจ้าของ: Takkan · ตรรกะตัดสินอยู่ที่ logic/pairing.js (tests/pairing.test.js) — ที่นี่ตรวจว่าหน้าจอ "แสดงและเรียก" ถูกต้อง
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePair, textOf, MIN } from './helpers/harness.js';

test('FR-01 ข้อ 1: เปิดแอปครั้งแรก เห็น QR + รหัส 6 หลักทันที ไม่ต้องสมัคร/พิมพ์ และอ่านข้อความ 3 ข้อก่อนยินยอม', async () => {
  const { senior } = await makePair('fresh');
  const v = await senior.view('senior-pair');
  assert.match(v.body, /class="qr"/);
  assert.match(textOf(v.body), /\d{3} \d{3}/);                       // รหัส 6 หลัก
  assert.doesNotMatch(v.body, /<input/);                              // ผู้สูงอายุไม่ต้องพิมพ์อะไร
  const t = textOf(v.body);
  assert.match(t, /ผู้ดูแลจะเห็น: ยา เวลามื้อ และสถานะการยืนยัน/);     // ข้อมูลที่แชร์
  assert.match(t, /เพื่ออะไร: แจ้งผู้ดูแลเมื่อมื้อยังไม่ยืนยัน/);        // เพื่ออะไร
  assert.match(t, /ยกเลิกจับคู่ได้ทุกเมื่อ/);                          // ยกเลิกได้
  assert.match(v.body, /data-act="consent"/);
  assert.match(v.covers, /FR-01/);
});

test('FR-01 ข้อ 2: ผู้ดูแลจับคู่ก่อนผู้สูงอายุยินยอม → ถูกปฏิเสธ บอกว่ารอยินยอม', async () => {
  const { senior, caregiver } = await makePair('fresh');
  await senior.load();
  await caregiver.act('fill-code');
  await caregiver.act('join');
  assert.match(caregiver.ui.error, /รอผู้สูงอายุกดยินยอม/);
  assert.equal((await caregiver.load()).pairState, 'waiting_consent');
});

test('FR-01 ข้อ 3: ยินยอมแล้วใช้รหัสถูก → ทั้งสองจอเห็นว่าเชื่อมต่อแล้ว', async () => {
  const { senior, caregiver } = await makePair('fresh');
  await senior.load();
  await senior.act('consent');
  await caregiver.act('fill-code');
  await caregiver.act('join');
  assert.equal(caregiver.ui.error, null);
  assert.match(textOf((await senior.view('senior-pair')).body), /เชื่อมต่อแล้ว/);
  assert.match(textOf((await caregiver.view('cg-pair')).body), /เชื่อมต่อแล้ว/);
});

test('FR-01 ข้อ 4: รหัสผิด / หมดอายุ (เกิน 10 นาที) / ใช้แล้ว → ปฏิเสธพร้อมข้อความ ไม่เกิดการเชื่อมต่อ', async () => {
  const { ctx, senior, caregiver } = await makePair('fresh');
  await senior.load(); await senior.act('consent');
  caregiver.ui.codeInput = '000000';                                   // ผิด (โอกาสชนกับรหัสจริง 1 ใน 1 ล้าน — ถ้าชนให้เปลี่ยน)
  const code = (await ctx.repo.getPairing()).invite.code;
  if (code === '000000') caregiver.ui.codeInput = '000001';
  await caregiver.act('join');
  assert.match(caregiver.ui.error, /รหัสไม่ถูกต้อง/);
  await caregiver.act('fill-code');
  ctx.clock.advance(10 * MIN);                                          // ตรง 10:00.000 ยังใช้ได้ (ใช้ไม่เกิน)
  ctx.clock.advance(1);                                                 // เลย 1 มิลลิวินาที → หมดอายุ
  await caregiver.act('join');
  assert.match(caregiver.ui.error, /หมดอายุ/);
  assert.equal((await caregiver.load()).pairState, 'waiting_caregiver');
});

test('FR-01 ข้อ 4: รหัสหมดอายุเมื่อ "เกิน" 10 นาที — ตรง 10:00.000 ยังใช้ได้', async () => {
  const { ctx, senior, caregiver } = await makePair('fresh');
  await senior.load(); await senior.act('consent'); await caregiver.act('fill-code');
  ctx.clock.advance(10 * MIN);
  await caregiver.act('join');
  assert.equal(caregiver.ui.error, null);
  assert.equal((await caregiver.load()).pairState, 'connected');
});

test('FR-01 ข้อ 4: สร้างรหัสใหม่แล้วรหัสเดิมใช้ไม่ได้', async () => {
  const { ctx, senior, caregiver } = await makePair('fresh');
  await senior.load(); await senior.act('consent'); await caregiver.act('fill-code');
  const old = caregiver.ui.codeInput;
  await senior.act('new-code');
  if ((await ctx.repo.getPairing()).invite.code === old) await senior.act('new-code'); // กันสุ่มชนรหัสเดิม
  await caregiver.act('join');
  assert.match(caregiver.ui.error, /รหัสไม่ถูกต้อง/);
});

test('FR-01 ข้อ 5: ผู้ดูแลคนที่สองใช้รหัสเดิม → ปฏิเสธ "ผู้สูงอายุท่านนี้มีผู้ดูแลแล้ว"', async () => {
  const { senior, caregiver } = await makePair('fresh');
  await senior.load(); await senior.act('consent'); await caregiver.act('fill-code'); await caregiver.act('join');
  await caregiver.act('join-second');
  assert.match(caregiver.ui.error, /มีผู้ดูแลแล้ว/);
  assert.equal((await caregiver.load()).pairing.pair.caregiverId, 'demo-caregiver');   // ยังเป็นคนแรก
});

test('FR-01 ข้อ 6: ยกเลิกจับคู่ต้องยืนยัน 2 ขั้น แล้วข้อมูลของคู่ถูกลบ ผู้สูงอายุได้ QR ใหม่', async () => {
  const { ctx, senior, caregiver } = await makePair('sample');
  assert.ok((await ctx.repo.listMedicines()).length > 0);
  await caregiver.act('unpair-ask');
  assert.match(textOf((await caregiver.view('cg-settings')).overlay), /ยกเลิกจับคู่\?/);       // ขั้นที่ 1
  await caregiver.act('unpair-next');
  assert.match(textOf((await caregiver.view('cg-settings')).overlay), /ยืนยันอีกครั้ง/);         // ขั้นที่ 2
  assert.equal((await caregiver.load()).pairState, 'connected');                                 // ยังไม่ลบจนกว่าจะยืนยัน
  await caregiver.act('unpair-yes');
  assert.equal(caregiver.unpaired, true);
  assert.equal((await ctx.repo.listMedicines()).length, 0);
  assert.equal(await ctx.repo.getMealTimes(), null);
  assert.equal((await senior.load()).pairState, 'waiting_consent');
  assert.match((await senior.view('senior-pair')).body, /class="qr"/);
});

test('FR-01 ข้อ 6: "ไม่ยกเลิก" ปิดกล่องโดยไม่ลบอะไร', async () => {
  const { ctx, caregiver } = await makePair('sample');
  await caregiver.act('unpair-ask'); await caregiver.act('unpair-no');
  assert.equal(caregiver.ui.dialog, null);
  assert.ok((await ctx.repo.listMedicines()).length > 0);
});

test('หน้าตั้งค่า S-04 / C-09 มีการแสดงผล (NFR-03) และปุ่มยกเลิกจับคู่เมื่อจับคู่แล้วเท่านั้น', async () => {
  const { senior, caregiver } = await makePair('sample');
  for (const [p, name] of [[senior, 'senior-settings'], [caregiver, 'cg-settings']]) {
    const v = await p.view(name);
    assert.match(v.body, /data-act="size-step"/);
    assert.match(v.body, /data-act="set-theme"/);
    assert.match(v.body, /data-act="unpair-ask"/);
    assert.match(v.covers, /FR-01/);
  }
  const fresh = await makePair('fresh');
  assert.doesNotMatch((await fresh.caregiver.view('cg-settings')).body, /data-act="unpair-ask"/);
});

test('ข้อความจากเขตข้อมูล (รหัสที่พิมพ์) ถูก escape ก่อนใส่ HTML', async () => {
  const { caregiver } = await makePair('fresh');
  caregiver.ui.codeInput = '"><script>x</script>';
  const v = await caregiver.view('cg-pair');
  assert.doesNotMatch(v.body, /<script>x/);
  assert.match(v.body, /&quot;&gt;&lt;script&gt;/);
});
