// GET /api/serial?sn=CS...: does this order serial exist? Shows only model, colour and status.
import { lookup } from './_lib/serials.js';

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Use GET.' }); }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'Too many checks. Please wait a minute.' });
  const sn = String((req.query && req.query.sn) || new URL(req.url, 'http://x').searchParams.get('sn') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^CS[A-Z0-9]{8}$/.test(sn)) return res.status(400).json({ ok: false, error: 'The serial number is 10 characters and starts with CS.' });
  const r = await lookup(sn);
  if (!r.ready) return res.status(503).json({ ok: false, error: "We can't check serial numbers right now." });
  return res.status(200).json({ ok: true, ...r });
}
