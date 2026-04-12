-- ═══════════════════════════════════════════════════════════
-- CHÂTEAUMOULIN BOOKING ENGINE — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Bookings table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_ids    TEXT[] NOT NULL DEFAULT '{}',
  guest_name  TEXT NOT NULL,
  email       TEXT NOT NULL,
  guests      INTEGER NOT NULL DEFAULT 1 CHECK (guests >= 1 AND guests <= 10),
  ages        TEXT DEFAULT '',
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'prebooking'
              CHECK (status IN ('prebooking', 'confirmed', 'blocked', 'cancelled')),
  booked_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT DEFAULT '',

  -- Payment fields
  total_price     INTEGER DEFAULT 0,        -- total in cents (€)
  deposit_amount  INTEGER DEFAULT 0,        -- 30% deposit in cents
  stripe_session_id TEXT DEFAULT NULL,
  stripe_payment_id TEXT DEFAULT NULL,
  paid            BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  -- Season constraint: Jun 15 – Sep 15, 2026
  CONSTRAINT valid_dates CHECK (check_out > check_in),
  CONSTRAINT season_bounds CHECK (
    check_in >= '2026-06-15' AND check_out <= '2026-09-15'
  )
);

-- ─── Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings (email);

-- ─── Updated_at trigger ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- ─── Row Level Security ──────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can check availability (select, no personal data)
CREATE POLICY "Public can view booking dates"
  ON bookings FOR SELECT
  USING (true);

-- Public insert: guests can create pre-bookings
CREATE POLICY "Guests can create prebookings"
  ON bookings FOR INSERT
  WITH CHECK (status = 'prebooking');

-- Service role: full access for admin/backend functions
-- (Netlify functions use service_role key, bypasses RLS)

-- ─── Availability view ──────────────────────────────────
-- For the guest-facing view: shows occupied rooms per date without personal info
CREATE OR REPLACE VIEW availability AS
  SELECT
    check_in,
    check_out,
    room_ids,
    status
  FROM bookings
  WHERE status IN ('confirmed', 'prebooking', 'blocked');

-- ═══════════════════════════════════════════════════════════
-- SAMPLE DATA (remove before production)
-- ═══════════════════════════════════════════════════════════
INSERT INTO bookings (room_ids, guest_name, email, guests, ages, check_in, check_out, status, booked_on, notes) VALUES
  ('{r1}', 'Marie Dupont', 'marie@email.com', 2, '32, 30', '2026-06-20', '2026-06-25', 'confirmed', '2026-04-01', ''),
  ('{r2}', 'James Wheeler', 'james@email.com', 2, '28, 27', '2026-06-18', '2026-06-22', 'confirmed', '2026-03-20', ''),
  ('{r3,r4}', 'Lucia Fernandez', 'lucia@email.com', 4, '35, 33, 10, 8', '2026-06-25', '2026-06-30', 'prebooking', '2026-04-08', 'Arriving late ~22h'),
  ('{r1,r2}', 'Karim Bensaid', 'karim@email.com', 3, '40, 38, 12', '2026-07-01', '2026-07-06', 'prebooking', '2026-04-05', ''),
  ('{r1,r2,r3,r4,r5}', 'Anna Schmidt', 'anna@email.com', 8, '45, 42, 15, 12, 10, 8, 4, 2', '2026-07-10', '2026-07-20', 'prebooking', '2026-04-09', 'Full estate — young children');
