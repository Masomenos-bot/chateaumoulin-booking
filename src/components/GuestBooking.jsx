import { useState, useMemo, useRef, useEffect } from 'react';
import { useBookings } from '../hooks/useBookings';
import { redirectToCheckout } from '../lib/stripe';
import {
  ROOMS, SEASON_START, SEASON_END, TIERS, RATES, MONTHS,
  FONTS, COLORS, DEPOSIT_PERCENT, CONTACT_EMAIL,
  dateKey, addDays, parseDate, daysInMonth, inSeason,
  getTier, getBucket, getPrice, dayName, nightsBetween,
} from '../lib/constants';

const H = FONTS.heading;
const C = FONTS.mono;
const BG = COLORS.bg;
const FG = COLORS.fg;
const MU = COLORS.muted;
const BD = COLORS.border;
const ROSE = COLORS.rose;
const ROSE_BG = COLORS.roseBg;
const RS = COLORS.roseStr;
const LAV = COLORS.lav;
const LAV_BG = COLORS.lavBg;
const LS = COLORS.lavStr;
const YELLOW = COLORS.yellow;
const YELLOW_BG = COLORS.yellowBg;
const YS = COLORS.yellowStr;

const EYE = "data:image/png;base64,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";

const TODAY = new Date();
const todayKey = dateKey(TODAY);

const lbl = { display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: MU, marginBottom: 4, fontFamily: C };
const inp = { width: '100%', padding: '9px 10px', border: '1px solid #ccc', fontSize: 13, fontFamily: C, background: '#FDFBF5', outline: 'none', boxSizing: 'border-box', color: FG };

function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

/* ─── Day Panel (read-only for guests) ──────────────── */
function DayPanel({ dk: dKey, bookings, rooms, onClose, onBook, isMobile }) {
  const dayB = bookings.filter(b => b.checkIn <= dKey && b.checkOut > dKey);
  const arr = bookings.filter(b => b.checkIn === dKey);
  const dep = bookings.filter(b => b.checkOut === dKey);
  const occ = dayB.flatMap(b => b.roomIds);
  const free = 5 - new Set(occ).size;
  const d = parseDate(dKey);
  const label = dayName(dKey) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];

  return (
    <div style={{ padding: isMobile ? '12px 14px' : '16px 20px', background: '#fff', border: '1px solid #000', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, fontFamily: H }}>{label}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontFamily: H, color: FG }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {rooms.map(r => {
          const o = occ.includes(r.id);
          return <div key={r.id} style={{ flex: 1, height: 5, background: o ? '#000' : BD }} />;
        })}
      </div>
      <div style={{ fontSize: 10, color: MU, fontFamily: C, marginBottom: 10 }}>
        {free} slot{free !== 1 ? 's' : ''} free · {dayB.length} booking{dayB.length !== 1 ? 's' : ''}
      </div>

      {arr.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: MU, fontFamily: C, marginBottom: 4 }}>ARRIVING</div>
          {arr.map(b => <GuestItem key={b.id} b={b} accent="#2E7D32" />)}
        </div>
      )}
      {dep.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: MU, fontFamily: C, marginBottom: 4 }}>DEPARTING</div>
          {dep.map(b => <GuestItem key={b.id} b={b} accent="#C62828" />)}
        </div>
      )}
      {dayB.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: MU, fontFamily: C, marginBottom: 4 }}>IN HOUSE</div>
          {dayB.map(b => <GuestItem key={b.id} b={b} />)}
        </div>
      )}
      {dayB.length === 0 && dep.length === 0 && (
        <div style={{ fontSize: 11, color: MU, fontFamily: C, fontStyle: 'italic' }}>No bookings</div>
      )}

      {free > 0 && (
        <button onClick={() => onBook(dKey)} style={{ marginTop: 10, width: '100%', padding: '10px 20px', border: '2px solid #000', background: '#000', color: BG, cursor: 'pointer', fontFamily: C, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
          BOOK THIS DATE · {free} SLOT{free !== 1 ? 'S' : ''} FREE
        </button>
      )}
    </div>
  );
}

function GuestItem({ b, accent }) {
  const nights = nightsBetween(b.checkIn, b.checkOut);
  const isPre = b.status === 'prebooking';
  return (
    <div style={{ padding: '6px 8px', marginBottom: 3, borderLeft: `2px solid ${accent || (isPre ? LAV : ROSE)}`, background: isPre ? LAV_BG : ROSE_BG }}>
      <span style={{ fontWeight: 700, fontFamily: H, fontSize: 11 }}>{b.guest}</span>
      <span style={{ color: MU, marginLeft: 8, fontFamily: C, fontSize: 9 }}>{b.roomIds.length}rm · {b.guests}p · {nights}n</span>
    </div>
  );
}

