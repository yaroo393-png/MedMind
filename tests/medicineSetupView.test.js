// FR-02 หน้าจอเพิ่มยาจากฉลาก (C-02…C-06) — AC 1–4, 5, 6, 7, 8, 10, 11 ระดับหน้าจอ · AC 5 (ข้อความเมื่อ AI ใช้ไม่ได้) และ AC 9 (ภาพที่ส่งจริง) บางส่วน
// เจ้าของ: Yar · "AI" ในหน้าจอเป็นตัวจำลองจาก core/demoData.js — ยังไม่มีการเรียก AI จริง/ปิดภาพจริง (services/aiLabel.js, redact.js ยังไม่สร้าง)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePair, textOf } from './helpers/harness.js';

// เปิดหน้าตรวจร่างของฉลากตัวอย่าง sample (ผ่านขั้นติ๊ก "ปิดชื่อและ HN แล้ว" เหมือนผู้ใช้จริง)
async function openDraft(cg, sample) {
  await cg.act('start-add');
  await cg.act('set-sample', { value: sample });
  await cg.act('cover-toggle', { region: 'name' }); await cg.act('cover-toggle', { region: 'hn' }); await cg.act('cover-toggle', { region: 'barcode' });
  await cg.act('set-tick', { checked: true });
  await cg.act('send-ai');
  if (cg.timer) cg.timer(); // ข้ามการรอ AI จำลอง
  return cg.view('cg-draft');
}

test('FR-02 ข้อ 1: ส่งฉลากแล้วได้ร่าง (ชื่อ ช่องเวลากิน เม็ดต่อครั้ง คำเตือน) และยังไม่บันทึกอะไร', async () => {
  const { ctx, caregiver } = await makePair('sample');
  const before = (await ctx.repo.listMedicines()).length;
  const v = await openDraft(caregiver, 'complete');
  assert.equal(caregiver.route, 'cg-draft');
  assert.match(v.body, /ยังไม่ได้บันทึก/);
  assert.match(v.body, /ช่องเวลากิน 3/);
  assert.equal((await ctx.repo.listMedicines()).length, before);
});

test('FR-02 ข้อ 2 + 10: ค่าที่ผู้ดูแลแก้ชนะค่าจาก AI · ฉลาก 3 ช่อง (1/1/2 เม็ด) บันทึกเป็น 1 ยา 3 slot เตือน 07:00/12:00/18:00', async () => {
  const { ctx, caregiver } = await makePair('sample');
  await openDraft(caregiver, 'complete');
  await caregiver.act('edit-field', { path: 'name', value: 'ยาที่ผู้ดูแลแก้ชื่อ' });
  await caregiver.act('save-draft');
  const saved = (await ctx.repo.listMedicines()).find((m) => m.name === 'ยาที่ผู้ดูแลแก้ชื่อ');
  assert.ok(saved, 'ต้องบันทึกชื่อที่แก้ ไม่ใช่ชื่อจาก AI');
  assert.deepEqual(saved.slots.map((s) => s.tabletsPerDose), [1, 1, 2]);
  const list = textOf((await caregiver.view('cg-meds')).body);
  assert.match(list, /ยาที่ผู้ดูแลแก้ชื่อ/);
  for (const t of ['07:00', '12:00', '18:00']) assert.match(list, new RegExp(`เตือน ${t}`));
});

test('FR-02 ข้อ 3: ช่องที่อ่านไม่ออก = "โปรดตรวจสอบ" เฉพาะช่องนั้น และบันทึกไม่ได้จนกว่าจะกรอก (ไม่เดาให้)', async () => {
  const { caregiver } = await makePair('sample');
  const v = await openDraft(caregiver, 'timesADayNoMeals'); // วันละ 3 ครั้ง ไม่บอกมื้อ + อ่านชื่อไม่ออก
  assert.match(v.body, /ช่องเวลากิน 3/);
  assert.ok((v.body.match(/class="flag"/g) ?? []).length >= 7, 'ชื่อ + (มื้อ วิธีกิน) × 3 ต้องมีป้าย');
  assert.match(v.body, /data-act="save-draft" disabled/);
  assert.match(v.body, /บันทึกไม่ได้/);
});

