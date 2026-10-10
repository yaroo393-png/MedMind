/*
 * readLabel adapter แบบจำลอง (ADR-03) — prototype ไม่ได้อ่านรูปจริง
 * แต่ละ "ฉลากตัวอย่าง" คืนร่างแบบที่ผู้ให้บริการอ่านฉลากจะคืน: ช่องที่อ่านไม่ได้เป็นค่าว่าง (BR-04)
 * ชื่อยาเป็นชื่อสมมติ ใช้สาธิตเท่านั้น
 */
(function (root) {
  'use strict';
  const SAMPLES = [
    { id: 'clear', label: 'ฉลากชัด — "หลังอาหารเช้า"', covers: 'FR-02 ✓1, ✓6',
      result: { ok: true, draft: { name: 'ยาตัวอย่าง A', tabletsPerDose: 1, timing: { type: 'after', meal: 'breakfast' },
        warnings: 'อาจทำให้ง่วงซึม', contraindications: 'ห้ามใช้ร่วมกับแอลกอฮอล์' } } },
    { id: 'before30', label: 'ฉลาก "ก่อนอาหารเช้า 30 นาที"', covers: 'FR-02 ✓8',
      result: { ok: true, draft: { name: 'ยาตัวอย่าง B', tabletsPerDose: 1, timing: { type: 'before', meal: 'breakfast', minutes: 30 },
        warnings: '', contraindications: '' } } },
    { id: 'bedtime', label: 'ฉลาก "ก่อนนอน"', covers: 'FR-02 ✓9',
      result: { ok: true, draft: { name: 'ยาตัวอย่าง C', tabletsPerDose: 2, timing: { type: 'bedtime' },
        warnings: '', contraindications: '' } } },
    { id: 'blurry', label: 'ฉลากเบลอ — อ่านชื่อยาไม่ได้', covers: 'FR-02 ✗3',
      result: { ok: true, draft: { name: '', tabletsPerDose: 1, timing: { type: 'after', meal: 'dinner' },
        warnings: '', contraindications: '' } } },
    { id: 'noMinutes', label: 'ฉลาก "ก่อนอาหาร" ไม่ระบุนาที', covers: 'FR-02 ✗10',
      result: { ok: true, draft: { name: 'ยาตัวอย่าง D', tabletsPerDose: 1, timing: { type: 'before', meal: 'lunch', minutes: '' },
        warnings: '', contraindications: '' } } },
    { id: 'asNeeded', label: 'ฉลาก "ทานเมื่อมีอาการ"', covers: 'FR-02 ✗4',
      result: { ok: true, draft: { name: 'ยาตัวอย่าง E', tabletsPerDose: 1, timing: { type: 'asNeeded' },
        warnings: '', contraindications: '' } } },
    { id: 'fail', label: 'อ่านรูปไม่ได้ / ผู้ให้บริการล่ม', covers: 'FR-02 ✗5',
      result: { ok: false } },
  ];
  function readLabel(sampleId) {
    const s = SAMPLES.find(function (x) { return x.id === sampleId; });
    return s ? JSON.parse(JSON.stringify(s.result)) : { ok: false };
  }
  root.ReadLabelMock = { SAMPLES: SAMPLES, readLabel: readLabel };
})(this);
