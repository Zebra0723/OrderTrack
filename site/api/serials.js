// POST /api/serials: OrderTrack sends the current list of order serials.
import { clean, keyOk, save, syncReady } from './_lib/serials.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Use POST.' }); }
  if (!syncReady()) return res.status(503).json({ ok: false, error: 'The website is missing SYNC_TOKEN or a connected Blob store.' });
  if (!keyOk(req.headers.authorization)) return res.status(401).json({ ok: false, error: 'Wrong sync key. Copy it from OrderTrack into SYNC_TOKEN in Vercel, then redeploy.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const serials = clean(body && body.orders);
  try {
    await save(serials);
  } catch (err) {
    console.error('serials: save failed', err && err.message);
    return res.status(502).json({ ok: false, error: 'The website could not store the list.' });
  }
  return res.status(200).json({ ok: true, count: Object.keys(serials).length });
}