test('FR-02 ข้อ 3: "ก่อนอาหาร" ไม่บอกกี่นาที → ติดป้ายที่ช่องนาที ไม่ใช่ช่องอื่น', async () => {
  const { caregiver } = await makePair('sample');
  const v = await openDraft(caregiver, 'beforeMealNoMinutes');
  assert.match(v.body, /ก่อนอาหารกี่นาที <span class="flag">/);
  assert.doesNotMatch(v.body, /จำนวนเม็ดต่อครั้ง <span class="flag">/);
  assert.match(v.body, /data-act="save-draft" disabled/);
});

test('FR-02 ข้อ 4: ยากินเมื่อมีอาการ → "ยังไม่รองรับ" ไม่สร้างเวลาเตือน แต่เปิดกรอกเองได้ (ยาเวลาตายตัว)', async () => {
  const { ctx, caregiver } = await makePair('sample');
  const before = (await ctx.repo.listMedicines()).length;
  const v = await openDraft(caregiver, 'asNeeded');
  assert.match(textOf(v.body), /ยาที่กินเมื่อมีอาการยังไม่รองรับ/);
  assert.doesNotMatch(v.body, /data-act="save-draft"/);
  assert.equal((await ctx.repo.listMedicines()).length, before);
  await caregiver.act('manual');
  assert.match(textOf((await caregiver.view('cg-draft')).body), /กรอกข้อมูลยาเอง/);
});

test('FR-02 ข้อ 5: AI ใช้ไม่ได้ → บอกเหตุผลแล้วเปิดฟอร์มกรอกเอง ไม่มีอะไรถูกบันทึก', async () => {
  const { ctx, caregiver } = await makePair('sample');
  const before = (await ctx.repo.listMedicines()).length;
  await caregiver.act('start-add');
  await caregiver.act('set-ai-problem', { value: 'quota' });
  await caregiver.act('set-tick', { checked: true });
  await caregiver.act('send-ai');
  const v = await caregiver.view('cg-draft');
  assert.equal(caregiver.timer, null, 'ไม่ต้องรอ AI');
  assert.match(textOf(v.body), /โควตา AI ของวันนี้หมดแล้ว/);
  assert.match(textOf(v.body), /กรอกข้อมูลยาด้วยตัวเองได้เลย/);
  assert.equal((await ctx.repo.listMedicines()).length, before);
});

test('FR-02 ข้อ 6: กดยกเลิกที่หน้าร่าง → ไม่บันทึกอะไร', async () => {
  const { ctx, caregiver } = await makePair('sample');
  const before = (await ctx.repo.listMedicines()).length;
  await openDraft(caregiver, 'complete');
  await caregiver.act('cancel-draft');
  assert.equal((await ctx.repo.listMedicines()).length, before);
  assert.equal(caregiver.ui.draft, null);
  assert.match(caregiver.toasts.at(-1), /ไม่ได้บันทึกอะไร/);
});

test('FR-02 ข้อ 7: "ก่อนอาหารเช้า 30 นาที" + เช้า 07:00 → เตือน 06:30', async () => {
  const { caregiver } = await makePair('sample');
  const v = await openDraft(caregiver, 'beforeBreakfast30');
  assert.match(textOf(v.body), /เวลาเตือนที่คำนวณได้: 06:30/);
  await caregiver.act('save-draft');
  assert.match(textOf((await caregiver.view('cg-meds')).body), /ยาตัวอย่าง F[\s\S]*เตือน 06:30/);
});

test('FR-02 ข้อ 8: ไม่ติ๊ก "ปิดชื่อและ HN แล้ว" → ปุ่มส่งปิด และกดส่งไม่มีอะไรเกิดขึ้น', async () => {
  const { caregiver } = await makePair('sample');
  await caregiver.act('start-add');
  caregiver.route = 'cg-cover';
  const v = await caregiver.view('cg-cover');
  assert.match(v.body, /data-act="send-ai" disabled/);
  await caregiver.act('send-ai');
  assert.equal(caregiver.route, 'cg-cover', 'ไม่ติ๊ก = ไม่เปลี่ยนหน้า ไม่เริ่มอ่าน');
  assert.equal(caregiver.timer, null);
});

