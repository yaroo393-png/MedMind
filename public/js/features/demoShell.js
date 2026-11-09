// เปลือกของ demo.html (Demo mode, ADR-8): แถบนาฬิกาจำลอง + สถานการณ์ + จอผู้สูงอายุและผู้ดูแลคู่กัน ใช้ที่เก็บข้อมูลเดียวกัน (localRepo)
// เจ้าของ: Nichanan (E-5) · ไฟล์นี้แตะ DOM — ตรรกะของปุ่มต่าง ๆ อยู่ใน demoControls.js (ทดสอบด้วย node)
import { Phone } from './phone.js';
import { PRESETS, createDemoContext, advance, jumpNextReminder, jumpAtDeadline, jumpPastDeadline, setClockTo, setSeniorOnline } from './demoControls.js';
import { fmtHMSms } from './format.js';
import { esc } from './ui.js';
import { initializeLanguage, localizeUiMessage, subscribeLanguage, tr } from './i18n.js';
import { bootWeeklySummaryController } from './weeklySummaryController.js';

const MIN = 60 * 1000;

function toolbarHtml() {
  const englishPresets = { fresh: 'Start fresh (not paired, no medicines)', sample: 'Sample data 06:40 (paired)', reminding: '07:00 — two doses due together', round2: '07:10 — third reminder (T+10)', notconfirmed: '07:16 — past T+15, unconfirmed', late: '07:40 — record a late confirmation', offline: '07:05 — older adult offline', syncdelay: '06:59 — confirm offline on time, sync later (FR-04/05)' };
  return `<div class="clockbar" role="group" aria-label="${tr('นาฬิกาจำลองและสถานการณ์', 'Simulated clock and scenarios')}">
    <span>${tr('เวลาจำลอง', 'Simulated time')}</span><span class="time" id="tb-time">--:--:--.---</span>
    <button type="button" class="tb" data-tb="m1">${tr('+1 นาที', '+1 minute')}</button><button type="button" class="tb" data-tb="m5">${tr('+5 นาที', '+5 minutes')}</button>
    <button type="button" class="tb" data-tb="m15">${tr('+15 นาที', '+15 minutes')}</button><button type="button" class="tb" data-tb="ms1">${tr('+1 มิลลิวินาที', '+1 millisecond')}</button>
    <button type="button" class="tb" data-tb="next">${tr('ไปเวลาเตือนถัดไป', 'Next reminder')}</button><button type="button" class="tb" data-tb="edge">${tr('ไป T+15 พอดี', 'Exactly T+15')}</button>
    <button type="button" class="tb" data-tb="late">${tr('ไปหลัง T+15 (1 มิลลิวินาที)', 'After T+15 (1 millisecond)')}</button></div>
    <form class="clockbar" id="tb-form" novalidate><label for="tb-set">${tr('ตั้งเวลาจำลอง', 'Set simulated time')}</label>
    <input type="text" id="tb-set" class="tb-input" inputmode="numeric" autocomplete="off" placeholder="12:00:00.000" aria-describedby="tb-msg">
    <button type="submit" class="tb">${tr('ไปที่เวลา', 'Go to time')}</button><span id="tb-msg" class="note" role="status">${tr('รูปแบบ HH:MM · HH:MM:SS · HH:MM:SS.mmm (เดินหน้าอย่างเดียว)', 'Format HH:MM · HH:MM:SS · HH:MM:SS.mmm (forward only)')}</span></form>
    <div class="clockbar"><label><input type="checkbox" id="tb-off"> ${tr('ผู้สูงอายุออฟไลน์', 'Older adult offline')}</label>
    <label><input type="checkbox" id="tb-sr"> ${tr('ผู้สูงอายุปิดหน้า MedMind', 'Older adult page closed')}</label><label><input type="checkbox" id="tb-cg"> ${tr('ผู้ดูแลปิดหน้า MedMind', 'Caregiver page closed')}</label>
    <label><input type="checkbox" id="tb-ai"> ${tr('AI ใช้ไม่ได้', 'AI unavailable')}</label>
    <label>${tr('สถานการณ์', 'Scenario')} <select id="tb-preset">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(tr(p.label, englishPresets[k]))}</option>`).join('')}</select></label>
    <button type="button" class="tb" data-tb="preset">${tr('ใช้สถานการณ์นี้', 'Use scenario')}</button></div>`;
}

/** เริ่ม Demo mode ในหน้า demo.html — query ?preset=reminding เปิดสถานการณ์ตรง ๆ */
export async function bootDemo({ toolbar, seniorEl, caregiverEl, presetName }) {
  initializeLanguage();
  toolbar.innerHTML = toolbarHtml();
  const $ = (id) => toolbar.querySelector(id);
  const senior = new Phone(seniorEl, { role: 'senior', ctx: null, route: 'senior-reminder' });
  const caregiver = new Phone(caregiverEl, { role: 'caregiver', ctx: null, route: 'cg-status' });
  let ctx = null, unsubs = [];

  const refresh = () => { senior.render(); caregiver.render(); syncBar(); };
  subscribeLanguage(() => {
    const inputValue = $('#tb-set')?.value ?? '';
    const selectedPreset = $('#tb-preset')?.value;
    const status = $('#tb-msg')?.textContent;
    const invalid = $('#tb-set')?.getAttribute('aria-invalid');
    toolbar.innerHTML = toolbarHtml();
    $('#tb-set').value = inputValue;
    if (selectedPreset) $('#tb-preset').value = selectedPreset;
    if (invalid) $('#tb-set').setAttribute('aria-invalid', invalid);
    if (status) $('#tb-msg').textContent = localizeUiMessage(status);
    if (ctx) refresh();
  });
  function syncBar() {
    if (!ctx) return;
    $('#tb-time').textContent = fmtHMSms(ctx.clock.now());
    $('#tb-off').checked = !ctx.queue.isOnline();
    $('#tb-sr').checked = !ctx.flags.seniorOpen;
    $('#tb-cg').checked = !ctx.flags.cgOpen;
    $('#tb-ai').checked = Boolean(ctx.flags.aiProblem);
  }

  async function start(name) {
    unsubs.forEach((u) => u());
    ctx = await createDemoContext(name);
    ctx.createWeeklySummary = ({ draw }) => bootWeeklySummaryController({ draw, clock: ctx.clock, initialMode: 'demo', viewOptions: { embedded: true, allowLive: false } });
    ctx.refresh = refresh;
    ctx.onUnpaired = () => { // ยกเลิกจับคู่ → ทั้งสองเครื่องกลับหน้าจับคู่ และกล่องแจ้งเตือนถูกล้าง (BR-17)
      senior.bind(ctx, 'senior-pair'); caregiver.bind(ctx, 'cg-pair');
    };
    unsubs = [ctx.repo.watch(refresh), ctx.clock.subscribe(refresh)];
    senior.bind(ctx, ctx.name === 'fresh' ? 'senior-pair' : 'senior-reminder');
    caregiver.bind(ctx, ctx.name === 'fresh' ? 'cg-pair' : 'cg-status');
    $('#tb-preset').value = ctx.name;
    refresh();
  }

  toolbar.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-tb]'); if (!b || !ctx) return;
    const k = b.dataset.tb;
    if (k === 'm1') advance(ctx, MIN);
    else if (k === 'm5') advance(ctx, 5 * MIN);
    else if (k === 'm15') advance(ctx, 15 * MIN);
    else if (k === 'ms1') advance(ctx, 1);
    else if (k === 'next') await jumpNextReminder(ctx);
    else if (k === 'edge') await jumpAtDeadline(ctx);
    else if (k === 'late') await jumpPastDeadline(ctx);
    else if (k === 'preset') await start($('#tb-preset').value);
    refresh();
  });
  toolbar.addEventListener('submit', (e) => {
    if (e.target.id !== 'tb-form') return;
    e.preventDefault();
    const msg = $('#tb-msg'), input = $('#tb-set');
    const r = setClockTo(ctx, input.value);
    if (r.ok) { msg.textContent = tr(`ไปที่ ${fmtHMSms(r.ms)} แล้ว`, `Time set to ${fmtHMSms(r.ms)}`); input.setAttribute('aria-invalid', 'false'); refresh(); return; }
    msg.textContent = r.reason === 'back' ? tr(`ย้อนเวลาไม่ได้ (เวลาตอนนี้ ${fmtHMSms(ctx.clock.now())}) — เลือก "สถานการณ์" แล้วกด "ใช้สถานการณ์นี้" เพื่อเริ่มใหม่`, `Cannot go backwards (current time ${fmtHMSms(ctx.clock.now())}). Choose a scenario and press “Use scenario” to restart.`) : tr('รูปแบบไม่ถูกต้อง — พิมพ์เช่น 12:00 หรือ 12:00:00.001', 'Invalid format — try 12:00 or 12:00:00.001');
    input.setAttribute('aria-invalid', 'true'); input.focus();
  });
  toolbar.addEventListener('change', async (e) => {
    if (!ctx) return;
    if (e.target.id === 'tb-off') await setSeniorOnline(ctx, !e.target.checked);
    else if (e.target.id === 'tb-sr') ctx.flags.seniorOpen = !e.target.checked;
    else if (e.target.id === 'tb-cg') ctx.flags.cgOpen = !e.target.checked;
    else if (e.target.id === 'tb-ai') ctx.flags.aiProblem = e.target.checked ? 'down' : '';
    else return;
    refresh();
  });

  await start(PRESETS[presetName] ? presetName : 'sample');
  return { senior, caregiver, get ctx() { return ctx; }, start };
}
