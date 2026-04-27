import { useState, useMemo, useEffect } from 'react';
import { useBookings } from '../hooks/useBookings';
import { redirectToCheckout } from '../lib/stripe';
import {
  ROOMS, SEASON_START, SEASON_END, TIERS, RATES, MONTHS,
  DEPOSIT_PERCENT, CONTACT_EMAIL,
  dateKey, addDays, parseDate, daysInMonth, inSeason,
  getTier, getBucket, getPrice, dayName, nightsBetween,
} from '../lib/constants';

const TODAY = new Date();
const todayKey = dateKey(TODAY);
const pad = n => String(n).padStart(2, '0');

function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

function displayName(b) {
  if (b.initials) {
    return ((b.firstName?.[0] || '') + (b.lastName?.[0] || '')).toUpperCase();
  }
  return b.firstName || b.guest?.split(' ')[0] || '';
}

/* ═══════════════════════════════════════════════════════════
   GuestBooking — matches frontend-mockup-v1.html
   ═══════════════════════════════════════════════════════════ */
export default function GuestBooking() {
  const isMobile = useIsMobile();
  const { bookings, createBooking } = useBookings();
  const [showForm, setShowForm] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [selDay, setSelDay] = useState(null);
  const [error, setError] = useState(null);
  const [weekStart, setWeekStart] = useState(parseDate("2026-06-15"));
  const [view, setView] = useState("week");

  const [f, setF] = useState({
    firstName: '', lastName: '', email: '', initials: false,
    numRooms: 1, guests: 2, status: 'prebooking',
    checkIn: '', checkOut: '',
    withChildren: false, kidsAges: '',
    notes: '',
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

  // Calendar state
  const curMonth = weekStart.getMonth();
  const curYear = weekStart.getFullYear();
  const dimMonth = daysInMonth(curYear, curMonth);
  const days = view === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : Array.from({ length: dimMonth }, (_, i) => new Date(curYear, curMonth, i + 1));

  // Build occupancy map
  const map = useMemo(() => {
    const m = {};
    bookings.forEach(b => {
      (b.roomIds || []).forEach(rid => {
        let c = parseDate(b.checkIn);
        const e = parseDate(b.checkOut);
        while (c < e) { m[rid + '_' + dateKey(c)] = b; c = addDays(c, 1); }
      });
    });
    return m;
  }, [bookings]);

  // Availability check
  const available = useMemo(() => {
    if (!f.checkIn || !f.checkOut) return true;
    for (let d = parseDate(f.checkIn); d < parseDate(f.checkOut); d = addDays(d, 1)) {
      const key = dateKey(d);
      const occupied = new Set();
      bookings.forEach(b => {
        if (b.checkIn <= key && b.checkOut > key) (b.roomIds || []).forEach(rid => occupied.add(rid));
      });
      if (5 - occupied.size < nR) return false;
    }
    return true;
  }, [f.checkIn, f.checkOut, nR, bookings]);

  const canSubmit = f.firstName && f.email && f.checkIn && f.checkOut && inSeason(f.checkIn) && nights > 0 && available;

  function assignRooms() {
    return ROOMS.filter(r => {
      for (let d = parseDate(f.checkIn); d < parseDate(f.checkOut); d = addDays(d, 1)) {
        const key = dateKey(d);
        for (const b of bookings) {
          if (b.checkIn <= key && b.checkOut > key && (b.roomIds || []).includes(r.id)) return false;
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
        roomIds,
        firstName: f.firstName,
        lastName: f.lastName,
        guest: `${f.firstName} ${f.lastName}`.trim(),
        email: f.email || '',
        guests: Math.min(f.guests || 1, mx),
        ages: f.kidsAges || '',
        checkIn: f.checkIn,
        checkOut: f.checkOut,
        status: 'prebooking',
        bookedOn,
        notes: f.notes,
        initials: f.initials,
        withChildren: f.withChildren,
        kidsAges: f.kidsAges,
      });
      await redirectToCheckout(booking.id, deposit * 100, f.email);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Something went wrong. Please try again.');
    }
  }

  function openBookingForm(dKey) {
    setF({
      firstName: '', lastName: '', email: '', initials: false,
      numRooms: 1, guests: 2, status: 'prebooking',
      checkIn: dKey || '', checkOut: dKey ? dateKey(addDays(parseDate(dKey), 2)) : '',
      withChildren: false, kidsAges: '',
      notes: '',
    });
    setEditBooking(null);
    setShowForm(true);
  }

  function openBookingDetail(b) {
    setF({
      firstName: b.firstName || b.guest?.split(' ')[0] || '',
      lastName: b.lastName || b.guest?.split(' ').slice(1).join(' ') || '',
      email: b.email || '',
      initials: b.initials || false,
      numRooms: (b.roomIds || []).length || 1,
      guests: b.guests || 1,
      status: b.status || 'prebooking',
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      withChildren: b.withChildren || false,
      kidsAges: b.kidsAges || '',
      notes: b.notes || '',
    });
    setEditBooking(b);
    setShowForm(true);
  }

  // Nav
  const isWeek = view === "week";
  const weekEnd = addDays(weekStart, 7);
  const navLabel = isWeek
    ? `${pad(weekStart.getDate())}/${pad(weekStart.getMonth() + 1)} — ${pad(weekEnd.getDate())}/${pad(weekEnd.getMonth() + 1)}`
    : `${MONTHS[curMonth].toUpperCase()} ${curYear}`;

  const seasonMin = parseDate(SEASON_START);
  const seasonMax = parseDate(SEASON_END);
  const canPrev = isWeek ? weekStart > seasonMin : curMonth > 5;
  const canNext = isWeek ? addDays(weekStart, 7) < seasonMax : curMonth < 8;
  const prev = () => { if (!canPrev) return; setSelDay(null); isWeek ? setWeekStart(d => addDays(d, -7)) : setWeekStart(new Date(curYear, curMonth - 1, 1)); };
  const next = () => { if (!canNext) return; setSelDay(null); isWeek ? setWeekStart(d => addDays(d, 7)) : setWeekStart(new Date(curYear, curMonth + 1, 1)); };
  const pickDay = (k) => setSelDay(selDay === k ? null : k);

  // Sidebar: occupancy for selected day
  const refDay = selDay || todayKey;
  const dayB = bookings.filter(b => b.checkIn <= refDay && b.checkOut > refDay);
  const occRooms = new Set(dayB.flatMap(b => b.roomIds || []));
  const occCount = occRooms.size;
  const freeCount = 5 - occCount;
  const occLabel = selDay
    ? (() => { const d = parseDate(selDay); return dayName(selDay).toUpperCase() + ' · ' + d.getDate() + ' ' + MONTHS[d.getMonth()].toUpperCase() + ' 2026'; })()
    : '— SELECT A DATE —';

  // Inner width for month view
  const innerWidth = days.length * 52 + days.length * 6 + 80;

  // ═══ RENDER ═══════════════════════════════════════════

  const renderTimeline = () => {
    const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className={`cm-tl-inner ${isWeek ? 'week' : 'month'}`} style={!isWeek ? { minWidth: innerWidth } : undefined}>
        {/* Header row */}
        <div className="cm-tl-header">
          <div className="cm-tl-slots">SLOTS</div>
          <div className="cm-tl-dates">
            {days.map(dt => {
              const key = dateKey(dt);
              const off = !inSeason(key);
              const isT = key === todayKey;
              const isSel = selDay === key;
              const dow = dt.getDay();
              const we = dow === 0 || dow === 6;
              const cls = ['cm-date-col'];
              if (off) cls.push('off');
              if (isT) cls.push('today');
              if (isSel) cls.push('selected');
              if (we && !off) cls.push('we');
              return (
                <div key={key} className={cls.join(' ')} onClick={() => !off && pickDay(key)}>
                  <div className="dow">{DN[dow]}</div>
                  <div>{dt.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room rows */}
        {ROOMS.map((room, ri) => (
          <div key={room.id} className="cm-tl-row">
            <div className="cm-room-lbl">{ri + 1}</div>
            <div className="cm-slots">
              {days.map(dt => {
                const key = dateKey(dt);
                const off = !inSeason(key);
                const b = map[room.id + '_' + key];
                const isCI = b && b.checkIn === key;
                const isSel = selDay === key;

                if (off) return <div key={key} className="cm-slot off" />;

                if (b) {
                  const isPre = b.status === 'prebooking';
                  const barCls = 'cm-booking-bar ' + (isPre ? 'lav' : 'rose') + (isCI ? ' ci' : '');
                  return (
                    <div key={key} className={`cm-booking ${isSel ? 'sel' : ''}`} style={{ cursor: 'default' }}>
                      <div className={barCls}>
                        <div className="name">{displayName(b).toUpperCase()}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={key} className={`cm-slot ${isSel ? 'sel' : ''}`} onClick={() => pickDay(key)}>
                    <div className="dot" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ─── Header ─── */}
      <div className="cm-header">
        <div className="cm-brand">
          <img className="cm-eye" src="/eye.gif" alt="" />
          <div>
            <div className="cm-brand-title">CHATEAUMOULIN</div>
            <div className="cm-brand-sub">BOOKING · SEASON 2026 · JUN 15 — SEP 15</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="https://mapchateaumoulin.netlify.app/" target="_blank" rel="noopener noreferrer" className="cm-btn-new" style={{ background: 'var(--rose)', textDecoration: 'none' }}>VIEW ON MAP</a>
          <button className="cm-btn-new" onClick={() => openBookingForm(null)}>+ NEW BOOKING</button>
        </div>
      </div>

      {/* ─── Nav ─── */}
      <div className="cm-nav">
        <div className="cm-nav-left">
          <button className="cm-nav-btn" onClick={prev} disabled={!canPrev} style={!canPrev ? {opacity:0.3,cursor:'default'} : {}}>←</button>
          <span className="cm-nav-label">{navLabel}</span>
          <button className="cm-nav-btn" onClick={next} disabled={!canNext} style={!canNext ? {opacity:0.3,cursor:'default'} : {}}>→</button>
          <div className="cm-divider" />
          <div className="cm-months">
            {[['JUN', 5], ['JUL', 6], ['AUG', 7], ['SEP', 8]].map(([lbl, mi]) => (
              <button
                key={lbl}
                className={curMonth === mi ? 'active' : ''}
                onClick={() => { setSelDay(null); setWeekStart(new Date(2026, mi, mi === 5 ? 15 : 1)); if (view === 'month') setView('month'); }}
              >{lbl}</button>
            ))}
          </div>
          <div className="cm-divider" />
          <div className="cm-toggle">
            <button className={view === 'week' ? 'active' : ''} onClick={() => { setSelDay(null); setView('week'); setWeekStart(parseDate("2026-06-15")); }}>WEEK</button>
            <button className={view === 'month' ? 'active' : ''} onClick={() => { setSelDay(null); setView('month'); }}>MONTH</button>
          </div>
        </div>
        <div className="cm-legend">
          <span><span className="swatch" style={{ background: 'var(--rose)' }} /> CONFIRMED</span>
          <span><span className="swatch" style={{ background: 'var(--lav)' }} /> PRE-BOOKING</span>
        </div>
      </div>

      {/* ─── Main ─── */}
      <div className="cm-main">
        <div className="cm-timeline-wrap">
          <div className={`cm-timeline ${isWeek ? 'week-mode' : ''}`}>
            {renderTimeline()}
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <aside className="cm-sidebar">
          {/* Occupancy */}
          <div className="cm-sb-block cm-occupancy">
            <div className="cm-sb-title">OCCUPANCY</div>
            <div className="cm-occ-label">{occLabel}</div>
            <div className="cm-occ-bars">
              {ROOMS.map(r => (
                <div key={r.id} className={`cm-occ-bar ${occRooms.has(r.id) ? 'on' : ''}`} />
              ))}
            </div>
            <div className="cm-occ-count">{occCount}/5</div>
            {freeCount === 0 ? (
              <button className="cm-book-btn" disabled>FULLY BOOKED</button>
            ) : (
              <button
                className="cm-book-btn"
                disabled={!selDay}
                onClick={() => openBookingForm(selDay)}
              >
                + BOOK THIS DATE{freeCount < 5 ? ` (${freeCount} room${freeCount > 1 ? 's' : ''} free)` : ''}
              </button>
            )}
          </div>

          {/* Pricing */}
          <div className="cm-sb-block cm-pricing">
            <div className="cm-sb-title">PRICING — €/NIGHT/ROOM</div>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontWeight: 700, letterSpacing: '0.1em', verticalAlign: 'top' }}>BOOK</th>
                  <th>T1<div style={{ fontSize: 8, fontWeight: 400 }}>till May 20</div></th>
                  <th>T2<div style={{ fontSize: 8, fontWeight: 400 }}>till Jul 1</div></th>
                  <th>T3<div style={{ fontSize: 8, fontWeight: 400 }}>after Jul 1</div></th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ fontWeight: 700 }}>1-2n</td><td>200€</td><td>270€</td><td>320€</td></tr>
                <tr><td style={{ fontWeight: 700 }}>3-5n</td><td>185€</td><td>265€</td><td>305€</td></tr>
                <tr><td style={{ fontWeight: 700 }}>6+n</td><td>170€</td><td>255€</td><td>290€</td></tr>
              </tbody>
            </table>
          </div>

        </aside>

        {/* Video + Description */}
        <div className="cm-sb-block cm-video-desc">
          <div className="cm-video">
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
              <iframe
                src="https://player.vimeo.com/video/1184350491?badge=0&autopause=0&player_id=0&dnt=1"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Chateaumoulin"
              />
            </div>
          </div>
          <div className="cm-desc-text">
            Part house, part creative playground, Chateaumoulin is a hosted estate in the south of France (Pic Saint-Loup / Montpellier), created for Masomenos World community members to gather and experience Masomenos lifestyle. 2026 edition will run from mid-June to mid-September, with different community members hosting throughout, each bringing their own flavour to the space.
          </div>
        </div>
      </div>

      {/* ─── Details ─── */}
      <div className="cm-details">
        <div style={{ flex: 1 }}>
          <h3>DETAILS</h3>
          <ul>
            <li>Only 5 rooms - community vibe, or take over the whole playground</li>
            <li>Max 2 per room</li>
            <li>Rooms flow on a first-come, first-served basis</li>
            <li>Breakfast à la carte - open community style coordinated kitchen</li>
            <li>Kids welcome from 8+</li>
            <li>Little ones? Reach out - or go all in and book the full space.</li>
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <h3>PAYMENT & CANCELLATION</h3>
          <ul>
            <li>30% deposit due at reservation via Stripe</li>
            <li>Balance payable on arrival</li>
            <li>Free cancellation until end of booking tier window</li>
            <li>30% deposit retained for late cancellations</li>
          </ul>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="cm-footer">
        <span>CHATEAUMOULIN · MASOMENOS WORLD · 2026</span>
        <span>{CONTACT_EMAIL}</span>
      </div>

      {/* ─── Modal ─── */}
      {showForm && (
        <div className="cm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <button className="cm-modal-close" onClick={() => setShowForm(false)}>&times;</button>
            <div className="cm-modal-title">{editBooking ? 'BOOKING DETAILS' : 'REQUEST A BOOKING'}</div>

            <div className="cm-grid-2">
              <div><label className="cm-lbl">First name</label><input className="cm-inp" value={f.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Marie" /></div>
              <div><label className="cm-lbl">Last name</label><input className="cm-inp" value={f.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Dupont" /></div>
            </div>

            <div className="cm-field">
              <label className="cm-lbl">Email</label>
              <input className="cm-inp" type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="marie@example.com" />
            </div>

            <div className="cm-check-row" onClick={e => { if (e.target.tagName !== 'INPUT') set('initials', !f.initials); }}>
              <input type="checkbox" checked={f.initials} onChange={e => set('initials', e.target.checked)} />
              <div>
                <label>Only show my initials on the booking block</label>
                <div className="hint">When checked, the timeline will show only first-letter initials (e.g. "MD") instead of the first name.</div>
              </div>
            </div>

            <div className="cm-grid-3">
              <div>
                <label className="cm-lbl">Rooms</label>
                <select className="cm-inp" value={nR} onChange={e => set('numRooms', parseInt(e.target.value))}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 5 ? ' (full estate)' : ''}</option>)}
                </select>
              </div>
              <div><label className="cm-lbl">Guests</label><input className="cm-inp" type="number" min={1} max={mx} value={f.guests} onChange={e => set('guests', Math.min(parseInt(e.target.value) || 1, mx))} /></div>
              <div>
                <label className="cm-lbl">Status</label>
                <select className="cm-inp" value={f.status} onChange={e => set('status', e.target.value)}>
                  <option value="prebooking">Pre-booking</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
            </div>

            <div className="cm-grid-2">
              <div><label className="cm-lbl">Check-in</label><input className="cm-inp" type="date" value={f.checkIn} min="2026-06-15" max="2026-09-14" onChange={e => set('checkIn', e.target.value)} /></div>
              <div><label className="cm-lbl">Check-out</label><input className="cm-inp" type="date" value={f.checkOut} min="2026-06-16" max="2026-09-15" onChange={e => set('checkOut', e.target.value)} /></div>
            </div>

            <div className="cm-check-row" onClick={e => { if (e.target.tagName !== 'INPUT') set('withChildren', !f.withChildren); }}>
              <input type="checkbox" checked={f.withChildren} onChange={e => set('withChildren', e.target.checked)} />
              <div>
                <label>Travelling with children</label>
                <div className="hint">Kids welcome from 8+. Tick if any of the guests are under 18.</div>
              </div>
            </div>

            {f.withChildren && (
              <div className="cm-field">
                <label className="cm-lbl">Children ages</label>
                <input className="cm-inp" value={f.kidsAges} onChange={e => set('kidsAges', e.target.value)} placeholder="e.g. 8, 10, 12" />
              </div>
            )}

            {!available && f.checkIn && f.checkOut && (
              <div style={{ padding: '10px 12px', background: 'rgba(198,40,40,0.06)', borderLeft: '3px solid #C62828', fontSize: 12, marginBottom: 14, color: '#C62828', fontFamily: 'var(--C)' }}>
                Not enough rooms available for these dates.
              </div>
            )}

            {nights > 0 && (
              <div className="cm-price-bar">
                <div>
                  {nR}rm × {nights}n × €{ppn} — {TIERS[ti].label}
                  <div className="detail">Deposit (30%): €{deposit} · Balance: €{total - deposit}</div>
                </div>
                <div className="total">€{total}</div>
              </div>
            )}

            <div className="cm-field">
              <label className="cm-lbl">Notes / requests</label>
              <textarea className="cm-inp" style={{ minHeight: 50, resize: 'vertical' }} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Arrival time, dietary needs, etc." />
            </div>

            {error && (
              <div style={{ padding: '10px 12px', background: 'rgba(198,40,40,0.06)', borderLeft: '3px solid #C62828', fontSize: 12, marginBottom: 14, color: '#C62828', fontFamily: 'var(--C)' }}>
                {error}
              </div>
            )}

            <div className="cm-modal-actions">
              <div />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="cm-btn-cancel" onClick={() => setShowForm(false)}>CANCEL</button>
                <button className="cm-btn-save" onClick={handleSubmit} disabled={!canSubmit} style={!canSubmit ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
                  {nights > 0 ? `REQUEST BOOKING · €${deposit}` : 'REQUEST BOOKING'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
