import { useState, useMemo, useEffect } from "react";
import { useBookings } from "../hooks/useBookings";
import {
  ROOMS, SEASON_START, SEASON_END, TIERS, RATES, MONTHS,
  CONTACT_EMAIL,
  dateKey, addDays, parseDate, daysInMonth, inSeason,
  getTier, getBucket, getPrice, dayName, nightsBetween,
} from "../lib/constants";

const TODAY = new Date();
const todayKey = dateKey(TODAY);
const pad = n => String(n).padStart(2, "0");

function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

function displayName(b) {
  if (b.initials) {
    return ((b.firstName?.[0] || "") + (b.lastName?.[0] || "")).toUpperCase();
  }
  return b.firstName || b.guest?.split(" ")[0] || "";
}

function fullName(b) {
  if (b.guest) return b.guest;
  return ((b.firstName || "") + " " + (b.lastName || "")).trim();
}

/* ═══════════════════════════════════════════════════════════
   Login
   ═══════════════════════════════════════════════════════════ */
function Login({ onAuth }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (pwd === "chateaumoulin") {
      localStorage.setItem("adminAuth", "true");
      onAuth();
    } else {
      setError("Invalid password");
      setPwd("");
    }
  };
  return (
    <div className="cm-login">
      <div className="cm-login-box">
        <h2>ADMIN ACCESS</h2>
        <input className="cm-inp" type="password" placeholder="Enter password" value={pwd}
          onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} autoFocus />
        {error && <div className="cm-login-err">{error}</div>}
        <button className="cm-login-btn" onClick={submit}>LOGIN</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AdminContent — matches admin-mockup-v3.html
   ═══════════════════════════════════════════════════════════ */
