// FR-02 เพิ่มยาจากฉลาก: C-02 ตั้งเวลามื้อ · C-03 ถ่ายรูปฉลาก · C-04 ปิดชื่อ/HN · C-05 AI อ่าน/ตรวจร่าง/กรอกเอง · C-06 รายการยา
// เจ้าของ: Yar Oo (FR-02) · BR-04–BR-07, BR-19 · NFR-06, NFR-09, NFR-14 · ตัดสินด้วย logic/labelDraft.js และ logic/schedule.js เท่านั้น
// Demo mode: "AI" เป็นตัวจำลอง ร่างมาจาก core/demoData.js (ฉลากสมมติ) · ใช้งานจริง (model.real): ถ่ายรูปจริง → ปิดแถบดำ (services/redact.js) → Gemini ผ่าน env.ai (services/aiLabel.js)
import { esc, btn, hero, flag } from './ui.js';
import { buildDraft, applyEdit, addSlot, removeSlot, canSave, canSend, toMedicine } from '../logic/labelDraft.js';
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

// ภาพฉลากสมมติ: ส่วนที่ปิดแล้วเป็นแถบทึบ — ภาพที่ "จะส่ง" ต้องไม่เห็นชื่อ/HN/บาร์โค้ด (BR-19)
function labelMock(cover) {
  const part = (region, text) => `<span class="lm-part${cover?.[region] ? ' is-covered' : ''}">${cover?.[region] ? '&nbsp;' : esc(text)}</span>`;
  return '<div class="label-mock" aria-label="ฉลากสมมติ"><p class="lm-title">โรงพยาบาลตัวอย่าง (ฉลากสมมติ)</p>' +
    `<p>ชื่อ: ${part('name', 'นามสมมติ ตัวอย่างใจดี')} &nbsp; HN: ${part('hn', '0000000')}</p>` +
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
    return `<fieldset class="slot"><legend>ช่องเวลากิน ${i + 1}</legend>` +
      `<label class="field"><span>มื้อ ${hasCheck(draft, p('meal')) ? flag() : ''}</span>${select(`slots[${i}].meal`, s.meal, MEAL_NAMES, '— เลือก —', hasCheck(draft, p('meal')))}</label>` +
      `<label class="field"><span>วิธีกิน ${hasCheck(draft, p('timing')) ? flag() : ''}</span>${select(`slots[${i}].timing`, s.timing, TIMING_NAMES, '— เลือก —', hasCheck(draft, p('timing')))}</label>` +
      (s.timing === 'before_meal' ? `<label class="field"><span>ก่อนอาหารกี่นาที ${hasCheck(draft, p('minutesBefore')) ? flag() : ''}</span><input type="number" min="1" step="1" data-path="${p('minutesBefore')}"${hasCheck(draft, p('minutesBefore')) ? ' aria-invalid="true"' : ''} value="${esc(s.minutesBefore ?? '')}"></label>` : '') +
      `<label class="field"><span>จำนวนเม็ดต่อครั้ง ${hasCheck(draft, p('tabletsPerDose')) ? flag() : ''}</span><input type="number" min="1" step="1" data-path="${p('tabletsPerDose')}"${hasCheck(draft, p('tabletsPerDose')) ? ' aria-invalid="true"' : ''} value="${esc(s.tabletsPerDose ?? '')}"></label>` +
      own.map((c) => `<p class="error">${flag()} ${esc(REASON_TEXT[c.reason] ?? c.reason)}</p>`).join('') +
      (time ? `<p class="hint ok">เวลาเตือนที่คำนวณได้: <b>${esc(time)}</b></p>` : '') +
      (draft.slots.length > 1 ? btn('ghost', 'ลบช่องนี้', 'del-slot', { i }) : '') + '</fieldset>';
  }).join('');
}

