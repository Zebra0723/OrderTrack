/* OrderTrack renderer: all UI. Data helpers live in data.js (window.OT). */
(function () {
  const { esc, money, num } = OT;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // Storage bridge. In the Mac app this is provided by preload.js; in a plain browser
  // (used for development only) it falls back to localStorage.
  const api = window.api || {
    platform: 'web',
    load: async () => JSON.parse(localStorage.getItem('ordertrack') || 'null'),
    save: async (d) => { localStorage.setItem('ordertrack', JSON.stringify(d)); return true; },
    dataLocation: async () => 'Browser storage (development mode)',
    exportBackup: async (d) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = 'ordertrack-backup.json'; a.click(); return true;
    },
    importBackup: async () => null,
    setSmtpPassword: async (v) => { localStorage.setItem('ordertrack-smtp', v ? '1' : ''); return true; },
    hasSmtpPassword: async () => !!localStorage.getItem('ordertrack-smtp'),
    sendEmail: async (_s, m) => { console.log('EMAIL', m); return { ok: true }; },
    openMailto: async (url) => { window.open(url); return true; }
  };

  let DB = OT.emptyDB();
  let route = { page: 'cs' };
  const listFilter = { cs: 'active', hack: 'active' };
  let hasSmtpPassword = false;
  let customerQuery = '';

  const main = $('#main');
  if (api.platform === 'darwin') document.body.classList.add('mac');

  // ---------- Helpers ----------
  const S = () => DB.settings;
  const bizName = (b) => S().businessNames[b];
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = (ts) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const pill = (status) => `<span class="pill s-${esc(status)}">${esc(OT.statusLabel(status))}</span>`;
  const tag = (b) => `<span class="tag ${b}">${b === 'cs' ? 'CS' : 'HC'}</span>`;
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const itemSummary = (o) => (o.business === 'cs' ? `${o.model}, ${o.colourName}` : o.donor);

  let toastTimer;
  function toast(msg, isError) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast'; }, isError ? 5000 : 2200);
  }

  async function persist(msg) {
    try {
      await api.save(DB);
      if (msg) toast(msg);
      return true;
    } catch (err) {
      toast('Could not save: ' + err.message, true);
      return false;
    }
  }

  function modal(html, onMount) {
    const m = $('#modal');
    m.innerHTML = `<div class="card">${html}</div>`;
    m.hidden = false;
    const close = () => { m.hidden = true; m.innerHTML = ''; };
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) close(); };
    if (onMount) onMount(m, close);
    const first = $('input, button.primary, button.dark', m);
    if (first) first.focus();
    return close;
  }

  function confirmBox(title, body, okLabel, danger) {
    return new Promise((resolve) => {
      modal(`<h2>${esc(title)}</h2><p class="muted">${body}</p>
        <div class="actions"><button class="btn ghost" data-close>Cancel</button>
        <button class="btn ${danger ? 'danger' : 'dark'}" id="okBtn">${esc(okLabel)}</button></div>`, (m, close) => {
        m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) { close(); resolve(false); } };
        $('#okBtn', m).onclick = () => { close(); resolve(true); };
      });
    });
  }

  // ---------- Lock screen ----------
  function showLock() {
    $('#shell').hidden = true;
    const lock = $('#lock');
    lock.hidden = false;
    const setup = !DB.security;
    lock.innerHTML = `<form class="card" id="lockForm" autocomplete="off">
      <div class="brand">Order<span>Track</span></div>
      <p>${setup ? 'Create a passcode to protect your orders.' : 'Enter your passcode to continue.'}</p>
      <input type="password" id="pc1" placeholder="Passcode" inputmode="numeric" aria-label="Passcode">
      ${setup ? '<input type="password" id="pc2" placeholder="Confirm passcode" inputmode="numeric" aria-label="Confirm passcode">' : ''}
      <button class="btn primary" type="submit">${setup ? 'Set passcode' : 'Unlock'}</button>
      <div class="err" id="lockErr"></div>
    </form>`;
    $('#pc1').focus();
    $('#lockForm').onsubmit = async (e) => {
      e.preventDefault();
      const p1 = $('#pc1').value;
      const err = $('#lockErr');
      if (setup) {
        const p2 = $('#pc2').value;
        if (p1.length < 4) { err.textContent = 'Use at least 4 characters.'; return; }
        if (p1 !== p2) { err.textContent = 'Passcodes do not match.'; return; }
        const salt = OT.uid();
        DB.security = { salt, hash: await OT.hashPasscode(p1, salt) };
        await persist();
        unlock();
      } else {
        const h = await OT.hashPasscode(p1, DB.security.salt);
        if (h === DB.security.hash) unlock();
        else { err.textContent = 'Incorrect passcode.'; $('#pc1').value = ''; $('#pc1').focus(); }
      }
    };
  }

  function unlock() {
    $('#lock').hidden = true;
    $('#lock').innerHTML = '';
    $('#shell').hidden = false;
    render();
  }

  // ---------- Routing ----------
  function go(page, extra) {
    route = { page, ...(extra || {}) };
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    const activeBiz = route.biz || (route.page === 'cs' || route.page === 'hack' ? route.page : null);
    $$('.switch button').forEach((b) => b.classList.toggle('active', b.dataset.nav === activeBiz));
    $$('.links button').forEach((b) => b.classList.toggle('active', b.dataset.nav === route.page));
    switch (route.page) {
      case 'cs': case 'hack': return renderList(route.page);
      case 'new': return route.biz === 'cs' ? renderCsForm() : renderHackForm();
      case 'order': return renderOrder();
      case 'customers': return renderCustomers();
      case 'settings': return renderSettings();
      case 'results': return renderResults();
    }
  }

  // ---------- Order list ----------
  function renderList(biz) {
    const all = DB.orders.filter((o) => o.business === biz).sort((a, b) => b.createdAt - a.createdAt);
    const f = listFilter[biz];
    const counts = Object.fromEntries(OT.STATUSES.map((s) => [s.id, all.filter((o) => o.status === s.id).length]));
    const active = all.filter((o) => o.status !== 'delivered');
    const shown = f === 'all' ? all : f === 'active' ? active : all.filter((o) => o.status === f);
    const revenue = all.reduce((s, o) => s + num(o.price), 0);

    main.innerHTML = `
      <div class="pagehead">
        <div><div class="eyebrow">${esc(bizName(biz))}</div><h1>Orders</h1></div>
        <button class="btn primary" data-action="new" data-biz="${biz}">New order</button>
      </div>
      <div class="stats">
        <div class="stat accent"><div class="v">${active.length}</div><div class="k">Open orders</div></div>
        <div class="stat"><div class="v">${counts.pending}</div><div class="k">Pending</div></div>
        <div class="stat"><div class="v">${counts.in_progress}</div><div class="k">In progress</div></div>
        <div class="stat"><div class="v">${money(revenue)}</div><div class="k">Total value, ${all.length} orders</div></div>
      </div>
      <div class="filters">
        <button data-filter="active" class="${f === 'active' ? 'active' : ''}">Open<span class="count">${active.length}</span></button>
        <button data-filter="all" class="${f === 'all' ? 'active' : ''}">All<span class="count">${all.length}</span></button>
        ${OT.STATUSES.map((s) => `<button data-filter="${s.id}" class="${f === s.id ? 'active' : ''}">${s.label}<span class="count">${counts[s.id]}</span></button>`).join('')}
      </div>
      ${shown.length ? `<div class="card listcard">${orderTable(shown, false)}</div>` : `<div class="card empty">
        <h3>${all.length ? 'No orders with this status' : 'No orders yet'}</h3>
        <div>${all.length ? 'Try another filter.' : `Create your first ${esc(bizName(biz))} order to get started.`}</div>
      </div>`}`;
    $$('[data-filter]').forEach((b) => b.onclick = () => { listFilter[biz] = b.dataset.filter; renderList(biz); });
  }

  function orderTable(orders, showBiz) {
    return `<table class="table">
      <thead><tr>${showBiz ? '<th></th>' : ''}<th>Order</th><th>Customer</th><th class="hide-sm">Serial</th><th class="hide-sm">Item</th><th class="r">Price</th><th>Status</th><th class="hide-sm">Date</th></tr></thead>
      <tbody>${orders.map((o) => `<tr data-open="${o.id}">
        ${showBiz ? `<td>${tag(o.business)}</td>` : ''}
        <td><b>${esc(o.orderId)}</b></td>
        <td>${esc(o.customerName)}</td>
        <td class="hide-sm mono">${esc(o.serial)}</td>
        <td class="hide-sm">${esc(itemSummary(o))}</td>
        <td class="r mono">${money(o.price)}</td>
        <td>${pill(o.status)}</td>
        <td class="hide-sm muted small">${fmtDate(o.createdAt)}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  // ---------- Shared form helpers ----------
  function field(id, label, input, hint) {
    return `<div class="field" data-field="${id}"><label for="${id}">${label}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}<div class="err" hidden></div></div>`;
  }

  function customerFields(biz) {
    const known = OT.customers(DB.orders).filter((c) => c.email);
    return `
      ${field('f_name', 'Customer name', `<input type="text" id="f_name" list="dl_names" autocomplete="off">`)}
      ${field('f_email', 'Customer email', `<input type="email" id="f_email" list="dl_emails" autocomplete="off">`, 'Status updates are sent to this address.')}
      ${field('f_orderId', 'Order ID', `<input type="text" id="f_orderId" value="${esc(OT.nextOrderId(DB.orders, biz))}" spellcheck="false">`)}
      ${field('f_serial', 'Serial number', `<input type="text" id="f_serial" value="${biz === 'cs' ? 'CS' : 'HC'}" maxlength="10" spellcheck="false" class="mono">`, `Exactly 10 characters, starting with ${biz === 'cs' ? 'CS' : 'HC'}.`)}
      <datalist id="dl_names">${known.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
      <datalist id="dl_emails">${known.map((c) => `<option value="${esc(c.email)}">${esc(c.name)}</option>`).join('')}</datalist>`;
  }

  function wireCustomerFields(biz) {
    const known = OT.customers(DB.orders);
    const name = $('#f_name'), email = $('#f_email'), serial = $('#f_serial'), oid = $('#f_orderId');
    name.addEventListener('change', () => {
      const c = known.find((k) => k.name.toLowerCase() === name.value.trim().toLowerCase());
      if (c && !email.value) email.value = c.email;
    });
    email.addEventListener('change', () => {
      const c = known.find((k) => (k.email || '').toLowerCase() === email.value.trim().toLowerCase());
      if (c && !name.value) name.value = c.name;
    });
    const prefix = biz === 'cs' ? 'CS' : 'HC';
    serial.addEventListener('input', () => {
      const pos = serial.selectionStart;
      serial.value = serial.value.toUpperCase().replace(/\s/g, '');
      serial.setSelectionRange(pos, pos);
      const hint = serial.parentElement.querySelector('.hint');
      hint.textContent = `${serial.value.length} of 10 characters, starting with ${prefix}.`;
    });
    oid.addEventListener('input', () => {
      const pos = oid.selectionStart;
      oid.value = oid.value.toUpperCase();
      oid.setSelectionRange(pos, pos);
    });
    $('#orderForm').addEventListener('input', (e) => { const f = e.target.closest('[data-field]'); if (f) setErr(f.dataset.field, ''); });
    $('#orderForm').addEventListener('change', (e) => { const f = e.target.closest('[data-field]'); if (f) setErr(f.dataset.field, ''); });
    name.focus();
  }

  function setErr(id, msg) {
    const wrap = $(`[data-field="${id}"]`);
    if (!wrap) return;
    const e = $('.err', wrap);
    e.textContent = msg || '';
    e.hidden = !msg;
    const input = $('input, select, textarea', wrap);
    if (input) input.classList.toggle('invalid', !!msg);
  }

  function validateCommon(biz) {
    const errs = {};
    const name = $('#f_name').value.trim();
    const email = $('#f_email').value.trim();
    const orderId = $('#f_orderId').value.trim().toUpperCase();
    const serial = $('#f_serial').value.trim().toUpperCase();
    if (!name) errs.f_name = 'Customer name is required.';
    if (!email) errs.f_email = 'Customer email is required.';
    else if (!isEmail(email)) errs.f_email = 'Enter a valid email address.';
    if (!orderId) errs.f_orderId = 'Order ID is required.';
    else if (DB.orders.some((o) => o.orderId.toUpperCase() === orderId)) errs.f_orderId = `Order ID ${orderId} is already used.`;
    const sErr = OT.validateSerial(serial, biz === 'cs' ? 'CS' : 'HC');
    if (sErr) errs.f_serial = sErr;
    else if (DB.orders.some((o) => o.serial.toUpperCase() === serial)) errs.f_serial = `Serial ${serial} is already used by another order.`;
    return { errs, values: { customerName: name, customerEmail: email, orderId, serial } };
  }

  function showErrors(ids, errs) {
    ids.forEach((id) => setErr(id, errs[id]));
    const first = ids.find((id) => errs[id]);
    if (first) { const el = $(`[data-field="${first}"] input, [data-field="${first}"] select, [data-field="${first}"] textarea`); if (el) el.focus(); }
    return !first;
  }

  async function createOrder(order) {
    const now = Date.now();
    order.id = OT.uid();
    order.status = 'pending';
    order.createdAt = now;
    order.history = [{ status: 'pending', at: now, email: 'none' }];
    DB.orders.push(order);
    if (await persist(`Order ${order.orderId} created`)) go('order', { id: order.id, biz: order.business });
  }

  // ---------- ClearSense form ----------
  function renderCsForm() {
    const s = S().cs;
    main.innerHTML = `
      <button class="backlink" data-nav="cs">Back to ClearSense orders</button>
      <div class="pagehead"><div><div class="eyebrow">ClearSense</div><h1>New order</h1></div></div>
      <form class="card" id="orderForm" novalidate>
        <div class="grid">
          ${customerFields('cs')}
          ${field('f_model', 'BDM model', `<select id="f_model"><option value="">Choose a model</option>${s.models.map((m) => `<option>${esc(m)}</option>`).join('')}</select>`)}
          ${field('f_colour', 'Colour', `<select id="f_colour" disabled><option value="">Choose a model first</option></select>`)}
          <div class="field full" data-field="f_delivery"><span class="fieldlabel">Delivery type</span><div class="checks" id="deliveryBox"><span class="muted small">Choose a colour first</span></div><div class="hint" id="deliveryHint"></div><div class="err" hidden></div></div>
          <div class="field full"><span class="fieldlabel">Options</span><div class="checks">
            ${s.addons.map((a) => `<label class="check"><input type="checkbox" name="addon" value="${a.id}"> ${esc(a.name)}${num(a.price) ? ` <span class="muted">+${money(a.price)}</span>` : ''}</label>`).join('') || '<span class="muted small">No options set up.</span>'}
          </div><div class="hint">Installation is always included.</div></div>
        </div>
        <div class="formfoot">
          <div class="pricebox"><span class="amt" id="price">${money(0)}</span><span class="lbl" id="priceLbl">Choose colour and delivery</span></div>
          <div><button type="button" class="btn ghost" data-nav="cs">Cancel</button> <button type="submit" class="btn primary">Create order</button></div>
        </div>
      </form>`;
    wireCustomerFields('cs');

    const model = $('#f_model'), colourSel = $('#f_colour'), box = $('#deliveryBox');
    const selectedDelivery = () => ($('input[name=delivery]:checked') || {}).value || '';
    const selectedAddons = () => $$('input[name=addon]:checked').map((i) => i.value);

    function updatePrice() {
      const p = OT.csPrice(S(), colourSel.value, selectedDelivery(), selectedAddons());
      $('#price').textContent = money(p || 0);
      $('#priceLbl').textContent = p == null ? 'Choose colour and delivery' : 'Installation included';
      $('#deliveryHint').textContent = selectedDelivery() ? OT.deliveryText(S(), selectedDelivery()) : '';
    }
    function fillDelivery() {
      const c = s.colours.find((x) => x.id === colourSel.value);
      const opts = OT.deliveryOptions(c);
      box.innerHTML = opts.length
        ? opts.map((o) => `<label class="check"><input type="radio" name="delivery" value="${o.id}" ${opts.length === 1 ? 'checked' : ''}> ${o.label} <span class="muted">${money(o.price)}</span></label>`).join('')
        : '<span class="muted small">Choose a colour first</span>';
      $$('input[name=delivery]').forEach((r) => r.onchange = updatePrice);
      updatePrice();
    }
    model.onchange = () => {
      const list = OT.coloursFor(S(), model.value);
      colourSel.disabled = !model.value;
      colourSel.innerHTML = model.value
        ? `<option value="">Choose a colour</option>${list.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}`
        : '<option value="">Choose a model first</option>';
      fillDelivery();
    };
    colourSel.onchange = fillDelivery;
    $$('input[name=addon]').forEach((c) => c.onchange = updatePrice);

    $('#orderForm').onsubmit = (e) => {
      e.preventDefault();
      const { errs, values } = validateCommon('cs');
      if (!model.value) errs.f_model = 'Choose a BDM model.';
      if (!colourSel.value) errs.f_colour = 'Choose a colour.';
      else if (!selectedDelivery()) errs.f_delivery = 'Choose a delivery type.';
      if (!showErrors(['f_name', 'f_email', 'f_orderId', 'f_serial', 'f_model', 'f_colour', 'f_delivery'], errs)) return;
      const c = s.colours.find((x) => x.id === colourSel.value);
      const addonIds = selectedAddons();
      createOrder({
        business: 'cs', ...values,
        model: model.value, colourId: c.id, colourName: c.name,
        delivery: selectedDelivery(),
        addonIds, addonNames: addonIds.map((id) => (s.addons.find((a) => a.id === id) || {}).name).filter(Boolean),
        price: OT.csPrice(S(), c.id, selectedDelivery(), addonIds)
      });
    };
  }

  // ---------- Hackulator form ----------
  function renderHackForm() {
    const h = S().hack;
    main.innerHTML = `
      <button class="backlink" data-nav="hack">Back to Hackulator orders</button>
      <div class="pagehead"><div><div class="eyebrow">Hackulator</div><h1>New order</h1></div></div>
      <form class="card" id="orderForm" novalidate>
        <div class="grid">
          ${field('f_donor', 'Donor calculator', `<input type="text" id="f_donor" placeholder="For example TI-84 Plus">`)}
          <div></div>
          ${customerFields('hack')}
          <div class="field full"><span class="fieldlabel">Included games</span>
            <div class="checks">${h.includedGames.map((g) => `<span class="chip" style="padding-right:12px">${esc(g)}</span>`).join('') || '<span class="muted small">None set up.</span>'}</div>
            <div class="hint">Included in the base price of ${money(h.basePrice)}.</div></div>
          ${field('f_games', 'Extra games', `<textarea id="f_games" placeholder="One game per line"></textarea>`, `One game per line. ${money(h.extraGamePrice)} per extra game.`).replace('class="field"', 'class="field full"')}
        </div>
        <div class="formfoot">
          <div class="pricebox"><span class="amt" id="price">${money(h.basePrice)}</span><span class="lbl" id="priceLbl">Base price, no extra games</span></div>
          <div><button type="button" class="btn ghost" data-nav="hack">Cancel</button> <button type="submit" class="btn primary">Create order</button></div>
        </div>
      </form>`;
    wireCustomerFields('hack');
    $('#f_donor').focus();
    const games = $('#f_games');
    games.oninput = () => {
      const extra = OT.parseGames(games.value);
      $('#price').textContent = money(OT.hackPrice(S(), extra));
      $('#priceLbl').textContent = extra.length
        ? `${money(h.basePrice)} base plus ${extra.length} extra game${extra.length === 1 ? '' : 's'}`
        : 'Base price, no extra games';
    };
    $('#orderForm').onsubmit = (e) => {
      e.preventDefault();
      const { errs, values } = validateCommon('hack');
      const donor = $('#f_donor').value.trim();
      if (!donor) errs.f_donor = 'Enter the donor calculator.';
      if (!showErrors(['f_donor', 'f_name', 'f_email', 'f_orderId', 'f_serial'], errs)) return;
      const extraGames = OT.parseGames(games.value);
      createOrder({
        business: 'hack', ...values, donor,
        includedGames: [...h.includedGames], extraGames,
        price: OT.hackPrice(S(), extraGames)
      });
    };
  }

  // ---------- Order view ----------
  function emailReady() {
    const e = S().email;
    return !!(e.host && e.user && hasSmtpPassword);
  }

  async function sendStatusEmail(order) {
    const msg = OT.buildStatusEmail(S(), order);
    if (emailReady()) {
      const res = await api.sendEmail(S().email, msg);
      if (res.ok) { toast(`Update email sent to ${order.customerEmail}`); return 'sent'; }
      toast('Email failed: ' + res.error, true);
      return 'failed';
    }
    const url = `mailto:${encodeURIComponent(msg.to)}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.text)}`;
    await api.openMailto(url);
    toast('Opened the email in your mail app');
    return 'mail app';
  }

  const EMAIL_NOTE = { sent: 'email sent', resent: 'email resent', failed: 'email failed', 'mail app': 'email opened in Mail' };

  function renderOrder() {
    const o = DB.orders.find((x) => x.id === route.id);
    if (!o) { go('cs'); return; }
    const idx = OT.STATUSES.findIndex((s) => s.id === o.status);
    const lines = OT.orderLines(S(), o);
    main.innerHTML = `
      <button class="backlink" data-nav="${o.business}">Back to ${esc(bizName(o.business))} orders</button>
      <div class="pagehead">
        <div><div class="eyebrow">${esc(bizName(o.business))}</div><h1>${esc(o.orderId)}</h1>
          <div style="margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">${pill(o.status)}<span class="muted small">Created ${fmtDateTime(o.createdAt)}</span></div></div>
      </div>
      <div class="ordergrid">
        <div class="stack">
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><h2>Customer</h2><button class="btn sm" data-action="editContact">Edit</button></div>
            <dl class="dl"><dt>Name</dt><dd>${esc(o.customerName)}</dd><dt>Email</dt><dd>${esc(o.customerEmail)}</dd></dl>
          </div>
          <div class="card">
            <h2 style="margin-bottom:14px">Order details</h2>
            <dl class="dl">${lines.map(([k, v]) => `<dt>${esc(k)}</dt><dd${k === 'Serial number' ? ' class="mono"' : ''}>${esc(v)}</dd>`).join('')}</dl>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <h2>Status</h2>
            <div class="steps">${OT.STATUSES.map((s, i) => `<button class="step ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}" data-status="${s.id}">
              <span class="dot">${i + 1}</span><span class="lbl">${s.label}</span></button>`).join('')}</div>
            <button class="btn" style="width:100%" data-action="resend">Email current status to customer</button>
            ${emailReady() ? '' : '<div class="notice" style="margin-top:12px">Email sending is not set up, so update emails open in your mail app instead. Add your mail account in Settings to send them directly.</div>'}
          </div>
          <div class="card">
            <h3 style="margin-bottom:8px">History</h3>
            <ul class="history">${[...o.history].reverse().map((h) => `<li><span>${esc(OT.statusLabel(h.status))}${EMAIL_NOTE[h.email] ? ` <span class="muted">(${EMAIL_NOTE[h.email]})</span>` : ''}</span><span class="muted">${fmtDateTime(h.at)}</span></li>`).join('')}</ul>
          </div>
          <button class="btn danger" style="width:100%" data-action="deleteOrder">Delete order</button>
        </div>
      </div>`;

    $$('[data-status]').forEach((b) => b.onclick = () => changeStatus(o, b.dataset.status));
  }

  function changeStatus(o, status) {
    if (status === o.status) return;
    const label = OT.statusLabel(status);
    modal(`<h2>Mark as ${esc(label)}?</h2>
      <p class="muted">${esc(o.orderId)} for ${esc(o.customerName)}</p>
      <label class="check" style="width:100%;margin-top:6px"><input type="checkbox" id="sendMail" checked>
        ${emailReady() ? `Send update email to ${esc(o.customerEmail)}` : `Open an update email to ${esc(o.customerEmail)} in Mail`}</label>
      <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="okBtn">Update status</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        const send = $('#sendMail', m).checked;
        close();
        o.status = status;
        const entry = { status, at: Date.now(), email: 'none' };
        o.history.push(entry);
        await persist(`Status set to ${label}`);
        renderOrder();
        if (send) {
          entry.email = await sendStatusEmail(o);
          await persist();
          if (route.page === 'order' && route.id === o.id) renderOrder();
        }
      };
    });
  }

  function editContact(o) {
    modal(`<h2>Edit customer</h2>
      <div class="stack" style="margin-top:14px">
        <div class="field" data-field="e_name"><label for="e_name">Customer name</label><input type="text" id="e_name" value="${esc(o.customerName)}"><div class="err" hidden></div></div>
        <div class="field" data-field="e_email"><label for="e_email">Customer email</label><input type="email" id="e_email" value="${esc(o.customerEmail)}"><div class="err" hidden></div></div>
      </div>
      <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn dark" id="okBtn">Save</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        const name = $('#e_name', m).value.trim(), email = $('#e_email', m).value.trim();
        setErr('e_name', name ? '' : 'Name is required.');
        setErr('e_email', isEmail(email) ? '' : 'Enter a valid email address.');
        if (!name || !isEmail(email)) return;
        o.customerName = name; o.customerEmail = email;
        close();
        await persist('Customer updated');
        renderOrder();
      };
    });
  }

  // ---------- Search ----------
  function find(q) {
    q = q.trim().toUpperCase();
    if (!q) return;
    const exact = DB.orders.find((o) => o.serial.toUpperCase() === q) || DB.orders.find((o) => o.orderId.toUpperCase() === q);
    if (exact) { $('#findInput').value = ''; $('#findInput').blur(); go('order', { id: exact.id, biz: exact.business }); return; }
    const partial = DB.orders.filter((o) => o.serial.toUpperCase().includes(q) || o.orderId.toUpperCase().includes(q));
    if (partial.length === 1) { $('#findInput').value = ''; go('order', { id: partial[0].id, biz: partial[0].business }); return; }
    if (!partial.length) { toast(`No order found for ${q}`, true); return; }
    go('results', { q, ids: partial.map((o) => o.id) });
  }

  function renderResults() {
    const list = DB.orders.filter((o) => route.ids.includes(o.id)).sort((a, b) => b.createdAt - a.createdAt);
    main.innerHTML = `<div class="pagehead"><div><div class="eyebrow">Find order</div><h1>${list.length} matches for ${esc(route.q)}</h1></div></div>
      <div class="card listcard">${orderTable(list, true)}</div>`;
  }

  // ---------- Customers ----------
  function renderCustomers() {
    const all = OT.customers(DB.orders);
    main.innerHTML = `
      <div class="pagehead"><div><div class="eyebrow">Both businesses</div><h1>Customers</h1></div>
        <input type="search" id="custSearch" placeholder="Search name or email" value="${esc(customerQuery)}" style="max-width:300px" aria-label="Search customers"></div>
      <div id="custList"></div>`;
    const draw = () => {
      const q = customerQuery.trim().toLowerCase();
      const list = q ? all.filter((c) => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)) : all;
      $('#custList').innerHTML = list.length ? list.map((c) => {
        const cs = c.orders.filter((o) => o.business === 'cs').length, hk = c.orders.length - cs;
        return `<details class="card cust">
          <summary><div class="who"><b>${esc(c.name)}</b><span>${esc(c.email)}</span></div>
            <div class="muted small" style="text-align:right">${cs ? `${cs} ClearSense` : ''}${cs && hk ? '<br>' : ''}${hk ? `${hk} Hackulator` : ''}</div>
            <div style="text-align:right;min-width:80px"><b class="mono">${money(c.total)}</b><div class="muted small">${c.orders.length} order${c.orders.length === 1 ? '' : 's'}</div></div>
          </summary>
          <div class="body">${orderTable(c.orders, true)}</div>
        </details>`;
      }).join('') : `<div class="card empty"><h3>${all.length ? 'No matching customers' : 'No customers yet'}</h3><div>${all.length ? 'Try a different search.' : 'Customers appear here once you create orders.'}</div></div>`;
    };
    draw();
    $('#custSearch').oninput = (e) => { customerQuery = e.target.value; draw(); };
  }

  // ---------- Settings ----------
  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
  function setPath(obj, path, val) {
    const keys = path.split('.'); const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = val;
  }

  async function renderSettings() {
    const s = S();
    hasSmtpPassword = await api.hasSmtpPassword();
    const location = await api.dataLocation();
    const priceInput = (attrs, val) => `<div class="prefix"><input type="number" step="0.01" min="0" ${attrs} value="${esc(val)}"></div>`;

    main.innerHTML = `
      <div class="pagehead"><div><div class="eyebrow">Everything saves automatically</div><h1>Settings</h1></div></div>
      <div class="settings-nav">${[['set-colours', 'Colours'], ['set-models', 'Models'], ['set-options', 'Options'], ['set-delivery', 'Delivery'], ['set-hack', 'Hackulator'], ['set-email', 'Email'], ['set-pass', 'Passcode'], ['set-data', 'Data']]
        .map(([id, l]) => `<button class="btn sm" data-jump="${id}">${l}</button>`).join('')}</div>
      <div class="settings stack">

        <section class="card" id="set-colours">
          <h2>ClearSense colours</h2>
          <p class="sub">Each colour sets its prices, which delivery types it offers, and which BDM models it fits. Existing orders keep the price they were created with.</p>
          ${s.cs.colours.map((c) => `<div class="colour" data-colour="${c.id}">
            <div class="row"><input type="text" data-cf="name" value="${esc(c.name)}" aria-label="Colour name"><button class="btn sm danger" data-action="delColour">Remove</button></div>
            <div class="opts">
              <div class="opt"><label><input type="checkbox" data-cf="standard.available" ${c.standard.available ? 'checked' : ''}> Non express</label>${priceInput('data-cf="standard.price" aria-label="Non express price"', c.standard.price)}</div>
              <div class="opt"><label><input type="checkbox" data-cf="express.available" ${c.express.available ? 'checked' : ''}> Express</label>${priceInput('data-cf="express.price" aria-label="Express price"', c.express.price)}</div>
            </div>
            <div class="models checks">${s.cs.models.map((m) => `<label class="check"><input type="checkbox" data-cmodel="${esc(m)}" ${c.models.includes(m) ? 'checked' : ''}> ${esc(m)}</label>`).join('')}</div>
          </div>`).join('')}
          <div class="addrow"><input type="text" id="newColour" placeholder="New colour name"><button class="btn" data-action="addColour">Add colour</button></div>
        </section>

        <section class="card" id="set-models">
          <h2>BDM models</h2>
          <p class="sub">Models shown in the ClearSense order form. Removing a model also removes it from every colour.</p>
          <div class="chiplist">${s.cs.models.map((m) => `<span class="chip">${esc(m)}<button data-action="delModel" data-model="${esc(m)}" aria-label="Remove ${esc(m)}">Remove</button></span>`).join('')}</div>
          <div class="addrow"><input type="text" id="newModel" placeholder="For example BDM-060"><button class="btn" data-action="addModel">Add model</button></div>
        </section>

        <section class="card" id="set-options">
          <h2>ClearSense options</h2>
          <p class="sub">Optional checkboxes on the order form. Set a price above zero to add it to the order total.</p>
          ${s.cs.addons.map((a) => `<div class="addon" data-addon="${a.id}"><input type="text" data-af="name" value="${esc(a.name)}" aria-label="Option name">${priceInput('data-af="price" aria-label="Option price"', a.price)}<button class="btn sm danger" data-action="delAddon">Remove</button></div>`).join('')}
          <div class="addrow"><input type="text" id="newAddon" placeholder="New option, for example Keep original D-pad"><button class="btn" data-action="addAddon">Add option</button></div>
        </section>

        <section class="card" id="set-delivery">
          <h2>Delivery wording</h2>
          <p class="sub">Shown on each ClearSense order and in customer emails.</p>
          <div class="grid">
            <div class="field"><label>Express</label><input type="text" data-set="cs.expressWording" value="${esc(s.cs.expressWording)}"></div>
            <div class="field"><label>Non express</label><input type="text" data-set="cs.standardWording" value="${esc(s.cs.standardWording)}"></div>
          </div>
        </section>

        <section class="card" id="set-hack">
          <h2>Hackulator pricing</h2>
          <p class="sub">Base price includes the games listed below. Each extra game line on an order adds the extra game price.</p>
          <div class="grid">
            <div class="field"><label>Base price</label>${priceInput('data-set="hack.basePrice" data-num', s.hack.basePrice)}</div>
            <div class="field"><label>Extra game price</label>${priceInput('data-set="hack.extraGamePrice" data-num', s.hack.extraGamePrice)}</div>
            <div class="field full"><label>Included games, one per line</label><textarea data-set="hack.includedGames" data-lines>${esc(s.hack.includedGames.join('\n'))}</textarea></div>
          </div>
        </section>

        <section class="card" id="set-email">
          <h2>Email</h2>
          <p class="sub">Used to send status updates. For Gmail use host smtp.gmail.com, port 587, your Gmail address as the username and an app password from your Google account security page. Until this is set up, update emails open in your mail app.</p>
          <div class="grid">
            <div class="field"><label>SMTP host</label><input type="text" data-set="email.host" value="${esc(s.email.host)}" placeholder="smtp.gmail.com" spellcheck="false"></div>
            <div class="field"><label>Port</label><input type="number" data-set="email.port" data-num value="${esc(s.email.port)}"></div>
            <div class="field"><label>Username</label><input type="text" data-set="email.user" value="${esc(s.email.user)}" spellcheck="false"></div>
            <div class="field"><label>Password ${hasSmtpPassword ? '<span class="muted">(saved)</span>' : ''}</label>
              <div style="display:flex;gap:8px"><input type="password" id="smtpPass" placeholder="${hasSmtpPassword ? 'Enter to replace' : 'App password'}"><button class="btn" data-action="savePass">Save</button></div>
              <div class="hint">Stored encrypted in your Mac keychain, not in the order data.</div></div>
            <div class="field"><label>From name</label><input type="text" data-set="email.fromName" value="${esc(s.email.fromName)}"></div>
            <div class="field"><label>From and reply-to address</label><input type="email" data-set="email.fromEmail" value="${esc(s.email.fromEmail)}" placeholder="Defaults to the username"></div>
            <div class="field full"><label>Sign-off</label><textarea data-set="email.signOff" style="min-height:70px">${esc(s.email.signOff)}</textarea></div>
          </div>
          <div class="addrow" style="justify-content:flex-start"><button class="btn" data-action="testEmail">Send a test email to myself</button></div>
        </section>

        <section class="card">
          <h2>Business names</h2>
          <div class="grid" style="margin-top:12px">
            <div class="field"><label>Controller business</label><input type="text" data-set="businessNames.cs" value="${esc(s.businessNames.cs)}"></div>
            <div class="field"><label>Calculator business</label><input type="text" data-set="businessNames.hack" value="${esc(s.businessNames.hack)}"></div>
          </div>
        </section>

        <section class="card" id="set-pass">
          <h2>Passcode</h2>
          <p class="sub">Asked for every time the app opens or is locked.</p>
          <div class="grid">
            <div class="field"><label>Current passcode</label><input type="password" id="pcOld"></div><div></div>
            <div class="field"><label>New passcode</label><input type="password" id="pcNew"></div>
            <div class="field"><label>Confirm new passcode</label><input type="password" id="pcNew2"></div>
          </div>
          <div class="addrow" style="justify-content:flex-start"><button class="btn dark" data-action="changePass">Change passcode</button></div>
        </section>

        <section class="card" id="set-data">
          <h2>Data</h2>
          <p class="sub">Orders and settings are saved on this Mac at <span class="mono" style="overflow-wrap:anywhere">${esc(location)}</span>. A copy of the previous save is kept next to it.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="export">Export backup</button><button class="btn" data-action="import">Import backup</button></div>
        </section>
      </div>`;

    $$('[data-jump]', main).forEach((b) => b.onclick = () => document.getElementById(b.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' }));

    // Simple settings bound by path.
    $$('[data-set]', main).forEach((el) => el.addEventListener('change', () => {
      let v = el.value;
      if (el.hasAttribute('data-num')) v = num(v);
      if (el.hasAttribute('data-lines')) v = OT.parseGames(v);
      setPath(s, el.dataset.set, v);
      persist('Saved');
    }));

    // Colour fields.
    $$('[data-colour]', main).forEach((card) => {
      const c = s.cs.colours.find((x) => x.id === card.dataset.colour);
      $$('[data-cf]', card).forEach((el) => el.addEventListener('change', () => {
        const path = el.dataset.cf;
        const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? num(el.value) : el.value.trim();
        if (path === 'name' && !v) { el.value = c.name; toast('Colour name cannot be empty', true); return; }
        setPath(c, path, v);
        persist('Saved');
      }));
      $$('[data-cmodel]', card).forEach((el) => el.addEventListener('change', () => {
        const m = el.dataset.cmodel;
        c.models = el.checked ? [...new Set([...c.models, m])] : c.models.filter((x) => x !== m);
        persist('Saved');
      }));
    });

    // Add-on fields.
    $$('[data-addon]', main).forEach((row) => {
      const a = s.cs.addons.find((x) => x.id === row.dataset.addon);
      $$('[data-af]', row).forEach((el) => el.addEventListener('change', () => {
        const v = el.dataset.af === 'price' ? num(el.value) : el.value.trim();
        if (el.dataset.af === 'name' && !v) { el.value = a.name; toast('Option name cannot be empty', true); return; }
        a[el.dataset.af] = v;
        persist('Saved');
      }));
    });

    const enter = (id, action) => { const el = $(id); if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAction(action, el); } }); };
    enter('#newColour', 'addColour'); enter('#newModel', 'addModel'); enter('#newAddon', 'addAddon'); enter('#smtpPass', 'savePass');
  }

  async function settingsAction(action, el) {
    const s = S();
    const reRender = async (msg) => { await persist(msg); const y = window.scrollY; await renderSettings(); window.scrollTo(0, y); };
    switch (action) {
      case 'addColour': {
        const name = $('#newColour').value.trim();
        if (!name) return toast('Enter a colour name', true);
        if (s.cs.colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) return toast('That colour already exists', true);
        s.cs.colours.push({ id: OT.uid(), name, models: [], standard: { available: true, price: 30 }, express: { available: false, price: 37 } });
        return reRender(`Added ${name}. Tick the models it fits.`);
      }
      case 'delColour': {
        const id = el.closest('[data-colour]').dataset.colour;
        const c = s.cs.colours.find((x) => x.id === id);
        if (!(await confirmBox('Remove colour?', `${esc(c.name)} will no longer be offered on new orders. Existing orders are not changed.`, 'Remove', true))) return;
        s.cs.colours = s.cs.colours.filter((x) => x.id !== id);
        return reRender('Colour removed');
      }
      case 'addModel': {
        const name = $('#newModel').value.trim().toUpperCase();
        if (!name) return toast('Enter a model name', true);
        if (s.cs.models.includes(name)) return toast('That model already exists', true);
        s.cs.models.push(name);
        return reRender(`Added ${name}. Tick it on the colours it supports.`);
      }
      case 'delModel': {
        const m = el.dataset.model;
        if (!(await confirmBox('Remove model?', `${esc(m)} will be removed from the order form and from every colour.`, 'Remove', true))) return;
        s.cs.models = s.cs.models.filter((x) => x !== m);
        s.cs.colours.forEach((c) => { c.models = c.models.filter((x) => x !== m); });
        return reRender('Model removed');
      }
      case 'addAddon': {
        const name = $('#newAddon').value.trim();
        if (!name) return toast('Enter an option name', true);
        s.cs.addons.push({ id: OT.uid(), name, price: 0 });
        return reRender('Option added');
      }
      case 'delAddon': {
        const id = el.closest('[data-addon]').dataset.addon;
        s.cs.addons = s.cs.addons.filter((x) => x.id !== id);
        return reRender('Option removed');
      }
      case 'savePass': {
        const v = $('#smtpPass').value;
        if (!v) return toast('Enter the password first', true);
        await api.setSmtpPassword(v);
        return reRender('Email password saved');
      }
      case 'testEmail': {
        hasSmtpPassword = await api.hasSmtpPassword();
        if (!emailReady()) return toast('Fill in host, username and password first', true);
        const to = s.email.fromEmail || s.email.user;
        el.disabled = true; el.textContent = 'Sending...';
        const res = await api.sendEmail(s.email, { to, subject: 'OrderTrack test email', text: 'Email sending from OrderTrack is working.', html: '<p>Email sending from OrderTrack is working.</p>' });
        el.disabled = false; el.textContent = 'Send a test email to myself';
        return res.ok ? toast(`Test email sent to ${to}`) : toast('Email failed: ' + res.error, true);
      }
      case 'changePass': {
        const old = $('#pcOld').value, n1 = $('#pcNew').value, n2 = $('#pcNew2').value;
        if ((await OT.hashPasscode(old, DB.security.salt)) !== DB.security.hash) return toast('Current passcode is incorrect', true);
        if (n1.length < 4) return toast('Use at least 4 characters', true);
        if (n1 !== n2) return toast('New passcodes do not match', true);
        const salt = OT.uid();
        DB.security = { salt, hash: await OT.hashPasscode(n1, salt) };
        ['#pcOld', '#pcNew', '#pcNew2'].forEach((id) => { $(id).value = ''; });
        return persist('Passcode changed');
      }
      case 'export': {
        const { security, ...rest } = DB;
        if (await api.exportBackup(rest)) toast('Backup exported');
        return;
      }
      case 'import': {
        const data = await api.importBackup();
        if (!data) return;
        if (!Array.isArray(data.orders) || !data.settings) return toast('That file is not an OrderTrack backup', true);
        if (!(await confirmBox('Replace all data?', `This replaces your current ${DB.orders.length} orders and settings with ${data.orders.length} orders from the backup. Your passcode stays the same.`, 'Replace', true))) return;
        const security = DB.security;
        DB = OT.migrate(data);
        DB.security = security;
        return reRender('Backup imported');
      }
    }
  }

  // ---------- Global events ----------
  async function handleAction(action, el) {
    const order = route.page === 'order' ? DB.orders.find((x) => x.id === route.id) : null;
    switch (action) {
      case 'new': return go('new', { biz: el.dataset.biz });
      case 'lock': return showLock();
      case 'resend': if (order) { const r = await sendStatusEmail(order); order.history.push({ status: order.status, at: Date.now(), email: r === 'sent' ? 'resent' : r }); await persist(); renderOrder(); } return;
      case 'editContact': return order && editContact(order);
      case 'deleteOrder':
        if (order && await confirmBox('Delete order?', `${esc(order.orderId)} for ${esc(order.customerName)} will be permanently deleted.`, 'Delete', true)) {
          DB.orders = DB.orders.filter((x) => x.id !== order.id);
          await persist('Order deleted');
          go(order.business);
        }
        return;
      default: return settingsAction(action, el);
    }
  }

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); return go(nav.dataset.nav); }
    const act = e.target.closest('[data-action]');
    if (act) { e.preventDefault(); return handleAction(act.dataset.action, act); }
    const open = e.target.closest('[data-open]');
    if (open) { const o = DB.orders.find((x) => x.id === open.dataset.open); if (o) go('order', { id: o.id, biz: o.business }); }
  });

  $('#find').addEventListener('submit', (e) => { e.preventDefault(); find($('#findInput').value); });
  $('#findInput').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });

  document.addEventListener('keydown', (e) => {
    if ($('#shell').hidden) return;
    if (e.key === 'Escape' && !$('#modal').hidden) { $('#modal').hidden = true; $('#modal').innerHTML = ''; return; }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); $('#findInput').focus(); $('#findInput').select(); }
    if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      const biz = route.biz || (route.page === 'hack' ? 'hack' : 'cs');
      go('new', { biz });
    }
  });

  // ---------- Start ----------
  (async function start() {
    try {
      DB = OT.migrate(await api.load());
    } catch (err) {
      document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif">Could not read saved data: ${esc(err.message)}</div>`;
      return;
    }
    hasSmtpPassword = await api.hasSmtpPassword();
    if (!DB.orders.length && !DB.security) await persist();
    showLock();
  })();
})();
