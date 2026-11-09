// C-10: ตาราง 7 วัน + ร่างสรุป ใช้ token/ตัวช่วย escape เดิม ไม่แก้หน้าของเพื่อน
import { esc } from './ui.js';
import { thaiDate } from './format.js';
import { weeklyRequestData } from '../services/aiWeeklySummary.js';

export function weeklySummaryView(state) {
  const { mode, summary, consent, result, reviewed, busy, error, notice } = state;
  const demo = mode === 'demo';
  const dates = summary?.dates ?? [];
  const totals = summary?.totals ?? { confirmed: 0, onTime: 0, late: 0 };
  const days = summary?.days ?? [];
  const payload = summary?.hasData ? JSON.stringify(weeklyRequestData(summary), null, 2) : '';
  return `<header class="week-header">
    <a href="index.html" class="week-brand"><img src="img/mascot.svg" alt="" width="44" height="44"> MedMind</a>
    <a href="caregiver.html">กลับหน้าผู้ดูแล</a>
  </header>
  <main id="weekly-main">
    <p class="week-eyebrow">สำหรับผู้ดูแล · สรุปย้อนหลัง 7 วัน</p>
    <h1>ดูภาพรวมการยืนยัน<br>ในหนึ่งสัปดาห์</h1>
    <p class="covers">Covers: FR-09 · C-10</p>
    <div class="week-mode" role="group" aria-label="แหล่งข้อมูล">
      <button type="button" data-action="demo" aria-pressed="${demo}">ข้อมูลตัวอย่าง</button>
      <button type="button" data-action="live" aria-pressed="${!demo}" ${busy ? 'disabled' : ''}>ข้อมูลผู้ดูแลของฉัน</button>
    </div>
    ${demo ? '<p class="week-banner" role="note">โหมดสาธิต · ข้อมูลสมมติและผลสรุปจำลอง ไม่ส่งข้อมูลออก</p>' : '<p class="week-banner" role="note">ข้อมูลของคู่ที่จับไว้บนเครื่องและเบราว์เซอร์นี้ · อ่านประวัติอย่างเดียว</p>'}
    <p class="week-notice" role="status" aria-live="polite">${esc(notice ?? '')}</p>
    ${error ? `<p class="week-error" role="alert">${esc(error)}</p>` : ''}
    <section class="week-card" aria-labelledby="week-range">
      <div class="week-section-head"><div><p class="week-eyebrow">ช่วงวันที่ของมื้อ</p><h2 id="week-range">${dates.length ? `${esc(thaiDate(dates[0]))} – ${esc(thaiDate(dates.at(-1)))}` : 'ยังไม่ได้โหลดประวัติ'}</h2></div>
      <button class="week-secondary" type="button" data-action="refresh" ${busy ? 'disabled' : ''}>โหลดใหม่</button></div>
      <p>7 วันปฏิทินที่จบแล้วก่อนวันนี้ ไม่รวมมื้อของวันนี้</p>
      <div class="week-stats"><div><strong>${totals.confirmed}</strong><span>บันทึกยืนยัน</span></div><div><strong>${totals.onTime}</strong><span>ยืนยันทันเวลา</span></div><div><strong>${totals.late}</strong><span>ยืนยันย้อนหลัง</span></div></div>
      <p class="week-scope">นับเฉพาะบันทึกที่มีอยู่ วันไม่มีรายการยังบอกพฤติกรรมการกินยาไม่ได้ และยังคำนวณอัตรากินยาครบไม่ได้</p>
    </section>
    <section class="week-card" aria-labelledby="week-table-title"><h2 id="week-table-title">บันทึกที่ใช้สรุป</h2>
      <table class="week-table"><caption>เวลาเตือนและสถานะของแต่ละวัน</caption><thead><tr><th scope="col">วันที่</th><th scope="col">บันทึกยืนยัน</th></tr></thead><tbody>${days.map((day) => `<tr><th scope="row">${esc(thaiDate(day.dateKey))}</th><td>${day.records.length ? `<ul class="week-records">${day.records.map((r) => `<li><time>${esc(r.reminderTime)}</time> <span class="week-label ${r.status === 'taken' ? 'is-on-time' : 'is-late'}">${r.status === 'taken' ? 'ยืนยันทันเวลา' : 'ยืนยันย้อนหลัง'}</span></li>`).join('')}</ul>` : '<span class="note">ไม่มีบันทึกยืนยัน</span>'}</td></tr>`).join('')}</tbody></table>
      ${!summary?.hasData ? '<p class="week-empty">ยังไม่มีบันทึกยืนยันที่ใช้สรุปได้ในช่วงนี้ จึงยังไม่สร้างสรุป</p>' : ''}
    </section>
    <section class="week-card" aria-labelledby="week-ai-title"><h2 id="week-ai-title">${demo ? 'ลองสร้างสรุปจำลอง' : 'ให้ AI ช่วยสรุป'}</h2>
      <p>สรุปเฉพาะรูปแบบการยืนยัน ไม่มีคำแนะนำยา โปรดตรวจเทียบกับตารางก่อนใช้</p>
      ${summary?.hasData ? `<details class="week-payload"><summary>ตรวจข้อมูลที่จะใช้สรุป</summary><p>ลำดับวัน เวลาเตือน สถานะยืนยัน และประเด็นสรุปที่คำนวณจากข้อมูลนี้ ไม่มีชื่อ HN รายละเอียดยา หรือรหัสจับคู่</p><pre>${esc(payload)}</pre></details>` : ''}
      <label class="week-consent"><input type="checkbox" data-action="consent" ${consent ? 'checked' : ''} ${busy || !summary?.hasData ? 'disabled' : ''}><span>${demo ? 'ฉันตรวจข้อมูลตัวอย่างแล้ว' : 'ฉันตรวจข้อมูลแล้ว และยินยอมส่งเฉพาะข้อมูลข้างต้นให้ AI สรุป'}</span></label>
      <button type="button" class="week-primary" data-action="summarise" ${busy || !consent || !summary?.hasData ? 'disabled' : ''}>${busy ? 'กำลังดำเนินการ…' : demo ? 'สร้างสรุปจำลอง' : 'สร้างร่างสรุปด้วย AI'}</button>
      ${result ? `<div class="week-result" role="status"><p class="week-eyebrow">${demo ? 'ผลสรุปจำลอง' : 'ร่างสรุปที่ AI เลือกประเด็น'} · ${reviewed ? 'คุณตรวจแล้ว' : 'รอคุณตรวจ'}</p><ul>${result.items.map((item) => `<li>${esc(item.text)}</li>`).join('')}</ul><p>สรุปจากบันทึกที่มีเท่านั้น ไม่ยืนยันการกินยาจริง</p><button type="button" data-action="review" class="week-secondary" ${reviewed ? 'disabled' : ''}>${reviewed ? 'ตรวจเทียบตารางแล้ว' : 'ฉันตรวจเทียบกับตารางแล้ว'}</button></div>` : ''}
    </section>
    ${demo ? '<button type="button" class="week-secondary" data-action="empty">ลองกรณีไม่มีข้อมูล</button>' : ''}
  </main><footer class="week-footer">MedMind · ข้อมูลที่ใช้สรุปอยู่ในหน้านี้ ไม่บันทึกผลสรุปลงประวัติยา</footer>`;
}
