// Sends the Chameleon website the list of real order serials, so its repair form
// only accepts serials that exist. Only what the site shows is sent: serial, model,
// colour, status and order date. No names, emails, phone numbers or prices.
const crypto = require('crypto');

const DELAY_MS = 4000;
const RETRY_MS = 5 * 60_000;

class WebsiteSync {
  constructor() {
    this.timer = null;
    this.retry = null;
    this.lastHash = '';
    this.state = { ok: null, at: null, count: 0, error: '' };
  }

  static payload(data) {
    const orders = (data.orders || [])
      .filter((o) => o && o.business === 'cs' && o.serial)
      .map((o) => ({
        serial: String(o.serial).toUpperCase(),
        model: o.model || '',
        colour: o.colourName || '',
        status: o.status || 'pending',
        createdAt: o.createdAt || null
      }));
    return { orders, sentAt: Date.now() };
  }

  /** Called whenever OrderTrack saves; sends shortly after, if anything changed. */
  update(data) {
    this.data = data;
    const w = (data && data.settings && data.settings.website) || {};
    clearTimeout(this.timer);
    if (!w.enabled || !w.url || !w.key) return;
    this.timer = setTimeout(() => this.send(false), DELAY_MS);
  }

  async send(force) {
    const data = this.data;
    const w = (data && data.settings && data.settings.website) || {};
    if (!w.enabled || !w.url || !w.key) return this.state;
    const body = WebsiteSync.payload(data);
    const hash = crypto.createHash('sha256').update(w.url + w.key + JSON.stringify(body.orders)).digest('hex');
    if (!force && hash === this.lastHash && this.state.ok) return this.state;
    clearTimeout(this.retry);
    try {
      const url = String(w.url).replace(/\/+$/, '') + '/api/serials';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${w.key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || `The website answered ${res.status}`);
      this.lastHash = hash;
      this.state = { ok: true, at: Date.now(), count: body.orders.length, error: '' };
    } catch (err) {
      this.state = { ok: false, at: Date.now(), count: body.orders.length, error: String((err && err.message) || err).slice(0, 200) };
      this.retry = setTimeout(() => this.send(false), RETRY_MS);
      if (this.retry.unref) this.retry.unref();
    }
    return this.state;
  }
}

module.exports = { WebsiteSync };
