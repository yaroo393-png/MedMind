// FR-02 เพิ่มยาจากฉลาก: C-02 ตั้งเวลามื้อ · C-03 ถ่ายรูปฉลาก · C-04 ปิดชื่อ/HN · C-05 AI อ่าน/ตรวจร่าง/กรอกเอง · C-06 รายการยา
// เจ้าของ: Yar Oo (FR-02) · BR-04–BR-07, BR-19 · NFR-06, NFR-09, NFR-14 · ตัดสินด้วย logic/labelDraft.js และ logic/schedule.js เท่านั้น
// Demo mode: "AI" เป็นตัวจำลอง ร่างมาจาก core/demoData.js (ฉลากสมมติ) · ใช้งานจริง (model.real): ถ่ายรูปจริง → ปิดแถบดำ (services/redact.js) → Gemini ผ่าน env.ai (services/aiLabel.js)
import { tr, localizeUiMessage } from './i18n.js';
import { esc, btn, hero, flag, icon, mascot } from './ui.js';
import { buildDraft, applyEdit, addSlot, removeSlot, canSave, canSend, toMedicine, ocrMismatches } from '../logic/labelDraft.js';
import { reminderTime } from '../logic/schedule.js';
import { labelDrafts } from '../core/demoData.js';
import { MEAL_NAMES, TIMING_NAMES, REASON_TEXT, AI_PROBLEMS } from './format.js';
import { TOP_BAND } from '../services/redact.js';

const DEFAULT_TIMES = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' };
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'bedtime'];
const AI_DELAY_MS = 1300;

// ชื่อฉลากตัวอย่าง (ครอบ FR-02 ข้อ 1, 3, 4, 7, 10, 11) — ข้อมูลสมมติ ไม่มีชื่อ/HN
export const SAMPLE_TITLES = {
  complete: 'อ่านครบ 3 ช่องเวลากิน (ข้อ 1, 2, 10)',
  beforeBreakfast30: 'ก่อนอาหารเช้า 30 นาที → เตือน 06:30 (ข้อ 7)',
  timesADayNoMeals: 'วันละ 3 ครั้ง ไม่บอกมื้อ + อ่านชื่อไม่ออก (ข้อ 3)',
  beforeMealNoMinutes: 'ก่อนอาหารแต่ไม่บอกกี่นาที (ข้อ 3)',
  every6Hours: 'ทุก 6 ชั่วโมง (ไม่ผูกกับมื้อ — ข้อ 3)',
  asNeeded: 'ยากินเมื่อมีอาการ (ข้อ 4)',
  duplicateSlots: 'ช่องเวลากินซ้ำ / เวลาเดียวกันเม็ดต่างกัน (ข้อ 11)',
};
const SAMPLE_TITLES_EN = {
  complete: 'Three complete dosing slots (AC1, 2, 10)',
  beforeBreakfast30: '30 min before breakfast → reminder 06:30 (AC7)',
  timesADayNoMeals: 'Three times daily, no meal given + unreadable name (AC3)',
  beforeMealNoMinutes: 'Before meals, minutes not specified (AC3)',
  every6Hours: 'Every 6 hours, not linked to meals (AC3)',
  asNeeded: 'As-needed medicine (AC4)',
  duplicateSlots: 'Duplicate slots / same time with different tablet counts (AC11)',
};

// Only UI-generated feedback is localized. Medicine fields and label text are never passed to this helper.
function manualMessage(ui) {
  if (!ui.manualAI) return localizeUiMessage(ui.manualReason);
  const { reason, detail } = ui.manualAI;
  return `${aiReasonText(reason)}${tr(' — กรอกข้อมูลยาด้วยตัวเองได้เลย ไม่มีอะไรถูกบันทึกให้', ' — You can enter the medicine details manually. Nothing has been saved.')}` +
    (detail ? ` (${tr('รายละเอียดสำหรับทีม: ', 'Details for the team: ')}${detail})` : '');
}

// ภาพฉลากสมมติ: ส่วนที่ปิดแล้วเป็นแถบทึบ — ภาพที่ "จะส่ง" ต้องไม่เห็นชื่อ/HN/บาร์โค้ด (BR-19)
function labelMock(cover) {
  const part = (region, text) => `<span class="lm-part${cover?.[region] ? ' is-covered' : ''}">${cover?.[region] ? '&nbsp;' : esc(text)}</span>`;
  return tr('<div class="label-mock" aria-label="ฉลากสมมติ"><p class="lm-title">โรงพยาบาลตัวอย่าง (ฉลากสมมติ)</p>', "<div class=\"label-mock\" aria-label=\"Sample label\"><p class=\"lm-title\">Example hospital (sample label)</p>") +
    tr(`<p>ชื่อ: ${part('name', 'นามสมมติ ตัวอย่างใจดี')} &nbsp; HN: ${part('hn', '0000000')}</p>`, `<p>Name: ${part('name', 'นามสมมติ ตัวอย่างใจดี')} &nbsp; HN: ${part('hn', '0000000')}</p>`) +
    `<p>ยาตัวอย่าง · วันละ 3 ครั้ง หลังอาหาร</p><p>${part('barcode', '||| |||| || |||')}</p></div>`;
}

// ---------- ช่วยวาดฟอร์มร่าง ----------
const hasCheck = (draft, path) => draft.checks.some((c) => c.path === path);
function select(path, current, options, placeholder, invalid) {
  return `<select data-path="${path}"${invalid ? ' aria-invalid="true"' : ''}><option value="">${placeholder}</option>` +
    Object.entries(options).map(([k, label]) => `<option value="${k}"${current === k ? ' selected' : ''}>${esc(label)}</option>`).join('') + '</select>';
}

