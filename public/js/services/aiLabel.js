// อ่านฉลากยาด้วย Gemini ผ่าน Firebase AI Logic (FR-02 ข้อ 1, 5 · ADR-3 · BR-04, BR-19) — ส่งเฉพาะรูปที่ปิดชื่อ/HN แล้ว (redact.js)
// เจ้าของ: Yar (FR-02) · สัญญา architecture §5.4 (ค): requestDraft(redactedImage) → Promise<aiJson> · ใช้ไม่ได้ → AiUnavailableError(reason)
// AI แค่ "ร่าง" — ผลถูกตรวจชนิดทุกช่องด้วย logic/labelDraft.js (buildDraft) และผู้ดูแลตรวจก่อนบันทึกทุกครั้ง · AI ไม่ตัดสินเวลาเตือนและไม่ให้คำแนะนำยา
// ส่วนที่ทดสอบด้วย node ได้: PROMPT, responseSchema, parseAiText, classifyError, createAiLabel (ใส่ model ปลอมได้)

/** ชื่อโมเดลของ Gemini Developer API (แพ็กฟรี) — ลองตามลำดับ ตัวแรกที่ใช้ได้ถูกจำไว้ใช้ต่อ
 *  วัดจริง 9 พ.ย. 2569 (ฉลากสมมติ ปิดแถบบนแล้ว · ปิดการ "คิด"): 3.6-flash ~3 วิ · 3.5-flash ~3 วิ · 3.5-flash-lite ~1–2 วิ — อ่านถูกครบทั้ง 3 ตัว
 *  ตัดออก: 3.8/3.7-flash (503 คนใช้เยอะ ค้างได้ถึง 72 วิ) · 2.5-flash-lite / 2.5-flash (404 ถูกถอน) · 3.1-flash-lite (~9 วิ)
 *  ถ้าชื่อใหม่ออก/ตัวเดิมถูกถอน แก้รายการนี้ที่เดียว */
export const AI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
export const AI_MODEL = AI_MODELS[0];
export const AI_REASONS = ['offline', 'service_down', 'quota', 'unreadable'];
export const AI_TIMEOUT_MS = 20_000;   // โมเดลหนึ่งตัวตอบช้ากว่านี้ = เลิกรอ ไปตัวถัดไป (ปกติ ~3 วิ · ตัวที่คนใช้เยอะค้างได้นาน)

/** รหัส/ข้อความจริงของข้อผิดพลาด (สั้น ๆ) ไว้แสดงให้ผู้ดูแล/ทีมแจ้งสาเหตุ — ไม่มีข้อมูลผู้ป่วย (เราไม่ส่งชื่อ/HN ไปอยู่แล้ว) */
export function errorDetail(error) {
  const cause = error?.cause ?? error;
  const raw = `${cause?.code ?? ''} ${cause?.status ?? ''} ${cause?.message ?? ''}`.replace(/\s+/g, ' ').trim();
  return raw.slice(0, 160);
}

export class AiUnavailableError extends Error {
  constructor(reason, cause) {
    super(`AI ใช้ไม่ได้: ${reason}`);
    this.name = 'AiUnavailableError';
    this.reason = AI_REASONS.includes(reason) ? reason : 'service_down';
    this.cause = cause;
    this.detail = cause ? errorDetail(cause) : '';   // รหัส/ข้อความจริง ไว้บอกทีมว่าพังเพราะอะไร (App Check, สิทธิ์, โควตา ฯลฯ)
  }
}

// คำสั่งถึง AI — ห้ามเดา, อ่านไม่ออก = null, ห้ามคืนชื่อผู้ป่วย/HN (NFR-09) — กติกาเดียวกับ architecture §5.4 (ก)
export const PROMPT = [
  'You read ONE Thai hospital medicine label photo. Some areas may be covered with black boxes on purpose (patient name, HN, barcode) — ignore them.',
  'Return JSON only, matching the schema. Never guess: if a value is not printed clearly on the label, use null.',
  'Never output patient name, HN, ID number, birth date, address or phone, even if visible.',
  'name = medicine name (and strength, e.g. 500 mg) exactly as printed.',
  'instructionText = how to take it, exactly as printed (Thai is fine). If the label has ข้อบ่งใช้ (what the medicine is for), add it at the end as "ข้อบ่งใช้: …".',
  'warnings = every printed คำเตือน, ข้อควรระวัง, ผลข้างเคียง and หมายเหตุ, copied as printed and joined with " · " — do not drop any; null only if none is printed.',
  'contraindications = printed ข้อห้ามใช้ / ห้ามใช้ text, or null. Copy text; never add your own advice.',
  'asNeeded = true only if the label says to take when needed (เมื่อมีอาการ / prn).',
  'slots = one entry per time of taking. meal: breakfast|lunch|dinner|bedtime, timing: after_meal|before_meal|at_bedtime,',
  'minutesBefore = number of minutes only when the label states it for before_meal, tabletsPerDose = whole number of tablets.',
  'If the label says "N times a day" without naming meals, return N slots with meal = null and timing = null.',
  'If the timing is not tied to meals (e.g. every 6 hours), return a slot with meal = null and timing = null.',
  'If "before meals" (ก่อนอาหาร) has no number of minutes, set minutesBefore = null — do not assume 15 or 30.',
  'If the dose unit is not a tablet or capsule (e.g. ซอง sachet, powder, ml, syrup), set tabletsPerDose = null.',
].join('\n');

