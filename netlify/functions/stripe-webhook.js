import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let stripeEvent;

  try {
    const sig = event.headers['stripe-signature'];
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      try {
        // Fetch booking details from Supabase
        const { data: booking, error: fetchError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (fetchError) {
          console.error('Fetch booking error:', fetchError);
          return { statusCode: 500, body: 'Booking fetch failed' };
        }

        // Update booking status to confirmed
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            paid: true,
            stripe_session_id: session.id,
            stripe_payment_id: session.payment_intent,
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error('Supabase update error:', updateError);
          return { statusCode: 500, body: 'Database update failed' };
        }

        console.log(`Booking ${bookingId} confirmed via Stripe`);

        // Send confirmation email via Resend
        const checkInDate = new Date(booking.check_in).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const checkOutDate = new Date(booking.check_out).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const emailHtml = `
          <h2>Booking Confirmation — Châteaumoulin</h2>
          <p>Dear ${booking.guest_name},</p>
          <p>Your booking has been confirmed! Here are your reservation details:</p>
          <div style="background: #f5f3ed; padding: 20px; margin: 20px 0; border-left: 4px solid #E91E7A;">
            <p><strong>Booking Reference:</strong> ${bookingId.slice(0, 8).toUpperCase()}</p>
            <p><strong>Check-in:</strong> ${checkInDate}</p>
            <p><strong>Check-out:</strong> ${checkOutDate}</p>
            <p><strong>Rooms:</strong> ${booking.room_ids.length}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
            <p><strong>Deposit Paid:</strong> €${(booking.total_price * 0.3 / 100).toFixed(2)}</p>
          </div>
          <p>We look forward to welcoming you at Châteaumoulin!</p>
          <p>If you have any questions, please contact us at contact@welcometomasomenos.com</p>
          <p>Best regards,<br />The Châteaumoulin Team</p>
        `;

        console.log('About to send email via Resend');
        console.log(`Email to: ${booking.email}`);
        console.log(`From: chateaumoulin@shop.masomenos.fr`);
        console.log(`Resend API Key exists: ${!!process.env.RESEND_API_KEY}`);

        const emailResponse = await resend.emails.send({
          from: 'chateaumoulin@shop.masomenos.fr',
          to: booking.email,
          subject: `Booking Confirmation — Châteaumoulin #${bookingId.slice(0, 8).toUpperCase()}`,
          html: emailHtml,
        });

        console.log(`Email response:`, emailResponse);
        console.log(`Confirmation email sent to ${booking.email}`);
      } catch (err) {
        console.error('Webhook processing error:', err);
        return { statusCode: 500, body: 'Processing failed' };
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
}
