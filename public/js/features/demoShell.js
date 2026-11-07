// เปลือกของ demo.html (Demo mode, ADR-8): แถบนาฬิกาจำลอง + สถานการณ์ + จอผู้สูงอายุและผู้ดูแลคู่กัน ใช้ที่เก็บข้อมูลเดียวกัน (localRepo)
// เจ้าของ: Nichanan (E-5) · ไฟล์นี้แตะ DOM — ตรรกะของปุ่มต่าง ๆ อยู่ใน demoControls.js (ทดสอบด้วย node)
import { Phone } from './phone.js';
import { PRESETS, createDemoContext, advance, jumpNextReminder, jumpAtDeadline, jumpPastDeadline, setClockTo, setSeniorOnline } from './demoControls.js';
import { fmtHMSms } from './format.js';
import { esc } from './ui.js';

const MIN = 60 * 1000;

function toolbarHtml() {
  return '<div class="clockbar" role="group" aria-label="นาฬิกาจำลองและสถานการณ์">' +
    '<span>เวลาจำลอง</span><span class="time" id="tb-time">--:--:--.---</span>' +
    '<button type="button" class="tb" data-tb="m1">+1 นาที</button><button type="button" class="tb" data-tb="m5">+5 นาที</button>' +
    '<button type="button" class="tb" data-tb="m15">+15 นาที</button><button type="button" class="tb" data-tb="ms1">+1 มิลลิวินาที</button>' +
    '<button type="button" class="tb" data-tb="next">ไปเวลาเตือนถัดไป</button><button type="button" class="tb" data-tb="edge">ไป T+15 พอดี</button>' +
    '<button type="button" class="tb" data-tb="late">ไปหลัง T+15 (1 มิลลิวินาที)</button></div>' +
    '<form class="clockbar" id="tb-form" novalidate><label for="tb-set">ตั้งเวลาจำลอง</label>' +
    '<input type="text" id="tb-set" class="tb-input" inputmode="numeric" autocomplete="off" placeholder="12:00:00.000" aria-describedby="tb-msg">' +
    '<button type="submit" class="tb">ไปที่เวลา</button><span id="tb-msg" class="note" role="status">รูปแบบ HH:MM · HH:MM:SS · HH:MM:SS.mmm (เดินหน้าอย่างเดียว)</span></form>' +
    '<div class="clockbar"><label><input type="checkbox" id="tb-off"> ผู้สูงอายุออฟไลน์</label>' +
    '<label><input type="checkbox" id="tb-sr"> ผู้สูงอายุปิดหน้า MedMind</label><label><input type="checkbox" id="tb-cg"> ผู้ดูแลปิดหน้า MedMind</label>' +
    '<label><input type="checkbox" id="tb-ai"> AI ใช้ไม่ได้</label>' +
    `<label>สถานการณ์ <select id="tb-preset">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join('')}</select></label>` +
    '<button type="button" class="tb" data-tb="preset">ใช้สถานการณ์นี้</button></div>';
}

/** เริ่ม Demo mode ในหน้า demo.html — query ?preset=reminding เปิดสถานการณ์ตรง ๆ */
export async function bootDemo({ toolbar, seniorEl, caregiverEl, presetName }) {
  toolbar.innerHTML = toolbarHtml();
  const $ = (id) => toolbar.querySelector(id);
  const senior = new Phone(seniorEl, { role: 'senior', ctx: null, route: 'senior-reminder' });
  const caregiver = new Phone(caregiverEl, { role: 'caregiver', ctx: null, route: 'cg-status' });
  let ctx = null, unsubs = [];

  const refresh = () => { senior.render(); caregiver.render(); syncBar(); };
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
  $('#tb-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('#tb-msg'), input = $('#tb-set');
    const r = setClockTo(ctx, input.value);
    if (r.ok) { msg.textContent = `ไปที่ ${fmtHMSms(r.ms)} แล้ว`; input.setAttribute('aria-invalid', 'false'); refresh(); return; }
    msg.textContent = r.reason === 'back' ? `ย้อนเวลาไม่ได้ (เวลาตอนนี้ ${fmtHMSms(ctx.clock.now())}) — เลือก "สถานการณ์" แล้วกด "ใช้สถานการณ์นี้" เพื่อเริ่มใหม่` : 'รูปแบบไม่ถูกต้อง — พิมพ์เช่น 12:00 หรือ 12:00:00.001';
    input.setAttribute('aria-invalid', 'true'); input.focus();
  });
  $('#tb-off').addEventListener('change', async (e) => { await setSeniorOnline(ctx, !e.target.checked); refresh(); });
  $('#tb-sr').addEventListener('change', (e) => { ctx.flags.seniorOpen = !e.target.checked; refresh(); });
  $('#tb-cg').addEventListener('change', (e) => { ctx.flags.cgOpen = !e.target.checked; refresh(); });
  $('#tb-ai').addEventListener('change', (e) => { ctx.flags.aiProblem = e.target.checked ? 'down' : ''; refresh(); });

  await start(PRESETS[presetName] ? presetName : 'sample');
  return { senior, caregiver, get ctx() { return ctx; }, start };
}
