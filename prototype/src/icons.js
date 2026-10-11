/*
 * ไอคอนเส้นชุดเดียวของ MedMind (วาดเอง, เส้นหนา 2, ใช้สีตามตัวอักษร) + มาสคอตเม็ดยา
 * ใช้: Icons.svg('clock', 22)
 */
(function (root) {
  'use strict';
  const P = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pill: '<path d="M10.5 3.5a5 5 0 0 1 7.07 7.07l-7.07 7.07a5 5 0 0 1-7.07-7.07z"/><path d="M7 7l7 7"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
    signal: '<path d="M4 18v-2M9 18v-5M14 18v-8M19 18V6"/>',
    battery: '<rect x="3" y="8" width="16" height="8" rx="2"/><path d="M21 11v2"/><rect x="5" y="10" width="10" height="4" fill="currentColor" stroke="none"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
    sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  };
  function svg(name, size, cls) {
    const s = size || 22;
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  // มาสคอต: เม็ดยาแคปซูลยิ้ม (ครึ่งเขียวอมฟ้า ครึ่งขาว)
  function mascot(size) {
    const s = size || 72;
    return '<svg class="mascot" width="' + s + '" height="' + s + '" viewBox="0 0 80 80" aria-hidden="true">' +
      '<g transform="rotate(-28 40 40)">' +
      '<rect x="10" y="24" width="60" height="32" rx="16" fill="#FFFFFF" stroke="#1F3A5F" stroke-width="3"/>' +
      '<path d="M40 24h14a16 16 0 0 1 0 32H40z" fill="#0F766E" stroke="#1F3A5F" stroke-width="3"/>' +
      '<circle cx="24" cy="38" r="2.6" fill="#1F3A5F"/><circle cx="33" cy="38" r="2.6" fill="#1F3A5F"/>' +
      '<path d="M24 45q4.5 4 9 0" fill="none" stroke="#1F3A5F" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="21" cy="44" rx="2.6" ry="1.6" fill="#FDA4AF"/><ellipse cx="36" cy="44" rx="2.6" ry="1.6" fill="#FDA4AF"/>' +
      '</g></svg>';
  }
  // ตัวละครการ์ตูนที่ทีมวาดเอง (ชุดเดียวกับ design canvas) — viewBox ต่อคน 160×170
  const LINE = ' stroke="#4A2E22" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const puffs = (cs) => '<g fill="#FFFFFF" stroke-width="7">' + cs + '</g><g fill="#FFFFFF" stroke="none">' + cs + '</g>';
  const circles = (list) => list.map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; }).join('');
  const glasses = (y) => '<circle cx="63" cy="' + y + '" r="15" fill="#FFFFFF" fill-opacity="0.3" stroke="#5B3A29" stroke-width="3.5"/>' +
    '<circle cx="97" cy="' + y + '" r="15" fill="#FFFFFF" fill-opacity="0.3" stroke="#5B3A29" stroke-width="3.5"/>' +
    '<path d="M78 ' + (y - 1) + 'q2-3 4 0M48 ' + (y - 2) + 'l-9-3M112 ' + (y - 2) + 'l9-3" fill="none" stroke="#5B3A29" stroke-width="3.5"/>' +
    '<path d="M56 ' + (y + 3) + 'q7-8 14 0M90 ' + (y + 3) + 'q7-8 14 0" fill="none"/>' +
    '<ellipse cx="50" cy="' + (y + 17) + '" rx="7" ry="4" fill="#F7A1A1" stroke="none"/><ellipse cx="110" cy="' + (y + 17) + '" rx="7" ry="4" fill="#F7A1A1" stroke="none"/>' +
    '<path d="M68 ' + (y + 15) + 'q12 22 24 0z" fill="#E2403A"/>';
  const SHIRT = (fill) => '<path d="M36 170c2-24 20-36 44-36s42 12 44 36z" fill="' + fill + '"/>';
  const GRANDPA = '<g' + LINE + '>' + SHIRT('#FFC93C') + '<path d="M68 136l12 10l12-10" fill="none"/>' +
    puffs(circles([[36, 80, 15], [30, 100, 14], [36, 118, 10], [124, 80, 15], [130, 100, 14], [124, 118, 10]])) +
    '<ellipse cx="38" cy="102" rx="8" ry="10" fill="#FCDCC8"/><ellipse cx="122" cy="102" rx="8" ry="10" fill="#FCDCC8"/>' +
    '<ellipse cx="80" cy="92" rx="43" ry="48" fill="#FCDCC8"/>' +
    '<ellipse cx="102" cy="58" rx="8" ry="4" fill="#FFFFFF" stroke="none" transform="rotate(-25 102 58)"/>' +
    '<path d="M64 74q16-6 32 0M68 82q12-4 24 0" fill="none" stroke="#D49A84" stroke-width="2"/>' + glasses(100) + '</g>';
  const GRANDMA = '<g' + LINE + '>' + SHIRT('#FFC93C') + '<path d="M68 136l12 10l12-10" fill="none"/>' +
    puffs(circles([[44, 64, 20], [62, 44, 22], [88, 38, 24], [114, 48, 22], [128, 72, 18], [34, 88, 16], [130, 94, 14], [30, 110, 12], [131, 114, 11]])) +
    '<ellipse cx="38" cy="100" rx="7" ry="9" fill="#FCDCC8"/><ellipse cx="122" cy="100" rx="7" ry="9" fill="#FCDCC8"/>' +
    '<ellipse cx="80" cy="96" rx="42" ry="40" fill="#FCDCC8"/>' +
    puffs(circles([[56, 62, 14], [78, 56, 16], [101, 60, 15], [117, 72, 10]])) + glasses(98) + '</g>';
  const CARER = '<g' + LINE + '>' + SHIRT('#2EC4C4') + '<path d="M66 136q14 12 28 0" fill="none"/>' +
    '<path d="M32 96c0-34 20-56 48-56s48 22 48 56v30c0 8-10 10-16 4H48c-6 6-16 4-16-4z" fill="#3B2A20"/>' +
    '<ellipse cx="80" cy="98" rx="40" ry="38" fill="#FCDCC8"/>' +
    '<path d="M40 94c0-30 18-46 40-46s40 16 40 46c-8-12-22-20-36-22c-8 10-26 18-44 22z" fill="#3B2A20"/>' +
    '<ellipse cx="64" cy="104" rx="4.5" ry="6" fill="#3B2A20" stroke="none"/><ellipse cx="96" cy="104" rx="4.5" ry="6" fill="#3B2A20" stroke="none"/>' +
    '<circle cx="65.5" cy="101.5" r="1.6" fill="#FFFFFF" stroke="none"/><circle cx="97.5" cy="101.5" r="1.6" fill="#FFFFFF" stroke="none"/>' +
    '<ellipse cx="52" cy="116" rx="7" ry="4" fill="#F7A1A1" stroke="none"/><ellipse cx="108" cy="116" rx="7" ry="4" fill="#F7A1A1" stroke="none"/>' +
    '<path d="M71 116q9 12 18 0z" fill="#E2403A"/></g>';
  const HEART = '<path d="M136 152c-6-5-12-9-12-15a6 6 0 0 1 12-2a6 6 0 0 1 12 2c0 6-6 10-12 15z" fill="#FF6B7A" stroke="#4A2E22" stroke-width="3"/>';
  const art = (w, h, vb, body, label) => '<svg class="art" width="' + w + '" height="' + h + '" viewBox="' + vb + '"' +
    (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '>' + body + '</svg>';
  // คุณตา + คุณยาย
  function couple(w, label) { return art(w, Math.round(w * 170 / 290), '0 0 290 170', GRANDPA + '<g transform="translate(130 0)">' + GRANDMA + '</g>', label); }
  // ลูกหลานผู้ดูแล
  function carer(w, label) { return art(w, Math.round(w * 170 / 160), '0 0 160 170', CARER + HEART, label); }
  // รูปโปรไฟล์วงกลม: 'senior' = คุณยาย, 'caregiver' = ลูกหลาน
  function avatar(kind, size) {
    return '<span class="avatar">' + (kind === 'senior'
      ? art(size, size, '22 26 116 116', GRANDMA) : art(size, size, '20 34 120 120', CARER)) + '</span>';
  }
  root.Icons = { svg: svg, mascot: mascot, couple: couple, carer: carer, avatar: avatar };
})(this);