// C-04 ใช้งานจริง: รูปจริง + แถบดำที่ลากวาด (ภาพนี้ = ภาพที่จะส่ง) · ส่งได้เมื่อมีแถบอย่างน้อย 1 แถบ และติ๊กยืนยัน (BR-19)
function realCover(model) {
  const { ui } = model;
  if (!ui.photo) return { title: 'ปิดชื่อ/HN', covers: 'FR-02, BR-19, NFR-14', body: '<p class="hint">ยังไม่มีรูป</p>' + btn('primary', 'ถ่ายรูปฉลาก', 'go', { to: 'cg-photo' }) };
  const rects = ui.rects ?? [];
  const tick = Boolean(ui.tick);
  const ready = canSend({ coveredTicked: tick }) && rects.length > 0;
  const boxes = rects.map((r) => `<div class="redact-box" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%"></div>`).join('');
  return { title: 'ปิดชื่อ/HN', covers: 'FR-02, BR-19, NFR-14', body: hero('shield', 'ปิดชื่อ HN และบาร์โค้ด', 'ลากนิ้วบนรูปเพื่อทำแถบดำ') +
    `<div class="redact-stage" data-redact="1" style="aspect-ratio:${ui.photo.width} / ${ui.photo.height}"><img src="${esc(ui.photo.url)}" alt="รูปฉลากที่จะส่ง (ส่วนที่ปิดจะเป็นสีดำ)">${boxes}</div>` +
    `<div class="row">${btn('ghost', 'ปิดแถบบน', 'cover-top')}${btn('ghost', 'ลบแถบล่าสุด', 'undo-rect')}${btn('ghost', 'ล้างทั้งหมด', 'clear-rects')}</div>` +
    (rects.length ? `<p class="hint">ปิดแล้ว ${rects.length} แถบ · ภาพข้างบนคือภาพที่จะส่งจริง ระบบวาดภาพใหม่ ลบข้อมูลไฟล์ และไม่เก็บต้นฉบับ</p>` : '<p class="error">ยังไม่ได้ปิดส่วนใดเลย — ลากนิ้วปิดชื่อ HN บาร์โค้ด หรือกด "ปิดแถบบน"</p>') +
    '<div class="card warn"><p>บริการ AI แบบฟรีอาจนำข้อมูลที่ส่งไปปรับปรุงผลิตภัณฑ์ จึงต้องปิดชื่อและ HN ก่อนส่งทุกครั้ง</p></div>' +
    `<label class="check"><input type="checkbox" data-field="tick"${tick ? ' checked' : ''}> ปิดชื่อและ HN แล้ว</label>` +
    `<button type="button" class="btn btn-primary" data-act="send-ai"${ready ? '' : ' disabled'}>ส่งให้ AI</button>` +
    (ready ? '' : '<p class="hint">ต้องมีแถบปิดอย่างน้อย 1 แถบ และติ๊กยืนยันก่อน — ระหว่างนี้ไม่มีอะไรถูกส่งออก</p>') + btn('ghost', 'ยกเลิก', 'cancel-draft') };
}

