// ─── Rooms ───────────────────────────────────────────────
export const ROOMS = [
  { id: 'r1' }, { id: 'r2' }, { id: 'r3' }, { id: 'r4' }, { id: 'r5' },
];

// ─── Season ──────────────────────────────────────────────
export const SEASON_START = '2026-06-15';
export const SEASON_END   = '2026-09-15';

// ─── Cascade Pricing ─────────────────────────────────────
export const TIERS = [
  { label: 'Tier 1', deadline: '2026-05-20' },
  { label: 'Tier 2', deadline: '2026-07-01' },
  { label: 'Tier 3', deadline: null },
];

export const RATES = [
  { '1-2': 200, '3-5': 185, '6+': 170 },
  { '1-2': 270, '3-5': 265, '6+': 255 },
  { '1-2': 320, '3-5': 305, '6+': 290 },
];

// ─── Design Tokens ───────────────────────────────────────
export const FONTS = {
  heading: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono:    "'Courier New', Courier, monospace",
};

export const COLORS = {
  bg:      '#F5F3ED',
  fg:      '#000',
  muted:   '#999',
  border:  '#e0dcd0',
  rose:    '#E91E7A',
  roseBg:  '#E91E7A',
  roseStr: '#FFFFFF',
  lav:     '#A0522D',
  lavBg:   '#A0522D',
  lavStr:  '#FFFFFF',
  yellow:  '#F5C518',
  yellowBg: '#FFFAED',
};

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Deposit ─────────────────────────────────────────────
export const DEPOSIT_PERCENT = 0.30;

// ─── Contact ─────────────────────────────────────────────
export const CONTACT_EMAIL = 'chateaumoulin@masomenos.fr';

// ─── Helpers ─────────────────────────────────────────────
export function dateKey(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

export function inSeason(key) {
  return key >= SEASON_START && key < SEASON_END;
}

export function getTier(bookedOn) {
  for (let i = 0; i < TIERS.length; i++) {
    if (TIERS[i].deadline && bookedOn < TIERS[i].deadline) return i;
  }
  return TIERS.length - 1;
}

export function getBucket(nights) {
  return nights <= 2 ? '1-2' : nights <= 5 ? '3-5' : '6+';
}

export function getPrice(bookedOn, nights) {
  return RATES[getTier(bookedOn)][getBucket(nights)];
}

export function dayName(key) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseDate(key).getDay()];
}

export function nightsBetween(checkIn, checkOut) {
  return Math.max(0, Math.round((parseDate(checkOut) - parseDate(checkIn)) / 86400000));
}