function slotRows(draft, mealTimes) {
  return draft.slots.map((s, i) => {
    const p = (f) => `slots[${i}].${f}`;
    const own = draft.checks.filter((c) => c.path === `slots[${i}]`);
    const time = !draft.checks.some((c) => c.path.startsWith(`slots[${i}]`)) ? reminderTime(s, mealTimes ?? {}) : null;
    return tr(`<fieldset class="slot"><legend>ช่องเวลากิน ${i + 1}</legend>`, `<fieldset class="slot"><legend>Dosing slot ${i + 1}</legend>`) +
      tr(`<label class="field"><span>มื้อ ${hasCheck(draft, p('meal')) ? flag() : ''}</span>${select(`slots[${i}].meal`, s.meal, MEAL_NAMES, tr('— เลือก —', "— Select —"), hasCheck(draft, p('meal')))}</label>`, `<label class="field"><span>Meal ${hasCheck(draft, p('meal')) ? flag() : ''}</span>${select(`slots[${i}].meal`, s.meal, MEAL_NAMES, tr('— เลือก —', "— Select —"), hasCheck(draft, p('meal')))}</label>`) +
      tr(`<label class="field"><span>วิธีกิน ${hasCheck(draft, p('timing')) ? flag() : ''}</span>${select(`slots[${i}].timing`, s.timing, TIMING_NAMES, tr('— เลือก —', "— Select —"), hasCheck(draft, p('timing')))}</label>`, `<label class="field"><span>Timing ${hasCheck(draft, p('timing')) ? flag() : ''}</span>${select(`slots[${i}].timing`, s.timing, TIMING_NAMES, tr('— เลือก —', "— Select —"), hasCheck(draft, p('timing')))}</label>`) +
      (s.timing === 'before_meal' ? tr(`<label class="field"><span>ก่อนอาหารกี่นาที ${hasCheck(draft, p('minutesBefore')) ? flag() : ''}</span><input type="number" min="1" step="1" data-path="${p('minutesBefore')}"${hasCheck(draft, p('minutesBefore')) ? ' aria-invalid="true"' : ''} value="${esc(s.minutesBefore ?? '')}"></label>`, `<label class="field"><span>Minutes before food ${hasCheck(draft, p('minutesBefore')) ? flag() : ''}</span><input type="number" min="1" step="1" data-path="${p('minutesBefore')}"${hasCheck(draft, p('minutesBefore')) ? ' aria-invalid="true"' : ''} value="${esc(s.minutesBefore ?? '')}"></label>`) : '') +
      tr(`<label class="field"><span>จำนวนเม็ดต่อครั้ง ${hasCheck(draft, p('tabletsPerDose')) ? flag() : ''}</span><input type="number" min="1" step="1" data-path="${p('tabletsPerDose')}"${hasCheck(draft, p('tabletsPerDose')) ? ' aria-invalid="true"' : ''} value="${esc(s.tabletsPerDose ?? '')}"></label>`, `<label class="field"><span>Tablets per dose ${hasCheck(draft, p('tabletsPerDose')) ? flag() : ''}</span><input type="number" min="1" step="1" data-path="${p('tabletsPerDose')}"${hasCheck(draft, p('tabletsPerDose')) ? ' aria-invalid="true"' : ''} value="${esc(s.tabletsPerDose ?? '')}"></label>`) +
      own.map((c) => `<p class="error">${flag()} ${esc(REASON_TEXT[c.reason] ?? c.reason)}</p>`).join('') +
      (time ? tr(`<p class="hint ok">เวลาเตือนที่คำนวณได้: <b>${esc(time)}</b></p>`, `<p class="hint ok">Calculated reminder time: <b>${esc(time)}</b></p>`) : '') +
      (draft.slots.length > 1 ? btn('ghost', tr('ลบช่องนี้', "Remove this slot"), 'del-slot', { i }) : '') + '</fieldset>';
  }).join('');
}

// C-04 ใช้งานจริง: รูปจริง + แถบดำที่ลากวาด (ภาพนี้ = ภาพที่จะส่ง) · ส่งได้เมื่อมีแถบอย่างน้อย 1 แถบ และติ๊กยืนยัน (BR-19)
function realCover(model) {
  const { ui } = model;
  if (!ui.photo) return { title: tr('ปิดชื่อ/HN', "Cover names/HN"), covers: 'FR-02, BR-19, NFR-14', body: tr('<p class="hint">ยังไม่มีรูป</p>', "<p class=\"hint\">No image yet</p>") + btn('primary', tr('ถ่ายรูปฉลาก', "Photograph label"), 'go', { to: 'cg-photo' }) };
  const rects = ui.rects ?? [];
  const tick = Boolean(ui.tick);
  const ready = canSend({ coveredTicked: tick }) && rects.length > 0;
  const boxes = rects.map((r) => `<div class="redact-box" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%"></div>`).join('');
  return { title: tr('ปิดชื่อ/HN', "Cover names/HN"), covers: 'FR-02, BR-19, NFR-14', body: hero('shield', tr('ปิดชื่อ HN และบาร์โค้ด', "Cover names, HN and barcodes"), tr('ลากนิ้วบนรูปเพื่อทำแถบดำ', "Drag on the image to cover an area in black")) +
    tr(`<div class="redact-stage" data-redact="1" style="aspect-ratio:${ui.photo.width} / ${ui.photo.height}"><img src="${esc(ui.photo.url)}" alt="รูปฉลากที่จะส่ง (ส่วนที่ปิดจะเป็นสีดำ)">${boxes}</div>`, `<div class="redact-stage" data-redact="1" style="aspect-ratio:${ui.photo.width} / ${ui.photo.height}"><img src="${esc(ui.photo.url)}" alt="Label image to be sent (covered areas are black)">${boxes}</div>`) +
    `<div class="row">${btn('ghost', tr('ปิดแถบบน', "Cover the top band"), 'cover-top')}${btn('ghost', tr('ลบแถบล่าสุด', "Undo last cover"), 'undo-rect')}${btn('ghost', tr('ล้างทั้งหมด', "Clear all covers"), 'clear-rects')}</div>` +
    (rects.length ? tr(`<p class="hint">ปิดแล้ว ${rects.length} แถบ · ภาพข้างบนคือภาพที่จะส่งจริง ระบบวาดภาพใหม่ ลบข้อมูลไฟล์ และไม่เก็บต้นฉบับ</p>`, `<p class="hint">Covered ${rects.length} bands · The image above is what will be sent. It is redrawn without file metadata; the original is not stored.</p>`) : tr('<p class="error">ยังไม่ได้ปิดส่วนใดเลย — ลากนิ้วปิดชื่อ HN บาร์โค้ด หรือกด "ปิดแถบบน"</p>', "<p class=\"error\">Nothing is covered yet — drag over names, HN and barcodes, or tap \"Cover the top band\".</p>")) +
    tr('<div class="card warn"><p>บริการ AI แบบฟรีอาจนำข้อมูลที่ส่งไปปรับปรุงผลิตภัณฑ์ จึงต้องปิดชื่อและ HN ก่อนส่งทุกครั้ง</p></div>', "<div class=\"card warn\"><p>The free AI service may use submitted content to improve its products. Always cover names and HN before sending.</p></div>") +
    tr(`<label class="check"><input type="checkbox" data-field="tick"${tick ? ' checked' : ''}> ปิดชื่อและ HN แล้ว</label>`, `<label class="check"><input type="checkbox" data-field="tick"${tick ? ' checked' : ''}> I have covered names and HN</label>`) +
    tr(`<button type="button" class="btn btn-primary" data-act="send-ai"${ready ? '' : ' disabled'}>ส่งให้ AI</button>`, `<button type="button" class="btn btn-primary" data-act="send-ai"${ready ? '' : ' disabled'}>Send to AI</button>`) +
    (ready ? '' : tr('<p class="hint">ต้องมีแถบปิดอย่างน้อย 1 แถบ และติ๊กยืนยันก่อน — ระหว่างนี้ไม่มีอะไรถูกส่งออก</p>', "<p class=\"hint\">Cover at least one area and tick the confirmation first. Nothing is sent until then.</p>")) + btn('ghost', tr('ยกเลิก', "Cancel"), 'cancel-draft') };
}

