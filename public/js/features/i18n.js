// UI language only. No translation service, patient data, or database writes.
let language = 'th';
let initialized = false;
const listeners = new Set();
const KEY = 'mm-language';
const uiMessages = new Map();

export const getLanguage = () => language;
export function tr(thai, english) {
  // Only explicit UI pairs are registered. Never run this over user/medicine data.
  if (typeof thai === 'string' && typeof english === 'string') {
    uiMessages.set(thai, [thai, english]);
    uiMessages.set(english, [thai, english]);
    while (uiMessages.size > 2000) uiMessages.delete(uiMessages.keys().next().value);
  }
  return language === 'en' ? english : thai;
}
export function localizeUiMessage(value) {
  const pair = uiMessages.get(value);
  return pair ? pair[language === 'en' ? 1 : 0] : value;
}

export function initializeLanguage(storage) {
  if (initialized) return language;
  initialized = true;
  try { language = (storage ?? globalThis.localStorage)?.getItem(KEY) === 'en' ? 'en' : 'th'; } catch { language = 'th'; }
  return language;
}

export function setLanguage(next, { persist = true } = {}) {
  if (next !== 'th' && next !== 'en') return false;
  if (persist) { try { globalThis.localStorage?.setItem(KEY, next); } catch { /* Language still works for this page. */ } }
  if (language === next) return false;
  language = next;
  for (const listener of [...listeners]) listener(language);
  return true;
}

export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function languageControls() {
  return `<nav class="language-controls" aria-label="${tr('ภาษา', 'Language')}"><span>${tr('ภาษา', 'Language')}</span><button type="button" data-language="th" aria-pressed="${language === 'th'}" lang="th">ไทย</button><button type="button" data-language="en" aria-pressed="${language === 'en'}" lang="en">English</button></nav>`;
}
