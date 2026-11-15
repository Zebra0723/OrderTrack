// Local API that lets Comet (the iMessage assistant on this Mac) read the catalogue and
// create orders. It listens on 127.0.0.1 only, needs the token shown in Settings, and
// refuses browser requests. Orders are created by the app window so they go through the
// same validation, stock and cost logic as orders typed in by hand.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Reuse the app's own pricing and catalogue helpers (src/data.js) in the main process.
function loadOT() {
  const sandbox = {};
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(__dirname, 'src', 'data.js'), 'utf8'))(sandbox);
  return sandbox.OT;
}

const MAX_BODY = 64 * 1024;

class CometApi {
  constructor({ getWindow, version }) {
    this.OT = loadOT();
    this.getWindow = getWindow;
    this.version = version;
    this.data = null;
    this.server = null;
    this.listening = null; // { port, token }
    this.pending = new Map();
  }

  /** Called with the latest saved data. Starts, stops or restarts the server to match Settings. */
  update(data) {
    this.data = data ? this.OT.migrate(data) : null;
    const c = (this.data && this.data.settings.comet) || {};
    const want = c.enabled && c.token ? { port: Number(c.port) || 8790, token: String(c.token) } : null;
    const same = want && this.listening && want.port === this.listening.port && want.token === this.listening.token;
    if (same) return;
    this.stop();
    if (want) this.start(want);
  }

  stop() {
    if (this.server) { this.server.close(); this.server = null; }
    this.listening = null;
  }

  start(cfg) {
    const server = http.createServer((req, res) => this.handle(req, res, cfg).catch((err) => {
      this.send(res, 500, { ok: false, error: 'Internal error: ' + err.message });
    }));
    server.on('error', (err) => { console.error('Comet API could not start:', err.message); this.listening = null; });
    server.listen(cfg.port, '127.0.0.1');
    this.server = server;
    this.listening = cfg;
  }

  send(res, code, body) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  }

  authorised(req, token) {
    const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(got), b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async handle(req, res, cfg) {
    // Web pages can reach localhost; they always send Origin, Comet never does.
    if (req.headers.origin) return this.send(res, 403, { ok: false, error: 'Browser requests are not allowed' });
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return this.send(res, 200, { ok: true, app: 'OrderTrack', version: this.version });
    }
    if (!this.authorised(req, cfg.token)) return this.send(res, 401, { ok: false, error: 'Missing or wrong token' });
    if (!this.data) return this.send(res, 503, { ok: false, error: 'OrderTrack has not loaded its data yet' });

    if (url.pathname === '/api/catalog' && req.method === 'GET') return this.send(res, 200, { ok: true, catalog: this.catalog() });
    if (url.pathname === '/api/orders' && req.method === 'POST') {
      const body = await readJson(req);
      if (!body.ok) return this.send(res, 400, { ok: false, error: body.error });
      const result = await this.createOrder(body.value);
      return this.send(res, result.ok ? 201 : 422, result);
    }
    // People the owner asked Comet to contact, waiting for Comet to text them.
    if (url.pathname === '/api/outreach' && req.method === 'GET') {
      const queued = (this.data.outreach || []).filter((x) => x.status === 'queued');
      return this.send(res, 200, { ok: true, requests: queued.map((x) => ({
        id: x.id, name: x.name || '', contact: x.contact, business: x.business, product: x.product || '', note: x.note || '', createdAt: x.createdAt
      })) });
    }
    const m = url.pathname.match(/^\/api\/outreach\/([A-Za-z0-9_-]{1,40})$/);
    if (m && req.method === 'POST') {
      const body = await readJson(req);
      if (!body.ok) return this.send(res, 400, { ok: false, error: body.error });
      const status = body.value.status;
      if (!['sent', 'failed'].includes(status)) return this.send(res, 400, { ok: false, error: 'status must be sent or failed' });
      const result = await this.askWindow('api:outreachUpdate', { id: m[1], status, error: String(body.value.error || '').slice(0, 300) });
      return this.send(res, result.ok ? 200 : 404, result);
    }
    return this.send(res, 404, { ok: false, error: 'Not found' });
  }

  /** What Comet may offer: models, colours per model with delivery prices and stock, options. */
  catalog() {
    const OT = this.OT, s = this.data.settings;
    const stockOf = (x) => (x && x.stock != null ? { tracked: true, inStock: Math.max(Number(x.stock) || 0, 0) } : { tracked: false });
    return {
      businesses: { cs: s.businessNames.cs, hack: s.businessNames.hack },
      cs: {
        models: s.cs.models,
        modelFromSerialDigit: { 1: 'BDM-010', 2: 'BDM-020', 3: 'BDM-030', 4: 'BDM-040', 5: 'BDM-050' },
        colours: s.cs.colours.filter((c) => OT.deliveryOptions(c).length).map((c) => ({
          id: c.id,
          name: c.name,
          models: c.models,
          extremerateUrl: c.extremerateUrl || '',
          delivery: OT.deliveryOptions(c).map((d) => ({
            type: d.id, label: d.label, price: d.price,
            wording: d.id === 'express' ? s.cs.expressWording : s.cs.standardWording,
            ...stockOf(c[d.id])
          }))
        })),
        options: s.cs.addons.map((a) => ({ id: a.id, name: a.name, price: Number(a.price) || 0 })),
        installationIncluded: true
      },
      hack: { basePrice: Number(s.hack.basePrice) || 0, extraGamePrice: Number(s.hack.extraGamePrice) || 0, includedGames: s.hack.includedGames },
      payment: { methods: ['upfront', 'finance'], financeFrequencies: ['weekly', 'monthly'], financeMinPayments: 2, financeMaxPayments: 52 }
    };
  }

  /** Hands the order to the app window, which validates and saves it. */
  createOrder(payload) {
    return this.askWindow('api:createOrder', payload);
  }

  /** Sends a request to the app window (which owns the data) and waits for its answer. */
  askWindow(channel, payload) {
    const win = this.getWindow();
    if (!win) return Promise.resolve({ ok: false, error: 'The OrderTrack window is not open' });
    const reqId = crypto.randomUUID();
    const result = new Promise((resolve) => {
      const timer = setTimeout(() => { this.pending.delete(reqId); resolve({ ok: false, error: 'OrderTrack did not respond in time' }); }, 15000);
      this.pending.set(reqId, (r) => { clearTimeout(timer); this.pending.delete(reqId); resolve(r); });
    });
    win.webContents.send(channel, { reqId, payload });
    return result;
  }

  respond(reqId, result) {
    const fn = this.pending.get(reqId);
    if (fn) fn(result);
  }
}

function readJson(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { resolve({ ok: false, error: 'Body too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve({ ok: true, value: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }); } catch { resolve({ ok: false, error: 'Body is not valid JSON' }); }
    });
    req.on('error', () => resolve({ ok: false, error: 'Could not read body' }));
  });
}

module.exports = { CometApi };
