/* Data model, defaults, pricing, validation and email content. No DOM code here. */
(function () {
  const STATUSES = [
    { id: 'pending', label: 'Pending', line: 'We have received your order and it is waiting to be confirmed.' },
    { id: 'confirmed', label: 'Confirmed', line: 'Your order has been confirmed.' },
    { id: 'in_progress', label: 'In progress', line: 'We are now working on your order.' },
    { id: 'shipped', label: 'Shipped', line: 'Your order has been shipped and is on its way to you.' },
    { id: 'delivered', label: 'Delivered', line: 'Your order has been delivered. Thank you for your order.' }
  ];

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  const LATER = ['BDM-030', 'BDM-040', 'BDM-050'];
  const EARLY = ['BDM-010', 'BDM-020'];
  const colour = (name, models, std, exp) => ({
    id: uid(), name, models: [...models],
    standard: { available: std != null, price: std ?? 30 },
    express: { available: exp != null, price: exp ?? 37 }
  });

  function defaultSettings() {
    return {
      businessNames: { cs: 'ClearSense', hack: 'Hackulator' },
      cs: {
        models: ['BDM-010', 'BDM-020', 'BDM-030', 'BDM-040', 'BDM-050'],
        colours: [
          colour('Clear', EARLY, 30, null),
          colour('Purple Tinted Clear', EARLY, 30, null),
          colour('Black', LATER, null, 37),
          colour('Scarlet', LATER, null, 37),
          colour('Grey with Black Buttons', LATER, 30, 37),
          colour('Emerald Clear', LATER, 30, null),
          colour('Purple Clear', LATER, 30, null),
          colour('Black Clear', LATER, 30, null),
          colour('Lime Green Clear', LATER, 30, 35),
          colour('Dragon', LATER, null, 44),
          colour('Anime', LATER, null, 44)
        ],
        addons: [
          { id: uid(), name: 'Keep original buttons', price: 0 },
          { id: uid(), name: 'Keep original triggers', price: 0 },
          { id: uid(), name: 'Keep original joysticks', price: 0 }
        ],
        expressWording: '2 to 5 days after receiving the controller',
        standardWording: '2 to 5 weeks after receiving the controller'
      },
      hack: {
        basePrice: 30,
        extraGamePrice: 1,
        includedGames: ['2048', 'Snake', 'Tetris']
      },
      email: {
        host: '', port: 587, user: '', fromName: 'ClearSense and Hackulator', fromEmail: '',
        signOff: 'Thanks,\nThe ClearSense and Hackulator team'
      }
    };
  }

  function emptyDB() {
    return { version: 1, settings: defaultSettings(), orders: [], security: null };
  }

  // Fill in anything missing from older saved data so new settings never break.
  function migrate(db) {
    const d = emptyDB();
    if (!db || typeof db !== 'object') return d;
    const s = db.settings || {};
    return {
      version: 1,
      security: db.security || null,
      orders: Array.isArray(db.orders) ? db.orders : [],
      settings: {
        businessNames: { ...d.settings.businessNames, ...(s.businessNames || {}) },
        cs: { ...d.settings.cs, ...(s.cs || {}) },
        hack: { ...d.settings.hack, ...(s.hack || {}) },
        email: { ...d.settings.email, ...(s.email || {}) }
      }
    };
  }

  const money = (n) => '£' + (Math.round(Number(n || 0) * 100) / 100).toFixed(2);
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

  function coloursFor(settings, model) {
    return settings.cs.colours.filter((c) => c.models.includes(model) && (c.standard.available || c.express.available));
  }

  function deliveryOptions(colourObj) {
    if (!colourObj) return [];
    const out = [];
    if (colourObj.express.available) out.push({ id: 'express', label: 'Express', price: num(colourObj.express.price) });
    if (colourObj.standard.available) out.push({ id: 'standard', label: 'Non express', price: num(colourObj.standard.price) });
    return out;
  }

  function deliveryText(settings, id) {
    return id === 'express'
      ? 'Express, ' + settings.cs.expressWording
      : 'Non express, ' + settings.cs.standardWording;
  }

  function csPrice(settings, colourId, delivery, addonIds) {
    const c = settings.cs.colours.find((x) => x.id === colourId);
    const opt = deliveryOptions(c).find((o) => o.id === delivery);
    if (!opt) return null;
    const extras = (addonIds || []).reduce((sum, id) => {
      const a = settings.cs.addons.find((x) => x.id === id);
      return sum + (a ? num(a.price) : 0);
    }, 0);
    return opt.price + extras;
  }

  function parseGames(text) {
    return String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  }

  function hackPrice(settings, extraGames) {
    return num(settings.hack.basePrice) + extraGames.length * num(settings.hack.extraGamePrice);
  }

  function validateSerial(serial, prefix) {
    if (!serial) return 'Serial number is required.';
    if (serial.length !== 10) return `Serial number must be exactly 10 characters (currently ${serial.length}).`;
    if (!serial.startsWith(prefix)) return `Serial number must start with ${prefix}.`;
    if (!/^[A-Z0-9]+$/.test(serial)) return 'Serial number can only contain letters and numbers.';
    return null;
  }

  function nextOrderId(orders, business) {
    const prefix = business === 'cs' ? 'CLEAR-' : 'HACK-';
    let max = 0;
    for (const o of orders) {
      if (o.business !== business) continue;
      const m = String(o.orderId).toUpperCase().match(/^[A-Z]+-(\d+)$/);
      if (m && String(o.orderId).toUpperCase().startsWith(prefix)) max = Math.max(max, parseInt(m[1], 10));
    }
    return prefix + String(max + 1).padStart(3, '0');
  }

  function statusLabel(id) { return (STATUSES.find((s) => s.id === id) || { label: id }).label; }

  function orderLines(settings, o) {
    const lines = [['Order ID', o.orderId], ['Serial number', o.serial]];
    if (o.business === 'cs') {
      lines.push(['Controller', o.model]);
      lines.push(['Colour', o.colourName]);
      lines.push(['Delivery', deliveryText(settings, o.delivery)]);
      lines.push(['Installation', 'Included']);
      if (o.addonNames && o.addonNames.length) lines.push(['Options', o.addonNames.join(', ')]);
    } else {
      lines.push(['Donor calculator', o.donor]);
      lines.push(['Included games', (o.includedGames || []).join(', ')]);
      if (o.extraGames && o.extraGames.length) lines.push(['Extra games', o.extraGames.join(', ')]);
    }
    lines.push(['Price', money(o.price)]);
    return lines;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function buildStatusEmail(settings, o) {
    const biz = settings.businessNames[o.business];
    const st = STATUSES.find((s) => s.id === o.status) || STATUSES[0];
    const first = String(o.customerName || '').trim().split(/\s+/)[0] || 'there';
    const lines = orderLines(settings, o);
    const subject = `${biz} order ${o.orderId}: ${st.label}`;
    const signOff = settings.email.signOff || '';
    const text = [
      `Hi ${first},`,
      '',
      `Your ${biz} order ${o.orderId} is now: ${st.label}.`,
      st.line,
      '',
      'Order details',
      ...lines.map(([k, v]) => `${k}: ${v}`),
      '',
      signOff
    ].join('\n');
    const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1C1F2B;max-width:560px;line-height:1.5">
<p>Hi ${esc(first)},</p>
<p>Your ${esc(biz)} order <b>${esc(o.orderId)}</b> is now: <b style="color:#C8412F">${esc(st.label)}</b>.<br>${esc(st.line)}</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px">
${lines.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#7D7F88;border-top:1px solid #E6DDCE;width:40%">${esc(k)}</td><td style="padding:6px 0;border-top:1px solid #E6DDCE">${esc(v)}</td></tr>`).join('\n')}
</table>
<p>${esc(signOff).replace(/\n/g, '<br>')}</p></div>`;
    return { to: o.customerEmail, subject, text, html };
  }

  function customers(orders) {
    const map = new Map();
    for (const o of orders) {
      const key = String(o.customerEmail || '').trim().toLowerCase() || 'no-email:' + o.customerName;
      if (!map.has(key)) map.set(key, { key, email: o.customerEmail, name: o.customerName, orders: [], total: 0, last: 0 });
      const c = map.get(key);
      c.orders.push(o);
      c.total += num(o.price);
      if (o.createdAt > c.last) { c.last = o.createdAt; c.name = o.customerName; }
    }
    const list = [...map.values()];
    list.forEach((c) => c.orders.sort((a, b) => b.createdAt - a.createdAt));
    return list.sort((a, b) => b.last - a.last);
  }

  async function hashPasscode(passcode, salt) {
    const bytes = new TextEncoder().encode(salt + ':' + passcode);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  window.OT = {
    STATUSES, uid, emptyDB, migrate, money, num, coloursFor, deliveryOptions, deliveryText,
    csPrice, parseGames, hackPrice, validateSerial, nextOrderId, statusLabel, orderLines,
    buildStatusEmail, customers, hashPasscode, esc
  };
})();