export const screens = {
  // C-02 — ตั้งเวลามื้อ (BR-06)
  'cg-meals'(model) {
    const times = model.ui.times ?? model.snap.mealTimes ?? DEFAULT_TIMES;
    const rows = MEAL_KEYS.map((k) => `<label class="field"><span>มื้อ${esc(MEAL_NAMES[k])}</span><input type="time" data-time="${k}" value="${esc(times[k])}"></label>`).join('');
    return { title: 'ตั้งเวลามื้อ', covers: 'FR-02, BR-06', body: '<h1>เวลามื้ออาหาร</h1><p class="lead">เวลาเตือนของยาคำนวณจากฉลากเท่านั้น ไม่เดา</p>' +
      rows + btn('primary', 'บันทึกเวลามื้อ', 'save-meals') + btn('ghost', 'เพิ่มยาจากฉลาก', 'start-add') };
  },

  // C-03 — ถ่ายรูปฉลาก (ตอนนี้เลือกฉลากสมมติแทนการถ่ายจริง)
  'cg-photo'(model) {
    if (model.real) {   // ใช้งานจริง: ถ่าย/เลือกรูปฉลากจากมือถือผู้ดูแล — รูปอยู่ในเครื่องจนกว่าจะปิดชื่อ/HN และติ๊กยืนยัน
      return { title: 'ถ่ายรูปฉลาก', covers: 'FR-02, BR-19', body: hero('camera', 'ถ่ายรูปฉลากยา', 'ถ่ายเฉพาะฉลาก ให้ตัวหนังสือชัด แสงพอ') +
        '<div class="card warn"><strong>ยังไม่มีอะไรถูกส่ง</strong><p>ขั้นต่อไปให้ปิดชื่อ HN และบาร์โค้ดก่อน แล้วจึงส่งให้ AI อ่าน</p></div>' +
        (model.snap.mealTimes ? '' : '<div class="card warn" role="alert"><p>ยังไม่ได้ตั้งเวลามื้อ — ตั้งก่อน ไม่เช่นนั้นระบบคำนวณเวลาเตือนไม่ได้</p>' + btn('ghost', 'ตั้งเวลามื้อ', 'go', { to: 'cg-meals' }) + '</div>') +
        '<label class="field"><span>ถ่ายรูป หรือเลือกรูปฉลาก</span><input type="file" accept="image/*" capture="environment" data-field="photo"></label>' +
        (model.ui.photoError ? `<p class="error" role="alert">${esc(model.ui.photoError)}</p>` : '') +
        btn('ghost', 'กรอกเองโดยไม่ถ่ายรูป', 'manual-entry') };
    }
    const sample = model.ui.sample ?? 'complete';
    const opts = Object.entries(SAMPLE_TITLES).map(([k, t]) => `<option value="${k}"${sample === k ? ' selected' : ''}>${esc(t)}</option>`).join('');
    const problems = Object.entries(AI_PROBLEMS).map(([k, t]) => `<option value="${k}"${model.flags.aiProblem === k ? ' selected' : ''}>${esc(t)}</option>`).join('');
    return { title: 'ถ่ายรูปฉลาก', covers: 'FR-02, BR-19', body: hero('camera', 'ถ่ายรูปฉลากยา', 'ถ่ายเฉพาะฉลาก ให้ตัวหนังสือชัด') +
      '<div class="card warn"><strong>ปิดชื่อและ HN ก่อนส่ง</strong><p>ขั้นต่อไปจะให้ลากปิดชื่อ HN และบาร์โค้ด ก่อนส่งให้ AI</p></div>' + labelMock(null) +
      (model.snap.mealTimes ? '' : '<div class="card warn" role="alert"><p>ยังไม่ได้ตั้งเวลามื้อ — ตั้งก่อน ไม่เช่นนั้นระบบคำนวณเวลาเตือนไม่ได้</p>' + btn('ghost', 'ตั้งเวลามื้อ', 'go', { to: 'cg-meals' }) + '</div>') +
      `<label class="field"><span>ฉลากตัวอย่างที่ AI จะ "อ่าน" (จำลอง ไม่ได้เรียก AI จริง)</span><select data-field="sample">${opts}</select></label>` +
      `<label class="field"><span>จำลองปัญหาของบริการ AI (FR-02 ข้อ 5)</span><select data-field="aiproblem"><option value=""${model.flags.aiProblem ? '' : ' selected'}>ไม่มีปัญหา</option>${problems}</select></label>` +
      btn('primary', 'ถ่ายรูป (ตัวอย่าง)', 'go', { to: 'cg-cover' }) };
  },

  // C-04 — ปิดชื่อ/HN/บาร์โค้ด + ติ๊กยืนยัน · ไม่ติ๊ก = ปุ่มส่งปิด ไม่มีอะไรถูกส่ง (ข้อ 8, 9, BR-19)
  'cg-cover'(model) {
    if (model.real) return realCover(model);
    const cover = model.ui.cover ?? {};
    const all = cover.name && cover.hn && cover.barcode;
    const tick = Boolean(model.ui.tick);
    const tog = (r, label) => `<button type="button" class="btn btn-ghost btn-small${cover[r] ? ' is-on' : ''}" data-act="cover-toggle" data-region="${r}">${cover[r] ? 'เปิดคืน ' : 'ปิด '}${label}</button>`;
    return { title: 'ปิดชื่อ/HN', covers: 'FR-02, BR-19, NFR-14', body: hero('shield', 'ปิดชื่อ HN และบาร์โค้ด', 'ก่อนส่งให้ AI ทุกครั้ง') + labelMock(cover) +
      `<div class="row">${tog('name', 'ชื่อ')}${tog('hn', 'HN')}${tog('barcode', 'บาร์โค้ด')}</div>` +
      (all ? '' : '<p class="error">ในภาพที่จะส่ง ยังเห็นข้อมูลส่วนตัวอยู่</p>') +
      '<p class="hint">ภาพข้างบนคือภาพที่จะส่งจริง · ระบบวาดภาพใหม่ ลบข้อมูลไฟล์ และไม่เก็บต้นฉบับ</p>' +
      '<div class="card warn"><p>ถ้าใช้บริการ AI แบบฟรี ผู้ให้บริการอาจนำข้อมูลที่ส่งไปปรับปรุงผลิตภัณฑ์ จึงต้องปิดชื่อและ HN ก่อนส่งทุกครั้ง</p></div>' +
      `<label class="check"><input type="checkbox" data-field="tick"${tick ? ' checked' : ''}> ปิดชื่อและ HN แล้ว</label>` +
      `<button type="button" class="btn btn-primary" data-act="send-ai"${canSend({ coveredTicked: tick }) ? '' : ' disabled'}>ส่งให้ AI</button>` +
      (tick ? '' : '<p class="hint">ยังไม่ติ๊ก — ปุ่มส่งปิดอยู่ จะไม่มีอะไรถูกส่งออก</p>') + btn('ghost', 'ยกเลิก', 'cancel-draft') };
  },

  // C-05 (กำลังอ่าน)
  'cg-ai'() {
    return { title: 'AI กำลังอ่าน', covers: 'FR-02, ADR-3, NFR-08', tabs: false, body: hero('sparkle', 'AI กำลังอ่านฉลาก…', '') +
      '<div class="spinner" aria-hidden="true"></div><p class="hint">AI แค่ร่าง — คุณต้องตรวจทุกช่องก่อนบันทึก</p>' + btn('ghost', 'ยกเลิก', 'cancel-draft') };
  },

  // C-05 (ร่าง / กรอกเอง / ยาเมื่อมีอาการ)
  'cg-draft'(model) {
    const { ui, snap } = model;
    const draft = ui.draft ?? buildDraft(labelDrafts()[ui.sample ?? 'complete'], { mealTimes: snap.mealTimes ?? undefined }); // เปิดตรง ๆ = ฉลากตัวอย่างที่เลือก
    if (draft.unsupported) { // ข้อ 4 · BR-07
      return { title: 'ตรวจร่าง', covers: 'FR-02, BR-07 · AC ข้อ 4', body: '<h1>ยังไม่รองรับ</h1><div class="card warn"><strong>ยาที่กินเมื่อมีอาการยังไม่รองรับ</strong><p>ระบบไม่สร้างเวลาเตือนให้ยาแบบนี้</p></div>' +
        btn('ghost', 'กรอกเอง (ยาเวลาตายตัว)', 'manual') + btn('ghost', 'ยกเลิก', 'cancel-draft') };
    }
    const ok = canSave(draft);
    const nameFlag = hasCheck(draft, 'name');
    const emptySlots = draft.checks.some((c) => c.path === 'slots');
    return { title: ui.manualReason ? 'กรอกเอง' : 'ตรวจร่าง', covers: 'FR-02, BR-04, BR-05, BR-06, BR-07 · NFR-06', body:
      `<h1>${ui.manualReason ? 'กรอกข้อมูลยาเอง' : 'ร่างจาก AI — ยังไม่ได้บันทึก'}</h1>` +
      (ui.manualReason ? `<div class="card warn" role="alert"><p>${esc(ui.manualReason)}</p></div>`
        : '<p class="hint">AI อ่านผิดได้ — ตรวจทุกช่องก่อนบันทึก · ช่องที่อ่านไม่ได้ปล่อยว่างไว้ ไม่เดา</p>' + (draft.instructionText ? `<p class="label-says">ฉลากเขียนว่า: “${esc(draft.instructionText)}”</p>` : '')) +
      `<label class="field"><span>ชื่อยา ${nameFlag ? flag() : ''}</span><input type="text" data-path="name"${nameFlag ? ' aria-invalid="true"' : ''} value="${esc(draft.name ?? '')}"></label>` +
      slotRows(draft, snap.mealTimes) + (emptySlots ? `<p class="error">${flag()} ยังไม่มีช่องเวลากิน</p>` : '') + btn('ghost', '+ เพิ่มช่องเวลากิน', 'add-slot') +
      `<label class="field"><span>คำเตือน (ถ้ามีบนฉลาก)</span><input type="text" data-path="warnings" value="${esc(draft.warnings ?? '')}"></label>` +
      `<label class="field"><span>ข้อห้าม (ถ้ามีบนฉลาก)</span><input type="text" data-path="contraindications" value="${esc(draft.contraindications ?? '')}"></label>` +
      `<button type="button" class="btn btn-taken" data-act="save-draft"${ok ? '' : ' disabled'}>บันทึกยา</button>` +
      (ok ? '' : '<p class="hint">ช่องบังคับยังไม่ครบ — บันทึกไม่ได้</p>') + btn('ghost', 'ยกเลิก (ไม่บันทึก)', 'cancel-draft') };
  },

  // C-06 — รายการยา (เฉพาะผู้ดูแลแก้ได้ BR-03)
  'cg-meds'(model) {
    const { snap } = model;
    let body = '<h1>รายการยา</h1>';
    if (!snap.medicines.length) body += '<div class="card empty"><strong>ยังไม่มียา</strong></div>';
    for (const m of snap.medicines) {
      body += `<section class="card"><h2 class="h-card">${esc(m.name)}</h2><ul class="plain">` + m.slots.map((s) => {
        const t = reminderTime(s, snap.mealTimes ?? {});
        return `<li>${esc(MEAL_NAMES[s.meal])} · ${esc(TIMING_NAMES[s.timing])}${s.timing === 'before_meal' ? ` ${esc(s.minutesBefore)} นาที` : ''} · ${esc(s.tabletsPerDose)} เม็ด${t ? ` → เตือน ${esc(t)}` : ''}</li>`;
      }).join('') + `</ul>${btn('ghost', 'ลบยา', 'del-med', { id: m.id })}</section>`;
    }
    body += btn('primary', 'เพิ่มยาจากฉลาก', 'start-add') + btn('ghost', 'ตั้งเวลามื้อ', 'go', { to: 'cg-meals' });
    return { title: 'ยา', covers: 'FR-02, BR-03 (เฉพาะผู้ดูแลแก้ยาได้)', body };
  },
};