// ข้อความ OCR ใช้ประกอบการตรวจเท่านั้น ไม่แปลข้อความจากฉลากหรือเติมช่องยาให้เอง
function ocrPanel({ ocrText, ocrReading }, { open = true } = {}) {
  if (ocrReading) return '<p class="hint" role="status">' + tr('กำลังอ่านข้อความด้วย OCR ในเครื่อง… (ทำต่อได้เลย ไม่ต้องรอ · ครั้งแรกโหลดตัวอ่าน ~8 MB)', 'Reading text with on-device OCR… You can continue without waiting. The first use downloads about 8 MB.') + '</p>';
  if (!ocrText) return '';
  return `<details class="card"${open ? ' open' : ''}><summary>${tr('ข้อความที่อ่านได้จากฉลาก (OCR — อาจผิด ใช้ดูประกอบเท่านั้น)', 'Text read from the label (OCR may be wrong; use it for reference only)')}</summary>` +
    `<pre class="ocr-text">${esc(ocrText)}</pre></details>`;
}

function ocrCheck(ui, draft) {
  if (!ocrMismatches(draft, ui.ocrText).includes('name')) return '';
  return `<p class="error" role="alert">${flag()} ${tr('ชื่อยาที่ AI อ่าน ไม่ตรงกับข้อความที่ OCR อ่านได้ — เทียบกับฉลากจริงอีกครั้ง', 'The medicine name read by AI does not match the OCR text — compare it with the original label again.')}</p>`;
}

