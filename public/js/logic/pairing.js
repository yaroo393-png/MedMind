// FR-01 จับคู่ผู้สูงอายุกับผู้ดูแล — ตรรกะล้วน (ไม่แตะ DOM / Firebase · ไม่เรียก Date.now() และไม่สุ่มเอง)
// เจ้าของ: Takkan · สัญญา architecture §5.5 (DL-20) · BR-01, BR-02, BR-17 · NFR-04, NFR-05
// สำคัญ: บน Firebase ผู้ตัดสินจริงคือ Security Rules — joinCheck ใช้เลือกข้อความให้ผู้ใช้ และใช้ใน localRepo (Demo mode)
import { MINUTE_MS } from './time.js';

export const INVITE_TTL_MIN = 10;          // รหัสใช้ได้ 10 นาที (BR-01)
const CODE_SPACE = 1_000_000;              // รหัส 6 หลัก 000000–999999

/**
 * สร้างรหัสเชิญใหม่ → { code, expiresAt, usedAt: null }
 * randomInt(n) ต้องคืนจำนวนเต็ม 0…n−1 จาก crypto.getRandomValues (รหัสเป็นกุญแจเข้าถึงข้อมูลสุขภาพ — ห้ามใช้ Math.random)
 */
export function makeInvite({ now, randomInt }) {
  if (!Number.isFinite(now)) throw new TypeError('now ต้องเป็นเวลา ms');
  const n = randomInt(CODE_SPACE);
  if (!Number.isInteger(n) || n < 0 || n >= CODE_SPACE) throw new RangeError('randomInt ต้องคืนจำนวนเต็ม 0…999999');
  return { code: String(n).padStart(6, '0'), expiresAt: now + INVITE_TTL_MIN * MINUTE_MS, usedAt: null };
}

// รหัสที่ผู้ดูแลพิมพ์/สแกน: ตัดช่องว่าง ต้องเป็นตัวเลข 6 หลักพอดี
function normalizeCode(entered) {
  const code = String(entered ?? '').replace(/\s+/g, '');
  return /^\d{6}$/.test(code) ? code : null;
}

/**
 * ตรวจว่าผู้ดูแลใช้รหัสนี้จับคู่ได้ไหม → { ok: true } | { ok: false, reason }
 * invite = เอกสารรหัสปัจจุบัน { code, expiresAt, usedAt, consented, hasCaregiver } หรือ null (ไม่พบรหัส)
 * ลำดับตรวจ (DL-20): wrong_code → already_has_caregiver → expired → already_used → not_consented
 *   "มีผู้ดูแลแล้ว" มาก่อน "หมดอายุ/ใช้แล้ว" เพราะผู้ดูแลคนที่สองมักใช้รหัสเก่า แต่ต้องได้ข้อความของ FR-01 ข้อ 5
 */
export function joinCheck({ now, invite, enteredCode }) {
  const code = normalizeCode(enteredCode);
  if (!invite || code === null || code !== invite.code) return { ok: false, reason: 'wrong_code' };   // ข้อ 4
  if (invite.hasCaregiver) return { ok: false, reason: 'already_has_caregiver' };                    // ข้อ 5
  if (now > invite.expiresAt) return { ok: false, reason: 'expired' };                              // ข้อ 4 — "เกิน" 10 นาที (ตรง 10:00 ยังใช้ได้)
  if (invite.usedAt !== null && invite.usedAt !== undefined) return { ok: false, reason: 'already_used' }; // ข้อ 4
  if (!invite.consented) return { ok: false, reason: 'not_consented' };                             // ข้อ 2
  return { ok: true };                                                                               // ข้อ 3
}

/** สถานะของคู่ — ใช้เลือกหน้าจอ (FR-01 ข้อ 1, 3) */
export function pairingState(pair) {
  if (!pair?.consentAt) return 'waiting_consent';
  if (!pair.caregiverId) return 'waiting_caregiver';
  return 'connected';
}