// ทิ้งรูปต้นฉบับ (ไม่เก็บ — FR-02 ข้อ 9)
function dropPhoto(env) {
  if (env.ui.photo && env.photo) env.photo.release(env.ui.photo);
  env.ui.photo = null; env.ui.rects = [];
}

// ใช้งานจริง: วาดรูปใหม่พร้อมแถบดำ → ส่งให้ AI → ร่าง · ใช้ไม่ได้ = บอกเหตุผลแล้วเปิดฟอร์มกรอกเอง (ข้อ 5)
const AI_REASON_TEXT = { offline: AI_PROBLEMS.offline, service_down: AI_PROBLEMS.down, quota: AI_PROBLEMS.quota, unreadable: AI_PROBLEMS.unreadable };
async function sendReal(env) {
  if (!env.ui.photo || !(env.ui.rects ?? []).length) return;          // ต้องปิดอย่างน้อย 1 แถบ (BR-19)
  const blob = await env.photo.redact(env.ui.photo, env.ui.rects);     // ภาพใหม่ ไม่มี EXIF
  dropPhoto(env);                                                       // ทิ้งต้นฉบับทันที
  env.go('cg-ai'); env.render();
  try {
    const json = await env.ai.requestDraft(blob);
    env.ui.manualReason = null;
    env.ui.draft = buildDraft(json, { mealTimes: env.snap.mealTimes ?? undefined });
    env.go('cg-draft');
  } catch (error) {
    startManual(env, `${AI_REASON_TEXT[error?.reason] ?? AI_PROBLEMS.down} — กรอกข้อมูลยาด้วยตัวเองได้เลย ไม่มีอะไรถูกบันทึกให้`);
  }
}

