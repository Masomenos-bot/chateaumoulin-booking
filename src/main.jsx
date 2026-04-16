import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/booking.css';
import AdminApp from './components/AdminApp';
import GuestBooking from './components/GuestBooking';

function Root() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest-facing booking page */}
        <Route path="/" element={<GuestBooking />} />
        <Route path="/book" element={<GuestBooking />} />

        {/* Admin dashboard */}
        <Route path="/admin" element={<AdminApp />} />

        {/* Payment return pages */}
        <Route path="/success" element={<PaymentSuccess />} />
        <Route path="/cancel" element={<PaymentCancel />} />
      </Routes>
    </BrowserRouter>
  );
}

function PaymentSuccess() {
  return (
    <div style={{
      fontFamily: "'Courier New', monospace",
      background: '#F5F3ED',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 40,
    }}>
      <div>
        <img src="/eye.gif" alt="Confirmed" style={{ height: 80, marginBottom: 20, display: 'block', margin: '0 auto 20px' }} />
        <h1 style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 26, marginBottom: 12 }}>
          Booking confirmed
        </h1>
        <p style={{ color: '#000', fontSize: 15, maxWidth: 400 }}>
          Your deposit has been received. You'll get a confirmation email shortly.
        </p>
        <a href="/" style={{
          display: 'inline-block',
          marginTop: 24,
          padding: '10px 24px',
          border: '2px solid #000',
          color: '#000',
          textDecoration: 'none',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          BACK
        </a>
      </div>
    </div>
  );
}

function PaymentCancel() {
  return (
    <div style={{
      fontFamily: "'Courier New', monospace",
      background: '#F5F3ED',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 40,
    }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✕</div>
        <h1 style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 26, marginBottom: 12 }}>
          Payment cancelled
        </h1>
        <p style={{ color: '#000', fontSize: 15, maxWidth: 400 }}>
          Your booking is pending. You can retry the payment or contact us.
        </p>
        <a href="/" style={{
          display: 'inline-block',
          marginTop: 24,
          padding: '10px 24px',
          border: '2px solid #000',
          color: '#000',
          textDecoration: 'none',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          TRY AGAIN
        </a>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
