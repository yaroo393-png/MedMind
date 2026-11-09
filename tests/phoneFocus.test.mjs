// Regression ของช่องรหัสใน Site preview เท่านั้น: จำลอง input ถูกแทน node ระหว่างผู้ใช้กำลังพิมพ์
// ไม่เปิด Firebase/เบราว์เซอร์ และไม่แก้โค้ดแอปหรือไฟล์ของทีม
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Phone } from '../public/js/features/phone.js';

const CODE_SELECTOR = 'input[data-live="codeInput"]';

function setup(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const document = { activeElement: null };
  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: document });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  let nodes = new Map();
  const view = {
    contains(element) { return [...nodes.values()].includes(element); },
    querySelector(selector) { return nodes.get(selector) ?? null; },
  };
  const phone = Object.assign(Object.create(Phone.prototype), { view, hadOverlay: false });
  const replaceNodes = (entries) => { nodes = new Map(entries); };
  const element = ({ tagName = 'INPUT', value = '', selectionStart = 0, selectionEnd = selectionStart,
    selectionDirection = 'none', supportsSelection = true, dataset = { live: 'codeInput' } } = {}) => ({
    tagName, value, selectionStart, selectionEnd, selectionDirection, dataset,
    attributes: {}, focusCalls: 0, rangeCalls: 0,
    setAttribute(name, val) { this.attributes[name] = val; },
    focus() {
      this.focusCalls += 1; document.activeElement = this;
      // node ใหม่ไม่ได้มี caret ของ node เก่าติดมาด้วย นี่คือสภาพที่เคยทำให้เลขชุดต่อไปไปอยู่ข้างหน้า
      if (typeof this.selectionStart === 'number') this.selectionStart = this.selectionEnd = 0;
    },
    setSelectionRange(start, end, direction) {
      this.rangeCalls += 1;
      if (!supportsSelection) throw new DOMException('Input type does not support selection', 'InvalidStateError');
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    },
  });
  return { document, phone, replaceNodes, element };
}

function typeText(input, text) {
  const start = input.selectionStart, end = input.selectionEnd;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  input.selectionStart = input.selectionEnd = start + text.length;
}

test('พิมพ์ 656 พักให้ input ถูกวาดใหม่ แล้วพิมพ์ 424 ต้องได้ 656424 ตามลำดับ', (t) => {
  const { document, phone, replaceNodes, element } = setup(t);
  const oldInput = element({ value: '656', selectionStart: 3 });
  replaceNodes([[CODE_SELECTOR, oldInput]]); document.activeElement = oldInput;
  const key = phone.focusKey(), selection = phone.focusSelection();
  const newInput = element({ value: oldInput.value });
  replaceNodes([[CODE_SELECTOR, newInput]]);
  phone.restoreFocus(key, false, false, selection);
  assert.equal(document.activeElement, newInput);
  assert.equal(newInput.selectionStart, 3);
  typeText(newInput, '424');
  assert.equal(newInput.value, '656424');
  assert.equal(newInput.selectionStart, 6);
});

test('ช่วงเลขที่เลือกไว้และทิศทาง backward ต้องยังอยู่ และพิมพ์แทนเฉพาะช่วงนั้น', (t) => {
  const { document, phone, replaceNodes, element } = setup(t);
  const oldInput = element({ value: '656424', selectionStart: 2, selectionEnd: 5, selectionDirection: 'backward' });
  replaceNodes([[CODE_SELECTOR, oldInput]]); document.activeElement = oldInput;
  const key = phone.focusKey(), selection = phone.focusSelection();
  const newInput = element({ value: oldInput.value });
  replaceNodes([[CODE_SELECTOR, newInput]]);
  phone.restoreFocus(key, false, false, selection);
  assert.equal(newInput.selectionStart, 2);
  assert.equal(newInput.selectionEnd, 5);
  assert.equal(newInput.selectionDirection, 'backward');
  typeText(newInput, '0');
  assert.equal(newInput.value, '6504');
});

