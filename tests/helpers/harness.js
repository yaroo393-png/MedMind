// ตัวช่วยเทสต์หน้าจอ (ไม่ใช่เทสต์เอง — ชื่อไม่ลงท้าย .test.js) · สร้างชุด Demo จริง (นาฬิกาจำลอง + localRepo + คิวออฟไลน์) แล้วประกอบ env แบบเดียวกับ phone.js
// ไม่แตะ DOM: เรียก screens (ฟังก์ชันล้วน) กับ actions (เรียก repo) ตรง ๆ แล้วตรวจผลเป็นข้อความ HTML / ข้อมูลใน repo
import { createDemoContext } from '../../public/js/features/demoControls.js';
import { loadSnapshot } from '../../public/js/features/model.js';
import { collectAlerts } from '../../public/js/features/alerts.js';
import { SCREENS, ACTIONS } from '../../public/js/features/phone.js';

export const MIN = 60 * 1000;

/** ชุด Demo ตามสถานการณ์ (ดู PRESETS ใน demoControls.js) */
export const makeCtx = (preset = 'sample') => createDemoContext(preset);

/** สถานะของจอ 1 เครื่อง — เก็บ ui / inbox / ข้อความ toast / route ระหว่างการกดหลายครั้ง */
export function makePhone(ctx, role, route) {
  const phone = { role, ctx, route, ui: { cover: {}, tick: false, codeInput: '', error: null, dialog: null, draft: null }, inbox: [], toasts: [], sound: false, pref: { size: 'normal', theme: 'light' }, timer: null, snap: null };
  const repo = () => (role === 'senior' ? ctx.seniorRepo : ctx.repo);
  phone.repo = repo;
  phone.load = async () => {
    if (role === 'senior' && !(await repo().getPairing())) await repo().createPairing({ seniorId: ctx.ids.seniorId });
    phone.snap = await loadSnapshot({ repo: repo(), clock: ctx.clock, dateKey: ctx.dateKey });
    if (role === 'caregiver' && ctx.flags.cgOpen && phone.snap.pairState === 'connected') phone.inbox = await collectAlerts({ repo: ctx.repo, snapshot: phone.snap, inbox: phone.inbox });
    return phone.snap;
  };
  /** วาดหน้าปัจจุบัน → { title, covers, body, overlay, tabs } */
  phone.view = async (name = phone.route, extra = {}) => {
    await phone.load();
    return SCREENS[name]({ role, snap: phone.snap, ui: phone.ui, pref: phone.pref, sound: phone.sound, inbox: phone.inbox, flags: ctx.flags, real: false, ctx, ...extra });
  };
  /** กดปุ่ม: เรียก action ที่ชื่อ act ด้วย env เหมือนใน phone.js */
  phone.act = async (act, data = {}) => {
    await phone.load();
    const env = {
      role, repo: repo(), clock: ctx.clock, ids: ctx.ids, flags: ctx.flags, ui: phone.ui, snap: phone.snap, inbox: phone.inbox,
      toast: (m) => phone.toasts.push(m), go: (r) => { phone.route = r; phone.ui.error = null; phone.ui.dialog = null; },
      later: (fn) => { phone.timer = fn; }, cancelLater: () => { phone.timer = null; },
      setFlag: (k, v) => { ctx.flags[k] = v; }, setInbox: (box) => { phone.inbox = box; }, unlockSound: () => { phone.sound = true; },
      onUnpaired: () => { phone.unpaired = true; },
      ai: null, photo: null, render: () => {},
      ...(phone.extraEnv ?? {}),
    };
    await ACTIONS[act](env, data);
    return phone.toasts.at(-1);
  };
  return phone;
}

/** ผู้สูงอายุ + ผู้ดูแลบนชุดข้อมูลเดียวกัน */
export async function makePair(preset = 'sample') {
  const ctx = await makeCtx(preset);
  return { ctx, senior: makePhone(ctx, 'senior', 'senior-reminder'), caregiver: makePhone(ctx, 'caregiver', 'cg-status') };
}

/** ข้อความล้วนจาก HTML (ตัดแท็ก) ใช้ตรวจว่าคำนั้นอยู่บนหน้า */
export const textOf = (html) => String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