test('FR-02 ข้อ 9 (ส่วนหน้าจอ): ภาพที่จะส่งซ่อนชื่อ/HN/บาร์โค้ดที่ปิดแล้ว และเตือนถ้ายังเห็นข้อมูลส่วนตัว', async () => {
  const { caregiver } = await makePair('sample');
  await caregiver.act('start-add');
  assert.match((await caregiver.view('cg-cover')).body, /ยังเห็นข้อมูลส่วนตัวอยู่/);
  await caregiver.act('cover-toggle', { region: 'name' });
  const v = await caregiver.view('cg-cover');
  assert.match(v.body, /lm-part is-covered">&nbsp;</);       // ชื่อถูกปิด
  assert.doesNotMatch(v.body, /นามสมมติ ตัวอย่างใจดี/);
  for (const r of ['hn', 'barcode']) await caregiver.act('cover-toggle', { region: r });
  assert.doesNotMatch((await caregiver.view('cg-cover')).body, /ยังเห็นข้อมูลส่วนตัวอยู่/);
});

test('FR-02 ข้อ 11: slot ซ้ำ / เวลาเดียวกันเม็ดต่างกัน → บันทึกไม่ได้ จนกว่าจะแก้หรือลบ slot', async () => {
  const { ctx, caregiver } = await makePair('sample');
  const v = await openDraft(caregiver, 'duplicateSlots');
  assert.match(textOf(v.body), /ช่องเวลากินซ้ำกัน|เวลาเตือนเดียวกันแต่จำนวนเม็ดต่างกัน/);
  assert.match(v.body, /data-act="save-draft" disabled/);
  await caregiver.act('del-slot', { i: 2 });
  await caregiver.act('del-slot', { i: 1 });
  assert.doesNotMatch((await caregiver.view('cg-draft')).body, /data-act="save-draft" disabled/);
  await caregiver.act('save-draft');
  assert.ok((await ctx.repo.listMedicines()).some((m) => m.name === 'ยาตัวอย่าง J'));
});

test('C-02: ตั้งเวลามื้อ 4 ช่อง บันทึกแล้วเวลาเตือนของยาเปลี่ยนตาม (BR-06) · เปิดตรง ๆ ได้ค่าเริ่มต้น', async () => {
  const { ctx, caregiver } = await makePair('fresh');
  const v = await caregiver.view('cg-meals');
  assert.match(v.body, /value="07:00"/);
  await caregiver.act('set-time', { time: 'breakfast', value: '08:30' });
  await caregiver.act('save-meals');
  assert.equal((await ctx.repo.getMealTimes()).breakfast, '08:30');
});

test('C-06: ลบยาได้ (เฉพาะผู้ดูแล) และข้อความจากยาถูก escape', async () => {
  const { ctx, caregiver } = await makePair('sample');
  await ctx.repo.saveMedicine({ name: '<img src=x onerror=alert(1)>', slots: [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }] });
  const v = await caregiver.view('cg-meds');
  assert.doesNotMatch(v.body, /<img src=x/);
  await caregiver.act('del-med', { id: 'demo-a' });
  assert.equal((await ctx.repo.listMedicines()).some((m) => m.id === 'demo-a'), false);
});

test('ทุกหน้าของ FR-02 มีป้าย Covers: FR-02', async () => {
  const { caregiver } = await makePair('sample');
  for (const name of ['cg-meals', 'cg-photo', 'cg-cover', 'cg-ai', 'cg-draft', 'cg-meds']) {
    assert.match((await caregiver.view(name)).covers, /FR-02/, name);
  }
});

test('FR-02 ข้อ 3/11 (กันบันทึกพลาด): สั่งบันทึกร่างที่ช่องไม่ครบ → ไม่มีอะไรถูกบันทึก และไม่ล้ม (BR-04)', async () => {
  const { ctx, caregiver } = await makePair('sample');
  const before = (await ctx.repo.listMedicines()).length;
  await openDraft(caregiver, 'timesADayNoMeals');
  await assert.doesNotReject(() => caregiver.act('save-draft'));
  assert.equal((await ctx.repo.listMedicines()).length, before);
  assert.equal(caregiver.route, 'cg-draft', 'ยังอยู่หน้าตรวจร่าง');
});

