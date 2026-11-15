/* Data model, defaults, pricing, validation and email content. No DOM code here. */
(function () {
  const STATUSES = [
    { id: 'pending', label: 'Pending', line: 'We have received your order and it is waiting to be confirmed.' },
    { id: 'confirmed', label: 'Confirmed', line: 'Your order has been confirmed.' },
    { id: 'in_progress', label: 'In progress', line: 'We are now working on your order.' },
    { id: 'shipped', label: 'Shipped', line: 'Your order has been shipped and is on its way to you.' },
    { id: 'delivered', label: 'Delivered', line: 'Your order has been delivered. Thank you for your order.' }
  ];
  // Cancelled sits outside the normal five-step flow.
  const CANCELLED = { id: 'cancelled', label: 'Cancelled', line: 'Your order has been cancelled. If you have any questions, just reply to this email.' };
  const statusInfo = (id) => STATUSES.find((s) => s.id === id) || (id === 'cancelled' ? CANCELLED : null);
  const isOpen = (o) => o.status !== 'delivered' && o.status !== 'cancelled';
  const phoneDigits = (p) => String(p || '').replace(/\D/g, '');
  function validatePhone(p) {
    if (!p) return null;
    if (!/^[+\d\s().-]+$/.test(p)) return 'Phone numbers can only use digits, spaces, +, brackets and dashes.';
    const n = phoneDigits(p).length;
    if (n < 7 || n > 15) return 'That phone number looks too short or too long.';
    return null;
  }

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  const LATER = ['BDM-030', 'BDM-040', 'BDM-050'];
  const EARLY = ['BDM-010', 'BDM-020'];
  const SWATCHES = {
    'clear': '#E4EBEF', 'purple tinted clear': '#CDB8E8', 'black': '#1F1F23', 'scarlet': '#C8102E',
    'grey with black buttons': '#9C9CA3', 'emerald clear': '#3FBF8A', 'purple clear': '#9B6BD6',
    'black clear': '#55555C', 'lime green clear': '#A6DD2E', 'dragon': '#B8452A', 'anime': '#F27AB0'
  };
  const guessSwatch = (name) => SWATCHES[String(name).toLowerCase()] || '#C9C2B6';
  const colour = (name, models, std, exp) => ({
    id: uid(), name, models: [...models], swatch: guessSwatch(name),
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
      },
      discounts: [],
      invoice: {
        address: '',
        paymentInstructions: '',
        footer: 'Thank you for your order.'
      },
      // Turnaround windows in days, counted from the day the item is received.
      turnaround: { expressMin: 2, expressMax: 5, standardMin: 14, standardMax: 35, hackMax: 14, dueSoonDays: 2 },
      // Extra parts tracked on the Stock page. stock null means not tracked.
      parts: [],
      // Costs per order, used for profit. Shell and part costs live on the colours and parts.
      costs: { postage: 0, csExtra: 0, hackExtra: 0, hackDonor: 0 },
      goals: { monthly: 0 },
      autoLockMinutes: 10
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
    if (s.cs && Array.isArray(s.cs.colours)) s.cs.colours.forEach((c) => { if (!c.swatch) c.swatch = guessSwatch(c.name); });
    return {
      version: 1,
      security: db.security || null,
      orders: Array.isArray(db.orders) ? db.orders : [],
      settings: {
        businessNames: { ...d.settings.businessNames, ...(s.businessNames || {}) },
        cs: { ...d.settings.cs, ...(s.cs || {}) },
        hack: { ...d.settings.hack, ...(s.hack || {}) },
        email: { ...d.settings.email, ...(s.email || {}) },
        discounts: Array.isArray(s.discounts) ? s.discounts : d.settings.discounts,
        invoice: { ...d.settings.invoice, ...(s.invoice || {}) },
        turnaround: { ...d.settings.turnaround, ...(s.turnaround || {}) },
        parts: Array.isArray(s.parts) ? s.parts : [],
        costs: { ...d.settings.costs, ...(s.costs || {}) },
        goals: { ...d.settings.goals, ...(s.goals || {}) },
        autoLockMinutes: s.autoLockMinutes != null ? s.autoLockMinutes : d.settings.autoLockMinutes
      }
    };
  }

  const money = (n) => {
    const v = Math.round(Number(n || 0) * 100) / 100;
    return (v < 0 ? '-£' : '£') + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
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

  // Discounts: { type: 'percent' | 'fixed', value, label }. Never takes a price below zero.
  const round2 = (n) => Math.round(n * 100) / 100;
  function discountAmount(subtotal, d) {
    if (!d) return 0;
    const v = Math.max(num(d.value), 0);
    const raw = d.type === 'percent' ? subtotal * Math.min(v, 100) / 100 : v;
    return round2(Math.min(raw, subtotal));
  }
  function discountText(d) {
    if (!d) return '';
    return d.type === 'percent' ? `${num(d.value)}% off` : `${money(d.value)} off`;
  }
  // Applies a discount to an order in place, keeping the pre-discount subtotal.
  function applyDiscount(order, d) {
    const subtotal = order.subtotal != null ? order.subtotal : order.price;
    order.subtotal = subtotal;
    if (d && discountAmount(subtotal, d) > 0) {
      const amount = discountAmount(subtotal, d);
      order.discount = { type: d.type, value: num(d.value), label: String(d.label || '').trim(), amount };
      order.price = round2(subtotal - amount);
    } else {
      order.discount = null;
      order.price = subtotal;
    }
    return order;
  }

  // Payment: { method: 'upfront', paid } or
  // { method: 'finance', frequency: 'weekly' | 'monthly', count, start: 'YYYY-MM-DD', paid: [bool] }.
  function addMonthsSafe(d, n) {
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(d.getDate(), last));
    return r;
  }
  function paymentSchedule(o) {
    const p = o.payment;
    if (!p || p.method !== 'finance') return [];
    const n = Math.max(1, Math.round(num(p.count)));
    const total = Math.round(num(o.price) * 100);
    const base = Math.floor(total / n);
    const rem = total - base * n;
    const start = new Date((p.start || new Date().toISOString().slice(0, 10)) + 'T12:00:00');
    return Array.from({ length: n }, (_, i) => {
      let due;
      if (p.frequency === 'weekly') { due = new Date(start); due.setDate(due.getDate() + 7 * i); } else due = addMonthsSafe(start, i);
      return { n: i + 1, due, amount: (base + (i < rem ? 1 : 0)) / 100, paid: !!(p.paid || [])[i] };
    });
  }
  const fmtDay = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  function paymentText(o) {
    const p = o.payment;
    if (!p || p.method !== 'finance') return 'Pay upfront';
    const s = paymentSchedule(o);
    const same = s.every((x) => x.amount === s[0].amount);
    return `Finance, ${s.length} ${p.frequency === 'weekly' ? 'weekly' : 'monthly'} payments of ${same ? '' : 'about '}${money(s[0].amount)} from ${fmtDay(s[0].due)}`;
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

  function statusLabel(id) { return (statusInfo(id) || { label: id }).label; }

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
    if (o.discount && o.discount.amount > 0) {
      lines.push(['Subtotal', money(o.subtotal)]);
      const why = o.discount.label ? `${o.discount.label}, ${discountText(o.discount)}` : discountText(o.discount);
      lines.push(['Discount', `-${money(o.discount.amount)} (${why})`]);
    }
    lines.push(['Price', money(o.price)]);
    lines.push(['Payment', paymentText(o)]);
    return lines;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function buildStatusEmail(settings, o) {
    const biz = settings.businessNames[o.business];
    const st = statusInfo(o.status) || STATUSES[0];
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

  // One customer per email; customers with no email are matched by phone, then by name.
  function customerKey(o) {
    const email = String(o.customerEmail || '').trim().toLowerCase();
    if (email) return email;
    const ph = phoneDigits(o.customerPhone);
    return ph ? 'phone:' + ph : 'name:' + String(o.customerName || '').trim().toLowerCase();
  }

  // Groups orders into customers. Orders belong to the same customer when they share an
  // email or a phone number, so a phone-only order joins the customer's email orders.
  function customers(orders) {
    const byEmail = new Map(), byPhone = new Map(), byName = new Map();
    const groups = [];
    const sorted = [...orders].sort((a, b) => a.createdAt - b.createdAt);
    const link = (c, o) => {
      const e = String(o.customerEmail || '').trim().toLowerCase(), ph = phoneDigits(o.customerPhone);
      if (e) byEmail.set(e, c);
      if (ph) byPhone.set(ph, c);
      if (!e && !ph) byName.set(String(o.customerName || '').trim().toLowerCase(), c);
    };
    for (const o of sorted) {
      const e = String(o.customerEmail || '').trim().toLowerCase(), ph = phoneDigits(o.customerPhone);
      const ce = e ? byEmail.get(e) : null, cp = ph ? byPhone.get(ph) : null;
      let c = ce || cp || (!e && !ph ? byName.get(String(o.customerName || '').trim().toLowerCase()) : null);
      if (ce && cp && ce !== cp) {
        // This order links two customers: merge the second into the first.
        cp.orders.forEach((x) => { ce.orders.push(x); link(ce, x); });
        groups.splice(groups.indexOf(cp), 1);
      }
      if (!c) { c = { key: customerKey(o), orders: [] }; groups.push(c); }
      c.orders.push(o);
      link(c, o);
    }
    for (const c of groups) {
      c.orders.sort((a, b) => b.createdAt - a.createdAt);
      const latest = c.orders[0];
      c.name = latest.customerName;
      c.email = (c.orders.find((x) => x.customerEmail) || {}).customerEmail || '';
      c.phone = (c.orders.find((x) => x.customerPhone) || {}).customerPhone || '';
      c.last = latest.createdAt;
      c.total = c.orders.filter((x) => x.status !== 'cancelled').reduce((s, x) => s + num(x.price), 0);
    }
    return groups.sort((a, b) => b.last - a.last);
  }

  function customerOf(orders, o) {
    return customers(orders).find((c) => c.orders.includes(o)) || null;
  }

  // ---------- Turnaround ----------
  const DAY = 86400000;
  const atNoon = (str) => new Date(str + 'T12:00:00');
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };

  function turnaroundWindow(settings, o) {
    const t = settings.turnaround;
    if (o.business === 'cs') return o.delivery === 'express' ? [num(t.expressMin), num(t.expressMax)] : [num(t.standardMin), num(t.standardMax)];
    return [0, num(t.hackMax)];
  }

  // When the order first reached Shipped (or Delivered, if Shipped was skipped).
  function shippedAt(o) {
    const h = (o.history || []).find((x) => !x.note && (x.status === 'shipped' || x.status === 'delivered'));
    return h ? h.at : null;
  }

  function turnaround(settings, o, now) {
    if (!o.receivedAt) return null;
    const [minD, maxD] = turnaroundWindow(settings, o);
    const received = atNoon(o.receivedAt);
    const from = addDays(received, minD), by = addDays(received, maxD);
    const today = startOfDay(now || new Date());
    const dueDay = startOfDay(by);
    const sAt = shippedAt(o);
    const out = { received, from, by, minD, maxD, shippedAt: sAt, daysTaken: null, daysLeft: null, state: 'on_track' };
    if (sAt) {
      out.daysTaken = Math.max(0, Math.round((startOfDay(sAt) - startOfDay(received)) / DAY));
      out.state = startOfDay(sAt) <= dueDay ? 'on_time' : 'late';
      out.daysLate = Math.round((startOfDay(sAt) - dueDay) / DAY);
    } else if (o.status === 'cancelled') {
      out.state = 'cancelled';
    } else {
      out.daysLeft = Math.round((dueDay - today) / DAY);
      out.state = out.daysLeft < 0 ? 'overdue' : out.daysLeft <= num(settings.turnaround.dueSoonDays) ? 'due_soon' : 'on_track';
    }
    return out;
  }

  // ---------- Stock ----------
  // Colours and parts carry stock (null = not tracked) and lowAt. Orders remember what
  // they took in o.stockTaken so it can be given back exactly once.
  function stockItem(settings, it) {
    return it.kind === 'colour' ? settings.cs.colours.find((c) => c.id === it.id) : (settings.parts || []).find((x) => x.id === it.id);
  }
  function stockNeeds(settings, o) {
    const needs = [];
    if (o.business === 'cs' && o.colourId) {
      const c = settings.cs.colours.find((x) => x.id === o.colourId);
      if (c && c.stock != null) needs.push({ kind: 'colour', id: c.id });
    }
    for (const part of settings.parts || []) if (part.perOrder === o.business && part.stock != null) needs.push({ kind: 'part', id: part.id });
    return needs;
  }
  function takeStock(settings, o) {
    if (o.stockTaken && o.stockTaken.length) return;
    const needs = stockNeeds(settings, o);
    needs.forEach((it) => { const x = stockItem(settings, it); if (x && x.stock != null) x.stock = num(x.stock) - 1; });
    o.stockTaken = needs;
  }
  function returnStock(settings, o) {
    (o.stockTaken || []).forEach((it) => { const x = stockItem(settings, it); if (x && x.stock != null) x.stock = num(x.stock) + 1; });
    o.stockTaken = [];
  }
  function stockState(x) {
    if (!x || x.stock == null) return 'untracked';
    if (num(x.stock) <= 0) return 'out';
    if (num(x.stock) <= num(x.lowAt != null ? x.lowAt : 2)) return 'low';
    return 'ok';
  }
  function lowStock(settings) {
    return [...settings.cs.colours, ...(settings.parts || [])].filter((x) => ['low', 'out'].includes(stockState(x)));
  }

  // ---------- Costs and profit ----------
  // What an order costs you, from current Settings. Saved on the order when it is created
  // (o.costs) so later price changes do not rewrite past profit.
  function costBreakdown(settings, o) {
    const c = settings.costs || {};
    const lines = [];
    if (o.business === 'cs') {
      const col = settings.cs.colours.find((x) => x.id === o.colourId);
      if (col && num(col.cost)) lines.push({ label: `${col.name} shell`, amount: num(col.cost) });
      if (num(c.csExtra)) lines.push({ label: 'Other costs per order', amount: num(c.csExtra) });
    } else {
      if (num(c.hackDonor)) lines.push({ label: 'Calculator and parts', amount: num(c.hackDonor) });
      if (num(c.hackExtra)) lines.push({ label: 'Other costs per order', amount: num(c.hackExtra) });
    }
    (settings.parts || []).filter((x) => x.perOrder === o.business && num(x.cost)).forEach((x) => lines.push({ label: x.name, amount: num(x.cost) }));
    if (num(c.postage)) lines.push({ label: 'Postage', amount: num(c.postage) });
    return lines;
  }
  function orderCost(settings, o) {
    if (o.costOverride != null) return num(o.costOverride);
    return (o.costs || costBreakdown(settings, o)).reduce((t, x) => t + num(x.amount), 0);
  }
  function costsConfigured(settings) {
    const c = settings.costs || {};
    return [c.postage, c.csExtra, c.hackExtra, c.hackDonor].some((v) => num(v) > 0)
      || settings.cs.colours.some((x) => num(x.cost) > 0) || (settings.parts || []).some((x) => num(x.cost) > 0);
  }
  function profitOf(settings, o) { return num(o.price) - orderCost(settings, o); }

  // ---------- Invoices ----------
  function isFullyPaid(o) {
    const p = o.payment;
    if (!p || p.method !== 'finance') return !!(p && p.paid);
    const sched = paymentSchedule(o);
    return sched.length > 0 && sched.every((x) => x.paid);
  }

  function invoiceLines(settings, o) {
    const subtotal = o.subtotal != null ? o.subtotal : o.price;
    const lines = [];
    if (o.business === 'cs') {
      const addons = (o.addonIds || []).map((id, i) => {
        const a = settings.cs.addons.find((x) => x.id === id);
        return { name: (o.addonNames || [])[i] || (a ? a.name : 'Option'), price: a ? num(a.price) : 0 };
      });
      const extras = addons.reduce((t, a) => t + a.price, 0);
      lines.push({ desc: `Custom controller housing, ${o.model}, ${o.colourName}`, sub: `${deliveryText(settings, o.delivery)}. Installation included.`, amount: Math.max(subtotal - extras, 0) });
      addons.forEach((a) => lines.push({ desc: a.name, sub: '', amount: a.price }));
    } else {
      const extra = (o.extraGames || []).length;
      const extrasTotal = Math.min(extra * num(settings.hack.extraGamePrice), subtotal);
      lines.push({ desc: `Hacked calculator, ${o.donor}`, sub: `Includes ${(o.includedGames || []).join(', ') || 'the base games'}.`, amount: subtotal - extrasTotal });
      if (extra) lines.push({ desc: `Extra games (${extra})`, sub: o.extraGames.join(', '), amount: extrasTotal });
    }
    return lines;
  }

  function invoiceNumber(o) { return 'INV-' + o.orderId; }

  // Returns the inner HTML for src/invoice.html (styles live there).
  function invoiceHtml(settings, o, issued) {
    const biz = settings.businessNames[o.business];
    const inv = settings.invoice || {};
    const date = (issued || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const lines = invoiceLines(settings, o);
    const sched = paymentSchedule(o);
    const paid = isFullyPaid(o);
    const p = o.payment || { method: 'upfront' };
    const br = (t) => esc(t).replace(/\n/g, '<br>');
    const contact = [o.customerEmail, o.customerPhone].filter(Boolean).map(esc).join('<br>');
    return `<div class="inv ${o.business}">
  <header>
    <div class="from"><div class="biz">${esc(biz)}</div>${inv.address ? `<div class="addr">${br(inv.address)}</div>` : ''}</div>
    <div class="title"><h1>Invoice</h1>${paid ? '<div class="stamp">Paid</div>' : ''}</div>
  </header>
  <section class="meta">
    <div><span>Billed to</span><b>${esc(o.customerName)}</b>${contact ? `<div class="sm">${contact}</div>` : ''}</div>
    <div><span>Invoice number</span><b>${esc(invoiceNumber(o))}</b><span>Date</span><b>${esc(date)}</b></div>
    <div><span>Order</span><b>${esc(o.orderId)}</b><span>Serial number</span><b class="mono">${esc(o.serial)}</b></div>
  </section>
  <table class="items">
    <thead><tr><th>Description</th><th class="r">Amount</th></tr></thead>
    <tbody>${lines.map((l) => `<tr><td><b>${esc(l.desc)}</b>${l.sub ? `<div class="sub">${esc(l.sub)}</div>` : ''}</td><td class="r">${l.amount ? money(l.amount) : 'Included'}</td></tr>`).join('')}</tbody>
  </table>
  <table class="totals">
    ${o.discount && o.discount.amount > 0 ? `<tr><td>Subtotal</td><td class="r">${money(o.subtotal)}</td></tr>
    <tr><td>Discount${o.discount.label ? ` (${esc(o.discount.label)})` : ''}, ${esc(discountText(o.discount))}</td><td class="r">-${money(o.discount.amount)}</td></tr>` : ''}
    <tr class="grand"><td>Total</td><td class="r">${money(o.price)}</td></tr>
  </table>
  <section class="pay">
    <h2>Payment</h2>
    ${p.method === 'finance'
      ? `<p>${sched.length} ${p.frequency} payments.</p>
    <table class="sched"><thead><tr><th>#</th><th>Due</th><th class="r">Amount</th><th class="r">Status</th></tr></thead><tbody>
    ${sched.map((x) => `<tr><td>${x.n}</td><td>${x.due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td class="r">${money(x.amount)}</td><td class="r ${x.paid ? 'ok' : ''}">${x.paid ? 'Paid' : 'Due'}</td></tr>`).join('')}
    </tbody></table>`
      : `<p>${paid ? 'Paid in full. Thank you.' : `Full payment of ${money(o.price)} is due.`}</p>`}
    ${inv.paymentInstructions && !paid ? `<div class="howto"><span>How to pay</span>${br(inv.paymentInstructions)}</div>` : ''}
  </section>
  ${inv.footer ? `<footer>${br(inv.footer)}</footer>` : ''}
</div>`;
  }

  async function hashPasscode(passcode, salt) {
    const bytes = new TextEncoder().encode(salt + ':' + passcode);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  window.OT = {
    costBreakdown, orderCost, costsConfigured, profitOf,
    turnaround, turnaroundWindow, shippedAt, takeStock, returnStock, stockState, lowStock, isFullyPaid, invoiceLines, invoiceNumber, invoiceHtml,
    customerOf, paymentSchedule, paymentText, STATUSES, CANCELLED, statusInfo, isOpen, phoneDigits, validatePhone, customerKey, uid, emptyDB, migrate, money, num, coloursFor, deliveryOptions, deliveryText,
    csPrice, parseGames, hackPrice, validateSerial, nextOrderId, statusLabel, orderLines,
    buildStatusEmail, customers, hashPasscode, esc, guessSwatch, discountAmount, discountText, applyDiscount
  };
})();