// ร่างปัจจุบัน — ถ้าเปิดหน้าตรวจร่างตรง ๆ (ยังไม่มีร่าง) ใช้ฉลากตัวอย่างที่เลือกไว้
function currentDraft(env) {
  return env.ui.draft ?? buildDraft(labelDrafts()[env.ui.sample ?? 'complete'], { mealTimes: env.snap.mealTimes ?? undefined });
}

// เริ่มร่างจากฉลากตัวอย่างที่เลือก → ไปหน้าตรวจร่าง
function startDraft(env) {
  const json = labelDrafts()[env.ui.sample ?? 'complete'];
  env.ui.manualReason = null;
  env.ui.draft = buildDraft(json, { mealTimes: env.snap.mealTimes ?? undefined });
  env.go('cg-draft');
}
// เปิดฟอร์มกรอกเอง (AI ใช้ไม่ได้ / ยาเมื่อมีอาการ — ข้อ 5)
function startManual(env, why) {
  const mealTimes = env.snap.mealTimes ?? undefined;
  env.ui.manualReason = why;
  env.ui.draft = addSlot(buildDraft(null, { mealTimes }), { mealTimes });
  env.go('cg-draft');
}

export const actions = {
  async 'save-meals'(env) {
    const times = env.ui.times ?? env.snap.mealTimes ?? DEFAULT_TIMES;
    try {
      await env.repo.setMealTimes(times);
      env.toast('บันทึกเวลามื้อแล้ว — เวลาเตือนคำนวณจากฉลากเท่านั้น');
    } catch { env.toast('เวลามื้อต้องกรอกครบ 4 ช่อง'); }
  },
  'set-time'(env, d) { env.ui.times = { ...(env.ui.times ?? env.snap.mealTimes ?? DEFAULT_TIMES), [d.time]: d.value }; },
  'start-add'(env) { env.ui.cover = {}; env.ui.tick = false; env.ui.draft = null; env.go('cg-photo'); },
  'cover-toggle'(env, d) { env.ui.cover = { ...(env.ui.cover ?? {}), [d.region]: !env.ui.cover?.[d.region] }; },
  'set-tick'(env, d) { env.ui.tick = d.checked; },
  'set-sample'(env, d) { env.ui.sample = d.value; },
  'set-ai-problem'(env, d) { env.setFlag('aiProblem', d.value); },
  /** "ส่งให้ AI" — ต้องติ๊ก "ปิดชื่อและ HN แล้ว" ก่อน ไม่เช่นนั้นไม่ส่งอะไรเลย (BR-19) */
  async 'send-ai'(env) {
    if (!canSend({ coveredTicked: env.ui.tick })) return;
    if (env.ai) return sendReal(env);
    const problem = env.flags.aiProblem;
    if (problem) { startManual(env, `${AI_PROBLEMS[problem]} — กรอกข้อมูลยาด้วยตัวเองได้เลย ไม่มีอะไรถูกบันทึกให้`); return; } // ข้อ 5
    env.go('cg-ai');
    env.later(() => startDraft(env), AI_DELAY_MS); // AI จำลอง
  },
  'cancel-draft'(env) { env.cancelLater(); dropPhoto(env); env.ui.draft = null; env.go('cg-meds'); env.toast('ยกเลิก — ไม่ได้บันทึกอะไร'); },
  // ---- ใช้งานจริง: รูปฉลาก + แถบปิด ----
  async 'set-photo'(env, d) {
    if (!d.file || !env.photo) return;
    dropPhoto(env);
    try {
      env.ui.photo = await env.photo.load(d.file);   // { url, width, height, bitmap }
      env.ui.rects = []; env.ui.tick = false; env.ui.photoError = null;
      env.go('cg-cover');
    } catch { env.ui.photoError = 'เปิดรูปนี้ไม่ได้ — ลองถ่ายใหม่'; }
  },
  'add-rect'(env, d) { env.ui.rects = [...(env.ui.rects ?? []), { x: Number(d.x), y: Number(d.y), w: Number(d.w), h: Number(d.h) }]; },
  'cover-top'(env) { env.ui.rects = [...(env.ui.rects ?? []), { ...TOP_BAND }]; },
  'undo-rect'(env) { env.ui.rects = (env.ui.rects ?? []).slice(0, -1); },
  'clear-rects'(env) { env.ui.rects = []; },
  'manual-entry'(env) { dropPhoto(env); startManual(env, 'กรอกข้อมูลยาเองจากฉลาก'); },
  manual(env) { startManual(env, 'ยาที่กินเมื่อมีอาการยังไม่รองรับ — ถ้าเป็นยาเวลาตายตัว กรอกเองได้'); },
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
    env.ui.draft = null;
    env.go('cg-meds');
    env.toast('บันทึกยาแล้ว');
  },
  async 'del-med'(env, d) { await env.repo.deleteMedicine(d.id); },
};
