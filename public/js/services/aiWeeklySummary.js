// FR-09: ให้ AI เลือกประเด็นจากข้อเท็จจริงที่คำนวณแล้ว ไม่แสดงข้อความอิสระหรือตัวเลขที่ AI แต่งขึ้น
// เพิ่มแยกจากงานอ่านฉลากเดิม: ส่งเฉพาะลำดับวัน เวลาเตือน และสถานะยืนยัน (ไม่มีวันที่จริง/รหัสคู่/ชื่อ/HN/รายละเอียดยา)
import { toWeeklyAiPayload } from '../logic/weeklySummary.js';
import { AI_MODELS, AiUnavailableError, classifyError } from './aiLabel.js';
import { cleanPayload as cleanFactsPayload, summaryChoices as factsChoices, weeklyRequestData as factsRequestData } from './weeklySummaryFacts.js';

export const WEEKLY_PROMPT = [
  'Select 1 to 3 informative facts for a Thai caregiver from the supplied candidates only.',
  'Return JSON only: {"selectedIds":["candidate_id"]}. Use distinct candidate ids exactly as supplied.',
  'Prefer the overview and then the most useful time-specific late-confirmation patterns.',
  'The days are relative positions in a seven-day period. Empty days mean no confirmation records, not failed or missed doses.',
  'Do not write new text, numbers, interpretations, medicine advice, or additional JSON properties.',
].join('\n');

const unavailable = (reason, code = reason) => {
  // ไม่แนบ cause/detail จาก SDK เพราะอาจมี URL หรือรายละเอียดภายใน; หน้าจอแปล reason/code เป็นข้อความเอง
  const error = new AiUnavailableError(reason);
  error.code = code;
  return error;
};

// คงชนิด error ของ API เดิม ส่วน facts ที่หน้าจอ/Demo ใช้ไม่มี dependency ต่อบริการ AI
const withAiError = (fn, value) => {
  try { return fn(value); }
  catch (error) {
    if (error?.code === 'invalid_data') throw unavailable('unreadable', 'invalid_data');
    throw error;
  }
};
const cleanPayload = (payload) => withAiError(cleanFactsPayload, payload);

/** ข้อความที่อนุญาตให้แสดง: คำนวณจาก payload ใหม่เสมอ ไม่เชื่อตัวเลขสรุปหรือข้อความที่แนบมา */
export function summaryChoices(payload) {
  return withAiError(factsChoices, payload);
}

/** ชุดข้อมูลจริงที่จะส่ง แบ่งปันกับหน้าตรวจข้อมูลเพื่อให้ preview ตรงคำขอ */
export function weeklyRequestData(summary) {
  return withAiError(factsRequestData, summary);
}

/** รับเฉพาะรหัสที่รู้จัก 1–3 รหัส; ข้อความบนหน้าจอมาจาก choices ในเครื่องเท่านั้น */
export function parseWeeklySelection(text, choices) {
  let value;
  try {
    if (typeof text !== 'string' || text.length > 8192) throw new Error();
    value = JSON.parse(text.trim());
  } catch { throw unavailable('unreadable', 'invalid_response'); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'selectedIds')) throw unavailable('unreadable', 'invalid_response');
  const ids = value.selectedIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length) throw unavailable('unreadable', 'invalid_response');
  const known = new Map(choices.map((item) => [item.id, item.text]));
  if (ids.some((id) => typeof id !== 'string' || !known.has(id))) throw unavailable('unreadable', 'invalid_response');
  const items = ids.map((id) => ({ id, text: known.get(id) }));
  return { items, text: items.map((item) => item.text).join('\n') };
}

/** Schema ของ Firebase AI Logic — enum จำกัดเฉพาะประเด็นที่มีจริงในข้อมูลรอบนี้ */
export function weeklySelectionSchema(Schema, choices) {
  return Schema.object({ properties: { selectedIds: Schema.array({ items: Schema.enumString({ enum: choices.map((item) => item.id) }) }) } });
}

const isNotFound = (error) => {
  const status = Number(error?.status ?? error?.code);
  if (Number.isInteger(status) && status >= 400 && status <= 599) return status === 404;
  // ไม่ใช้แค่คำว่า "not found" เพราะข้อความของ 401/403 ก็อาจมีคำนี้
  return /\b404\b/.test(String(error?.message ?? ''));
};