/* ─── Main Guest Component ──────────────────────────── */
export default function GuestBooking() {
  const isMobile = useIsMobile();
  const { bookings, createBooking } = useBookings();
  const [showForm, setShowForm] = useState(false);
  const [selDay, setSelDay] = useState(null);
  const [error, setError] = useState(null);
  const [year] = useState(2026);
  const [month, setMonth] = useState(5);
  const ref = useRef(null);

  const [f, setF] = useState({
    numRooms: 1, firstName: '', lastName: '', email: '', guests: 1, ages: '', checkIn: '', checkOut: '', notes: '',
  });

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const bookedOn = todayKey;
  const nR = f.numRooms || 1;
  const nights = nightsBetween(f.checkIn, f.checkOut);
  const ppn = nights > 0 ? getPrice(bookedOn, nights) : 0;
  const total = nights * ppn * nR;
  const deposit = Math.round(total * DEPOSIT_PERCENT);
  const ti = getTier(bookedOn);
  const mx = nR * 2;
  const full = nR === 5;
  const ages = f.ages ? f.ages.split(',').map(a => parseInt(a.trim())).filter(n => !isNaN(n)) : [];
  const u8 = ages.some(a => a < 8);
  const nc = u8 && !full;

  const dim = daysInMonth(year, month);
  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const CW = isMobile ? 38 : 42;

  // Build occupancy map
  const map = useMemo(() => {
    const m = {};
    bookings.forEach(b => {
      b.roomIds.forEach(rid => {
        let c = parseDate(b.checkIn);
        const e = parseDate(b.checkOut);
        while (c < e) { m[rid + '_' + dateKey(c)] = b; c = addDays(c, 1); }
      });
    });
    return m;
  }, [bookings]);

  // Check availability
  const available = useMemo(() => {
    if (!f.checkIn || !f.checkOut) return true;
    for (let d = parseDate(f.checkIn); d < parseDate(f.checkOut); d = addDays(d, 1)) {
      const key = dateKey(d);
      const occupied = new Set();
      bookings.forEach(b => {
        if (b.checkIn <= key && b.checkOut > key) b.roomIds.forEach(rid => occupied.add(rid));
      });
      if (5 - occupied.size < nR) return false;
    }
    return true;
  }, [f.checkIn, f.checkOut, nR, bookings]);

  const canSubmit = f.firstName && f.lastName && f.email && f.checkIn && f.checkOut && inSeason(f.checkIn) && nights > 0 && available && !nc;

  function assignRooms() {
    return ROOMS.filter(r => {
      for (let d = parseDate(f.checkIn); d < parseDate(f.checkOut); d = addDays(d, 1)) {
        const key = dateKey(d);
        for (const b of bookings) {
          if (b.checkIn <= key && b.checkOut > key && b.roomIds.includes(r.id)) return false;
        }
      }
      return true;
    }).slice(0, nR).map(r => r.id);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    try {
      const roomIds = assignRooms();
      if (roomIds.length < nR) { setError('Not enough rooms available for these dates.'); return; }
      const booking = await createBooking({
        roomIds, firstName: f.firstName, lastName: f.lastName, guest: `${f.firstName} ${f.lastName}`, email: f.email, guests: Math.min(f.guests || 1, mx),
        ages: f.ages, checkIn: f.checkIn, checkOut: f.checkOut, status: 'prebooking', bookedOn, notes: f.notes,
      });
      await redirectToCheckout(booking.id, deposit * 100, f.email);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Something went wrong. Please try again.');
    }
  }

  // Open booking form pre-filled with date
  function bookFromDay(dKey) {
    setF(prev => ({ ...prev, checkIn: dKey, checkOut: dateKey(addDays(parseDate(dKey), 2)) }));
    setSelDay(null);
    setShowForm(true);
  }

  const prev = () => { if (month > 5) setMonth(m => m - 1); };
  const next = () => { if (month < 8) setMonth(m => m + 1); };
  const sw = (dir) => { if (ref.current) ref.current.scrollLeft += dir * CW * 7; };

  const px = isMobile ? 14 : 28;

  return (
    <div style={{ fontFamily: C, background: BG, minHeight: '100vh', color: FG }}>
      {/* Header */}
      <div style={{ padding: `12px ${px}px`, borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
          <img src={EYE} alt="" style={{ height: isMobile ? 24 : 32, opacity: 0.8 }} />
          <div>
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, letterSpacing: '0.12em', fontFamily: H }}>CHÂTEAUMOULIN</div>
            {!isMobile && <div style={{ fontSize: 9, color: MU, letterSpacing: '0.2em', marginTop: 2 }}>SEASON 2026 · JUN 15 — SEP 15</div>}
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: isMobile ? '6px 12px' : '8px 20px', border: '2px solid #000', background: '#000', color: BG, cursor: 'pointer', fontFamily: C, fontSize: isMobile ? 9 : 10, fontWeight: 700, letterSpacing: '0.1em' }}>+ NEW BOOKING</button>
      </div>

      {/* Intro */}
      <div style={{ padding: `${isMobile ? 16 : 24}px ${px}px` }}>
        <h2 style={{ fontFamily: H, fontSize: isMobile ? 20 : 28, fontWeight: 700, marginBottom: 10 }}>Come Together</h2>
        <p style={{ fontSize: isMobile ? 11 : 12, color: MU, lineHeight: 1.7, maxWidth: 640 }}>
          Châteaumoulin is a hosted estate in the south of France, created as a physical location for the Masomenos World community to thrive together. It runs on an open format — where art, music, and design naturally blend with the surrounding environment. Part house, part creative playground, it's a place to experience the Masomenos lifestyle in real life. 2026 edition runs from mid-June to mid-September, with different community members hosting throughout, each bringing their own flavour to the space.
        </p>
      </div>

      {/* Timeline nav */}
      <div style={{ padding: `10px ${px}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BD}`, borderTop: `1px solid ${BD}`, flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          <button onClick={prev} style={{ background: 'none', border: '1px solid #ccc', padding: '4px 8px', cursor: 'pointer', fontFamily: H, fontSize: isMobile ? 12 : 14, color: FG }}>←</button>
          <span style={{ minWidth: isMobile ? 110 : 160, textAlign: 'center', fontSize: isMobile ? 13 : 15, fontWeight: 700, letterSpacing: '0.08em', fontFamily: H }}>{MONTHS[month].toUpperCase().slice(0, isMobile ? 3 : 99)} {year}</span>
          <button onClick={next} style={{ background: 'none', border: '1px solid #ccc', padding: '4px 8px', cursor: 'pointer', fontFamily: H, fontSize: isMobile ? 12 : 14, color: FG }}>→</button>
          {!isMobile && <>
            <div style={{ width: 1, height: 20, background: BD, margin: '0 4px' }} />
            <button onClick={() => sw(-1)} style={{ background: 'none', border: '1px solid #ccc', padding: '5px 8px', cursor: 'pointer', fontFamily: C, fontSize: 9, color: FG }}>◄ WEEK</button>
            <button onClick={() => sw(1)} style={{ background: 'none', border: '1px solid #ccc', padding: '5px 8px', cursor: 'pointer', fontFamily: C, fontSize: 9, color: FG }}>WEEK ►</button>
          </>}
        </div>
        {isMobile ? (
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <button onClick={() => sw(-1)} style={{ background: 'none', border: '1px solid #ccc', padding: '4px 8px', cursor: 'pointer', fontFamily: C, fontSize: 8, color: FG }}>◄ WK</button>
            <button onClick={() => sw(1)} style={{ background: 'none', border: '1px solid #ccc', padding: '4px 8px', cursor: 'pointer', fontFamily: C, fontSize: 8, color: FG }}>WK ►</button>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 8, fontSize: 8, alignItems: 'center', fontFamily: C }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, background: ROSE }} /> booked
              <span style={{ display: 'inline-block', width: 8, height: 8, background: LAV, marginLeft: 4 }} /> pre
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, fontSize: 9, letterSpacing: '0.1em', fontFamily: C }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: ROSE, marginRight: 4, verticalAlign: 'middle' }} /> CONFIRMED</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: LAV, marginRight: 4, verticalAlign: 'middle' }} /> PRE-BOOKING</span>
            <span style={{ color: MU, opacity: 0.5 }}>/// OFF</span>
          </div>
        )}
      </div>

      {/* Day panel — opens when clicking a date */}
      {selDay && (
        <div style={{ padding: `12px ${px}px 0` }}>
          <DayPanel dk={selDay} bookings={bookings} rooms={ROOMS} onClose={() => setSelDay(null)} onBook={bookFromDay} isMobile={isMobile} />
        </div>
      )}

      {/* Timeline — 5 slots */}
      <div style={{ padding: `0 ${px}px 16px` }}>
        <div ref={ref} style={{ overflowX: 'auto', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: dim * CW + (isMobile ? 50 : 80) }}>
            {/* Day headers */}
            <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
              <div style={{ width: isMobile ? 50 : 80, flexShrink: 0, padding: '6px 8px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', fontFamily: C }}>{isMobile ? '#' : 'SLOTS'}</div>
              <div style={{ display: 'flex' }}>
                {days.map(d => {
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isT = key === todayKey;
                  const dow = new Date(year, month, d).getDay();
                  const we = dow === 0 || dow === 6;
                  const off = !inSeason(key);
                  const isSel = selDay === key;
                  return (
                    <div key={d}
                      onClick={() => inSeason(key) ? setSelDay(selDay === key ? null : key) : null}
                      style={{ width: CW, textAlign: 'center', padding: '3px 0', fontSize: isMobile ? 10 : 11, fontFamily: H, fontWeight: isT ? 800 : isSel ? 700 : 400, color: off ? '#d0ccc0' : isT ? '#000' : we ? '#aaa' : '#888', background: isSel ? 'rgba(0,0,0,0.08)' : isT ? 'rgba(0,0,0,0.04)' : 'transparent', cursor: off ? 'default' : 'pointer', borderBottom: isSel ? '2px solid #000' : '2px solid transparent', flexShrink: 0 }}>
                      <div style={{ fontSize: 7, color: off ? '#d0ccc0' : MU, fontFamily: C }}>{dayName(key).slice(0, isMobile ? 2 : 3)}</div>
                      <div>{d}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room rows */}
            {ROOMS.map((room, ri) => (
              <div key={room.id} style={{ display: 'flex', borderBottom: `1px solid ${BD}` }}>
                <div style={{ width: isMobile ? 50 : 80, flexShrink: 0, padding: '8px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', color: MU, fontFamily: H }}>{ri + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', minHeight: isMobile ? 34 : 38 }}>
                  {days.map(d => {
                    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const k = room.id + '_' + key;
                    const b = map[k];
                    const off = !inSeason(key);
                    const isCI = b && b.checkIn === key;
                    const isSel = selDay === key;

                    if (off) return <div key={d} style={{ width: CW, height: isMobile ? 34 : 38, flexShrink: 0, background: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px)' }} />;

                    if (b) {
                      const isPre = b.status === 'prebooking';
                      const borderColor = isPre ? LAV : YELLOW;
                      return (
                        <div key={d} onClick={() => setSelDay(selDay === key ? null : key)} style={{ width: CW, height: isMobile ? 34 : 38, flexShrink: 0, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', background: isSel ? 'rgba(0,0,0,0.04)' : 'transparent' }}>
                          <div style={{ position: 'absolute', left: isCI ? 2 : 0, right: 0, top: 4, bottom: 4, background: isPre ? LAV_BG : YELLOW_BG, border: `2px solid ${borderColor}`, boxShadow: `2px 2px 0 #000`, borderLeft: isCI ? `2px solid ${borderColor}` : 'none' }}>
                            {isCI && <div style={{ fontSize: isMobile ? 7 : 8, fontWeight: 700, padding: '1px 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isPre ? LS : YS, fontFamily: C }}>{b.guest.split(' ')[0].toUpperCase()}</div>}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={d} onClick={() => setSelDay(selDay === key ? null : key)} style={{ width: CW, height: isMobile ? 34 : 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isSel ? 'rgba(0,0,0,0.04)' : 'transparent' }}>
                        <div style={{ width: 2, height: 2, borderRadius: '50%', background: '#d0ccc0' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing grid */}
      <div style={{ padding: `16px ${px}px`, borderTop: `1px solid ${BD}`, maxWidth: 500 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: MU, marginBottom: 10 }}>RATES €/NIGHT/ROOM</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: C }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BD}` }}>
              <td style={{ padding: '6px 4px' }}></td>
              <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, fontFamily: H, fontSize: 10 }}>Tier 1<br /><span style={{ fontWeight: 400, fontSize: 8, color: MU }}>before May 20</span></td>
              <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, fontFamily: H, fontSize: 10 }}>Tier 2<br /><span style={{ fontWeight: 400, fontSize: 8, color: MU }}>before Jul 1</span></td>
              <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, fontFamily: H, fontSize: 10 }}>Tier 3<br /><span style={{ fontWeight: 400, fontSize: 8, color: MU }}>after Jul 1</span></td>
            </tr>
          </thead>
          <tbody>
            {[['1-2 nights', 200, 270, 320], ['3-5 nights', 185, 265, 305], ['6+ nights', 170, 255, 290]].map(([l, ...v], i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BD}` }}>
                <td style={{ padding: '6px 4px', color: MU, fontSize: 10 }}>{l}</td>
                {v.map((x, j) => <td key={j} style={{ padding: '6px 4px', textAlign: 'center' }}>€{x}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 9, color: MU, marginTop: 8, lineHeight: 1.5 }}>30% deposit at booking, balance on arrival. Free cancellation until end of tier, 30% retained after.</p>
      </div>

      {/* Footer */}
      <div style={{ padding: `24px ${px}px 40px`, textAlign: 'center' }}>
        <img src={EYE} alt="" style={{ height: 20, opacity: 0.12 }} />
        <div style={{ fontSize: 8, color: MU, marginTop: 8, letterSpacing: '0.1em' }}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: MU, textDecoration: 'none' }}>{CONTACT_EMAIL}</a>
        </div>
      </div>

      {/* Booking modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: BG, maxWidth: isMobile ? '100%' : 500, width: isMobile ? '100%' : '92%', maxHeight: isMobile ? '95vh' : '90vh', overflowY: 'auto', padding: isMobile ? 20 : 32, border: '1px solid #000', borderRadius: isMobile ? '16px 16px 0 0' : 0 }} onClick={e => e.stopPropagation()}>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: 10, marginBottom: 20, fontFamily: C }}>BOOK YOUR STAY</div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Rooms</label><select style={{ ...inp, cursor: 'pointer' }} value={nR} onChange={e => set('numRooms', parseInt(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 5 ? ' (full)' : ''}</option>)}</select></div>
              <div><label style={lbl}>Guests (max {mx})</label><input style={inp} type="number" min={1} max={mx} value={f.guests || 1} onChange={e => set('guests', Math.min(parseInt(e.target.value) || 1, mx))} /></div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}><label style={lbl}>First name</label><input style={inp} value={f.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Marie" /></div>
              <div style={{ flex: 1 }}><label style={lbl}>Last name</label><input style={inp} value={f.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Dupont" /></div>
            </div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Email</label><input style={inp} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" /></div>
            <div style={{ marginBottom: 12 }}><label style={lbl}>Guest ages</label><input style={inp} value={f.ages} onChange={e => set('ages', e.target.value)} placeholder="32, 30, 10" /></div>

            {nc && <div style={{ padding: '10px 12px', background: 'rgba(198,40,40,0.06)', borderLeft: '3px solid #C62828', fontSize: 12, marginBottom: 12, color: '#C62828' }}>Children under 8 — please book the full estate (5 rooms) or <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>contact us</a>.</div>}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Check-in</label><input style={inp} type="date" value={f.checkIn} min="2026-06-15" max="2026-09-14" onChange={e => set('checkIn', e.target.value)} /></div>
              <div><label style={lbl}>Check-out</label><input style={inp} type="date" value={f.checkOut} min="2026-06-16" max="2026-09-15" onChange={e => set('checkOut', e.target.value)} /></div>
            </div>

            {!available && f.checkIn && f.checkOut && <div style={{ padding: '10px 12px', background: 'rgba(198,40,40,0.06)', borderLeft: '3px solid #C62828', fontSize: 12, marginBottom: 12, color: '#C62828' }}>Not enough rooms available for these dates.</div>}

            {nights > 0 && (
              <div style={{ padding: '10px 12px', background: '#000', color: BG, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 12, fontFamily: C }}>
                <span>{nR}rm × {nights}n × €{ppn} — {TIERS[ti].label}<br /><span style={{ fontSize: 9, color: '#999' }}>Deposit (30%): €{deposit} · Balance: €{total - deposit}</span></span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>€{total}</span>
              </div>
            )}

            <div style={{ marginBottom: 16 }}><label style={lbl}>Notes / requests</label><textarea style={{ ...inp, minHeight: 40, resize: 'vertical' }} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Arrival time, dietary needs, etc." /></div>

            {error && <div style={{ padding: '10px 12px', background: 'rgba(198,40,40,0.06)', borderLeft: '3px solid #C62828', fontSize: 12, marginBottom: 12, color: '#C62828' }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer', fontFamily: C, fontSize: 11 }}>CANCEL</button>
              <button onClick={handleSubmit} disabled={!canSubmit} style={{ padding: '8px 20px', border: '1px solid #000', background: canSubmit ? '#000' : '#999', color: BG, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: C, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', opacity: canSubmit ? 1 : 0.4 }}>{nights > 0 ? `BOOK · €${deposit} DEPOSIT` : 'BOOK'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
