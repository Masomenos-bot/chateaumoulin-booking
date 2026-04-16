import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { dateKey } from '../lib/constants';

/**
 * Hook to manage bookings via Supabase.
 * Falls back to local sample data if Supabase is not configured.
 */

const SAMPLE_BOOKINGS = [
  { id: 'b1', room_ids: ['r1'], first_name: 'Marie', last_name: 'Dupont', guest_name: 'Marie Dupont', email: 'marie@email.com', guests: 2, ages: '32, 30', check_in: '2026-06-20', check_out: '2026-06-25', status: 'confirmed', booked_on: '2026-04-01', notes: '', show_initials: false, with_children: false, kids_ages: '' },
  { id: 'b2', room_ids: ['r2'], first_name: 'James', last_name: 'Wheeler', guest_name: 'James Wheeler', email: 'james@email.com', guests: 2, ages: '28, 27', check_in: '2026-06-18', check_out: '2026-06-22', status: 'confirmed', booked_on: '2026-03-20', notes: '', show_initials: true, with_children: false, kids_ages: '' },
  { id: 'b3', room_ids: ['r3', 'r4'], first_name: 'Lucia', last_name: 'Fernandez', guest_name: 'Lucia Fernandez', email: 'lucia@email.com', guests: 4, ages: '35, 33, 10, 8', check_in: '2026-06-25', check_out: '2026-06-30', status: 'prebooking', booked_on: '2026-04-08', notes: 'Arriving late ~22h', show_initials: false, with_children: true, kids_ages: '10, 8' },
  { id: 'b4', room_ids: ['r1', 'r2'], first_name: 'Karim', last_name: 'Bensaid', guest_name: 'Karim Bensaid', email: 'karim@email.com', guests: 3, ages: '40, 38, 12', check_in: '2026-07-01', check_out: '2026-07-06', status: 'prebooking', booked_on: '2026-04-05', notes: '', show_initials: true, with_children: true, kids_ages: '12' },
  { id: 'b5', room_ids: ['r1', 'r2', 'r3', 'r4', 'r5'], first_name: 'Anna', last_name: 'Schmidt', guest_name: 'Anna Schmidt', email: 'anna@email.com', guests: 8, ages: '45, 42, 15, 12, 10, 8, 4, 2', check_in: '2026-07-10', check_out: '2026-07-20', status: 'prebooking', booked_on: '2026-04-09', notes: 'Full estate — young children', show_initials: false, with_children: true, kids_ages: '15, 12, 10, 8, 4, 2' },
];

// Map DB column names to frontend field names
function toFrontend(row) {
  return {
    id: row.id,
    roomIds: row.room_ids,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    guest: row.guest_name,
    email: row.email,
    guests: row.guests,
    ages: row.ages,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
    bookedOn: row.booked_on,
    notes: row.notes || '',
    initials: row.show_initials || false,
    withChildren: row.with_children || false,
    kidsAges: row.kids_ages || '',
  };
}

function toBackend(booking) {
  return {
    room_ids: booking.roomIds,
    first_name: booking.firstName || '',
    last_name: booking.lastName || '',
    guest_name: booking.guest || `${booking.firstName || ''} ${booking.lastName || ''}`.trim(),
    email: booking.email,
    guests: booking.guests,
    ages: booking.ages,
    check_in: booking.checkIn,
    check_out: booking.checkOut,
    status: booking.status,
    booked_on: booking.bookedOn,
    notes: booking.notes || '',
    show_initials: booking.initials || false,
    with_children: booking.withChildren || false,
    kids_ages: booking.kidsAges || '',
  };
}

const isConfigured = import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder';

export function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch ────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    if (!isConfigured) {
      // Fallback: use sample data for development
      setBookings(SAMPLE_BOOKINGS.map(toFrontend));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('bookings')
        .select('*')
        .order('check_in', { ascending: true });

      if (err) throw err;
      setBookings((data || []).map(toFrontend));
    } catch (e) {
      console.error('Fetch bookings error:', e);
      setError(e.message);
      // Fallback to sample data on error
      setBookings(SAMPLE_BOOKINGS.map(toFrontend));
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Create ───────────────────────────────────────────
  const createBooking = useCallback(async (booking) => {
    if (!isConfigured) {
      const newBooking = { ...booking, id: 'b' + Date.now() };
      setBookings(prev => [...prev, newBooking]);
      return newBooking;
    }

    const row = toBackend(booking);
    const { data, error: err } = await supabase
      .from('bookings')
      .insert(row)
      .select()
      .single();

    if (err) throw err;
    const fb = toFrontend(data);
    setBookings(prev => [...prev, fb]);
    return fb;
  }, []);

  // ─── Update ───────────────────────────────────────────
  const updateBooking = useCallback(async (booking) => {
    if (!isConfigured) {
      setBookings(prev => prev.map(b => b.id === booking.id ? booking : b));
      return booking;
    }

    const row = toBackend(booking);
    const { data, error: err } = await supabase
      .from('bookings')
      .update(row)
      .eq('id', booking.id)
      .select()
      .single();

    if (err) throw err;
    const fb = toFrontend(data);
    setBookings(prev => prev.map(b => b.id === fb.id ? fb : b));
    return fb;
  }, []);

  // ─── Delete ───────────────────────────────────────────
  const deleteBooking = useCallback(async (id) => {
    if (!isConfigured) {
      setBookings(prev => prev.filter(b => b.id !== id));
      return;
    }

    const { error: err } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (err) throw err;
    setBookings(prev => prev.filter(b => b.id !== id));
  }, []);

  // ─── Save (create or update) ──────────────────────────
  const saveBooking = useCallback(async (booking) => {
    if (booking.id && !booking.id.startsWith('b')) {
      // Has a real UUID → update
      return updateBooking(booking);
    } else if (booking.id) {
      // Has a local-only id → could be update in demo mode
      if (!isConfigured) {
        setBookings(prev => prev.map(b => b.id === booking.id ? booking : b));
        return booking;
      }
      return createBooking(booking);
    }
    return createBooking(booking);
  }, [createBooking, updateBooking]);

  // ─── Realtime subscription ────────────────────────────
  useEffect(() => {
    fetchBookings();

    if (!isConfigured) return;

    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' },
        () => { fetchBookings(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    saveBooking,
    deleteBooking,
    createBooking,
    updateBooking,
    refetch: fetchBookings,
  };
}
