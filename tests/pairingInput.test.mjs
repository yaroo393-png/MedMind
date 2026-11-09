// ตรวจ regression กับโมดูลที่อยู่ใน Site copy จริง ใช้ localRepo ในหน่วยความจำ ไม่แตะ Firebase หรือคู่ของทีม
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoContext } from '../public/js/features/demoControls.js';
import { screens, actions } from '../public/js/features/pairing.js';
import { createLocalRepo } from '../public/js/core/repo.js';
import { loadSnapshot } from '../public/js/features/model.js';
import { joinCheck, makeInvite, pairingState } from '../public/js/logic/pairing.js';
import { JOIN_TEXT } from '../public/js/features/format.js';

async function fresh(inviteNumber) {
  const ctx = await createDemoContext('fresh');
  // กรณีเลขศูนย์นำหน้าใช้ repo จริงตัวเดิม แต่กำหนดตัวสุ่มของ fixture เพื่อไม่พึ่งความบังเอิญ
  const repo = inviteNumber === undefined ? ctx.repo : createLocalRepo({ clock: ctx.clock, randomInt: () => inviteNumber });
  const { invite } = await repo.createPairing({ seniorId: ctx.ids.seniorId });
  const messages = [], ui = { codeInput: '', error: null, dialog: null };
  const env = { repo, clock: ctx.clock, ids: ctx.ids, ui, toast: (message) => messages.push(message) };
  const view = async (route = 'cg-pair') => screens[route]({
    snap: await loadSnapshot({ repo, clock: ctx.clock, dateKey: ctx.dateKey }), ui,
    real: true, ctx, pref: { size: 'normal', theme: 'light' }, sound: false,
  });
  return { ctx, repo, invite, messages, ui, env, view };
}

test('รหัสบนจอผู้สูงอายุแบบ 3+3 วางลงช่องผู้ดูแลได้ครบ และ join ด้วย localRepo จริงสำเร็จ', async () => {
  const { repo, invite, ui, env, view } = await fresh();
  const grouped = `${invite.code.slice(0, 3)} ${invite.code.slice(3)}`;
  const senior = await view('senior-pair');
  assert.ok(senior.body.includes(`aria-label="รหัส 6 หลัก">${grouped}</p>`));
  ui.codeInput = grouped;
  const input = /<input\b[^>]*data-live="codeInput"[^>]*>/.exec((await view()).body)?.[0];
  assert.ok(input, 'หน้าจอต้องมีช่องรหัสที่ใช้งานจริง');
  assert.match(input, /dir="ltr"/);
  assert.ok(Number(/maxlength="(\d+)"/.exec(input)?.[1]) >= grouped.length, 'ช่องต้องรับรหัสที่เว้นวรรคตามจอผู้สูงอายุได้ครบ');
  assert.ok(input.includes(`value="${grouped}"`));
  await actions.consent(env);
  await actions.join(env);
  const result = await repo.getPairing();
  assert.equal(result.pair.caregiverId, env.ids.caregiverId);
  assert.equal(result.invite.usedBy, env.ids.caregiverId);
  assert.equal(pairingState(result.pair), 'connected');
  assert.equal(ui.error, null);
  assert.equal(ui.codeInput, '');
});

test('เลขศูนย์นำหน้าคงอยู่ทั้งตอนแสดง กรอก และจับคู่ ไม่ถูกแปลงเป็นตัวเลขสามหลัก', async () => {
  const { repo, invite, ui, env, view } = await fresh(424);
  assert.equal(invite.code, '000424');
  assert.ok((await view('senior-pair')).body.includes('>000 424</p>'));
  ui.codeInput = '000 424';
  assert.ok((await view()).body.includes('value="000 424"'));
  await actions.consent(env);
  await actions.join(env);
  const result = await repo.getPairing();
  assert.equal(result.invite.code, '000424');
  assert.equal(result.pair.caregiverId, env.ids.caregiverId);
  assert.equal(ui.error, null);
});

test('เลขเจ็ดหลักหรือรหัสที่ปนตัวอักษรถูกปฏิเสธ ไม่ตัดเหลือหกหลักแล้วจับคู่ให้', async () => {
  const { ctx, repo, invite, ui, env, view, messages } = await fresh(656424);
  await actions.consent(env);
  const before = await repo.getPairing();
  for (const invalid of ['6564247', '0656424', '656b424', '656a24']) {
    ui.codeInput = invalid;
    assert.ok((await view()).body.includes(`value="${invalid}"`), 'หน้าจอไม่ควรแอบตัดข้อมูลให้กลายเป็นรหัสอื่น');
    assert.deepEqual(joinCheck({ now: ctx.clock.now(), invite: before.invite, enteredCode: invalid }), { ok: false, reason: 'wrong_code' });
    await actions.join(env);
    assert.equal(ui.error, JOIN_TEXT.wrong_code);
    assert.equal(ui.codeInput, invalid);
    assert.deepEqual(await repo.getPairing(), before, 'รหัสผิดต้องไม่เปลี่ยนคู่หรือใช้รหัสเชิญ');
  }
  assert.equal(invite.code, '656424');
  assert.deepEqual(messages, []);
});

test('flow เดิมยังต้องยินยอมก่อน join รหัสหกหลักธรรมดา และการยินยอมซ้ำไม่เปลี่ยนเวลารับรอง', async () => {
  const { ctx, repo, invite, ui, env } = await fresh(123456);
  ui.codeInput = invite.code;
  await actions.join(env);
  let result = await repo.getPairing();
  assert.equal(ui.error, JOIN_TEXT.not_consented);
  assert.equal(result.pair.caregiverId, null);
  assert.equal(result.invite.usedAt, null);
  ctx.clock.advance(1000);
  await actions.consent(env);
  const consentAt = (await repo.getPairing()).pair.consentAt;
  ctx.clock.advance(1000);
  await actions.consent(env);
  assert.equal((await repo.getPairing()).pair.consentAt, consentAt);
  await actions.join(env);
  result = await repo.getPairing();
  assert.equal(ui.error, null);
  assert.equal(result.pair.caregiverId, env.ids.caregiverId);
  assert.equal(result.pair.consentAt, consentAt);
  assert.equal(result.invite.usedAt, ctx.clock.now());
  const connectedBeforeSecondJoin = structuredClone(result);
  await actions['join-second'](env);
  assert.equal(ui.error, JOIN_TEXT.already_has_caregiver);
  assert.deepEqual(await repo.getPairing(), connectedBeforeSecondJoin);
});

test('ตัวตรวจรหัสยังเก็บ leading zero รับช่องว่าง และปฏิเสธเจ็ดหลัก/ตัวอักษรแม้ prefix หกหลักถูกต้อง', () => {
  const now = 1000;
  const invite = { ...makeInvite({ now, randomInt: () => 0 }), consented: true, hasCaregiver: false };
  assert.equal(invite.code, '000000');
  for (const enteredCode of ['000000', '000 000']) assert.deepEqual(joinCheck({ now, invite, enteredCode }), { ok: true });
  for (const enteredCode of ['0000000', '000 0000', '000a000', '00000', '']) assert.deepEqual(joinCheck({ now, invite, enteredCode }), { ok: false, reason: 'wrong_code' });
});
