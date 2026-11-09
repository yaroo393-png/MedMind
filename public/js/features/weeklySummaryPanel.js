// Embedded caregiver route. The controller factory comes from the current app context.
import { tr } from './i18n.js';

export const screens = {
  'cg-weekly'(model) {
    return {
      title: tr('สรุปรายสัปดาห์', 'Weekly summary'),
      covers: 'FR-09 · C-10',
      body: model.weeklyHtml ?? `<p class="hint" role="status">${tr('กำลังเปิดสรุปรายสัปดาห์…', 'Opening the weekly summary…')}</p>`,
    };
  },
};
