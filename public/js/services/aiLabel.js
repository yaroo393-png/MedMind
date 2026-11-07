// อ่านฉลากยาด้วย Gemini ผ่าน Firebase AI Logic (FR-02 ข้อ 1, 5 · ADR-3 · BR-04, BR-19) — ส่งเฉพาะรูปที่ปิดชื่อ/HN แล้ว (redact.js)
// เจ้าของ: Yar (FR-02) · สัญญา architecture §5.4 (ค): requestDraft(redactedImage) → Promise<aiJson> · ใช้ไม่ได้ → AiUnavailableError(reason)
// AI แค่ "ร่าง" — ผลถูกตรวจชนิดทุกช่องด้วย logic/labelDraft.js (buildDraft) และผู้ดูแลตรวจก่อนบันทึกทุกครั้ง · AI ไม่ตัดสินเวลาเตือนและไม่ให้คำแนะนำยา
// ส่วนที่ทดสอบด้วย node ได้: PROMPT, responseSchema, parseAiText, classifyError, createAiLabel (ใส่ model ปลอมได้)

/** ชื่อโมเดลของ Gemini Developer API (แพ็กฟรี) — ถ้าคอนโซลแจ้งว่าเลิกใช้ ให้เปลี่ยนที่นี่ที่เดียว */
export const AI_MODEL = 'gemini-2.5-flash';
export const AI_REASONS = ['offline', 'service_down', 'quota', 'unreadable'];

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
  'name = medicine name as printed. instructionText = the dosage instruction text exactly as printed (Thai is fine).',
  'warnings / contraindications = as printed, or null. asNeeded = true only if the label says to take when needed (เมื่อมีอาการ / prn).',
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

const toBase64 = async (blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/**
 * @param {{ getModel: () => Promise<{ generateContent(parts: any[]): Promise<{ response: { text(): string } }> }>, isOnline?: () => boolean }} deps
 *   getModel = คืน GenerativeModel ของ Firebase AI Logic (หรือของปลอมในเทสต์)
 */
export function createAiLabel({ getModel, isOnline = () => true }) {
  return {
    /** รูปที่ปิดแล้ว (Blob JPEG) → aiJson · ไม่ส่งอะไรถ้าออฟไลน์ */
    async requestDraft(redactedImage) {
      if (!isOnline()) throw new AiUnavailableError('offline');
      try {
        const model = await getModel();
        const result = await model.generateContent([PROMPT, { inlineData: { data: await toBase64(redactedImage), mimeType: redactedImage.type || 'image/jpeg' } }]);
        return parseAiText(result.response.text());
      } catch (error) {
        throw error instanceof AiUnavailableError ? error : new AiUnavailableError(classifyError(error, { online: isOnline() }), error);
      }
    },
  };
}

/** สร้างตัวอ่านฉลากจริงจากการเชื่อม Firebase (core/firebase.js) — โหลด SDK ของ AI เมื่อใช้ครั้งแรกเท่านั้น */
export function aiLabelFromFirebase(fb, { model = AI_MODEL, isOnline } = {}) {
  let cached = null;
  const getModel = async () => {
    if (cached) return cached;
    const ai = await import(`${fb.sdkBase}firebase-ai.js`);
    const instance = ai.getAI(fb.app, { backend: new ai.GoogleAIBackend() });
    cached = ai.getGenerativeModel(instance, { model, generationConfig: { responseMimeType: 'application/json', responseSchema: responseSchema(ai.Schema) } });
    return cached;
  };
  return createAiLabel({ getModel, isOnline });
}