/**
 * getModel(name, choices) คืน model ของ Firebase หรือของจำลองในเทสต์
 * deadline ครอบทั้งการโหลด model และ fallback ทุกครั้ง; SDK ที่ส่งคำขอไปแล้วอาจทำงานต่อ แต่ผลเก่าถูกทิ้งและไม่เริ่ม fallback ต่อ
 */
export function createAiWeeklySummary({ getModel, isOnline = () => true, models = AI_MODELS, timeoutMs = 15000 }) {
  if (typeof getModel !== 'function' || typeof isOnline !== 'function') throw new TypeError('ต้องส่ง getModel และ isOnline ที่เป็นฟังก์ชัน');
  if (!Array.isArray(models) || models.length === 0 || models.some((name) => typeof name !== 'string' || !name)) throw new TypeError('ต้องมีชื่อโมเดลอย่างน้อย 1 ชื่อ');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs ต้องเป็นจำนวนบวก');
  const names = [...new Set(models)];
  let good = null;
  return {
    // ชื่อโมเดลที่ใช้ร้องขอและตรวจคำตอบสำเร็จล่าสุด ไม่ใช่เวอร์ชันที่บริการ resolve จาก alias
    get lastModel() { return good; },
    async summariseWeek(summary) {
      let payload;
      try { payload = cleanPayload(toWeeklyAiPayload(summary)); }
      catch (error) { throw unavailable('unreadable', error instanceof RangeError ? 'no_data' : 'invalid_data'); }
      if (!payload.days.some((day) => day.meals.length)) throw unavailable('unreadable', 'no_data');
      if (!isOnline()) throw unavailable('offline');
      const requestData = weeklyRequestData(summary);
      const choices = requestData.candidates;
      const parts = [WEEKLY_PROMPT, JSON.stringify(requestData)];
      const order = good ? [good, ...names.filter((name) => name !== good)] : names;
      const token = { expired: false };
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => { token.expired = true; reject(unavailable('service_down', 'timeout')); }, timeoutMs);
      });
      const run = async () => {
        for (const name of order) {
          if (token.expired) throw unavailable('service_down', 'timeout');
          if (!isOnline()) throw unavailable('offline');
          try {
            // ส่งสำเนาให้ factory; ไม่เปิดให้ factory เปลี่ยนชุดข้อความที่จะใช้แสดงผล
            const model = await getModel(name, choices.map((item) => ({ ...item })));
            if (token.expired) throw unavailable('service_down', 'timeout');
            const result = await model.generateContent(parts);
            if (token.expired) throw unavailable('service_down', 'timeout');
            const selection = parseWeeklySelection(result.response.text(), summaryChoices(payload));
            good = name;
            return selection;
          } catch (error) {
            if (token.expired) throw unavailable('service_down', 'timeout');
            if (error instanceof AiUnavailableError) throw unavailable(error.reason, error.code ?? error.reason);
            if (!isNotFound(error)) throw unavailable(classifyError(error, { online: isOnline() }));
          }
        }
        throw unavailable('service_down');
      };
      try { return await Promise.race([run(), deadline]); }
      finally { clearTimeout(timer); }
    },
  };
}

/** ใช้ Firebase/SDK เดิม โหลดเมื่อกดสร้างสรุปเท่านั้น ไม่มี API key หรือบริการใหม่ */
export function aiWeeklySummaryFromFirebase(fb, { models = AI_MODELS, isOnline, timeoutMs } = {}) {
  let sdkPromise;
  let instance;
  const cache = new Map();
  const getModel = async (name, choices) => {
    const key = `${name}|${choices.map((item) => item.id).join(',')}`;
    if (cache.has(key)) return cache.get(key);
    sdkPromise ??= import(`${fb.sdkBase}firebase-ai.js`);
    let ai;
    try { ai = await sdkPromise; }
    catch (error) { sdkPromise = undefined; throw error; }
    instance ??= ai.getAI(fb.app, { backend: new ai.GoogleAIBackend() });
    const model = ai.getGenerativeModel(instance, { model: name, generationConfig: { responseMimeType: 'application/json', responseSchema: weeklySelectionSchema(ai.Schema, choices) } });
    cache.set(key, model);
    return model;
  };
  return createAiWeeklySummary({ getModel, isOnline, models, timeoutMs });
}