export const screens = {
  // C-02 — ตั้งเวลามื้อ (BR-06)
  'cg-meals'(model) {
    const times = model.ui.times ?? model.snap.mealTimes ?? DEFAULT_TIMES;
    const rows = MEAL_KEYS.map((k) => `<label class="field"><span>${tr('มื้อ', 'Meal: ')}${esc(MEAL_NAMES[k])}</span><input type="time" data-time="${k}" value="${esc(times[k])}"></label>`).join('');
    const first = !model.snap.mealTimes;
    return { title: tr('ตั้งเวลามื้อ', "Set meal times"), covers: 'FR-02, BR-06', body: (first ? tr('<p class="step-pill">ขั้นที่ 1 จาก 2 · ตั้งเวลามื้อ → เพิ่มยา</p>', "<p class=\"step-pill\">Step 1 of 2 · Set meal times → add medicine</p>") : '') +
      tr(`<div class="hero-row">${mascot('encourage', 84)}<div><h1>เวลามื้ออาหาร</h1><p class="lead">ตั้งตามเวลากินข้าวจริงของพ่อแม่ · เวลาเตือนคำนวณจากฉลากและเวลานี้ ไม่เดา</p></div></div>`, `<div class="hero-row">${mascot('encourage', 84)}<div><h1>Meal times</h1><p class="lead">Use the older adult's actual meal times. Reminders are calculated from the label and these times, without guessing.</p></div></div>`) +
      `<section class="card">${rows}</section>` + btn('primary', first ? tr('บันทึก แล้วไปเพิ่มยา', "Save and add medicine") : tr('บันทึกเวลามื้อ', "Save meal times"), 'save-meals') + (first ? '' : btn('ghost', tr('เพิ่มยาจากฉลาก', "Add medicine from a label"), 'start-add')) };
  },

  // C-03 — ถ่ายรูปฉลาก (ตอนนี้เลือกฉลากสมมติแทนการถ่ายจริง)
  'cg-photo'(model) {
    if (model.real) {   // ใช้งานจริง: ถ่าย/เลือกรูปฉลากจากมือถือผู้ดูแล — รูปอยู่ในเครื่องจนกว่าจะปิดชื่อ/HN และติ๊กยืนยัน
      return { title: tr('ถ่ายรูปฉลาก', "Photograph label"), covers: 'FR-02, BR-19', body: hero('camera', tr('ถ่ายรูปฉลากยา', "Photograph the medicine label"), tr('ถ่ายเฉพาะฉลาก ให้ตัวหนังสือชัด แสงพอ', "Photograph only the label, with clear text and enough light")) +
        (model.snap.mealTimes ? '' : tr('<div class="card warn" role="alert"><p>ยังไม่ได้ตั้งเวลามื้อ — ตั้งก่อน ไม่เช่นนั้นระบบคำนวณเวลาเตือนไม่ได้</p>', "<div class=\"card warn\" role=\"alert\"><p>Meal times are not set. Set them first so reminder times can be calculated.</p>") + btn('ghost', tr('ตั้งเวลามื้อ', "Set meal times"), 'go', { to: 'cg-meals' }) + '</div>') +
        tr(`<div class="viewfinder" aria-hidden="true">${icon('camera')}<span>ให้ฉลากอยู่ในกรอบ ตัวหนังสือชัด</span></div>`, `<div class="viewfinder" aria-hidden="true">${icon('camera')}<span>Keep the label inside the frame and the text clear</span></div>`) +
        tr(`<label class="btn btn-primary btn-file">${icon('camera')}ถ่ายรูปฉลาก<input class="sr-only" type="file" accept="image/*" capture="environment" data-field="photo"></label>`, `<label class="btn btn-primary btn-file">${icon('camera')}Photograph label<input class="sr-only" type="file" accept="image/*" capture="environment" data-field="photo"></label>`) +
        tr(`<label class="btn btn-ghost btn-file">${icon('image')}เลือกรูปจากเครื่อง<input class="sr-only" type="file" accept="image/*" data-field="photo"></label>`, `<label class="btn btn-ghost btn-file">${icon('image')}Choose an image<input class="sr-only" type="file" accept="image/*" data-field="photo"></label>`) +
        tr('<div class="card warn"><strong>ยังไม่มีอะไรถูกส่ง</strong><p>ขั้นต่อไปให้ปิดชื่อ HN และบาร์โค้ดก่อน แล้วจึงส่งให้ AI อ่าน</p></div>', "<div class=\"card warn\"><strong>Nothing has been sent</strong><p>Next, cover names, HN and barcodes before sending the image to AI.</p></div>") +
        (model.ui.photoError ? `<p class="error" role="alert">${esc(localizeUiMessage(model.ui.photoError))}</p>` : '') +
        btn('ghost', tr('กรอกเองโดยไม่ถ่ายรูป', "Enter manually without a photo"), 'manual-entry') };
    }
    const sample = model.ui.sample ?? 'complete';
    const opts = Object.entries(SAMPLE_TITLES).map(([k, t]) => `<option value="${k}"${sample === k ? ' selected' : ''}>${esc(tr(t, SAMPLE_TITLES_EN[k]))}</option>`).join('');
    const problems = Object.entries(AI_PROBLEMS).map(([k, t]) => `<option value="${k}"${model.flags.aiProblem === k ? ' selected' : ''}>${esc(t)}</option>`).join('');
    return { title: tr('ถ่ายรูปฉลาก', "Photograph label"), covers: 'FR-02, BR-19', body: hero('camera', tr('ถ่ายรูปฉลากยา', "Photograph the medicine label"), tr('ถ่ายเฉพาะฉลาก ให้ตัวหนังสือชัด', "Photograph only the label, with clear text")) +
      tr('<div class="card warn"><strong>ปิดชื่อและ HN ก่อนส่ง</strong><p>ขั้นต่อไปจะให้ลากปิดชื่อ HN และบาร์โค้ด ก่อนส่งให้ AI</p></div>', "<div class=\"card warn\"><strong>Cover names and HN before sending</strong><p>Next, drag to cover names, HN and barcodes before sending to AI.</p></div>") + labelMock(null) +
      (model.snap.mealTimes ? '' : tr('<div class="card warn" role="alert"><p>ยังไม่ได้ตั้งเวลามื้อ — ตั้งก่อน ไม่เช่นนั้นระบบคำนวณเวลาเตือนไม่ได้</p>', "<div class=\"card warn\" role=\"alert\"><p>Meal times are not set. Set them first so reminder times can be calculated.</p>") + btn('ghost', tr('ตั้งเวลามื้อ', "Set meal times"), 'go', { to: 'cg-meals' }) + '</div>') +
      tr(`<label class="field"><span>ฉลากตัวอย่างที่ AI จะ "อ่าน" (จำลอง ไม่ได้เรียก AI จริง)</span><select data-field="sample">${opts}</select></label>`, `<label class="field"><span>Sample label for AI to "read" (simulated, no real AI request)</span><select data-field="sample">${opts}</select></label>`) +
      tr(`<label class="field"><span>จำลองปัญหาของบริการ AI (FR-02 ข้อ 5)</span><select data-field="aiproblem"><option value=""${model.flags.aiProblem ? '' : ' selected'}>ไม่มีปัญหา</option>${problems}</select></label>`, `<label class="field"><span>Simulate an AI service problem (FR-02 AC5)</span><select data-field="aiproblem"><option value=""${model.flags.aiProblem ? '' : ' selected'}>No problem</option>${problems}</select></label>`) +
      btn('primary', tr(`${icon('camera')}ถ่ายรูป (ตัวอย่าง)`, `${icon('camera')}Take sample photo`), 'go', { to: 'cg-cover' }) };
  },

  // C-04 — ปิดชื่อ/HN/บาร์โค้ด + ติ๊กยืนยัน · ไม่ติ๊ก = ปุ่มส่งปิด ไม่มีอะไรถูกส่ง (ข้อ 8, 9, BR-19)
  'cg-cover'(model) {
    if (model.real) return realCover(model);
    const cover = model.ui.cover ?? {};
    const all = cover.name && cover.hn && cover.barcode;
    const tick = Boolean(model.ui.tick);
    const tog = (r, label) => `<button type="button" class="btn btn-ghost btn-small${cover[r] ? ' is-on' : ''}" data-act="cover-toggle" data-region="${r}">${cover[r] ? tr('เปิดคืน ', "Uncover ") : tr('ปิด ', "Cover ")}${label}</button>`;
    return { title: tr('ปิดชื่อ/HN', "Cover names/HN"), covers: 'FR-02, BR-19, NFR-14', body: hero('shield', tr('ปิดชื่อ HN และบาร์โค้ด', "Cover names, HN and barcodes"), tr('ก่อนส่งให้ AI ทุกครั้ง', "Before every AI request")) + labelMock(cover) +
      `<div class="row">${tog('name', tr('ชื่อ', "Name"))}${tog('hn', 'HN')}${tog('barcode', tr('บาร์โค้ด', "Barcode"))}</div>` +
      (all ? '' : tr('<p class="error">ในภาพที่จะส่ง ยังเห็นข้อมูลส่วนตัวอยู่</p>', "<p class=\"error\">Personal information is still visible in the image to be sent.</p>")) +
      tr('<p class="hint">ภาพข้างบนคือภาพที่จะส่งจริง · ระบบวาดภาพใหม่ ลบข้อมูลไฟล์ และไม่เก็บต้นฉบับ</p>', "<p class=\"hint\">The image above is what will be sent. It is redrawn without file metadata; the original is not stored.</p>") +
      tr('<div class="card warn"><p>ถ้าใช้บริการ AI แบบฟรี ผู้ให้บริการอาจนำข้อมูลที่ส่งไปปรับปรุงผลิตภัณฑ์ จึงต้องปิดชื่อและ HN ก่อนส่งทุกครั้ง</p></div>', "<div class=\"card warn\"><p>The free AI provider may use submitted content to improve its products. Always cover names and HN before sending.</p></div>") +
      tr(`<label class="check"><input type="checkbox" data-field="tick"${tick ? ' checked' : ''}> ปิดชื่อและ HN แล้ว</label>`, `<label class="check"><input type="checkbox" data-field="tick"${tick ? ' checked' : ''}> I have covered names and HN</label>`) +
      tr(`<button type="button" class="btn btn-primary" data-act="send-ai"${canSend({ coveredTicked: tick }) ? '' : ' disabled'}>ส่งให้ AI</button>`, `<button type="button" class="btn btn-primary" data-act="send-ai"${canSend({ coveredTicked: tick }) ? '' : ' disabled'}>Send to AI</button>`) +
      (tick ? '' : tr('<p class="hint">ยังไม่ติ๊ก — ปุ่มส่งปิดอยู่ จะไม่มีอะไรถูกส่งออก</p>', "<p class=\"hint\">Not ticked — Send is disabled. Nothing will be sent.</p>")) + btn('ghost', tr('ยกเลิก', "Cancel"), 'cancel-draft') };
  },

  // C-05 (กำลังอ่าน)
  'cg-ai'() {
    return { title: tr('AI กำลังอ่าน', "AI is reading"), covers: 'FR-02, ADR-3, NFR-08', tabs: false, body: hero('sparkle', tr('AI กำลังอ่านฉลาก…', "AI is reading the label…"), '') +
      tr('<p class="hint" role="status">ปกติใช้ 5–20 วินาที · ถ้า AI ไม่ตอบ ระบบจะเปิดให้กรอกเอง</p>', '<p class="hint" role="status">Usually takes 5–20 seconds. If AI does not respond, manual entry will open.</p>') +
      tr('<div class="spinner" aria-hidden="true"></div><p class="hint">AI แค่ร่าง — คุณต้องตรวจทุกช่องก่อนบันทึก</p>', "<div class=\"spinner\" aria-hidden=\"true\"></div><p class=\"hint\">AI only drafts — check every field before saving.</p>") + btn('ghost', tr('ยกเลิก', "Cancel"), 'cancel-draft') };
  },

  // C-05 (ร่าง / กรอกเอง / ยาเมื่อมีอาการ)
  'cg-draft'(model) {
    const { ui, snap } = model;
    const draft = ui.draft ?? buildDraft(labelDrafts()[ui.sample ?? 'complete'], { mealTimes: snap.mealTimes ?? undefined }); // เปิดตรง ๆ = ฉลากตัวอย่างที่เลือก
    if (draft.unsupported) { // ข้อ 4 · BR-07
      return { title: tr('ตรวจร่าง', "Review draft"), covers: tr('FR-02, BR-07 · AC ข้อ 4', "FR-02, BR-07 · AC4"), body: tr('<h1>ยังไม่รองรับ</h1><div class="card warn"><strong>ยาที่กินเมื่อมีอาการยังไม่รองรับ</strong><p>ระบบไม่สร้างเวลาเตือนให้ยาแบบนี้</p></div>', "<h1>Not supported yet</h1><div class=\"card warn\"><strong>As-needed medicines are not supported</strong><p>The app does not create reminders for this type of medicine.</p></div>") +
        btn('ghost', tr('กรอกเอง (ยาเวลาตายตัว)', "Enter manually (fixed schedule)"), 'manual') + btn('ghost', tr('ยกเลิก', "Cancel"), 'cancel-draft') };
    }
    const ok = canSave(draft);
    const nameFlag = hasCheck(draft, 'name');
    const emptySlots = draft.checks.some((c) => c.path === 'slots');
    return { title: ui.manualReason ? tr('กรอกเอง', "Manual entry") : tr('ตรวจร่าง', "Review draft"), covers: 'FR-02, BR-04, BR-05, BR-06, BR-07 · NFR-06', body:
      `<h1>${ui.manualReason ? tr('กรอกข้อมูลยาเอง', "Enter medicine details manually") : tr('ร่างจาก AI — ยังไม่ได้บันทึก', "AI draft — not saved yet")}</h1>` +
      (ui.manualReason ? `<div class="card warn" role="alert"><p>${esc(manualMessage(ui))}</p></div>` + ocrPanel(ui)
        : tr('<p class="hint">AI อ่านผิดได้ — ตรวจทุกช่องก่อนบันทึก · ช่องที่อ่านไม่ได้ปล่อยว่างไว้ ไม่เดา</p>', "<p class=\"hint\">AI can misread labels. Check every field before saving. Unreadable fields stay blank; the app does not guess.</p>") + ocrCheck(ui, draft) + ocrPanel(ui, { open: false }) + (draft.instructionText ? tr(`<p class="label-says">ฉลากเขียนว่า: “${esc(draft.instructionText)}”</p>`, `<p class="label-says">The label says: “${esc(draft.instructionText)}”</p>`) : '')) +
      tr(`<label class="field"><span>ชื่อยา ${nameFlag ? flag() : ''}</span><input type="text" data-path="name"${nameFlag ? ' aria-invalid="true"' : ''} value="${esc(draft.name ?? '')}"></label>`, `<label class="field"><span>Medicine name ${nameFlag ? flag() : ''}</span><input type="text" data-path="name"${nameFlag ? ' aria-invalid="true"' : ''} value="${esc(draft.name ?? '')}"></label>`) +
      slotRows(draft, snap.mealTimes) + (emptySlots ? tr(`<p class="error">${flag()} ยังไม่มีช่องเวลากิน</p>`, `<p class="error">${flag()} No dosing slots yet</p>`) : '') + btn('ghost', tr('+ เพิ่มช่องเวลากิน', "+ Add dosing slot"), 'add-slot') +
      tr(`<label class="field"><span>คำเตือน (ถ้ามีบนฉลาก)</span><input type="text" data-path="warnings" value="${esc(draft.warnings ?? '')}"></label>`, `<label class="field"><span>Warnings (if listed on the label)</span><input type="text" data-path="warnings" value="${esc(draft.warnings ?? '')}"></label>`) +
      tr(`<label class="field"><span>ข้อห้าม (ถ้ามีบนฉลาก)</span><input type="text" data-path="contraindications" value="${esc(draft.contraindications ?? '')}"></label>`, `<label class="field"><span>Contraindications (if listed on the label)</span><input type="text" data-path="contraindications" value="${esc(draft.contraindications ?? '')}"></label>`) +
      tr(`<button type="button" class="btn btn-taken" data-act="save-draft"${ok ? '' : ' disabled'}>บันทึกยา</button>`, `<button type="button" class="btn btn-taken" data-act="save-draft"${ok ? '' : ' disabled'}>Save medicine</button>`) +
      (ok ? '' : tr('<p class="hint">ช่องบังคับยังไม่ครบ — บันทึกไม่ได้</p>', "<p class=\"hint\">Required fields are incomplete — cannot save yet.</p>")) + btn('ghost', tr('ยกเลิก (ไม่บันทึก)', "Cancel without saving"), 'cancel-draft') };
  },

  // C-06 — รายการยา (เฉพาะผู้ดูแลแก้ได้ BR-03)
  'cg-meds'(model) {
    const { snap } = model;
    const mt = snap.mealTimes;
    let body = tr('<h1>รายการยา</h1>', "<h1>Medicines</h1>") + (mt
      ? tr(`<section class="card meal-times"><div class="card-head"><h2 class="h-card">${icon('clock')}เวลามื้อ</h2>${btn('ghost', tr('แก้', "Edit"), 'go', { to: 'cg-meals' }).replace('class="btn btn-ghost"', 'class="btn btn-ghost btn-small"')}</div>`, `<section class="card meal-times"><div class="card-head"><h2 class="h-card">${icon('clock')}Meal times</h2>${btn('ghost', tr('แก้', "Edit"), 'go', { to: 'cg-meals' }).replace('class="btn btn-ghost"', 'class="btn btn-ghost btn-small"')}</div>`) +
        `<p>${['breakfast', 'lunch', 'dinner', 'bedtime'].map((k) => `${esc(MEAL_NAMES[k])} ${esc(mt[k])}`).join(' · ')}</p></section>`
      : tr(`<section class="card st-none"><h2 class="h-card">${icon('clock')}ยังไม่ได้ตั้งเวลามื้อ</h2><p>ตั้งก่อนเพิ่มยา ระบบจึงคำนวณเวลาเตือนได้</p>${btn('primary', tr('ตั้งเวลามื้อ', "Set meal times"), 'go', { to: 'cg-meals' })}</section>`, `<section class="card st-none"><h2 class="h-card">${icon('clock')}Meal times are not set</h2><p>Set meal times before adding medicine so reminders can be calculated.</p>${btn('primary', tr('ตั้งเวลามื้อ', "Set meal times"), 'go', { to: 'cg-meals' })}</section>`));
    if (!snap.medicines.length) body += tr('<div class="card empty"><strong>ยังไม่มียา</strong></div>', "<div class=\"card empty\"><strong>No medicines yet</strong></div>");
    for (const m of snap.medicines) {
      body += `<section class="card"><h2 class="h-card">${esc(m.name)}</h2><ul class="plain">` + m.slots.map((s) => {
        const t = reminderTime(s, snap.mealTimes ?? {});
        return tr(`<li>${esc(MEAL_NAMES[s.meal])} · ${esc(TIMING_NAMES[s.timing])}${s.timing === 'before_meal' ? tr(` ${esc(s.minutesBefore)} นาที`, ` ${esc(s.minutesBefore)} min`) : ''} · ${esc(s.tabletsPerDose)} เม็ด${t ? tr(` → เตือน ${esc(t)}`, ` → reminder ${esc(t)}`) : ''}</li>`, `<li>${esc(MEAL_NAMES[s.meal])} · ${esc(TIMING_NAMES[s.timing])}${s.timing === 'before_meal' ? tr(` ${esc(s.minutesBefore)} นาที`, ` ${esc(s.minutesBefore)} min`) : ''} · ${esc(s.tabletsPerDose)} ${Number(s.tabletsPerDose) === 1 ? 'tablet' : 'tablets'}${t ? tr(` → เตือน ${esc(t)}`, ` → reminder ${esc(t)}`) : ''}</li>`);
      }).join('') + `</ul>${btn('ghost', tr('ลบยา', "Delete medicine"), 'del-med', { id: m.id })}</section>`;
    }
    body += btn('primary', tr(`${icon('camera')}เพิ่มยาจากฉลาก`, `${icon('camera')}Add medicine from a label`), 'start-add') + btn('ghost', tr('+ กรอกเอง', "+ Enter manually"), 'manual-entry');
    return { title: tr('ยา', "Medicines"), covers: tr('FR-02, BR-03 (เฉพาะผู้ดูแลแก้ยาได้)', "FR-02, BR-03 (caregiver-only editing)"), body };
  },
};

