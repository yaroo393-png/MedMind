// ตรวจว่าไม่มีความลับ / ไฟล์ต้องห้ามถูก track ใน Git (PDPA + Week 9)
// รัน: npm run check:secrets   (CI รันให้ทุก push / PR)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);

// 1) path ที่ห้ามมีใน repo
const forbiddenPath = [
  /(^|\/)\.env($|\.)/,            // .env, .env.local (ยกเว้น .env.example ด้านล่าง)
  /(^|\/)test-labels\//,          // รูปฉลากยาจริง
  /(^|\/)private\//,              // โฟลเดอร์เก็บของส่วนตัว
  /serviceAccount.*\.json$/i,     // Firebase / Google service account
  /\.pem$/i,
];
// 2) รูปแบบความลับในเนื้อไฟล์ (ไม่รวม Firebase web apiKey ซึ่งเป็นค่าสาธารณะ)
const secretText = [
  { name: 'private key', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'service account', re: /"private_key"\s*:/ },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'Anthropic key', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'AWS key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Gemini/Google API key assigned to a secret name', re: /(GEMINI|GOOGLE_AI|AI_STUDIO)[A-Z_]*KEY\s*[=:]\s*['"]?AIza/ },
];

const problems = [];
for (const f of files) {
  if (/\.env\.example$/.test(f)) continue;
  if (forbiddenPath.some((re) => re.test(f))) problems.push(`ไฟล์ต้องห้าม: ${f}`);
  if (/\.(png|jpe?g|gif|webp|pdf|docx|zip)$/i.test(f)) continue; // ไม่สแกนไฟล์ไบนารี
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (f === 'scripts/check-secrets.js') continue; // ไฟล์นี้มีรูปแบบอยู่ในตัวเอง
  for (const { name, re } of secretText) {
    if (re.test(text)) problems.push(`พบรูปแบบ ${name} ใน ${f}`);
  }
}

if (problems.length) {
  console.error('❌ check:secrets ไม่ผ่าน\n' + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log(`✅ check:secrets ผ่าน (ตรวจ ${files.length} ไฟล์)`);
