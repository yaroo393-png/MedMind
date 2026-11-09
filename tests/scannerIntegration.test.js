// FR-02: UI ใหม่สองภาษาต้องคง OCR เบื้องหลัง การปิดข้อมูล และการยกเลิกของระบบสแกนล่าสุด
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actions, screens } from '../public/js/features/medicineSetup.js';
import { setLanguage } from '../public/js/features/i18n.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

function scanner() {
  const redacted = new Blob(['covered sample label'], { type: 'image/jpeg' });
  const source = { url: 'blob:sample', width: 800, height: 600 };
  const released = [];
  const state = { route: 'cg-cover', renders: 0, saved: [] };
  const env = {
    ui: { photo: source, rects: [{ x: 0, y: 0, w: 1, h: 0.3 }], tick: true },
    snap: { mealTimes: { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' } },
    flags: { aiProblem: '' },
    photo: {
      async redact(photo, rects) {
        assert.equal(photo, source);
        assert.equal(rects.length, 1);
        return redacted;
      },
      release: (photo) => released.push(photo.url),
    },
    repo: { async saveMedicine(value) { state.saved.push(value); } },
    go: (route) => { state.route = route; },
    render: () => { state.renders += 1; },
    cancelLater() {}, toast() {},
  };
  const view = () => screens['cg-draft']({ ui: env.ui, snap: env.snap }).body;
  return { env, state, redacted, released, view };
}

const aiDraft = {
  name: 'ยาตัวอย่าง 5 mg', instructionText: 'หลังอาหารเช้า', warnings: 'คำเตือนจากฉลาก',
  contraindications: null, asNeeded: false,
  slots: [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }],
};

test('FR-02 รวม UI: ร่างภาษาอังกฤษขึ้นก่อน OCR เสร็จ ข้อความฉลากไม่ถูกแปล และ OCR ไม่เปลี่ยนร่างให้เอง', async (t) => {
  t.after(() => setLanguage('th', { persist: false }));
  setLanguage('en', { persist: false });
  const scan = scanner();
  const enteredOcr = deferred(), ocr = deferred();
  const sent = [];
  scan.env.ai = { async requestDraft(image) { sent.push(image); return aiDraft; } };
  scan.env.ocr = { recognize(image) { sent.push(image); enteredOcr.resolve(); return ocr.promise; } };
  const sending = actions['send-ai'](scan.env);
  await enteredOcr.promise;

  assert.equal(scan.state.route, 'cg-draft');
  assert.match(scan.view(), /AI draft — not saved yet/);
  assert.match(scan.view(), /on-device OCR/);
  assert.match(scan.view(), /ยาตัวอย่าง 5 mg/);
  assert.match(scan.view(), /หลังอาหารเช้า/);
  assert.deepEqual(sent, [scan.redacted, scan.redacted], 'AI และ OCR ได้ภาพที่ปิดข้อมูลแล้วชิ้นเดียวกัน');
  assert.deepEqual(scan.released, ['blob:sample']);

  ocr.resolve({ text: 'OTHER MEDICINE <img src=x onerror=alert(1)>' });
  await sending;
  assert.match(scan.view(), /does not match the OCR text/);
  assert.match(scan.view(), /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(scan.view(), /<img src=x/);
  assert.equal(scan.env.ui.draft.name, aiDraft.name);
  assert.doesNotMatch(scan.view(), /data-act="save-draft" disabled/);
  assert.deepEqual(scan.state.saved, []);

  setLanguage('th', { persist: false });
  assert.match(scan.view(), /ไม่ตรงกับข้อความที่ OCR อ่านได้/);
  assert.equal(scan.env.ui.draft.name, aiDraft.name);
});

test('FR-02 รวม UI: เมื่อ AI ล้ม ฟอร์มกรอกเองและข้อความ OCR เปลี่ยนภาษาได้โดยไม่เติมยาให้อัตโนมัติ', async (t) => {
  t.after(() => setLanguage('th', { persist: false }));
  setLanguage('en', { persist: false });
  t.mock.method(console, 'warn', () => {});
  const scan = scanner();
  scan.env.ai = { async requestDraft() { throw { reason: 'quota', detail: '<b>sample detail</b>' }; } };
  scan.env.ocr = { async recognize(image) { assert.equal(image, scan.redacted); return { text: 'ข้อความสมมติจากฉลาก' }; } };
  await actions['send-ai'](scan.env);

  assert.match(scan.view(), /Enter medicine details manually/);
  assert.match(scan.view(), /Details for the team: &lt;b&gt;sample detail&lt;\/b&gt;/);
  assert.match(scan.view(), /Text read from the label/);
  assert.equal(scan.env.ui.draft.name, null);
  assert.deepEqual(scan.state.saved, []);
  setLanguage('th', { persist: false });
  assert.match(scan.view(), /กรอกข้อมูลยาเอง/);
  assert.match(scan.view(), /โควตา/);
  assert.match(scan.view(), /ข้อความสมมติจากฉลาก/);
});

test('FR-02 รวม UI: ยกเลิกระหว่าง OCR ในภาษาอังกฤษแล้วผลเก่าต้องไม่กลับมาทับหน้า', async (t) => {
  t.after(() => setLanguage('th', { persist: false }));
  setLanguage('en', { persist: false });
  const scan = scanner();
  const enteredOcr = deferred(), ocr = deferred();
  scan.env.ai = { async requestDraft() { return aiDraft; } };
  scan.env.ocr = { recognize() { enteredOcr.resolve(); return ocr.promise; } };
  const sending = actions['send-ai'](scan.env);
  await enteredOcr.promise;
  actions['cancel-draft'](scan.env);
  const rendersAfterCancel = scan.state.renders;
  ocr.resolve({ text: 'ข้อความที่มาช้า' });
  await sending;

  assert.equal(scan.state.route, 'cg-meds');
  assert.equal(scan.env.ui.draft, null);
  assert.equal(scan.env.ui.ocrText, '');
  assert.equal(scan.env.ui.ocrReading, false);
  assert.equal(scan.state.renders, rendersAfterCancel);
  assert.deepEqual(scan.state.saved, []);
});

for (const outcome of ['success', 'failure']) {
  test(`FR-02 ยกเลิกระหว่างปิดภาพ: ผลเก่า ${outcome} ไม่ส่ง AI/OCR และไม่ทิ้งรูปที่เลือกใหม่`, async () => {
    const scan = scanner();
    const redaction = deferred();
    let sentOut = 0;
    scan.env.photo.redact = () => redaction.promise;
    scan.env.ai = { async requestDraft() { sentOut += 1; return aiDraft; } };
    scan.env.ocr = { async recognize() { sentOut += 1; return { text: 'old result' }; } };
    const sending = actions['send-ai'](scan.env);
    actions['cancel-draft'](scan.env);

    // ผู้ใช้เลือกรูปใหม่แล้ว ผลของรูปเก่าต้องไม่ release รูปใหม่นี้หรือพากลับไปหน้า AI/กรอกเอง
    const nextPhoto = { url: 'blob:next-photo', width: 800, height: 600 };
    scan.env.photo.load = async () => nextPhoto;
    await actions['set-photo'](scan.env, { file: {} });
    const rendersBeforeOldResult = scan.state.renders;
    if (outcome === 'success') redaction.resolve(scan.redacted);
    else redaction.reject(new Error('canvas failed after cancellation'));
    await sending;

    assert.equal(sentOut, 0);
    assert.equal(scan.state.route, 'cg-cover');
    assert.equal(scan.env.ui.photo, nextPhoto);
    assert.equal(scan.env.ui.draft, null);
    assert.equal(scan.env.ui.manualReason, undefined);
    assert.equal(scan.state.renders, rendersBeforeOldResult);
    assert.deepEqual(scan.released, ['blob:sample']);
    assert.deepEqual(scan.state.saved, []);
  });
}