test('เปลี่ยนหน้าแล้วต้องโฟกัสหัวข้อใหม่ ไม่ย้าย caret เก่ามาใส่ช่องที่ชื่อเหมือนเดิม', (t) => {
  const { document, phone, replaceNodes, element } = setup(t);
  const oldInput = element({ value: '656', selectionStart: 3 });
  replaceNodes([[CODE_SELECTOR, oldInput]]); document.activeElement = oldInput;
  const key = phone.focusKey(), selection = phone.focusSelection();
  const newInput = element({ value: '123456' }), heading = element({ tagName: 'H1', dataset: {}, selectionStart: null, selectionEnd: null });
  replaceNodes([[CODE_SELECTOR, newInput], ['.screen h1, .screen h2', heading]]);
  phone.restoreFocus(key, true, false, selection);
  assert.equal(document.activeElement, heading);
  assert.equal(heading.attributes.tabindex, '-1');
  assert.equal(newInput.focusCalls, 0);
  assert.equal(newInput.rangeCalls, 0);
});

test('กล่องยืนยันเพิ่งเปิดต้องรับ focus ไม่ย้ายกลับช่องกรอกรหัสที่อยู่ด้านหลัง', (t) => {
  const { document, phone, replaceNodes, element } = setup(t);
  const oldInput = element({ value: '656', selectionStart: 3 });
  replaceNodes([[CODE_SELECTOR, oldInput]]); document.activeElement = oldInput;
  const key = phone.focusKey(), selection = phone.focusSelection();
  const newInput = element({ value: '656' }), dialogButton = element({ tagName: 'BUTTON', dataset: {}, selectionStart: null, selectionEnd: null });
  replaceNodes([[CODE_SELECTOR, newInput], ['.modal [data-act]', dialogButton]]);
  phone.restoreFocus(key, false, true, selection);
  assert.equal(document.activeElement, dialogButton);
  assert.equal(phone.hadOverlay, true);
  assert.equal(newInput.focusCalls, 0);
  assert.equal(newInput.rangeCalls, 0);
});

test('ช่องชนิดที่ไม่รองรับ selection ต้องจับ focus ได้ตามเดิมโดยไม่โยน error', (t) => {
  const { document, phone, replaceNodes, element } = setup(t);
  const unsupported = element({ value: '656', selectionStart: null, selectionEnd: null, supportsSelection: false });
  replaceNodes([[CODE_SELECTOR, unsupported]]); document.activeElement = unsupported;
  assert.equal(phone.focusSelection(), null);
  // เผื่อรูปแบบช่องเปลี่ยนระหว่าง render และยังมี selection ของ text input เก่าส่งมา
  assert.doesNotThrow(() => phone.restoreFocus(CODE_SELECTOR, false, false, { start: 3, end: 3, direction: 'none' }));
  assert.equal(document.activeElement, unsupported);
  assert.equal(unsupported.focusCalls, 1);
  assert.equal(unsupported.rangeCalls, 1);
});

test('ปุ่มหรือ control ที่ไม่มี setSelectionRange ต้องไม่ทำให้การคืน focus ล้มเหลว', (t) => {
  const { document, phone, replaceNodes, element } = setup(t);
  const button = element({ tagName: 'BUTTON', dataset: { act: 'join' }, selectionStart: null, selectionEnd: null });
  delete button.setSelectionRange;
  replaceNodes([['button[data-act="join"]', button]]);
  assert.doesNotThrow(() => phone.restoreFocus('button[data-act="join"]', false, false, { start: 3, end: 3 }));
  assert.equal(document.activeElement, button);
});

test('focus อยู่นอก Phone ต้องไม่เก็บ selection หรือแย่ง focus กลับเข้าหน้าจอ', (t) => {
  const { document, phone, replaceNodes, element } = setup(t);
  const outside = element({ value: 'external', selectionStart: 4 });
  const inside = element({ value: '656' }), heading = element({ tagName: 'H1', dataset: {} });
  replaceNodes([[CODE_SELECTOR, inside], ['.screen h1, .screen h2', heading]]); document.activeElement = outside;
  const key = phone.focusKey(), selection = phone.focusSelection();
  assert.equal(key, null);
  assert.equal(selection, null);
  phone.restoreFocus(key, false, false, selection);
  assert.equal(document.activeElement, outside);
  assert.equal(inside.focusCalls, 0);
  assert.equal(heading.focusCalls, 0);
});