/** โครง JSON ที่บังคับให้ AI คืน (สร้างด้วย Schema ของ firebase/ai) */
export function responseSchema(Schema) {
  const nullableString = () => Schema.string({ nullable: true });
  return Schema.object({
    properties: {
      name: nullableString(), instructionText: nullableString(), warnings: nullableString(), contraindications: nullableString(),
      asNeeded: Schema.boolean(),
      slots: Schema.array({
        items: Schema.object({
          properties: {
            meal: Schema.enumString({ enum: ['breakfast', 'lunch', 'dinner', 'bedtime'], nullable: true }),
            timing: Schema.enumString({ enum: ['after_meal', 'before_meal', 'at_bedtime'], nullable: true }),
            minutesBefore: Schema.integer({ nullable: true }),
            tabletsPerDose: Schema.integer({ nullable: true }),
          },
        }),
      }),
    },
  });
}

/** ข้อความที่ AI ตอบ → object (ไม่ใช่ JSON object = อ่านไม่ออก) — ความถูกต้องรายช่องตรวจต่อที่ buildDraft */
export function parseAiText(text) {
  let value;
  try { value = JSON.parse(String(text ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (error) { throw new AiUnavailableError('unreadable', error); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AiUnavailableError('unreadable');
  return value;
}

/** ข้อผิดพลาดจาก SDK/เครือข่าย → เหตุผลที่หน้าจอบอกผู้ดูแล (FR-02 ข้อ 5) */
export function classifyError(error, { online = true } = {}) {
  if (error instanceof AiUnavailableError) return error.reason;
  if (!online) return 'offline';
  const text = `${error?.code ?? ''} ${error?.status ?? ''} ${error?.message ?? ''}`.toLowerCase();
  // ใช้ขอบคำ (\b) — เดิมคำว่า "rate" ไปตรงกับ "generateContent" ทำให้ทุกข้อผิดพลาดถูกแจ้งว่า "โควตาหมด"
  if (/\b429\b|resource[_ ]?exhausted|\bquota\b|rate[_ -]?limit|too many requests/.test(text)) return 'quota';
  if (/failed to fetch|networkerror|network request failed|\boffline\b|err_internet_disconnected/.test(text)) return 'offline';
  if (/safety|blocked|no candidates|empty/.test(text)) return 'unreadable';
  return 'service_down';
}

/** ต้องเป็นภาพ JPEG ที่ redactImage สร้าง — อย่างอื่น (เช่นไฟล์ต้นฉบับ) ไม่ส่ง (BR-19) */
function assertRedactedJpeg(image) {
  if (!(image instanceof Blob) || image.type !== 'image/jpeg' || image.size === 0) throw new AiUnavailableError('unreadable', new TypeError('รับเฉพาะภาพ JPEG ที่ปิดข้อมูลแล้ว'));
}

const toBase64 = async (blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/** รอ promise ไม่เกิน ms — เกินเวลา = throw (code 'timeout' → แสดงเป็น "AI ใช้ไม่ได้") */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(`AI ตอบช้าเกิน ${Math.round(ms / 1000)} วินาที`), { code: 'timeout' })), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const errText = (error) => `${error?.code ?? ''} ${error?.status ?? ''} ${error?.message ?? ''}`;
// ลองโมเดลถัดไปได้เมื่อ: ไม่มีโมเดลนี้ (404) · คนใช้เยอะ/เซิร์ฟเวอร์ล่ม (5xx) · ตอบช้าเกินเวลา — ส่วนโควตาหมด/App Check/สิทธิ์ ลองตัวอื่นก็ไม่หาย
const tryNext = (error) => /\b404\b|not found|no longer available|has been retired|\b(500|502|503|504)\b|unavailable|overloaded|high demand|timeout/i.test(errText(error));
// โมเดลไม่รับค่า "ปิดการคิด" (400 เช่น flash-lite) → ลองโมเดลเดิมแบบไม่ส่งค่านี้
const rejectsFast = (error) => /\b400\b|invalid[_ ]argument|thinking/i.test(errText(error));

/**
 * @param {{ getModel: (name?: string, options?: { fast?: boolean }) => Promise<{ generateContent(parts: any[]): Promise<{ response: { text(): string } }> }>, isOnline?: () => boolean, models?: string[], timeoutMs?: number }} deps
 *   getModel = คืน GenerativeModel ของ Firebase AI Logic (หรือของปลอมในเทสต์) · fast = ปิดการ "คิด" ของโมเดล (เร็วขึ้น ~5 เท่า)
 */
export function createAiLabel({ getModel, isOnline = () => true, models = [undefined], timeoutMs = AI_TIMEOUT_MS }) {
  let good = null;              // ชื่อโมเดลที่ใช้ได้ (จำไว้ ครั้งหน้าลองตัวนี้ก่อน)
  const noFast = new Set();     // โมเดลที่ไม่รับค่าปิดการคิด (จำไว้ ไม่ส่งซ้ำ)

  /** เรียกโมเดลหนึ่งตัว (จำกัดเวลา) — ไม่รับค่าปิดการคิด → ลองตัวเดิมอีกครั้งแบบปกติ */
  async function generate(name, parts) {
    const call = async (fast) => withTimeout((await getModel(name, { fast })).generateContent(parts), timeoutMs);
    if (noFast.has(name)) return call(false);
    try {
      return await call(true);
    } catch (error) {
      if (!rejectsFast(error)) throw error;
      noFast.add(name);
      return call(false);
    }
  }

  return {
    /** รูปที่ปิดแล้ว (Blob JPEG) → aiJson · ไม่ส่งอะไรถ้าออฟไลน์ */
    async requestDraft(redactedImage) {
      if (!isOnline()) throw new AiUnavailableError('offline');
      assertRedactedJpeg(redactedImage);
      const data = await toBase64(redactedImage);
      const parts = [PROMPT, { inlineData: { data, mimeType: 'image/jpeg' } }];
      const order = good ? [good, ...models.filter((m) => m !== good)] : models;
      let lastError;
      for (const name of order) {
        try {
          const result = await generate(name, parts);
          good = name;
          return parseAiText(result.response.text());
        } catch (error) {
          if (error instanceof AiUnavailableError) throw error;
          lastError = error;
          if (!tryNext(error)) throw new AiUnavailableError(classifyError(error, { online: isOnline() }), error);   // โควตา/สิทธิ์ → ไม่ลองตัวอื่น
        }
      }
      throw new AiUnavailableError(classifyError(lastError, { online: isOnline() }), lastError);   // ทุกตัวใช้ไม่ได้
    },
  };
}

/** สร้างตัวอ่านฉลากจริงจากการเชื่อม Firebase (core/firebase.js) — โหลด SDK ของ AI เมื่อใช้ครั้งแรกเท่านั้น */
export function aiLabelFromFirebase(fb, { models = AI_MODELS, isOnline } = {}) {
  const cache = new Map();
  const getModel = async (name, { fast = false } = {}) => {
    // ไม่มีโทเคน App Check = Firebase AI Logic ปฏิเสธแน่นอน (401) → บอกสาเหตุทันที ไม่ต้องส่งภาพออกไปเปล่า ๆ
    if (!fb.appCheck) throw new AiUnavailableError('service_down', fb.appCheckError ?? new Error('App Check ยังไม่เริ่ม'));
    const key = `${name}|${fast}`;
    if (cache.has(key)) return cache.get(key);
    const ai = await import(`${fb.sdkBase}firebase-ai.js`);
    const instance = ai.getAI(fb.app, { backend: new ai.GoogleAIBackend() });
    const generationConfig = { responseMimeType: 'application/json', responseSchema: responseSchema(ai.Schema) };
    if (fast) generationConfig.thinkingConfig = { thinkingBudget: 0 };   // อ่านฉลากไม่ต้องให้โมเดลคิดนาน
    const model = ai.getGenerativeModel(instance, { model: name, generationConfig });
    cache.set(key, model);
    return model;
  };
  return createAiLabel({ getModel, isOnline, models });
}