// ทิ้งรูปต้นฉบับ (ไม่เก็บ — FR-02 ข้อ 9)
function dropPhoto(env) {
  if (env.ui.photo && env.photo) env.photo.release(env.ui.photo);
  env.ui.photo = null; env.ui.rects = [];
}

// ใช้งานจริง: วาดรูปใหม่พร้อมแถบดำ → ส่งให้ AI → ร่าง · ใช้ไม่ได้ = บอกเหตุผลแล้วเปิดฟอร์มกรอกเอง (ข้อ 5)
// Resolve the imported UI map when used, so switching language does not freeze the first locale.
const aiReasonText = (reason) => AI_PROBLEMS[reason === 'service_down' ? 'down' : reason] ?? AI_PROBLEMS.down;
async function sendReal(env) {
  if (!env.ui.photo || !(env.ui.rects ?? []).length) return;          // ต้องปิดอย่างน้อย 1 แถบ (BR-19)
  const scan = newScan(env);
  let image;
  try {
    image = await env.photo.redact(env.ui.photo, env.ui.rects);        // ภาพใหม่ ไม่มี EXIF
  } catch {
    if (isStale(env, scan)) return;                                     // ยกเลิกระหว่างเตรียมภาพแล้ว ไม่ทับรอบใหม่
    dropPhoto(env);
    startManual(env, tr('เตรียมภาพที่ปิดชื่อ/HN ไม่สำเร็จ — ไม่มีอะไรถูกส่งออก ลองถ่ายใหม่หรือกรอกเอง', 'Could not prepare the covered image. Nothing was sent. Take another photo or enter the details manually.'));
    return;
  }
  if (isStale(env, scan)) return;                                       // ยกเลิกแล้ว ไม่ส่ง AI และไม่ทิ้งรูปของรอบใหม่
  dropPhoto(env);                                                       // ทิ้งต้นฉบับทันที
  env.go('cg-ai'); env.render();
  try {
    const json = await env.ai.requestDraft(image);
    if (isStale(env, scan)) return;                                     // ผู้ใช้ยกเลิก/เริ่มใหม่ระหว่างรอ → ทิ้งผล
    env.ui.manualReason = null; env.ui.manualAI = null;
    env.ui.draft = buildDraft(json, { mealTimes: env.snap.mealTimes ?? undefined });
    env.go('cg-draft');
    await readWithOcr(env, image, scan);                                // ไม่บล็อก: ผู้ดูแลตรวจร่างได้เลย OCR มาเทียบชื่อยาทีหลัง
  } catch (error) {
    if (isStale(env, scan)) return;
    if (error?.detail) console.warn('AI อ่านฉลากไม่ได้:', error.detail);   // รหัส/ข้อความสั้น ไม่มีข้อมูลในภาพ
    const feedback = { reason: error?.reason, detail: error?.detail ?? '' };
    // เปิดฟอร์มกรอกเองทันที (ไม่รอ OCR) แล้วให้ OCR อ่านต่อเบื้องหลัง → ผู้ใช้ไม่ต้องเห็นวงกลมหมุนซ้ำ
    startManual(env, manualMessage({ manualAI: feedback }), feedback);
    await readWithOcr(env, image, scan);
  }
}

