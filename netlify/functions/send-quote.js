import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function calcPricing(booking) {
  const nights = Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000);
  const nRooms = (booking.room_ids || []).length;

  let ppn;
  if (booking.contributor_rate) {
    ppn = booking.contributor_rate;
  } else {
    const bookedOn = booking.booked_on || new Date().toISOString().slice(0, 10);
    const TIERS = [{ deadline: '2026-05-20' }, { deadline: '2026-07-01' }, { deadline: null }];
    const RATES = [
      { '1-2': 200, '3-5': 185, '6+': 170 },
      { '1-2': 270, '3-5': 265, '6+': 255 },
      { '1-2': 320, '3-5': 305, '6+': 290 },
    ];
    let ti = TIERS.length - 1;
    for (let i = 0; i < TIERS.length; i++) {
      if (TIERS[i].deadline && bookedOn < TIERS[i].deadline) { ti = i; break; }
    }
    const bucket = nights <= 2 ? '1-2' : nights <= 5 ? '3-5' : '6+';
    ppn = RATES[ti][bucket];
  }

  const total = nights * ppn * nRooms;
  const deposit = Math.round(total * 0.30);
  return { nights, nRooms, ppn, total, deposit };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { bookingId } = JSON.parse(event.body);

    if (!bookingId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing bookingId' }) };
    }

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('Fetch booking error:', fetchError);
      return { statusCode: 404, body: 'Booking not found' };
    }

    if (!booking.email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Booking has no email' }) };
    }

    const isInvited = booking.invited === true;
    const { nights, nRooms, total, deposit } = calcPricing(booking);

    // Create Stripe session only for paying guests
    let stripeUrl = '';
    if (!isInvited) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: booking.email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Chateaumoulin — Booking deposit (30%)',
              description: `Booking #${bookingId.slice(0, 8)}`,
            },
            unit_amount: deposit * 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.URL || 'http://localhost:3000'}/cancel`,
        metadata: { booking_id: bookingId },
      });
      stripeUrl = session.url;
    }

    const checkInDate = new Date(booking.check_in).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const checkOutDate = new Date(booking.check_out).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const firstName = (booking.first_name || booking.guest_name?.split(' ')[0] || 'Guest');
    const imgBase = 'https://raw.githubusercontent.com/Masomenos-bot/chateaumoulin-booking/main/public';

    // Greeting text differs for invited vs paying
    const greetingText = isInvited
      ? `We're happy to let you know that a stay at Chateaumoulin has been reserved for you as our guest. No payment needed — just pack your bags.`
      : `We've reserved the following dates for you at Chateaumoulin. To confirm your booking, please pay the 30% deposit using the link below.`;

    // Deposit row differs for invited vs paying
    const depositRow = isInvited
      ? `<span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; display:block; margin-bottom:4px;">DEPOSIT</span>
         <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#999; text-decoration:line-through;">${deposit} &euro;</span>
         <span style="font-family:'Courier New',Courier,monospace; font-size:10px; font-weight:700; letter-spacing:0.1em; color:#000; margin-left:6px;">INVITED</span>`
      : `<span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; display:block; margin-bottom:4px;">DEPOSIT (30%)</span>
         <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000; font-weight:700;">${deposit} &euro;</span>`;

    // Pay button only for paying guests
    const payButton = isInvited ? '' : `
        <tr>
          <td style="padding:28px 0 0;" align="center">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="background:#000; padding:0 0 4px 0;">
                <table cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="background:#000; padding:0 4px 0 0;">
                    <a href="${stripeUrl}" target="_blank" style="display:block; background-color:#A8D4B8; padding:14px 40px; border:3px solid #000; text-decoration:none;">
                      <span style="font-family:'Courier New',Courier,monospace; font-size:12px; font-weight:700; letter-spacing:0.14em; color:#000; text-transform:uppercase;">PAY DEPOSIT &middot; ${deposit} &euro;</span>
                    </a>
                  </td>
                </tr></table>
              </td>
            </tr></table>
          </td>
        </tr>`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background-color:#F5F3ED;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3ED; padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#F5F3ED;">

        <!-- Eye GIF -->
        <tr>
          <td align="center" style="padding:0 0 20px; text-align:center;">
            <img src="${imgBase}/eye.gif" alt="Eye" width="80" height="80" style="display:inline-block; margin:0 auto;" />
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td align="center" style="padding:0 0 16px;">
            <span style="font-family:'Arial','Helvetica Neue','Helvetica',sans-serif; font-size:24px; font-weight:700; letter-spacing:0.05em; color:#000; text-transform:uppercase;">CHATEAUMOULIN</span>
          </td>
        </tr>
        <tr><td><div style="border-top:1px solid #000;"></div></td></tr>

        <!-- Badge -->
        <tr>
          <td style="padding:28px 0 0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0" border="0"><tr>
                    <td style="background:#000; padding:0 0 4px 0;">
                      <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="background:#000; padding:0 4px 0 0;">
                          <div style="background-color:#8B9DC3; padding:5px 12px; border:3px solid #000;">
                            <span style="font-family:'Courier New',Courier,monospace; font-size:10px; font-weight:700; letter-spacing:0.12em; color:#000; text-transform:uppercase;">${isInvited ? 'INVITED' : 'QUOTE'}</span>
                          </div>
                        </td>
                      </tr></table>
                    </td>
                  </tr></table>
                </td>
                <td style="padding-left:10px; vertical-align:middle;">
                  <span style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#000;">#${bookingId.slice(0, 8).toUpperCase()}</span>
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
              ${greetingText}
            </p>
          </td>
        </tr>

        <!-- Booking details card -->
        <tr>
          <td style="padding:24px 0 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td style="background:#000; padding:0 0 4px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                  <td style="background:#000; padding:0 4px 0 0;">
                    <div style="background:#fff; border:2px solid #000; padding:20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom:18px;" width="50%">
                            <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; display:block; margin-bottom:4px;">CHECK-IN</span>
                            <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${checkInDate}</span>
                          </td>
                          <td style="padding-bottom:18px;" width="50%">
                            <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; display:block; margin-bottom:4px;">CHECK-OUT</span>
                            <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${checkOutDate}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom:18px;">
                            <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; display:block; margin-bottom:4px;">NIGHTS</span>
                            <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${nights}</span>
                          </td>
                          <td style="padding-bottom:18px;">
                            <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; display:block; margin-bottom:4px;">ROOMS</span>
                            <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${nRooms}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom:4px;">
                            <span style="font-family:'Courier New',Courier,monospace; font-size:9px; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; display:block; margin-bottom:4px;">TOTAL</span>
                            <span style="font-family:'Courier New',Courier,monospace; font-size:12px; color:#000;">${total} &euro;</span>
                          </td>
                          <td style="padding-bottom:4px;">
                            ${depositRow}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr></table>
              </td>
            </tr></table>
          </td>
        </tr>

        ${payButton}

        <!-- Extras note -->
        <tr>
          <td style="padding:20px 0 0;">
            <p style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#000; margin:0; line-height:1.7;">
              Drinks, snacks, and any other treats enjoyed on-site would be on you — all settled on the spot, no surprises.
            </p>
          </td>
        </tr>

        <!-- Request modification -->
        <tr>
          <td style="padding:16px 0 0;">
            <p style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#000; margin:0; line-height:1.7;">
              Need to adjust your dates? <a href="mailto:chateaumoulin@masomenos.fr?subject=Date%20modification%20request%20%E2%80%94%20%23${bookingId.slice(0, 8).toUpperCase()}&body=Hi%2C%0A%0AI%E2%80%99d%20like%20to%20modify%20the%20dates%20for%20my%20booking%20%23${bookingId.slice(0, 8).toUpperCase()}.%0A%0ANew%20preferred%20dates%3A%0ACheck-in%3A%20%0ACheck-out%3A%20%0A%0AThanks!" style="color:#000; text-decoration:underline; font-weight:700;">Request a date change</a>
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:24px 0 0;"><div style="border-top:1px solid #e0dcd0;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0;">
            <p style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#000; margin:0; line-height:1.7;">
              Questions? Write to us at <a href="mailto:chateaumoulin@masomenos.fr" style="color:#000; text-decoration:underline;">chateaumoulin@masomenos.fr</a>
            </p>
            <p style="font-family:'Courier New',Courier,monospace; font-size:10px; color:#000; margin:8px 0 0; line-height:1.5;">
              This is an automated message — please do not reply to this email.
            </p>
          </td>
        </tr>

        <!-- Branding -->
        <tr>
          <td align="center" style="padding:32px 0 0; text-align:center;">
            <div style="text-align:center;">
              <img src="${imgBase}/bonvoyage.gif" alt="Bon Voyage" width="84" height="84" style="display:inline-block; margin-bottom:12px;" />
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

    const subjectPrefix = isInvited ? 'You\'re Invited' : 'Your Booking Quote';
    const emailResponse = await resend.emails.send({
      from: 'Chateaumoulin <chateaumoulin@world.masomenos.fr>',
      to: booking.email,
      subject: `${subjectPrefix} — Chateaumoulin #${bookingId.slice(0, 8).toUpperCase()}`,
      html: emailHtml,
    });

    console.log(`Quote email sent to ${booking.email}`, emailResponse);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, email: booking.email }),
    };
  } catch (error) {
    console.error('Send quote error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
