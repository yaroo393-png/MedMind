// C-10: ตาราง 7 วัน + ร่างสรุป ใช้ token/ตัวช่วย escape เดิม ไม่แก้หน้าของเพื่อน
import { esc } from './ui.js';
import { thaiDate } from './format.js';
import { weeklyRequestData } from '../services/weeklySummaryFacts.js';
import { tr, getLanguage } from './i18n.js';

// แปลเฉพาะข้อความควบคุมของหน้า ไม่แปลข้อความผู้ใช้หรือเปลี่ยน state ระหว่างสลับภาษา
const MESSAGES = new Map([
  ['เริ่มจากข้อมูลตัวอย่าง ลองดูตารางก่อนสร้างสรุปได้', 'Start with sample records. Review the table before creating a summary.'],
  ['ตัวอย่างกรณีไม่มีข้อมูล · ปุ่มสร้างสรุปจะยังใช้ไม่ได้', 'Empty-data example · A summary cannot be created yet.'],
  ['ข้อมูลและผลสรุปในโหมดนี้เป็นตัวอย่าง ไม่เรียก AI จริง', 'The records and summary in this mode are examples. No real AI request is made.'],
  ['กำลังตรวจสิทธิ์ผู้ดูแลและโหลดบันทึก…', 'Checking caregiver access and loading records…'],
  ['โหลดบันทึกแล้ว · กดโหลดใหม่เมื่อต้องการข้อมูลล่าสุด', 'Records loaded · Select Reload to get the latest records.'],
  ['วันเปลี่ยนแล้ว โหลดช่วงวันที่ใหม่ให้แล้ว โปรดตรวจข้อมูลอีกครั้ง', 'The day has changed. The date range has been reloaded. Please review the records again.'],
  ['กำลังสร้างร่างสรุป…', 'Creating a draft summary…'],
  ['กำลังสร้างผลสรุปจำลอง…', 'Creating a sample summary…'],
  ['วันเปลี่ยนระหว่างรอสรุป โหลดช่วงวันที่ใหม่ให้แล้ว โปรดตรวจข้อมูลอีกครั้ง', 'The day changed while waiting. The date range has been reloaded. Please review the records again.'],
  ['ได้ร่างสรุปแล้ว โปรดตรวจเทียบตาราง', 'The draft is ready. Please compare it with the table.'],
  ['ผลจำลองพร้อมแล้ว · โหมดนี้ไม่ได้เรียก AI จริง', 'The sample summary is ready · This mode does not call real AI.'],
  ['เปิดจากเครื่องผู้ดูแลที่จับคู่ไว้ก่อน หากยกเลิกจับคู่แล้วจะดูประวัตินี้ไม่ได้', 'Open this page on the paired caregiver device. This history is unavailable after unpairing.'],
  ['AI ตอบช้าเกินไป ลองใหม่ภายหลังได้ ตารางบันทึกยังดูได้ตามปกติ', 'AI took too long to respond. Try again later. The records table is still available.'],
  ['ไม่มีบันทึกยืนยันที่ใช้สรุปได้ จึงยังไม่ส่งข้อมูลให้ AI', 'There are no usable confirmation records, so nothing has been sent to AI.'],
  ['ไม่มีอินเทอร์เน็ต จึงยังส่งข้อมูลให้ AI ไม่ได้', 'There is no internet connection. Records cannot be sent to AI yet.'],
  ['บริการ AI จำกัดจำนวนคำขอตอนนี้ โปรดลองใหม่ภายหลัง', 'The AI service is limiting requests. Please try again later.'],
  ['ผลจาก AI ตรวจสอบไม่ผ่าน จึงยังไม่แสดงสรุป โปรดลองใหม่', 'The AI response did not pass validation. No summary is shown. Please try again.'],
  ['เชื่อมต่อข้อมูลหรือบริการ AI ไม่สำเร็จ โปรดตรวจอินเทอร์เน็ตแล้วลองใหม่', 'Unable to connect to the records or AI service. Check your connection and try again.'],
]);
const displayMessage = (message = '') => MESSAGES.has(message) ? tr(message, MESSAGES.get(message)) : message;

export function weeklyDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return tr(thaiDate(dateKey), new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day)));
}

