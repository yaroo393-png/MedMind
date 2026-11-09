import { getLanguage, initializeLanguage, languageControls, setLanguage, subscribeLanguage, tr } from './i18n.js';

const TEXT = {
  subtitle: ['ดูแลมื้อยาอย่างอุ่นใจ', 'A little peace of mind at medicine time'],
  welcome: ['วันนี้ เราค่อย ๆ ไปด้วยกันนะ', 'One step at a time, together.'],
  start: ['เริ่มใช้งาน ›', 'Get started ›'],
  disclaimer: ['MedMind ไม่ใช่คำแนะนำทางการแพทย์', 'MedMind does not provide medical advice.'],
  roleTitle: ['คุณใช้ MedMind ในฐานะใคร?', 'How will you use MedMind?'],
  senior: ['ผู้สูงอายุ', 'Older adult'],
  seniorDescription: ['ดูมื้อยา รับการเตือน และกดกินแล้ว', 'View scheduled doses, receive reminders, and confirm a dose.'],
  caregiver: ['ลูกหลาน / ผู้ดูแล', 'Family / caregiver'],
  caregiverDescription: ['เพิ่มยาและติดตามการยืนยันมื้อยา', 'Add medicines and follow dose confirmations.'],
  tryDemo: ['ลองโหมดสาธิต (ข้อมูลตัวอย่าง)', 'Try the demo (sample data)'],
  demoBanner: ['โหมดสาธิต — ข้อมูลตัวอย่างและนาฬิกาจำลอง ไม่ใช่ข้อมูลจริง ไม่ส่งข้อมูลออก', 'Demo — sample data and a simulated clock. No real patient data; nothing is sent.'],
  demoTitle: ['MedMind — ผู้สูงอายุและผู้ดูแลในหน้าเดียว', 'MedMind — older adult and caregiver together'],
  demoCovers: ['Covers: FR-01–FR-05 (ADR-8 Demo mode) · เดินครบทุก Must FR และทางที่ผิดได้ในเบราว์เซอร์เดียว', 'Covers: FR-01–FR-05 (ADR-8 Demo mode) · Explore core features and error cases in one browser.'],
  demoHelp: ['กดปุ่มเวลาจำลองเพื่อไปถึงเวลาเตือน แล้วลอง "กินแล้ว" / "ยังไม่กิน" ฝั่งซ้าย ดูผลฝั่งขวา · ', 'Advance the simulated clock, try “Taken” / “Not yet” on the left, and see updates on the right. · '],
  home: ['หน้าแรก', 'Home'],
  settings: ['ตั้งค่า', 'Settings'],
  seniorDevice: ['เครื่องผู้สูงอายุ', 'Older adult’s device'],
  caregiverDevice: ['เครื่องผู้ดูแล', 'Caregiver’s device'],
};
const TITLES = {
  entry: ['MedMind — ดูแลมื้อยาอย่างอุ่นใจ', 'MedMind — medicine reminders with peace of mind'],
  demo: ['โหมดสาธิต MedMind — ผู้สูงอายุและผู้ดูแลคู่กัน', 'MedMind demo — older adult and caregiver'],
  senior: ['MedMind — เครื่องผู้สูงอายุ', 'MedMind — older adult'],
  caregiver: ['MedMind — เครื่องผู้ดูแล', 'MedMind — caregiver'],
  weekly: ['MedMind — สรุปรายสัปดาห์', 'MedMind — weekly summary'],
};
let installed = false;
export function installLanguageUi() {
  initializeLanguage();
  if (installed) return;
  installed = true;
  const root = document.getElementById('page-language');
  if (root) root.innerHTML = languageControls();
  const update = () => {
    document.documentElement.lang = getLanguage();
    const title = TITLES[document.body.dataset.page];
    if (title) document.title = tr(...title);
    for (const node of document.querySelectorAll('[data-i18n]')) {
      const pair = TEXT[node.dataset.i18n];
      if (pair) node.textContent = tr(...pair);
    }
    for (const controls of document.querySelectorAll('.language-controls')) {
      controls.setAttribute('aria-label', tr('ภาษา', 'Language'));
      controls.querySelector('span').textContent = tr('ภาษา', 'Language');
      for (const button of controls.querySelectorAll('button[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === getLanguage()));
    }
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-language]');
    if (!button || button.disabled || button.closest('[inert]')) return;
    event.preventDefault();
    setLanguage(button.dataset.language);
  });
  subscribeLanguage(update);
  update();
}