function AdminContent() {
  const isMobile = useIsMobile();
  const { bookings, saveBooking, deleteBooking } = useBookings();
  const [weekStart, setWeekStart] = useState(parseDate("2026-06-15"));
  const [view, setView] = useState("week");
  const [modal, setModal] = useState(null); // { type: 'new'|'edit', data }
  const [selDay, setSelDay] = useState(null);

  const curMonth = weekStart.getMonth();
  const curYear = weekStart.getFullYear();
  const dimMonth = daysInMonth(curYear, curMonth);
  const isWeek = view === "week";
  const days = isWeek
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : Array.from({ length: dimMonth }, (_, i) => new Date(curYear, curMonth, i + 1));

  // Build occupancy map
  const map = useMemo(() => {
    const m = {};
    bookings.forEach(b => {
      (b.roomIds || []).forEach(rid => {
        let c = parseDate(b.checkIn);
        const e = parseDate(b.checkOut);
        while (c < e) { m[rid + "_" + dateKey(c)] = b; c = addDays(c, 1); }
      });
    });
    return m;
  }, [bookings]);

  // Nav
  const weekEnd = addDays(weekStart, 7);
  const navLabel = isWeek
    ? `${pad(weekStart.getDate())}/${pad(weekStart.getMonth() + 1)} — ${pad(weekEnd.getDate())}/${pad(weekEnd.getMonth() + 1)}`
    : `${MONTHS[curMonth].toUpperCase()} ${curYear}`;

  const prev = () => { setSelDay(null); isWeek ? setWeekStart(d => addDays(d, -7)) : setWeekStart(new Date(curYear, curMonth - 1, 1)); };
  const next = () => { setSelDay(null); isWeek ? setWeekStart(d => addDays(d, 7)) : setWeekStart(new Date(curYear, curMonth + 1, 1)); };
  const pickDay = (k) => setSelDay(selDay === k ? null : k);

  // Sidebar occupancy
  const refDay = selDay || todayKey;
  const dayB = bookings.filter(b => b.checkIn <= refDay && b.checkOut > refDay);
  const occRooms = new Set(dayB.flatMap(b => b.roomIds || []));
  const occCount = occRooms.size;
  const freeCount = 5 - occCount;
  const occLabel = selDay
    ? (() => { const d = parseDate(selDay); return dayName(selDay).toUpperCase() + " · " + d.getDate() + " " + MONTHS[d.getMonth()].toUpperCase() + " 2026"; })()
    : "— SELECT A DATE —";

  // Sidebar bookings for selected day
  const arr = selDay ? bookings.filter(b => b.checkIn === selDay) : [];
  const dep = selDay ? bookings.filter(b => b.checkOut === selDay) : [];
  const inHouse = selDay ? dayB : [];

  // Modal save/delete
  const save = async (f) => { try { await saveBooking(f); } catch (e) { console.error(e); } setModal(null); };
  const del = async (id) => { try { await deleteBooking(id); } catch (e) { console.error(e); } setModal(null); };

  const innerWidth = days.length * 52 + days.length * 6 + 80;
  const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderTimeline = () => (
    <div className={`cm-tl-inner ${isWeek ? "week" : "month"}`} style={!isWeek ? { minWidth: innerWidth } : undefined}>
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
            const cls = ["cm-date-col"];
            if (off) cls.push("off");
            if (isT) cls.push("today");
            if (isSel) cls.push("selected");
            if (we && !off) cls.push("we");
            return (
              <div key={key} className={cls.join(" ")} onClick={() => !off && pickDay(key)}>
                <div className="dow">{DN[dow]}</div>
                <div>{dt.getDate()}</div>
              </div>
            );
          })}
        </div>
      </div>
      {ROOMS.map((room, ri) => (
        <div key={room.id} className="cm-tl-row">
          <div className="cm-room-lbl">{ri + 1}</div>
          <div className="cm-slots">
            {days.map(dt => {
              const key = dateKey(dt);
              const off = !inSeason(key);
              const b = map[room.id + "_" + key];
              const isCI = b && b.checkIn === key;
              const isSel = selDay === key;

              if (off) return <div key={key} className="cm-slot off" />;

              if (b) {
                const isPre = b.status === "prebooking";
                const barCls = "cm-booking-bar " + (isPre ? "lav" : "rose") + (isCI ? " ci" : "");
                return (
                  <div key={key} className={`cm-booking ${isSel ? "sel" : ""}`}
                    onClick={() => { pickDay(key); setModal({ type: "edit", data: b }); }}>
                    <div className={barCls}>
                      <div className="name">{displayName(b).toUpperCase()}</div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={key} className={`cm-slot ${isSel ? "sel" : ""}`} onClick={() => pickDay(key)}>
                  <div className="dot" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* ─── Header ─── */}
      <div className="cm-header">
        <div className="cm-brand">
          <img className="cm-eye" src="/eye.gif" alt="" />
          <div>
            <div className="cm-brand-title">CHATEAUMOULIN</div>
            <div className="cm-brand-sub">BOOKING · SEASON 2026 · JUN 15 — SEP 15</div>
          </div>
        </div>
        <button className="cm-btn-new" onClick={() => setModal({ type: "new", data: null })}>+ NEW BOOKING</button>
      </div>

      {/* ─── Nav ─── */}
      <div className="cm-nav">
        <div className="cm-nav-left">
          <button className="cm-nav-btn" onClick={prev}>←</button>
          <span className="cm-nav-label">{navLabel}</span>
          <button className="cm-nav-btn" onClick={next}>→</button>
          <div className="cm-divider" />
          <div className="cm-toggle">
            <button className={view === "week" ? "active" : ""} onClick={() => { setSelDay(null); setView("week"); setWeekStart(parseDate("2026-06-15")); }}>WEEK</button>
            <button className={view === "month" ? "active" : ""} onClick={() => { setSelDay(null); setView("month"); }}>MONTH</button>
          </div>
        </div>
        <div className="cm-legend">
          <span><span className="swatch" style={{ background: "var(--rose)" }} /> CONFIRMED</span>
          <span><span className="swatch" style={{ background: "var(--lav)" }} /> PRE-BOOKING</span>
        </div>
      </div>

      {/* ─── Main ─── */}
      <div className="cm-main">
        <div className="cm-timeline-wrap">
          <div className={`cm-timeline ${isWeek ? "week-mode" : ""}`}>
            {renderTimeline()}
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <aside className="cm-sidebar">
          {/* Occupancy */}
          <div className="cm-sb-block">
            <div className="cm-sb-title">OCCUPANCY</div>
            <div className="cm-occ-label">{occLabel}</div>
            <div className="cm-occ-bars">
              {ROOMS.map(r => (
                <div key={r.id} className={`cm-occ-bar ${occRooms.has(r.id) ? "on" : ""}`} />
              ))}
            </div>
            <div className="cm-occ-count">{occCount}/5</div>
            {freeCount === 0 ? (
              <button className="cm-book-btn" disabled>FULLY BOOKED</button>
            ) : (
              <button className="cm-book-btn" disabled={!selDay}
                onClick={() => setModal({ type: "new", data: { checkIn: selDay, checkOut: dateKey(addDays(parseDate(selDay), 2)) } })}>
                + BOOK THIS DATE{freeCount < 5 ? ` (${freeCount} room${freeCount > 1 ? "s" : ""} free)` : ""}
              </button>
            )}
          </div>

          {/* Day Bookings */}
          <div className="cm-sb-block">
            <div className="cm-sb-title">BOOKINGS</div>
            {!selDay ? (
              <div style={{ fontSize: 11, color: "var(--fg)", fontFamily: "var(--C)", fontStyle: "italic", textAlign: "center" }}>
                Select a date to see its bookings
              </div>
            ) : (
              <>
                {arr.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="cm-sub-title">ARRIVING</div>
                    {arr.map(b => <BookingCard key={b.id} b={b} onClick={() => setModal({ type: "edit", data: b })} />)}
                  </div>
                )}
                {dep.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="cm-sub-title">DEPARTING</div>
                    {dep.map(b => <BookingCard key={b.id} b={b} onClick={() => setModal({ type: "edit", data: b })} />)}
                  </div>
                )}
                {inHouse.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="cm-sub-title">IN HOUSE</div>
                    {inHouse.map(b => <BookingCard key={b.id} b={b} onClick={() => setModal({ type: "edit", data: b })} />)}
                  </div>
                )}
                {inHouse.length === 0 && dep.length === 0 && arr.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--fg)", fontFamily: "var(--C)", fontStyle: "italic", textAlign: "center" }}>
                    No bookings
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pricing */}
          <div className="cm-sb-block cm-pricing">
            <div className="cm-sb-title">PRICING — €/NIGHT/ROOM</div>
            <table>
              <thead>
                <tr>
                  <th></th>
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
      </div>

      {/* ─── Details ─── */}
      <div className="cm-details">
        <div style={{ flex: 1 }}>
          <h3>DETAILS</h3>
          <ul>
            <li>Only 5 rooms — community vibe, or take over the whole playground</li>
            <li>Max 2 per room</li>
            <li>Rooms flow on a first-come, first-served basis</li>
            <li>Breakfast à la carte — open community style coordinated kitchen</li>
            <li>Kids welcome from 8+</li>
            <li>Little ones? Reach out — or go all in and book the full space.</li>
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
      {modal && (
        <div className="cm-modal-bg" onClick={() => setModal(null)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <button className="cm-modal-close" onClick={() => setModal(null)}>&times;</button>
            <AdminForm
              data={modal.type === "edit" ? modal.data : modal.data}
              isEdit={modal.type === "edit"}
              bookings={bookings}
              onSave={save}
              onDelete={modal.type === "edit" ? del : null}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Booking Card (sidebar) ─────────────────────────── */
function BookingCard({ b, onClick }) {
  const nights = nightsBetween(b.checkIn, b.checkOut);
  const isPre = b.status === "prebooking";
  return (
    <div className={`cm-card ${isPre ? "lav" : "rose"}`} onClick={onClick}>
      <div className="g-name">{fullName(b)}</div>
      <div className="g-meta">{(b.roomIds || []).length}rm · {b.guests}p · {nights}n · {b.checkIn.slice(5)} → {b.checkOut.slice(5)}</div>
      {b.notes && <div className="g-notes">{b.notes}</div>}
    </div>
  );
}

/* ─── Admin Booking Form (modal) ─────────────────────── */
function AdminForm({ data, isEdit, bookings, onSave, onDelete, onCancel }) {
  const [f, setF] = useState(() => {
    if (isEdit && data) {
      return {
        id: data.id,
        firstName: data.firstName || data.guest?.split(" ")[0] || "",
        lastName: data.lastName || data.guest?.split(" ").slice(1).join(" ") || "",
        initials: data.initials || false,
        email: data.email || "",
        numRooms: (data.roomIds || []).length || 1,
        guests: data.guests || 1,
        status: data.status || "prebooking",
        checkIn: data.checkIn || "",
        checkOut: data.checkOut || "",
        bookedOn: data.bookedOn || dateKey(TODAY),
        withChildren: data.withChildren || false,
        kidsAges: data.kidsAges || "",
        notes: data.notes || "",
        invited: data.invited || false,
        contributorRate: data.contributorRate || "",
      };
    }
    return {
      firstName: "", lastName: "", initials: false, email: "",
      numRooms: 1, guests: 2, status: "prebooking",
      checkIn: data?.checkIn || "", checkOut: data?.checkOut || "",
      bookedOn: dateKey(TODAY),
      withChildren: false, kidsAges: "",
      notes: "",
      invited: false, contributorRate: "",
    };
  });

  const [quoteSending, setQuoteSending] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState(null);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const nR = f.numRooms || 1;
  const nights = (f.checkIn && f.checkOut) ? nightsBetween(f.checkIn, f.checkOut) : 0;
  const hasContrib = f.contributorRate && parseFloat(f.contributorRate) > 0;
  const ppn = hasContrib ? parseFloat(f.contributorRate) : (nights > 0 && f.bookedOn ? getPrice(f.bookedOn, nights) : 0);
  const total = f.invited ? 0 : nights * ppn * nR;
  const deposit = Math.round(total * 0.30);
  const ti = f.bookedOn ? getTier(f.bookedOn) : 0;
  const mx = nR * 2;

  function assignRooms() {
    return ROOMS.filter(r => {
      for (let d = parseDate(f.checkIn); d < parseDate(f.checkOut); d = addDays(d, 1)) {
        const key = dateKey(d);
        for (const b of bookings) {
          if (isEdit && b.id === f.id) continue;
          if (b.checkIn <= key && b.checkOut > key && (b.roomIds || []).includes(r.id)) return false;
        }
      }
      return true;
    }).slice(0, nR).map(r => r.id);
  }

  function handleSave() {
    if (!f.firstName || !f.checkIn || !f.checkOut || !inSeason(f.checkIn)) return;
    const rids = assignRooms();
    if (rids.length < nR) { alert("Not enough rooms available"); return; }
    onSave({
      ...(f.id ? { id: f.id } : {}),
      roomIds: rids,
      firstName: f.firstName,
      lastName: f.lastName,
      guest: (f.firstName + " " + f.lastName).trim(),
      email: f.email,
      guests: Math.min(f.guests || 1, mx),
      ages: f.kidsAges || "",
      checkIn: f.checkIn,
      checkOut: f.checkOut,
      status: f.status,
      bookedOn: f.bookedOn,
      notes: f.notes,
      initials: f.initials,
      withChildren: f.withChildren,
      kidsAges: f.kidsAges,
      invited: f.invited,
      contributorRate: hasContrib ? parseFloat(f.contributorRate) : null,
    });
  }

  return (
    <div>
      <div className="cm-modal-title">{isEdit ? "EDIT BOOKING" : "NEW BOOKING"}</div>

      <div className="cm-grid-2">
        <div><label className="cm-lbl">First name</label><input className="cm-inp" value={f.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Marie" /></div>
        <div><label className="cm-lbl">Last name</label><input className="cm-inp" value={f.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Dupont" /></div>
      </div>

      <div className="cm-field">
        <label className="cm-lbl">Email</label>
        <input className="cm-inp" type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="guest@email.com" />
      </div>

      <div className="cm-check-row" onClick={e => { if (e.target.tagName !== "INPUT") set("initials", !f.initials); }}>
        <input type="checkbox" checked={f.initials} onChange={e => set("initials", e.target.checked)} />
        <div>
          <label>Only show initials on the booking block</label>
          <div className="hint">Timeline shows first-letter initials (e.g. "MD") instead of first name.</div>
        </div>
      </div>

      <div className="cm-grid-3">
        <div>
          <label className="cm-lbl">Rooms</label>
          <select className="cm-inp" value={nR} onChange={e => set("numRooms", parseInt(e.target.value))}>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 5 ? " (full)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="cm-lbl">Status</label>
          <select className="cm-inp" value={f.status} onChange={e => set("status", e.target.value)}>
            <option value="prebooking">Pre-booking</option>
            <option value="confirmed">Confirmed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div><label className="cm-lbl">Guests (max {mx})</label><input className="cm-inp" type="number" min={1} max={mx} value={f.guests} onChange={e => set("guests", Math.min(parseInt(e.target.value) || 1, mx))} /></div>
      </div>

      <div className="cm-grid-3">
        <div><label className="cm-lbl">Check-in</label><input className="cm-inp" type="date" value={f.checkIn} min="2026-06-15" max="2026-09-14" onChange={e => set("checkIn", e.target.value)} /></div>
        <div><label className="cm-lbl">Check-out</label><input className="cm-inp" type="date" value={f.checkOut} min="2026-06-16" max="2026-09-15" onChange={e => set("checkOut", e.target.value)} /></div>
        <div><label className="cm-lbl">Booked on</label><input className="cm-inp" type="date" value={f.bookedOn} min="2026-01-01" max="2026-12-31" onChange={e => set("bookedOn", e.target.value)} /></div>
      </div>

      <div className="cm-check-row" onClick={e => { if (e.target.tagName !== "INPUT") set("withChildren", !f.withChildren); }}>
        <input type="checkbox" checked={f.withChildren} onChange={e => set("withChildren", e.target.checked)} />
        <div>
          <label>Travelling with children</label>
          <div className="hint">Kids welcome from 8+. Tick if any guests are under 18.</div>
        </div>
      </div>

      {f.withChildren && (
        <div className="cm-field">
          <label className="cm-lbl">Children ages</label>
          <input className="cm-inp" value={f.kidsAges} onChange={e => set("kidsAges", e.target.value)} placeholder="e.g. 8, 10, 12" />
        </div>
      )}

      <div className="cm-check-row" onClick={e => { if (e.target.tagName !== "INPUT") set("invited", !f.invited); }}>
        <input type="checkbox" checked={f.invited} onChange={e => set("invited", e.target.checked)} />
        <div>
          <label>Invited guest</label>
          <div className="hint">No payment required — guest stays for free.</div>
        </div>
      </div>

      {!f.invited && (
        <div className="cm-check-row" style={{ flexWrap: "wrap" }} onClick={e => { if (e.target.tagName !== "INPUT" && e.target.tagName !== "LABEL") { const next = !hasContrib; set("contributorRate", next ? "150" : ""); } }}>
          <input type="checkbox" checked={!!hasContrib} onChange={e => set("contributorRate", e.target.checked ? "150" : "")} />
          <div style={{ flex: 1 }}>
            <label>Contributor rate</label>
            <div className="hint">Custom price per night instead of standard pricing.</div>
          </div>
          {hasContrib && (
            <div style={{ width: "100%", marginTop: 8 }} onClick={e => e.stopPropagation()}>
              <input className="cm-inp" type="number" min={0} value={f.contributorRate} onChange={e => set("contributorRate", e.target.value)} placeholder="€/night" style={{ width: 120 }} />
              <span style={{ fontSize: 10, fontFamily: "var(--C)", marginLeft: 8, color: "var(--fg)" }}>€/night/room</span>
            </div>
          )}
        </div>
      )}

      {nights > 0 && !f.invited && (
        <div className="cm-price-bar">
          <span>{nR}rm × {nights}n × €{ppn}{hasContrib ? " (contributor)" : ` — ${TIERS[ti].label}`}</span>
          <span className="total">€{total}</span>
        </div>
      )}

      <div className="cm-field">
        <label className="cm-lbl">Notes</label>
        <textarea className="cm-inp" style={{ minHeight: 50, resize: "vertical" }} value={f.notes} onChange={e => set("notes", e.target.value)} />
      </div>

      {quoteMsg && (
        <div style={{ padding: "10px 12px", background: quoteMsg.ok ? "rgba(168,212,184,0.2)" : "rgba(198,40,40,0.06)", borderLeft: `3px solid ${quoteMsg.ok ? "#A8D4B8" : "#C62828"}`, fontSize: 11, marginBottom: 14, color: "var(--fg)", fontFamily: "var(--C)" }}>
          {quoteMsg.text}
        </div>
      )}

      <div className="cm-modal-actions">
        <div style={{ display: "flex", gap: 10 }}>
          {isEdit && onDelete && (
            <button className="cm-btn-del" onClick={() => onDelete(f.id)}>DELETE</button>
          )}
          {isEdit && f.email && f.status === "prebooking" && (
            <button
              className="cm-btn-save"
              style={{ background: "var(--lav)", color: "#000", boxShadow: "3px 3px 0 #000" }}
              disabled={quoteSending}
              onClick={async (e) => {
                e.preventDefault();
                setQuoteSending(true);
                setQuoteMsg(null);
                try {
                  const res = await fetch("/.netlify/functions/send-quote", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookingId: f.id }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setQuoteMsg({ ok: true, text: `${f.invited ? "Invitation" : "Quote"} sent to ${data.email}` });
                  } else {
                    setQuoteMsg({ ok: false, text: data.error || "Failed to send" });
                  }
                } catch (err) {
                  setQuoteMsg({ ok: false, text: err.message });
                }
                setQuoteSending(false);
              }}
            >
              {quoteSending ? "SENDING..." : (f.invited ? "SEND INVITE" : "SEND QUOTE")}
            </button>
          )}
          {isEdit && f.email && f.status === "confirmed" && (
            <button
              className="cm-btn-save"
              style={{ background: "var(--yel)", color: "#000", boxShadow: "3px 3px 0 #000" }}
              disabled={quoteSending}
              onClick={async (e) => {
                e.preventDefault();
                setQuoteSending(true);
                setQuoteMsg(null);
                try {
                  const res = await fetch("/.netlify/functions/send-confirmation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bookingId: f.id }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setQuoteMsg({ ok: true, text: `Confirmation sent to ${data.email}` });
                  } else {
                    setQuoteMsg({ ok: false, text: data.error || "Failed to send" });
                  }
                } catch (err) {
                  setQuoteMsg({ ok: false, text: err.message });
                }
                setQuoteSending(false);
              }}
            >
              {quoteSending ? "SENDING..." : "SEND CONFIRMATION"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="cm-btn-cancel" onClick={onCancel}>CANCEL</button>
          <button className="cm-btn-save" onClick={handleSave}>{isEdit ? "UPDATE" : "CREATE"}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Export with login gate
   ═══════════════════════════════════════════════════════════ */
export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("adminAuth") === "true";
  });

  if (!isAuthenticated) {
    return <Login onAuth={() => setIsAuthenticated(true)} />;
  }

  return <AdminContent />;
}