/** แปลประโยคควบคุมจาก ID และข้อมูลเดิมในเครื่อง ไม่แปลอิสระหรือเรียก AI ซ้ำ */
export function weeklySummaryText(item, summary) {
  if (getLanguage() !== 'en' || !summary?.hasData) return item.text;
  const request = weeklyRequestData(summary);
  if (!request.candidates.some((candidate) => candidate.id === item.id)) return item.text;
  const meals = request.days.flatMap((day) => day.meals);
  if (item.id === 'overview') {
    const late = meals.filter((meal) => meal.status === 'taken_late').length;
    return `The 7-day period contains ${meals.length} recorded confirmations: ${meals.length - late} on time and ${late} late.`;
  }
  const match = /^late_(\d{2})(\d{2})$/.exec(item.id);
  if (!match) return item.text;
  const time = `${match[1]}:${match[2]}`;
  const atTime = meals.filter((meal) => meal.time === time);
  const late = atTime.filter((meal) => meal.status === 'taken_late').length;
  return `Reminders at ${time} have ${late} late confirmations out of ${atTime.length} recorded confirmations in this period.`;
}

export function weeklySummaryView(state, { embedded = false, allowLive = true, allowDemo = true } = {}) {
  const { mode, summary, consent, result, reviewed, busy, error, notice, aiModel, configuredModelName } = state;
  const demo = mode === 'demo';
  const dates = summary?.dates ?? [];
  const totals = summary?.totals ?? { confirmed: 0, onTime: 0, late: 0 };
  const days = summary?.days ?? [];
  const payload = summary?.hasData ? JSON.stringify(weeklyRequestData(summary), null, 2) : '';
  const contentTag = embedded ? 'section' : 'main';
  const sectionId = (name) => embedded ? `embedded-${name}` : name;
  const usedModel = !demo && result && typeof aiModel === 'string' && aiModel.trim() ? aiModel : null;
  const firstChoice = !demo && typeof configuredModelName === 'string' && configuredModelName.trim() ? configuredModelName : null;
  return `${embedded ? '<section class="week-root week-embedded" data-weekly-embedded="true">' : ''}${embedded ? '' : `<header class="week-header">
    <a href="index.html" class="week-brand"><img src="img/mascot.svg" alt="" width="44" height="44"> MedMind</a>
    <a href="caregiver.html">${tr('กลับหน้าผู้ดูแล', 'Back to caregiver')}</a>
  </header>`}
  <${contentTag} id="${sectionId('weekly-main')}"${embedded ? ' class="week-content"' : ''}>
    <p class="week-eyebrow">${tr('สำหรับผู้ดูแล · สรุปย้อนหลัง 7 วัน', 'For caregivers · Previous 7 days')}</p>
    <h1>${tr('ดูภาพรวมการยืนยัน<br>ในหนึ่งสัปดาห์', 'A week of<br>confirmation records')}</h1>
    <p class="covers">Covers: FR-09 · C-10</p>
    ${allowDemo || allowLive ? `<div class="week-mode" role="group" aria-label="${tr('แหล่งข้อมูล', 'Data source')}">
      ${allowDemo ? `<button type="button" data-action="demo" aria-pressed="${demo}">${tr('ข้อมูลตัวอย่าง', 'Sample records')}</button>` : ''}
      ${allowLive ? `<button type="button" data-action="live" aria-pressed="${!demo}" ${busy ? 'disabled' : ''}>${tr('ข้อมูลผู้ดูแลของฉัน', 'My caregiver records')}</button>` : ''}
    </div>` : ''}
    <p class="week-banner" role="note">${demo ? tr('โหมดสาธิต · ข้อมูลสมมติและผลสรุปจำลอง ไม่ส่งข้อมูลออก', 'Demo · Fictional records and a sample summary. Nothing is sent.') : tr('ข้อมูลของคู่ที่จับไว้บนเครื่องและเบราว์เซอร์นี้ · อ่านประวัติอย่างเดียว', 'Records for the pair linked on this device and browser · Read-only history')}</p>
    <p class="week-notice" role="status" aria-live="polite">${esc(displayMessage(notice ?? ''))}</p>
    ${error ? `<p class="week-error" role="alert">${esc(displayMessage(error))}</p>` : ''}
    <section class="week-card" aria-labelledby="${sectionId('week-range')}">
      <div class="week-section-head"><div><p class="week-eyebrow">${tr('ช่วงวันที่ของมื้อ', 'Meal date range')}</p><h2 id="${sectionId('week-range')}">${dates.length ? `${esc(weeklyDisplayDate(dates[0]))} – ${esc(weeklyDisplayDate(dates.at(-1)))}` : tr('ยังไม่ได้โหลดประวัติ', 'History not loaded')}</h2></div>
      <button class="week-secondary" type="button" data-action="refresh" ${busy ? 'disabled' : ''}>${tr('โหลดใหม่', 'Reload')}</button></div>
      <p>${tr('7 วันปฏิทินที่จบแล้วก่อนวันนี้ ไม่รวมมื้อของวันนี้', 'Seven complete calendar days before today. Today’s meals are excluded.')}</p>
      <div class="week-stats"><div><strong>${totals.confirmed}</strong><span>${tr('บันทึกยืนยัน', 'Recorded confirmations')}</span></div><div><strong>${totals.onTime}</strong><span>${tr('ยืนยันทันเวลา', 'On-time confirmations')}</span></div><div><strong>${totals.late}</strong><span>${tr('ยืนยันย้อนหลัง', 'Late confirmations')}</span></div></div>
      <p class="week-scope">${tr('นับเฉพาะบันทึกที่มีอยู่ วันไม่มีรายการยังบอกพฤติกรรมการกินยาไม่ได้ และยังคำนวณอัตรากินยาครบไม่ได้', 'Only existing records are counted. Days without records cannot establish medicine-taking behavior, and full adherence cannot be calculated.')}</p>
    </section>
    <section class="week-card" aria-labelledby="${sectionId('week-table-title')}"><h2 id="${sectionId('week-table-title')}">${tr('บันทึกที่ใช้สรุป', 'Records used for the summary')}</h2>
      <table class="week-table"><caption>${tr('เวลาเตือนและสถานะของแต่ละวัน', 'Reminder times and confirmation statuses by day')}</caption><thead><tr><th scope="col">${tr('วันที่', 'Date')}</th><th scope="col">${tr('บันทึกยืนยัน', 'Confirmation records')}</th></tr></thead><tbody>${days.map((day) => `<tr><th scope="row">${esc(weeklyDisplayDate(day.dateKey))}</th><td>${day.records.length ? `<ul class="week-records">${day.records.map((r) => `<li><time>${esc(r.reminderTime)}</time> <span class="week-label ${r.status === 'taken' ? 'is-on-time' : 'is-late'}">${r.status === 'taken' ? tr('ยืนยันทันเวลา', 'On time') : tr('ยืนยันย้อนหลัง', 'Late confirmation')}</span></li>`).join('')}</ul>` : `<span class="note">${tr('ไม่มีบันทึกยืนยัน', 'No confirmation records')}</span>`}</td></tr>`).join('')}</tbody></table>
      ${!summary?.hasData ? `<p class="week-empty">${tr('ยังไม่มีบันทึกยืนยันที่ใช้สรุปได้ในช่วงนี้ จึงยังไม่สร้างสรุป', 'There are no usable confirmation records in this period, so a summary cannot be created yet.')}</p>` : ''}
    </section>
    <section class="week-card" aria-labelledby="${sectionId('week-ai-title')}"><h2 id="${sectionId('week-ai-title')}">${demo ? tr('ลองสร้างสรุปจำลอง', 'Try a sample summary') : tr('ให้ AI ช่วยสรุป', 'Summarise with AI')}</h2>
      <div class="week-ai-info" id="${sectionId('week-ai-method')}">
        <p><strong>${tr('AI สำหรับข้อมูลจริง', 'AI for real records')}: Google Gemini</strong> · Firebase AI Logic</p>
        <p>${demo ? tr('โหมดสาธิตไม่เรียก Google Gemini และไม่ส่งข้อมูลให้บริการ AI แอปคำนวณตัวเลขและแสดงการเลือกข้อความจำลองจากประเด็นที่มีอยู่', 'Demo does not call Google Gemini or send records to an AI service. The app calculates the numbers and simulates selecting from the available facts.') : tr('ใช้ Google Gemini ผ่าน Firebase AI Logic เมื่อคุณยินยอมและกดสร้างร่าง แอปคำนวณตัวเลขจากบันทึกก่อน แล้วให้ AI เลือก 1–3 ประเด็นที่มีอยู่เท่านั้น ไม่สร้างตัวเลขใหม่และไม่ให้คำแนะนำเรื่องขนาดหรือวิธีกินยา', 'After you consent and create a draft, Google Gemini is accessed through Firebase AI Logic. The app calculates the numeric facts first; AI selects only 1–3 known facts. It cannot add numbers or give dosing advice.')}</p>
        ${firstChoice && !usedModel ? `<p class="week-model">${tr('โมเดลที่ตั้งค่าให้ลองก่อน (ยังไม่ใช่ผลยืนยันว่าเรียกสำเร็จ): ', 'Configured first choice (not a confirmed successful request): ')}<strong>${esc(firstChoice)}</strong></p>` : ''}
      </div>
      <p>${tr('สรุปเฉพาะรูปแบบการยืนยัน ไม่มีคำแนะนำยา โปรดตรวจเทียบกับตารางก่อนใช้', 'Only confirmation patterns are summarised. No medicine advice is given. Check against the table before use.')}</p>
      ${summary?.hasData ? `<details class="week-payload"><summary>${tr('ตรวจข้อมูลที่จะใช้สรุป', 'Review the summary input')}</summary><p>${tr('ลำดับวัน เวลาเตือน สถานะยืนยัน และประเด็นสรุปที่คำนวณจากข้อมูลนี้ ไม่มีชื่อ HN รายละเอียดยา หรือรหัสจับคู่', 'Day positions, reminder times, confirmation statuses, and facts calculated from these records. No names, HN, medicine details, or pairing codes.')}</p><pre>${esc(payload)}</pre></details>` : ''}
      <label class="week-consent"><input type="checkbox" data-action="consent" ${consent ? 'checked' : ''} ${busy || !summary?.hasData ? 'disabled' : ''}><span>${demo ? tr('ฉันตรวจข้อมูลตัวอย่างแล้ว', 'I have checked the sample records') : tr('ฉันตรวจข้อมูลแล้ว และยินยอมส่งเฉพาะข้อมูลข้างต้นให้ AI สรุป', 'I have checked these records and consent to sending only the data above to AI for a summary')}</span></label>
      <button type="button" class="week-primary" data-action="summarise" aria-describedby="${sectionId('week-ai-method')}" ${busy || !consent || !summary?.hasData ? 'disabled' : ''}>${busy ? tr('กำลังดำเนินการ…', 'Working…') : demo ? tr('สร้างสรุปจำลอง', 'Create sample summary') : tr('สร้างร่างสรุปด้วย AI', 'Create AI draft summary')}</button>
      ${result ? `<div class="week-result" role="status"><p class="week-eyebrow">${demo ? tr('ผลสรุปจำลอง', 'Sample summary') : tr('ร่างสรุปที่ AI เลือกประเด็น', 'AI-selected draft summary')} · ${reviewed ? tr('คุณตรวจแล้ว', 'Reviewed by you') : tr('รอคุณตรวจ', 'Waiting for your review')}</p>${usedModel ? `<p class="week-model">${tr('รุ่นที่ส่งคำขอสำเร็จ: ', 'Successful request model: ')}<strong>${esc(usedModel)}</strong></p>` : ''}<ul>${result.items.map((item) => `<li>${esc(weeklySummaryText(item, summary))}</li>`).join('')}</ul><p>${tr('สรุปจากบันทึกที่มีเท่านั้น ไม่ยืนยันการกินยาจริง', 'Based only on available confirmation records. This does not verify actual medicine use.')}</p><button type="button" data-action="review" class="week-secondary" ${reviewed ? 'disabled' : ''}>${reviewed ? tr('ตรวจเทียบตารางแล้ว', 'Compared with the table') : tr('ฉันตรวจเทียบกับตารางแล้ว', 'I have compared this with the table')}</button></div>` : ''}
    </section>
    ${demo && allowDemo ? `<button type="button" class="week-secondary" data-action="empty">${tr('ลองกรณีไม่มีข้อมูล', 'Try the empty-data example')}</button>` : ''}
    ${embedded ? `<p class="week-storage-note">${tr('ไม่บันทึกผลสรุปลงประวัติยา', 'Summaries are not saved to the medicine history.')}</p>` : ''}
  </${contentTag}>${embedded ? '</section>' : `<footer class="week-footer">MedMind · ${tr('ข้อมูลที่ใช้สรุปอยู่ในหน้านี้ ไม่บันทึกผลสรุปลงประวัติยา', 'Summary input is displayed on this page. Summaries are not saved to the medicine history.')}</footer>`}`;
}