// OCR บนเครื่อง (ทางสำรองเมื่อ Gemini ใช้ไม่ได้) — เก็บผลลง ui.ocrText เมื่ออ่านได้ · อ่านไม่ได้/ไม่มี OCR = ไม่แสดงอะไร
async function readWithOcr(env, image, scan) {
  if (!env.ocr) return;
  env.ui.ocrReading = true; env.render();
  let text = '';
  try {
    text = (await env.ocr.recognize(image)).text;
  } catch (error) {
    console.warn('OCR อ่านไม่ได้:', String(error?.message ?? error).slice(0, 120));   // ห้าม log ข้อความในภาพ
  }
  if (isStale(env, scan)) return;                                       // ผู้ใช้ยกเลิก/เริ่มใหม่ระหว่างรอ → ทิ้งผล
  env.ui.ocrReading = false;
  env.ui.ocrText = text;
  env.render();
}

// รอบการสแกน: ยกเลิก/เริ่มใหม่ = เพิ่มเลขรอบ → ผลของรอบเก่าที่มาถึงทีหลังถูกทิ้ง ไม่ทับหน้าจอปัจจุบัน
function newScan(env) {
  env.ui.scan = (env.ui.scan ?? 0) + 1;
  env.ui.ocrText = '';
  env.ui.ocrReading = false;
  return env.ui.scan;
}
const isStale = (env, scan) => env.ui.scan !== scan;

