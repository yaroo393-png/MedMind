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
  root.Icons = { svg: svg, mascot: mascot };
})(this);
