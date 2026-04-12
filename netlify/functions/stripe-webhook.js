import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            paid: true,
            stripe_session_id: session.id,
            stripe_payment_id: session.payment_intent,
          })
          .eq('id', bookingId);

        if (error) {
          console.error('Supabase update error:', error);
          return { statusCode: 500, body: 'Database update failed' };
        }

        console.log(`Booking ${bookingId} confirmed via Stripe`);
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