// ร่างปัจจุบัน — ถ้าเปิดหน้าตรวจร่างตรง ๆ (ยังไม่มีร่าง) ใช้ฉลากตัวอย่างที่เลือกไว้
function currentDraft(env) {
  return env.ui.draft ?? buildDraft(labelDrafts()[env.ui.sample ?? 'complete'], { mealTimes: env.snap.mealTimes ?? undefined });
}

// เริ่มร่างจากฉลากตัวอย่างที่เลือก → ไปหน้าตรวจร่าง
function startDraft(env) {
  const json = labelDrafts()[env.ui.sample ?? 'complete'];
  env.ui.manualReason = null; env.ui.manualAI = null;
  env.ui.draft = buildDraft(json, { mealTimes: env.snap.mealTimes ?? undefined });
  env.go('cg-draft');
}
// เปิดฟอร์มกรอกเอง (AI ใช้ไม่ได้ / ยาเมื่อมีอาการ — ข้อ 5)
function startManual(env, why, aiFeedback = null) {
  const mealTimes = env.snap.mealTimes ?? undefined;
  env.ui.manualReason = why;
  env.ui.manualAI = aiFeedback;
  env.ui.draft = addSlot(buildDraft(null, { mealTimes }), { mealTimes });
  env.go('cg-draft');
}