// ---------- ใช้งานจริง (model.real): รูปจริง + แถบปิด + AI จริง (ที่นี่ใช้ของปลอมแทนกล้อง/AI) ----------
async function realPair(aiReply) {
  const { ctx, caregiver } = await makePair('sample');
  ctx.name = 'real';
  const released = [];
  const sent = [];
  const env = {
    photo: { async load() { return { url: 'blob:fake', width: 400, height: 300 }; }, release: (p) => released.push(p.url), async redact(_p, rects) { sent.push(rects); return new Blob(['x'], { type: 'image/jpeg' }); } },
    ai: { async requestDraft() { if (aiReply instanceof Error) throw aiReply; return aiReply; } },
  };
  return { ctx, caregiver, env, released, sent };
}

test('ใช้งานจริง C-03/C-04: ถ่ายรูป → ปิดแถบ → ต้องมีแถบอย่างน้อย 1 แถบ + ติ๊ก จึงส่งได้ · ส่งเฉพาะภาพที่ปิดแล้ว · ทิ้งรูปต้นฉบับ (ข้อ 8, 9)', async () => {
  const { caregiver, env, released, sent } = await realPair({ name: 'ยาจริง', instructionText: null, warnings: null, contraindications: null, asNeeded: false, slots: [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }] });
  caregiver.extraEnv = env;
  const photoView = await caregiver.view('cg-photo', { real: true });
  assert.match(photoView.body, /type="file" accept="image\/\*" capture="environment"/);
  await caregiver.act('set-photo', { file: {} });
  assert.equal(caregiver.route, 'cg-cover');
  let v = await caregiver.view('cg-cover', { real: true });
  assert.match(v.body, /data-redact="1"/);
  assert.match(v.body, /data-act="send-ai" disabled/);
  await caregiver.act('set-tick', { checked: true });
  assert.match((await caregiver.view('cg-cover', { real: true })).body, /data-act="send-ai" disabled/, 'ติ๊กแล้วแต่ยังไม่มีแถบปิด = ยังส่งไม่ได้');
  await caregiver.act('add-rect', { x: 0.2, y: 0.3, w: 0.5, h: 0.1 });
  v = await caregiver.view('cg-cover', { real: true });
  assert.match(v.body, /class="redact-box" style="left:20%;top:30%;width:50%;height:10%"/);
  assert.doesNotMatch(v.body, /data-act="send-ai" disabled/);
  await caregiver.act('send-ai');
  assert.deepEqual(sent, [[{ x: 0.2, y: 0.3, w: 0.5, h: 0.1 }]]);
  assert.deepEqual(released, ['blob:fake']);
  assert.equal(caregiver.ui.photo, null);
  assert.equal(caregiver.route, 'cg-draft');
  assert.equal(caregiver.ui.draft.name, 'ยาจริง');
});

test('ใช้งานจริง ข้อ 5: AI ใช้ไม่ได้ (โควตาหมด) → บอกเหตุผลและเปิดฟอร์มกรอกเอง ไม่มีอะไรถูกบันทึก', async () => {
  const { ctx, caregiver, env } = await realPair(Object.assign(new Error('quota'), { reason: 'quota' }));
  caregiver.extraEnv = env;
  const before = (await ctx.repo.listMedicines()).length;
  await caregiver.act('set-photo', { file: {} });
  await caregiver.act('cover-top');
  await caregiver.act('set-tick', { checked: true });
  await caregiver.act('send-ai');
  assert.equal(caregiver.route, 'cg-draft');
  assert.match(caregiver.ui.manualReason, /โควตา AI ของวันนี้หมดแล้ว/);
  assert.equal((await ctx.repo.listMedicines()).length, before);
});

test('ใช้งานจริง: ลบแถบล่าสุด / ล้างทั้งหมด / ยกเลิกทิ้งรูปต้นฉบับ', async () => {
  const { caregiver, env, released } = await realPair({});
  caregiver.extraEnv = env;
  await caregiver.act('set-photo', { file: {} });
  await caregiver.act('cover-top'); await caregiver.act('add-rect', { x: 0, y: 0.5, w: 0.2, h: 0.2 });
  await caregiver.act('undo-rect');
  assert.equal(caregiver.ui.rects.length, 1);
  await caregiver.act('clear-rects');
  assert.equal(caregiver.ui.rects.length, 0);
  await caregiver.act('cancel-draft');
  assert.deepEqual(released, ['blob:fake']);
  assert.equal(caregiver.ui.photo, null);
});
