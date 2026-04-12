import { loadStripe } from '@stripe/stripe-js';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

let stripePromise = null;

export function getStripe() {
  if (!stripePromise && stripeKey) {
    stripePromise = loadStripe(stripeKey);
  }
  return stripePromise;
}

/**
 * Redirect to Stripe Checkout for a 30% deposit.
 * Calls our Netlify function which creates the session server-side.
 */
export async function redirectToCheckout(bookingId, amount, guestEmail) {
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, amount, email: guestEmail }),
  });

  if (!res.ok) {
    throw new Error('Failed to create checkout session');
  }

  const { sessionId } = await res.json();
  const stripe = await getStripe();

  if (stripe) {
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) throw error;
  }
}
