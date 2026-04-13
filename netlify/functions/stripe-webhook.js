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

        const nights = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000);
        const depositAmount = (booking.total_price * 0.3 / 100).toFixed(2);
        const firstName = (booking.first_name || booking.guest_name.split(' ')[0] || 'Guest');
        const imgBase = 'https://raw.githubusercontent.com/Masomenos-bot/chateaumoulin-booking/main/public';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background-color:#F5F3ED;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3ED; padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#F5F3ED;">

        <!-- Eye GIF animated -->
        <tr>
          <td align="center" style="padding:0 0 20px; text-align:center;">
            <img src="${imgBase}/eye.gif" alt="Eye" width="40" height="40" style="display:inline-block; margin:0 auto;" />
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td align="center" style="padding:0 0 16px;">
            <span style="font-family:'Arial','Helvetica Neue','Helvetica',sans-serif; font-size:24px; font-weight:700; letter-spacing:0.05em; color:#000; text-transform:uppercase;">CHATEAUMOULIN</span>
          </td>
        </tr>
        <tr><td><div style="border-top:1px solid #000;"></div></td></tr>

        <!-- Confirmation badge -->
        <tr>
          <td style="padding:28px 0 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#F5C518; padding:5px 12px; border:3px solid #000; box-shadow: 4px 4px 0 #000; display:inline-block;">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:10px; font-weight:700; letter-spacing:0.12em; color:#000; text-transform:uppercase;">CONFIRMED</span>
                </td>
                <td style="padding-left:10px;">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#999;">#${bookingId.slice(0, 8).toUpperCase()}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:24px 0 0;">
            <p style="font-family:'Courier New',Courier,monospace; font-size:14px; color:#000; margin:0; line-height:1.7;">
              Dear ${firstName},
            </p>
            <p style="font-family:'Courier New',Courier,monospace; font-size:13px; color:#000; margin:12px 0 0; line-height:1.7;">
              Your booking at Chateaumoulin has been confirmed. Welcome to the Masomenos World community — we can't wait to host you this summer.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:24px 0 0;"><div style="border-top:1px solid #e0dcd0;"></div></td></tr>

        <!-- Booking details -->
        <tr>
          <td style="padding:24px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:18px;" width="50%">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#999; text-transform:uppercase; display:block; margin-bottom:4px;">CHECK-IN</span>
                  <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${checkInDate}</span>
                </td>
                <td style="padding-bottom:18px;" width="50%">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#999; text-transform:uppercase; display:block; margin-bottom:4px;">CHECK-OUT</span>
                  <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${checkOutDate}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:18px;">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#999; text-transform:uppercase; display:block; margin-bottom:4px;">NIGHTS</span>
                  <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${nights}</span>
                </td>
                <td style="padding-bottom:18px;">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#999; text-transform:uppercase; display:block; margin-bottom:4px;">ROOMS</span>
                  <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${booking.room_ids.length}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:18px;">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#999; text-transform:uppercase; display:block; margin-bottom:4px;">GUESTS</span>
                  <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${booking.guests}</span>
                </td>
                <td style="padding-bottom:18px;">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#999; text-transform:uppercase; display:block; margin-bottom:4px;">DEPOSIT PAID</span>
                  <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000; font-weight:700;">${depositAmount} &euro;</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td><div style="border-top:1px solid #e0dcd0;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0;">
            <p style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#999; margin:0; line-height:1.7;">
              Questions? Write to us at <a href="mailto:chateaumoulin@masomenos.fr" style="color:#000; text-decoration:underline;">chateaumoulin@masomenos.fr</a>
            </p>
            <p style="font-family:'Courier New',Courier,monospace; font-size:10px; color:#bbb; margin:8px 0 0; line-height:1.5;">
              This is an automated message — please do not reply to this email.
            </p>
          </td>
        </tr>

        <!-- Branding: globe + masomenos logo -->
        <tr>
          <td align="center" style="padding:32px 0 0; text-align:center;">
            <div style="text-align:center;">
              <img src="${imgBase}/globe.gif" alt="Masomenos" width="48" height="48" style="display:inline-block; margin-bottom:12px; border-radius:50%;" />
            </div>
            <div style="text-align:center;">
              <img src="${imgBase}/masomenos-logo.png" alt="masomenos" height="16" style="display:inline-block;" />
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
        `;

        const emailResponse = await resend.emails.send({
          from: 'Chateaumoulin <chateaumoulin@shop.masomenos.fr>',
          to: booking.email,
          subject: `Booking Confirmed — Chateaumoulin #${bookingId.slice(0, 8).toUpperCase()}`,
          html: emailHtml,
        });

        console.log(`Confirmation email sent to ${booking.email}`, emailResponse);
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
