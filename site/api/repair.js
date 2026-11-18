// POST /api/repair: checks a repair ticket and emails it to the Chameleon team,
// with a copy to the customer.
//
// Email goes out through Resend (RESEND_API_KEY) if set, otherwise through SMTP
// (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS), for example Gmail with an app password.
// TICKET_TO sets where tickets go (default clearsense@dailyos.uk), MAIL_FROM the sender.
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const TO = process.env.TICKET_TO || 'clearsense@dailyos.uk';
const REASONS = ['Button not working', 'Trigger not working', 'Joystick not working', 'Broken parts', 'Touchpad malfunction', 'Other'];

// A light per-instance limit; the honeypot and timing check catch most bots.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim().slice(0, max);

export function validate(body) {
  const b = body && typeof body === 'object' ? body : {};
  const t = {
    serial: clean(b.serial, 20).toUpperCase().replace(/\s/g, ''),
    name: clean(b.name, 120).replace(/\s+/g, ' '),
    email: clean(b.email, 200).toLowerCase(),
    reason: clean(b.reason, 40),
    other: clean(b.other, 1000)
  };
  if (!/^CS[A-Z0-9]{8}$/.test(t.serial)) return { error: 'The serial number is 10 characters and starts with CS.' };
  if (t.name.length < 2 || !/\S+\s+\S+/.test(t.name)) return { error: 'Please enter your first and last name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.email)) return { error: 'Please enter a valid email address.' };
  if (!REASONS.includes(t.reason)) return { error: 'Please choose a reason for the repair.' };
  if (t.reason === 'Other' && t.other.length < 3) return { error: 'Please describe the problem.' };
  if (t.reason !== 'Other') t.other = '';
  return { ticket: t };
}

export function ticketRef(now = new Date()) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(4);
  const tail = Array.from(bytes, (x) => alphabet[x % alphabet.length]).join('');
  return `RPR-${d}-${tail}`;
}

function emailHtml(title, intro, rows, footer) {
  const tr = rows.map(([k, v]) => `<tr><td style="padding:10px 0;color:#868892;font-size:12px;letter-spacing:.1em;text-transform:uppercase;width:120px;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;color:#1A1D29;font-size:15px;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#FAF6EF;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EF;padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #ECE4D7;border-radius:18px;overflow:hidden">
    <tr><td style="background:#1A1D29;padding:22px 26px;color:#fff;font-family:Georgia,serif;font-size:22px">Chameleon <span style="color:#FF6B5A">·</span> <span style="font-size:15px;color:#C9C6D0;font-family:-apple-system,Helvetica,Arial,sans-serif">${esc(title)}</span></td></tr>
    <tr><td style="padding:24px 26px 6px;color:#464A58;font-size:15px;line-height:1.6">${intro}</td></tr>
    <tr><td style="padding:6px 26px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ECE4D7">${tr}</table></td></tr>
    <tr><td style="padding:16px 26px 22px;border-top:2px dashed #DDD2C1;color:#868892;font-size:13px">${footer}</td></tr>
  </table></td></tr></table></body></html>`;
}

async function transport() {
  if (process.env.MAIL_TRANSPORT === 'json') {
    const t = nodemailer.createTransport({ jsonTransport: true });
    return { send: async (m) => { const r = await t.sendMail(m); console.log('[mail]', r.message); } };
  }
  if (process.env.RESEND_API_KEY) {
    return {
      send: async (m) => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: m.from, to: [m.to], reply_to: m.replyTo, subject: m.subject, html: m.html, text: m.text })
        });
        if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
    };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT || 465);
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return { send: (m) => t.sendMail(m) };
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Use POST.' });
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  // Bots fill the hidden field or submit instantly: pretend it worked.
  if (body && (body.website || Number(body.elapsed) < 2500)) return res.status(200).json({ ok: true, ref: ticketRef(), confirmationSent: false });
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'Too many tickets from here. Please try again in a few minutes.' });

  const { ticket, error } = validate(body);
  if (error) return res.status(400).json({ ok: false, error });

  const mail = await transport();
  if (!mail) {
    console.error('repair: no email transport configured');
    return res.status(503).json({ ok: false, error: `Tickets are not set up yet. Please email ${TO} instead.` });
  }

  const ref = ticketRef();
  const from = process.env.MAIL_FROM || `Chameleon Repairs <${process.env.SMTP_USER || 'repairs@dailyos.uk'}>`;
  const reasonText = ticket.reason === 'Other' ? `Other: ${ticket.other}` : ticket.reason;
  const when = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' });
  const rows = [['Ticket', ref], ['Serial', ticket.serial], ['Name', ticket.name], ['Email', ticket.email], ['Reason', ticket.reason]];
  if (ticket.other) rows.push(['Details', ticket.other]);
  rows.push(['Sent', when]);

  try {
    await mail.send({
      from, to: TO, replyTo: ticket.email,
      subject: `Repair ${ref} · ${ticket.serial} · ${ticket.reason}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nReply to this email to answer the customer.',
      html: emailHtml('New repair ticket', `New repair ticket from <b>${esc(ticket.name)}</b>. Reply to this email to answer them.`, rows, 'Sent from the repair form on the Chameleon website.')
    });
  } catch (err) {
    console.error('repair: could not send ticket', err && err.message);
    return res.status(502).json({ ok: false, error: `We could not send your ticket just now. Please try again, or email ${TO}.` });
  }

  let confirmationSent = false;
  try {
    const first = ticket.name.split(' ')[0];
    await mail.send({
      from, to: ticket.email, replyTo: TO,
      subject: `Your Chameleon repair ticket ${ref}`,
      text: `Hi ${first},\n\nThanks for your repair request. We have it and will be in touch soon.\n\nTicket: ${ref}\nSerial: ${ticket.serial}\nReason: ${reasonText}\n\nReply to this email if you need to add anything.\n\nChameleon`,
      html: emailHtml('Repair ticket received', `Hi ${esc(first)}, thanks for your repair request. We have it and will be in touch soon. Keep your ticket number handy.`, [['Ticket', ref], ['Serial', ticket.serial], ['Reason', reasonText]], 'Reply to this email if you need to add anything.')
    });
    confirmationSent = true;
  } catch (err) {
    console.error('repair: confirmation not sent', err && err.message);
  }

  return res.status(200).json({ ok: true, ref, confirmationSent });
}