export const actions = {
  async 'save-meals'(env) {
    const times = env.ui.times ?? env.snap.mealTimes ?? DEFAULT_TIMES;
    try {
      await env.repo.setMealTimes(times);
      env.toast(tr('บันทึกเวลามื้อแล้ว — เวลาเตือนคำนวณจากฉลากเท่านั้น', "Meal times saved — reminders are calculated from the label only."));
      env.ui.times = null;
      env.go('cg-meds');   // ขั้นต่อไป: เพิ่มยา
    } catch { env.toast(tr('เวลามื้อต้องกรอกครบ 4 ช่อง', "Complete all four meal-time fields.")); }
  },
  'set-time'(env, d) { env.ui.times = { ...(env.ui.times ?? env.snap.mealTimes ?? DEFAULT_TIMES), [d.time]: d.value }; },
  'start-add'(env) { newScan(env); env.ui.manualAI = null; env.ui.cover = {}; env.ui.tick = false; env.ui.draft = null; env.go('cg-photo'); },
  'cover-toggle'(env, d) { env.ui.cover = { ...(env.ui.cover ?? {}), [d.region]: !env.ui.cover?.[d.region] }; },
  'set-tick'(env, d) { env.ui.tick = d.checked; },
  'set-sample'(env, d) { env.ui.sample = d.value; },
  'set-ai-problem'(env, d) { env.setFlag('aiProblem', d.value); },
  /** "ส่งให้ AI" — ต้องติ๊ก "ปิดชื่อและ HN แล้ว" ก่อน ไม่เช่นนั้นไม่ส่งอะไรเลย (BR-19) */
  async 'send-ai'(env) {
    if (!canSend({ coveredTicked: env.ui.tick })) return;
    if (env.ai) return sendReal(env);
    const problem = env.flags.aiProblem;
    if (problem) { const feedback = { reason: problem, detail: '' }; startManual(env, manualMessage({ manualAI: feedback }), feedback); return; } // ข้อ 5
    env.go('cg-ai');
    env.later(() => startDraft(env), AI_DELAY_MS); // AI จำลอง
  },
  'cancel-draft'(env) { env.cancelLater(); newScan(env); dropPhoto(env); env.ui.draft = null; env.go('cg-meds'); env.toast(tr('ยกเลิก — ไม่ได้บันทึกอะไร', "Cancelled — nothing was saved.")); },
  // ---- ใช้งานจริง: รูปฉลาก + แถบปิด ----
  async 'set-photo'(env, d) {
    if (!d.file || !env.photo) return;
    dropPhoto(env);
    try {
      env.ui.photo = await env.photo.load(d.file);   // { url, width, height, bitmap }
      env.ui.rects = []; env.ui.tick = false; env.ui.photoError = null;
      env.go('cg-cover');
    } catch { env.ui.photoError = tr('เปิดรูปนี้ไม่ได้ — ลองถ่ายใหม่', "Could not open this image — try taking another photo."); }
  },
  'add-rect'(env, d) { env.ui.rects = [...(env.ui.rects ?? []), { x: Number(d.x), y: Number(d.y), w: Number(d.w), h: Number(d.h) }]; },
  'cover-top'(env) { env.ui.rects = [...(env.ui.rects ?? []), { ...TOP_BAND }]; },
  'undo-rect'(env) { env.ui.rects = (env.ui.rects ?? []).slice(0, -1); },
  'clear-rects'(env) { env.ui.rects = []; },
  'manual-entry'(env) { newScan(env); dropPhoto(env); startManual(env, tr('กรอกข้อมูลยาเองจากฉลาก', "Enter medicine details from the label.")); },
  manual(env) { startManual(env, tr('ยาที่กินเมื่อมีอาการยังไม่รองรับ — ถ้าเป็นยาเวลาตายตัว กรอกเองได้', "As-needed medicines are not supported. You can enter a fixed-schedule medicine manually.")); },
  /** ผู้ดูแลแก้ช่องของร่าง (ค่าที่แก้ชนะค่าจาก AI — ข้อ 2) */
  'edit-field'(env, d) {
    const mealTimes = env.snap.mealTimes ?? undefined;
    let draft = applyEdit(currentDraft(env), d.path, d.value, { mealTimes });
    const m = /^slots\[(\d+)\]\.timing$/.exec(d.path);
    if (m) { // เลือก "ก่อนนอน" → มื้อ = ก่อนนอน · ไม่ใช่ "ก่อนอาหาร" → ล้างจำนวนนาที
      if (d.value === 'at_bedtime') draft = applyEdit(draft, `slots[${m[1]}].meal`, 'bedtime', { mealTimes });
      if (d.value !== 'before_meal') draft = applyEdit(draft, `slots[${m[1]}].minutesBefore`, '', { mealTimes });
    }
    env.ui.draft = draft;
  },
  'add-slot'(env) { env.ui.draft = addSlot(currentDraft(env), { mealTimes: env.snap.mealTimes ?? undefined }); },
  'del-slot'(env, d) { env.ui.draft = removeSlot(currentDraft(env), Number(d.i), { mealTimes: env.snap.mealTimes ?? undefined }); },
  /** บันทึกยา — ช่องบังคับไม่ครบ = บันทึกไม่ได้ (BR-04) */
  async 'save-draft'(env) {
    const draft = currentDraft(env);
    if (!canSave(draft)) return;
    await env.repo.saveMedicine(toMedicine(draft));
    newScan(env); env.ui.draft = null;
    env.go('cg-meds');
    env.toast(tr('บันทึกยาแล้ว', "Medicine saved."));
  },
  async 'del-med'(env, d) { await env.repo.deleteMedicine(d.id); },
};
