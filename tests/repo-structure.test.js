// ตรวจโครง repo และเอกสารที่ M4 ต้องการ — กันไฟล์สำคัญหายโดยไม่ตั้งใจ
// เทสต์ของฟีเจอร์ (logic ของแต่ละ FR) ให้เจ้าของงานเพิ่มเป็นไฟล์ <ชื่อ>.test.js ในโฟลเดอร์นี้
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mustExist = [
  'README.md', 'CLAUDE.md', 'RULES.md', '.gitignore',
  'docs/01-charter/M1-Charter_MedMind.pdf',
  'docs/01-charter/charter.md',
  'docs/02-requirements/M2-SRS_MedMind.pdf',
  'docs/02-requirements/spec.md',
  'docs/02-requirements/backlog.md',
  'docs/03-design/architecture.md',
  'docs/03-design/design-system.md',
  'docs/TRACEABILITY.md',
  'docs/AI_USAGE_LOG.md',
  'docs/PROJECT-PLAN.md',
  'docs/05-report/final-report.md',
  'docs/05-report/ai-use-statement.md',
  'docs/06-presentation/demo-slides.md',
  '.github/pull_request_template.md',
];
for (const f of mustExist) {
  test(`มีไฟล์ ${f}`, () => assert.ok(existsSync(f), `ไม่พบ ${f}`));
}

const frs = ['FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-05'];
const frDirs = {
  'FR-01': 'fr/FR-01-pairing', 'FR-02': 'fr/FR-02-label-scan', 'FR-03': 'fr/FR-03-reminder',
  'FR-04': 'fr/FR-04-confirm', 'FR-05': 'fr/FR-05-caregiver-status',
};
for (const fr of frs) {
  test(`${fr}: มี README ของผู้รับผิดชอบ`, () => assert.ok(existsSync(`${frDirs[fr]}/README.md`)));
  test(`${fr}: อยู่ใน docs/TRACEABILITY.md`, () => {
    assert.match(readFileSync('docs/TRACEABILITY.md', 'utf8'), new RegExp(`## ${fr}\\b`));
  });
  test(`${fr}: อยู่ใน README.md`, () => {
    assert.ok(readFileSync('README.md', 'utf8').includes(fr));
  });
}
