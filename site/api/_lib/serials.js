// The list of real Chameleon order serials, sent by OrderTrack on the owner's Mac.
// Kept in Vercel Blob (connect a Blob store to the project), under a path derived
// from SYNC_TOKEN so it cannot be guessed. Only serial, model, colour, status and
// order date are kept: nothing about the customer.
import crypto from 'node:crypto';
import fs from 'node:fs';

const STATUS = {
  pending: 'Order received', confirmed: 'Confirmed', in_progress: 'Being fitted',
  shipped: 'On its way', delivered: 'Delivered', cancelled: 'Cancelled'
};

export function syncReady() {
  return !!process.env.SYNC_TOKEN && (!!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.SERIALS_FILE);
}

function blobPath() {
  const h = crypto.createHash('sha256').update('chameleon-serials:' + (process.env.SYNC_TOKEN || '')).digest('hex').slice(0, 40);
  return `serials/${h}.json`;
}

/** Is this the key OrderTrack was given? Compared in constant time. */
export function keyOk(header) {
  const want = process.env.SYNC_TOKEN || '';
  const got = String(header || '').replace(/^Bearer\s+/i, '');
  if (want.length < 20 || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export function clean(orders) {
  const out = {};
  for (const o of Array.isArray(orders) ? orders.slice(0, 50000) : []) {
    const serial = String(o && o.serial || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^CS[A-Z0-9]{8}$/.test(serial)) continue;
    out[serial] = {
      model: String(o.model || '').slice(0, 20),
      colour: String(o.colour || '').slice(0, 60),
      status: STATUS[o.status] ? o.status : 'pending',
      created: Number(o.createdAt) > 0 ? new Date(Number(o.createdAt)).toISOString().slice(0, 10) : null
    };
  }
  return out;
}

export async function save(serials) {
  const body = JSON.stringify({ updated: new Date().toISOString(), serials });
  if (process.env.SERIALS_FILE) { fs.writeFileSync(process.env.SERIALS_FILE, body); cache = null; return; }
  const { put } = await import('@vercel/blob');
  await put(blobPath(), body, { access: 'public', addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
  cache = null;
}

let cache = null;
export async function load() {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  let data = null;
  if (process.env.SERIALS_FILE) {
    try { data = JSON.parse(fs.readFileSync(process.env.SERIALS_FILE, 'utf8')); } catch { data = null; }
  } else {
    const { head } = await import('@vercel/blob');
    try {
      const meta = await head(blobPath());
      const res = await fetch(`${meta.url}?v=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) data = await res.json();
    } catch { data = null; }
  }
  cache = { at: Date.now(), data };
  return data;
}

/** What the public may see about a serial, or null if it does not exist. */
export async function lookup(serial) {
  const data = await load();
  if (!data) return { ready: false };
  const o = data.serials && data.serials[String(serial).toUpperCase()];
  if (!o) return { ready: true, found: false };
  return {
    ready: true, found: true,
    model: o.model, colour: o.colour, status: o.status, statusText: STATUS[o.status] || 'Order received',
    ordered: o.created ? new Date(o.created).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null
  };
}
