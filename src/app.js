/* OrderTrack renderer: all UI. Data helpers live in data.js (window.OT). */
(function () {
  const { esc, money, num } = OT;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // Storage bridge. In the Mac app this comes from preload.js; in a plain browser
  // (development only) it falls back to localStorage.
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
    openMailto: async () => true
  };

  // ---------- Icons (inline SVG line icons) ----------
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    pad: '<path d="M7.5 7h9a5 5 0 0 1 4.9 6l-.7 3.4a2.4 2.4 0 0 1-4.2 1L14.6 15H9.4l-1.9 2.4a2.4 2.4 0 0 1-4.2-1L2.6 13a5 5 0 0 1 4.9-6z"/><path d="M8 10v3M6.5 11.5h3"/><path d="M15.5 11h.01M17.5 12.5h.01"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><rect x="8" y="5.5" width="8" height="4" rx="1"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>',
    users: '<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.5"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.65a3.5 3.5 0 0 1 0 6.7"/>',
    gear: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6 8.5-6"/>',
    send: '<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>',
    phone: '<path d="M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 5.2 5.2l1.4-2.1 4.2 1.6v3.2a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 5.7a2 2 0 0 1 2-2.2z"/>',
    minus: '<path d="M5 12h14"/>',
    tag: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  const MARK = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#FFFDF9"/><rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" stroke="#E6DDCE"/><rect x="13" y="15" width="38" height="9" rx="4.5" fill="#1A1D29"/><circle cx="17.5" cy="19.5" r="2.6" fill="#FF6B5A"/><rect x="13" y="27.5" width="38" height="9" rx="4.5" fill="#FF6B5A"/><circle cx="17.5" cy="32" r="2.6" fill="#FFFDF9"/><rect x="13" y="40" width="27" height="9" rx="4.5" fill="#F5A524"/><circle cx="17.5" cy="44.5" r="2.6" fill="#FFFDF9"/></svg>`;

  let DB = OT.emptyDB();
  let route = { page: 'cs' };
  const listState = { cs: { tab: 'active', q: '' }, hack: { tab: 'active', q: '' } };
  let hasSmtpPassword = false;
  let customerQuery = '';
  let openCustomer = null;

  const main = $('#main');
  const content = $('#content');
  if (api.platform === 'darwin') document.body.classList.add('mac');

  // ---------- Helpers ----------
  const S = () => DB.settings;
  const bizName = (b) => S().businessNames[b];
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDateTime = (ts) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  function ago(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    const d = Math.floor(s / 86400);
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d} days ago`;
    return fmtDate(ts);
  }
  const pill = (status) => `<span class="pill s-${esc(status)}">${esc(OT.statusLabel(status))}</span>`;
  const bizChip = (b) => `<span class="bizchip ${b}"><i></i>${esc(bizName(b))}</span>`;
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const contactLine = (o) => [o.customerEmail, o.customerPhone].filter(Boolean).join(' \u00B7 ');
  const custKey = (o) => { const c = OT.customerOf(DB.orders, o); return c ? c.key : OT.customerKey(o); };
  const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const avatar = (name, key, lg) => `<span class="avatar av${hash(key || name) % 5}${lg ? ' lg' : ''}">${esc(initials(name))}</span>`;
  const swatchOf = (o) => { const c = S().cs.colours.find((x) => x.id === o.colourId); return (c && c.swatch) || o.swatch || OT.guessSwatch(o.colourName); };
  const swatch = (hex, lg) => `<span class="swatch${lg ? ' lg' : ''}" style="background:${esc(hex)}"></span>`;

  function itemCell(o) {
    if (o.business === 'cs') {
      return `<div class="item">${swatch(swatchOf(o))}<div><b>${esc(o.colourName)}</b><span class="sub">${esc(o.model)}, ${o.delivery === 'express' ? 'Express' : 'Non express'}</span></div></div>`;
    }
    const extra = (o.extraGames || []).length;
    return `<div class="item"><span class="calcmark">${icon('calc')}</span><div><b>${esc(o.donor)}</b><span class="sub">${(o.includedGames || []).length} included${extra ? ` plus ${extra} extra` : ''} games</span></div></div>`;
  }

  let toastTimer;
  function toast(msg, isError) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast' + (isError ? ' error' : ''); }, isError ? 5000 : 2400);
  }

  async function persist(msg) {
    try {
      await api.save(DB);
      if (msg) toast(msg);
      updateCounts();
      return true;
    } catch (err) {
      toast('Could not save: ' + err.message, true);
      return false;
    }
  }

  function modal(html, onMount, biz) {
    const m = $('#modal');
    m.innerHTML = `<div class="card"${biz ? ` data-biz="${biz}"` : ''}>${html}</div>`;
    m.hidden = false;
    const close = () => { m.hidden = true; m.innerHTML = ''; };
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) close(); };
    if (onMount) onMount(m, close);
    const first = $('input:not([type=checkbox]), #okBtn', m);
    if (first) first.focus();
    return close;
  }

  function confirmBox(title, body, okLabel, danger) {
    return new Promise((resolve) => {
      modal(`<div class="m-body"><h2>${esc(title)}</h2><p>${body}</p></div>
        <div class="m-foot"><button class="btn ghost" data-close>Cancel</button>
        <button class="btn ${danger ? 'danger' : 'dark'}" id="okBtn">${esc(okLabel)}</button></div>`, (m, close) => {
        m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) { close(); resolve(false); } };
        $('#okBtn', m).onclick = () => { close(); resolve(true); };
      });
    });
  }

  // ---------- Lock screen ----------
  function showLock() {
    $('#shell').hidden = true;
    $('#modal').hidden = true;
    const lock = $('#lock');
    lock.hidden = false;
    const setup = !DB.security;
    lock.innerHTML = `<form class="card lockcard" id="lockForm" autocomplete="off">
      ${MARK}
      <h1>Order<span>Track</span></h1>
      <p>${setup ? 'Choose a passcode to protect your orders. You will enter it each time the app opens.' : 'Enter your passcode to unlock.'}</p>
      <input type="password" id="pc1" placeholder="Passcode" aria-label="Passcode">
      ${setup ? '<input type="password" id="pc2" placeholder="Confirm passcode" aria-label="Confirm passcode">' : ''}
      <button class="btn dark lg" type="submit">${setup ? 'Set passcode' : 'Unlock'}</button>
      <div class="err" id="lockErr"></div>
    </form>`;
    $('#pc1').focus();
    const fail = (msg) => {
      $('#lockErr').textContent = msg;
      const card = $('#lockForm'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    };
    $('#lockForm').onsubmit = async (e) => {
      e.preventDefault();
      const p1 = $('#pc1').value;
      if (setup) {
        const p2 = $('#pc2').value;
        if (p1.length < 4) return fail('Use at least 4 characters.');
        if (p1 !== p2) return fail('Passcodes do not match.');
        const salt = OT.uid();
        DB.security = { salt, hash: await OT.hashPasscode(p1, salt) };
        await persist();
        unlock();
      } else {
        const h = await OT.hashPasscode(p1, DB.security.salt);
        if (h === DB.security.hash) unlock();
        else { fail('Incorrect passcode. Try again.'); $('#pc1').value = ''; $('#pc1').focus(); }
      }
    };
  }

  function unlock() {
    $('#lock').hidden = true;
    $('#lock').innerHTML = '';
    $('#shell').hidden = false;
    render();
  }

  // ---------- Sidebar ----------
  function renderSidebar() {
    $('#sidebar').innerHTML = `
      <div class="sb-brand">${MARK}<b>Order<span>Track</span></b></div>
      <form id="find" class="find" autocomplete="off">
        ${icon('search')}
        <input id="findInput" type="search" placeholder="Find order" aria-label="Find order by serial or order ID" spellcheck="false">
        <kbd>${api.platform === 'darwin' ? '&#8984;F' : 'Ctrl F'}</kbd>
      </form>
      <div class="sb-label">Orders</div>
      <button class="sb-item" data-nav="cs"><span class="sb-dot cs">${icon('pad')}</span><span id="nm-cs"></span><span class="sb-count" id="count-cs"></span></button>
      <button class="sb-item" data-nav="hack"><span class="sb-dot hack">${icon('calc')}</span><span id="nm-hack"></span><span class="sb-count" id="count-hack"></span></button>
      <div class="sb-label">Records</div>
      <button class="sb-item" data-nav="customers">${icon('users')}Customers<span class="sb-count" id="count-cust"></span></button>
      <div class="sb-spacer"></div>
      <div class="sb-foot">
        <button class="sb-item" data-nav="settings">${icon('gear')}Settings</button>
        <button class="sb-item" data-action="lock">${icon('lock')}Lock</button>
      </div>`;
    $('.mobilebar .iconbtn').innerHTML = icon('menu');
    $('#find').addEventListener('submit', (e) => { e.preventDefault(); find($('#findInput').value); });
    $('#findInput').addEventListener('input', (e) => { const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); });
    updateCounts();
  }

  function updateCounts() {
    if (!$('#count-cs')) return;
    for (const b of ['cs', 'hack']) {
      $('#nm-' + b).textContent = bizName(b);
      const open = DB.orders.filter((o) => o.business === b && OT.isOpen(o)).length;
      $('#count-' + b).textContent = open || '';
    }
    $('#count-cust').textContent = OT.customers(DB.orders).length || '';
  }

  // ---------- Routing ----------
  function go(page, extra) {
    route = { page, ...(extra || {}) };
    $('#shell').classList.remove('nav-open');
    content.onscroll = null;
    render();
    content.scrollTop = 0;
  }

  const PAGE_TITLES = { customers: 'Customers', settings: 'Settings', results: 'Search' };

  function render() {
    const activeBiz = route.biz || (route.page === 'cs' || route.page === 'hack' ? route.page : null);
    const navKey = activeBiz && ['cs', 'hack', 'new', 'order'].includes(route.page) ? activeBiz : route.page;
    $$('.sb-item[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === navKey));
    main.dataset.biz = activeBiz || 'cs';
    $('#mbTitle').textContent = activeBiz && route.page !== 'customers' ? bizName(activeBiz) : (PAGE_TITLES[route.page] || 'OrderTrack');
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
    const st = listState[biz];
    const all = DB.orders.filter((o) => o.business === biz).sort((a, b) => b.createdAt - a.createdAt);
    const counts = Object.fromEntries([...OT.STATUSES, OT.CANCELLED].map((s) => [s.id, all.filter((o) => o.status === s.id).length]));
    const active = all.filter(OT.isOpen);
    const revenue = all.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + num(o.price), 0);
    const lede = all.length
      ? `${active.length} open order${active.length === 1 ? '' : 's'}${counts.pending ? `, ${counts.pending} waiting to be confirmed` : ''}.`
      : 'No orders yet.';

    main.innerHTML = `
      <div class="pagehead">
        <div><div class="crumb"><span class="bar"></span>${esc(bizName(biz))}</div><h1>Orders</h1><p class="lede">${lede}</p></div>
        <div class="head-actions"><button class="btn primary lg" data-action="new" data-biz="${biz}">${icon('plus')}New order</button></div>
      </div>
      <div class="card kpis">
        <div class="kpi"><div class="k"><i style="background:var(--accent)"></i>Open</div><div class="v">${active.length}</div></div>
        <div class="kpi"><div class="k"><i style="background:var(--ink-4)"></i>Pending</div><div class="v">${counts.pending}</div></div>
        <div class="kpi"><div class="k"><i style="background:var(--amber)"></i>In progress</div><div class="v">${counts.in_progress}</div></div>
        <div class="kpi"><div class="k"><i style="background:var(--green)"></i>Total value</div><div class="v">${money(revenue)}</div></div>
      </div>
      <div class="card" style="overflow:hidden">
        <div class="toolbar">
          <div class="tabs" role="tablist">
            <button data-tab="active">Open<span class="count">${active.length}</span></button>
            ${OT.STATUSES.map((s) => `<button data-tab="${s.id}">${s.label}<span class="count">${counts[s.id]}</span></button>`).join('')}
            ${counts.cancelled ? `<button data-tab="cancelled">Cancelled<span class="count">${counts.cancelled}</span></button>` : ''}
            <button data-tab="all">All<span class="count">${all.length}</span></button>
          </div>
          <div class="filterbox">${icon('search')}<input type="text" id="listQ" placeholder="Filter by name, email, phone, serial" value="${esc(st.q)}"></div>
        </div>
        <div id="listBody"></div>
      </div>`;

    const draw = () => {
      $$('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === st.tab));
      const q = st.q.trim().toLowerCase();
      let shown = st.tab === 'all' ? all : st.tab === 'active' ? active : all.filter((o) => o.status === st.tab);
      if (q) shown = shown.filter((o) => [o.customerName, o.customerEmail, o.customerPhone, o.serial, o.orderId, o.colourName, o.donor, o.model, o.notes].some((v) => String(v || '').toLowerCase().includes(q)));
      $('#listBody').innerHTML = shown.length ? orderTable(shown, false) : emptyState(all.length, biz, q);
    };
    $$('[data-tab]').forEach((b) => b.onclick = () => { st.tab = b.dataset.tab; draw(); });
    $('#listQ').oninput = (e) => { st.q = e.target.value; draw(); };
    draw();
  }

  function emptyState(total, biz, q) {
    if (!total) {
      return `<div class="empty"><div class="art">${icon(biz === 'cs' ? 'pad' : 'calc')}</div>
        <h3>No ${esc(bizName(biz))} orders yet</h3><p>Orders you create will appear here with their status.</p>
        <button class="btn primary" data-action="new" data-biz="${biz}">${icon('plus')}Create the first order</button></div>`;
    }
    return `<div class="empty"><div class="art">${icon('box')}</div><h3>Nothing here</h3><p>${q ? 'No orders match that filter.' : 'No orders have this status right now.'}</p></div>`;
  }

  function orderTable(orders, showBiz) {
    return `<table class="table">
      <thead><tr><th>Order</th><th>Customer</th><th class="hide-sm">Item</th><th class="r">Price</th><th>Status</th><th class="hide-md">Updated</th></tr></thead>
      <tbody>${orders.map((o) => {
        const last = o.history && o.history.length ? o.history[o.history.length - 1].at : o.createdAt;
        return `<tr data-open="${o.id}">
        <td><b>${esc(o.orderId)}</b><span class="sub mono">${showBiz ? `${esc(bizName(o.business))}, ` : ''}${esc(o.serial)}</span></td>
        <td><div class="person">${avatar(o.customerName, custKey(o))}<div><b>${esc(o.customerName)}</b><span class="sub hide-sm">${esc(contactLine(o))}</span></div></div></td>
        <td class="hide-sm">${itemCell(o)}</td>
        <td class="r num"><b>${money(o.price)}</b></td>
        <td>${pill(o.status)}</td>
        <td class="hide-md muted" style="font-size:13px;white-space:nowrap">${ago(last)}</td>
      </tr>`;
      }).join('')}</tbody></table>`;
  }

  // ---------- Shared form helpers ----------
  function field(id, label, input, hint, cls) {
    return `<div class="field${cls ? ' ' + cls : ''}" data-field="${id}"><label for="${id}">${label}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}<div class="err" hidden></div></div>`;
  }

  function section(n, title, desc, body) {
    return `<div class="fsec"><div class="fsec-head"><span class="n">${n}</span><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div></div>${body}</div>`;
  }

  function customerSection(n) {
    const known = OT.customers(DB.orders);
    return section(n, 'Customer', 'Enter an email, a phone number, or both. Start typing to reuse an existing customer.', `<div class="grid">
      ${field('f_name', 'Name', `<input type="text" id="f_name" list="dl_names" autocomplete="off" placeholder="Full name">`, null, 'full')}
      ${field('f_email', 'Email', `<input type="email" id="f_email" list="dl_emails" autocomplete="off" placeholder="name@example.com">`, 'Needed for status update emails.')}
      ${field('f_phone', 'Phone', `<input type="tel" id="f_phone" list="dl_phones" autocomplete="off" placeholder="07700 900123">`, 'Optional if you have an email.')}
      <datalist id="dl_names">${known.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
      <datalist id="dl_emails">${known.filter((c) => c.email).map((c) => `<option value="${esc(c.email)}">${esc(c.name)}</option>`).join('')}</datalist>
      <datalist id="dl_phones">${known.filter((c) => c.phone).map((c) => `<option value="${esc(c.phone)}">${esc(c.name)}</option>`).join('')}</datalist>
    </div>`);
  }

  function idFields(biz) {
    const prefix = biz === 'cs' ? 'CS' : 'HC';
    return `<div class="grid">
      ${field('f_orderId', 'Order ID', `<input type="text" id="f_orderId" value="${esc(OT.nextOrderId(DB.orders, biz))}" spellcheck="false">`, 'Suggested automatically, change it if you need to.')}
      ${field('f_serial', 'Serial number', `<div class="serial-wrap"><input type="text" id="f_serial" value="${prefix}" maxlength="10" spellcheck="false"><span class="counter" id="serialCount">2/10</span></div>`, `10 characters, starting with ${prefix}.`)}
    </div>`;
  }

  function wireCommon(biz, onChange) {
    const known = OT.customers(DB.orders);
    const name = $('#f_name'), email = $('#f_email'), phone = $('#f_phone'), serial = $('#f_serial'), oid = $('#f_orderId');
    const fill = (c) => {
      if (!c) return;
      if (!name.value) name.value = c.name;
      if (!email.value && c.email) email.value = c.email;
      if (!phone.value && c.phone) phone.value = c.phone;
      ['f_email', 'f_phone'].forEach((id) => setErr(id, ''));
      onChange();
    };
    name.addEventListener('change', () => fill(known.find((k) => k.name.toLowerCase() === name.value.trim().toLowerCase())));
    phone.addEventListener('change', () => {
      const d = OT.phoneDigits(phone.value);
      if (d) fill(known.find((k) => k.phone && OT.phoneDigits(k.phone) === d));
    });
    email.addEventListener('change', () => {
      fill(known.find((k) => k.email && k.email.toLowerCase() === email.value.trim().toLowerCase()));
    });
    const upper = (el) => { const p = el.selectionStart; el.value = el.value.toUpperCase().replace(el === serial ? /\s/g : /$^/, ''); el.setSelectionRange(p, p); };
    const prefix = biz === 'cs' ? 'CS' : 'HC';
    const updateCounter = () => {
      const c = $('#serialCount');
      c.textContent = `${serial.value.length}/10`;
      c.classList.toggle('ok', !OT.validateSerial(serial.value, prefix));
    };
    serial.addEventListener('input', () => { upper(serial); updateCounter(); });
    oid.addEventListener('input', () => upper(oid));
    updateCounter();
    const form = $('#orderForm');
    form.addEventListener('input', (e) => { const f = e.target.closest('[data-field]'); if (f) setErr(f.dataset.field, ''); onChange(); });
    form.addEventListener('change', (e) => { const f = e.target.closest('[data-field]'); if (f) setErr(f.dataset.field, ''); onChange(); });
  }

  function setErr(id, msg) {
    const wrap = $(`[data-field="${id}"]`);
    if (!wrap) return;
    const e = $('.err', wrap);
    if (!e) return;
    e.innerHTML = msg ? `${icon('info', 'sm')}${esc(msg)}` : '';
    e.hidden = !msg;
    const input = $('input:not([type=radio]):not([type=checkbox]), select, textarea', wrap);
    if (input) input.classList.toggle('invalid', !!msg);
  }

  function validateCommon(biz) {
    const errs = {};
    const name = $('#f_name').value.trim();
    const email = $('#f_email').value.trim();
    const phone = $('#f_phone').value.trim();
    const orderId = $('#f_orderId').value.trim().toUpperCase();
    const serial = $('#f_serial').value.trim().toUpperCase();
    if (!name) errs.f_name = 'Enter the customer name.';
    if (!email && !phone) errs.f_email = 'Enter an email or a phone number (or both).';
    else if (email && !isEmail(email)) errs.f_email = 'That does not look like a valid email address.';
    const pErr = OT.validatePhone(phone);
    if (pErr) errs.f_phone = pErr;
    if (!orderId) errs.f_orderId = 'Enter an order ID.';
    else if (DB.orders.some((o) => o.orderId.toUpperCase() === orderId)) errs.f_orderId = `${orderId} is already used by another order.`;
    const sErr = OT.validateSerial(serial, biz === 'cs' ? 'CS' : 'HC');
    if (sErr) errs.f_serial = sErr;
    else if (DB.orders.some((o) => o.serial.toUpperCase() === serial)) errs.f_serial = `${serial} is already used by another order.`;
    return { errs, values: { customerName: name, customerEmail: email, customerPhone: phone, orderId, serial } };
  }

  function showErrors(ids, errs) {
    ids.forEach((id) => setErr(id, errs[id]));
    const first = ids.find((id) => errs[id]);
    if (first) {
      const wrap = $(`[data-field="${first}"]`);
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const el = $('input:not([type=radio]):not([type=checkbox]), select, textarea', wrap);
      if (el) el.focus({ preventScroll: true });
      toast('Check the highlighted fields', true);
    }
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

  const sumRow = (k, v) => `<div class="row"><span>${k}</span><span>${v || '<span class="empty-val">Not chosen</span>'}</span></div>`;

  // ---------- Discounts (shared by the order forms and the order page) ----------
  function discountPicker(current) {
    const presets = S().discounts || [];
    let sel = 'none';
    let custom = { type: 'percent', value: '', label: '' };
    if (current) {
      const p = presets.find((x) => x.type === current.type && num(x.value) === num(current.value) && x.name === current.label);
      if (p) sel = p.id;
      else { sel = 'custom'; custom = { type: current.type, value: current.value, label: current.label || '' }; }
    }
    const tile = (value, title, sub) => `<label class="tile"><input type="radio" name="disc" value="${esc(value)}" ${sel === value ? 'checked' : ''}><span class="radio"></span><span class="t-main"><span class="t-title">${title}</span>${sub ? `<span class="t-sub">${sub}</span>` : ''}</span></label>`;
    return `<div class="field" data-field="f_disc">
      <div class="tiles discounts">
        ${tile('none', 'No discount', 'Full price')}
        ${presets.map((p) => tile(p.id, esc(p.name), esc(OT.discountText(p)))).join('')}
        ${tile('custom', 'Custom', 'Percent or amount')}
      </div>
      <div class="disc-custom" id="discCustom" ${sel === 'custom' ? '' : 'hidden'}>
        <select id="d_type" aria-label="Discount type">
          <option value="percent" ${custom.type === 'percent' ? 'selected' : ''}>Percent off</option>
          <option value="fixed" ${custom.type === 'fixed' ? 'selected' : ''}>Amount off (£)</option>
        </select>
        <input type="number" id="d_value" min="0" step="0.01" placeholder="${custom.type === 'fixed' ? '5.00' : '10'}" value="${esc(custom.value)}" aria-label="Discount value">
        <input type="text" id="d_label" placeholder="Reason (optional), for example Returning customer" value="${esc(custom.label)}" aria-label="Discount reason">
      </div>
      <div class="err" hidden></div>
    </div>`;
  }

  function readDiscount(root) {
    const sel = ($('input[name=disc]:checked', root) || {}).value || 'none';
    if (sel === 'none') return { d: null };
    if (sel === 'custom') {
      const type = $('#d_type', root).value;
      const value = num($('#d_value', root).value);
      const label = $('#d_label', root).value.trim();
      if (!(value > 0)) return { err: 'Enter a discount above zero, or choose No discount.' };
      if (type === 'percent' && value > 100) return { err: 'A percentage discount cannot be more than 100.' };
      return { d: { type, value, label } };
    }
    const p = (S().discounts || []).find((x) => x.id === sel);
    return { d: p ? { type: p.type, value: num(p.value), label: p.name } : null };
  }

  function wireDiscount(root, onChange) {
    root.addEventListener('change', (e) => {
      if (e.target.name === 'disc') {
        $('#discCustom', root).hidden = e.target.value !== 'custom';
        if (e.target.value === 'custom') $('#d_value', root).focus();
      }
      if (e.target.id === 'd_type') $('#d_value', root).placeholder = e.target.value === 'fixed' ? '5.00' : '10';
      if (onChange) onChange();
    });
    root.addEventListener('input', (e) => { if (e.target.id === 'd_value' || e.target.id === 'd_label') { setErr('f_disc', ''); if (onChange) onChange(); } });
  }

  // Summary rows and total for a subtotal with whatever discount is currently picked.
  function discountSummary(subtotal, root) {
    const r = readDiscount(root);
    const amt = r.d ? OT.discountAmount(subtotal, r.d) : 0;
    const rows = amt > 0
      ? sumRow('Subtotal', money(subtotal)) + sumRow('Discount', `<span class="disc-val">-${money(amt)}</span>`)
      : '';
    return { rows, total: subtotal - amt };
  }

  // The summary shell (with its buttons) is rendered once; only its contents update,
  // so a click on Create order is never lost to a re-render triggered by blur/change.
  function summaryCard(biz, rowsHtml, total, totalLbl) {
    const slot = $('#sumSlot');
    if (!$('#summary', slot)) {
      slot.innerHTML = `<aside class="card summary" id="summary">
        <div class="s-top"><div class="s-eyebrow">Order summary</div><div class="s-id" id="sumId"></div></div>
        <div class="rows" id="sumRows"></div>
        <div class="total"><span class="lbl" id="sumLbl"></span><span class="amt" id="sumAmt"></span></div>
        <div class="s-actions"><button type="submit" form="orderForm" class="btn primary lg block">${icon('check')}Create order</button>
          <button type="button" class="btn ghost block" data-nav="${biz}">Cancel</button></div>
        <p class="note">New orders start as Pending. You can change the status from the order page.</p>
      </aside>`;
    }
    $('#sumId').textContent = $('#f_orderId') ? $('#f_orderId').value : '';
    $('#sumRows').innerHTML = rowsHtml;
    $('#sumLbl').textContent = totalLbl;
    $('#sumAmt').textContent = money(total);
  }

  // ---------- Payment (shared by the order forms and the order page) ----------
  const todayStr = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

  function paymentPicker(cur) {
    const fin = cur && cur.method === 'finance';
    const freq = fin ? cur.frequency : 'monthly';
    const count = fin ? cur.count : 3;
    const start = fin && cur.start ? cur.start : todayStr();
    const tile = (value, title, sub, checked) => `<label class="tile"><input type="radio" name="pay" value="${value}" ${checked ? 'checked' : ''}><span class="radio"></span><span class="t-main"><span class="t-title">${title}</span><span class="t-sub">${sub}</span></span></label>`;
    return `<div class="field" data-field="f_pay">
      <div class="tiles paymethod">
        ${tile('upfront', 'Pay upfront', 'The full amount in one payment', !fin)}
        ${tile('finance', 'Finance', 'Split into weekly or monthly payments', fin)}
      </div>
      <div class="finance" id="finBox" ${fin ? '' : 'hidden'}>
        <div class="fin-grid">
          <div><span class="flabel">How often</span>
            <div class="seg" role="radiogroup">
              <label><input type="radio" name="freq" value="weekly" ${freq === 'weekly' ? 'checked' : ''}><span>Weekly</span></label>
              <label><input type="radio" name="freq" value="monthly" ${freq !== 'weekly' ? 'checked' : ''}><span>Monthly</span></label>
            </div></div>
          <div><span class="flabel">Number of payments</span>
            <div class="stepper"><button type="button" data-step="-1" aria-label="Fewer payments">${icon('minus')}</button><input type="number" id="fin_count" min="2" max="52" value="${esc(count)}" aria-label="Number of payments"><button type="button" data-step="1" aria-label="More payments">${icon('plus')}</button></div></div>
          <div><span class="flabel">First payment</span><input type="date" id="fin_start" value="${esc(start)}" aria-label="First payment date"></div>
        </div>
        <div class="fin-preview" id="finPreview"></div>
      </div>
      <div class="err" hidden></div>
    </div>`;
  }

  function readPayment(root) {
    const method = ($('input[name=pay]:checked', root) || {}).value || 'upfront';
    if (method === 'upfront') return { p: { method: 'upfront', paid: false } };
    const count = Math.round(num($('#fin_count', root).value));
    const start = $('#fin_start', root).value;
    const frequency = ($('input[name=freq]:checked', root) || {}).value || 'monthly';
    if (count < 2 || count > 52) return { err: 'Choose between 2 and 52 payments.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return { err: 'Choose the date of the first payment.' };
    return { p: { method: 'finance', frequency, count, start, paid: [] } };
  }

  function drawFinancePreview(root, total) {
    const box = $('#finPreview', root);
    if (!box || $('#finBox', root).hidden) return;
    const r = readPayment(root);
    if (r.err) { box.innerHTML = `<span class="muted">${esc(r.err)}</span>`; return; }
    if (!(total > 0)) { box.innerHTML = '<span class="muted">Choose the product above to see the payment amounts.</span>'; return; }
    const sched = OT.paymentSchedule({ price: total, payment: r.p });
    const shown = sched.slice(0, 6);
    box.innerHTML = `<div class="fin-head"><b>${sched.length} ${r.p.frequency} payments of ${money(sched[0].amount)}</b><span>Last payment ${fmtDate(sched[sched.length - 1].due)}</span></div>
      <ol class="fin-list">${shown.map((x) => `<li><span>${fmtDate(x.due)}</span><span class="num">${money(x.amount)}</span></li>`).join('')}${sched.length > shown.length ? `<li class="more">and ${sched.length - shown.length} more</li>` : ''}</ol>`;
  }

  function wirePayment(root, getTotal, onChange) {
    const refresh = () => { drawFinancePreview(root, getTotal()); if (onChange) onChange(); };
    root.addEventListener('change', (e) => {
      if (e.target.name === 'pay') $('#finBox', root).hidden = e.target.value !== 'finance';
      if (['pay', 'freq'].includes(e.target.name) || ['fin_count', 'fin_start'].includes(e.target.id)) { setErr('f_pay', ''); refresh(); }
    });
    root.addEventListener('input', (e) => { if (e.target.id === 'fin_count') refresh(); });
    $$('[data-step]', root).forEach((b) => b.addEventListener('click', () => {
      const inp = $('#fin_count', root);
      inp.value = Math.min(52, Math.max(2, Math.round(num(inp.value)) + Number(b.dataset.step)));
      refresh();
    }));
    drawFinancePreview(root, getTotal());
  }

  const payShort = (pay) => (!pay ? '' : pay.method === 'finance' ? `${pay.count} x ${pay.frequency}` : 'Upfront');

  function notesSection(n) {
    return section(n, 'Extra notes', 'Optional. Only you see these, they are never sent to the customer.',
      `<div class="field" data-field="f_notes"><textarea id="f_notes" placeholder="Anything to remember about this order"></textarea></div>`);
  }

  // ---------- ClearSense form ----------
  function renderCsForm() {
    const s = S().cs;
    main.innerHTML = `
      <button class="back" data-nav="cs">${icon('back')}${esc(bizName('cs'))} orders</button>
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>${esc(bizName('cs'))}</div><h1>New order</h1></div></div>
      <div class="formlayout">
        <form class="card" id="orderForm" novalidate>
          ${customerSection(1)}
          ${section(2, 'Order', null, idFields('cs'))}
          ${section(3, 'Controller', 'Pick the BDM model, then the colour. Installation is always included.', `
            <div class="field" data-field="f_model"><span class="flabel">BDM model</span>
              <div class="tiles models">${s.models.map((m) => `<label class="tile"><input type="radio" name="model" value="${esc(m)}">${esc(m)}</label>`).join('')}</div><div class="err" hidden></div></div>
            <div class="field" data-field="f_colour" style="margin-top:18px"><span class="flabel">Colour</span><div id="colourBox"></div><div class="err" hidden></div></div>
            <div class="field" data-field="f_delivery" style="margin-top:18px"><span class="flabel">Delivery</span><div id="deliveryBox"></div><div class="err" hidden></div></div>`)}
          ${section(4, 'Options', 'Optional. Tick any that apply.', s.addons.length ? `<div class="tiles addons">${s.addons.map((a) => `<label class="tile"><input type="checkbox" name="addon" value="${a.id}"><span class="box">${icon('check')}</span><span class="t-main"><span class="t-title">${esc(a.name)}</span></span>${num(a.price) ? `<span class="t-price">+${money(a.price)}</span>` : ''}</label>`).join('')}</div>` : '<div class="placeholder-note">No options set up. Add them in Settings.</div>')}
          ${section(5, 'Discount', 'Optional. Pick a saved discount or enter a custom one.', discountPicker(null))}
          ${section(6, 'Payment', 'How the customer is paying.', paymentPicker(null))}
          ${notesSection(7)}
        </form>
        <div id="sumSlot"></div>
      </div>`;

    const val = (n) => ($(`input[name=${n}]:checked`) || {}).value || '';
    const addons = () => $$('input[name=addon]:checked').map((i) => i.value);

    function drawColours() {
      const model = val('model');
      const prev = val('colour');
      const list = OT.coloursFor(S(), model);
      $('#colourBox').innerHTML = !model
        ? '<div class="placeholder-note">Choose a model to see its colours.</div>'
        : list.length ? `<div class="tiles colours">${list.map((c) => {
          const prices = OT.deliveryOptions(c).map((o) => o.price);
          return `<label class="tile"><input type="radio" name="colour" value="${c.id}" ${c.id === prev ? 'checked' : ''}>${swatch(c.swatch, true)}<span class="t-main"><span class="t-title">${esc(c.name)}</span><span class="t-sub">from ${money(Math.min(...prices))}</span></span></label>`;
        }).join('')}</div>` : '<div class="placeholder-note">No colours are set up for this model.</div>';
      drawDelivery();
    }
    function drawDelivery() {
      const c = s.colours.find((x) => x.id === val('colour'));
      const prev = val('delivery');
      const opts = OT.deliveryOptions(c);
      $('#deliveryBox').innerHTML = !opts.length
        ? '<div class="placeholder-note">Choose a colour to see delivery options.</div>'
        : `<div class="tiles delivery">${opts.map((o) => `<label class="tile"><input type="radio" name="delivery" value="${o.id}" ${o.id === prev || opts.length === 1 ? 'checked' : ''}><span class="radio"></span><span class="t-main"><span class="t-title">${o.label}</span><span class="t-sub">${esc(o.id === 'express' ? s.expressWording : s.standardWording)}</span></span><span class="t-price">${money(o.price)}</span></label>`).join('')}</div>`;
      drawSummary();
    }
    function drawSummary() {
      const c = s.colours.find((x) => x.id === val('colour'));
      const d = val('delivery');
      const price = OT.csPrice(S(), val('colour'), d, addons());
      const names = addons().map((id) => (s.addons.find((a) => a.id === id) || {}).name).filter(Boolean);
      const disc = discountSummary(price || 0, $('#orderForm'));
      summaryCard('cs',
        sumRow('Customer', esc($('#f_name').value.trim())) +
        sumRow('Serial', $('#f_serial').value.length > 2 ? `<span class="mono">${esc($('#f_serial').value)}</span>` : '') +
        sumRow('Model', esc(val('model'))) +
        sumRow('Colour', c ? `${swatch(c.swatch)}${esc(c.name)}` : '') +
        sumRow('Delivery', d ? (d === 'express' ? 'Express' : 'Non express') : '') +
        sumRow('Options', names.length ? esc(names.join(', ')) : '<span class="empty-val">None</span>') +
        sumRow('Installation', 'Included') +
        sumRow('Payment', esc(payShort(readPayment($('#orderForm')).p) || 'Check finance details')) +
        (price == null ? '' : disc.rows),
        price == null ? 0 : disc.total, price == null ? 'Choose colour and delivery' : 'Total');
    }

    wireCommon('cs', drawSummary);
    wireDiscount($('#orderForm'), drawSummary);
    const csTotal = () => discountSummary(OT.csPrice(S(), val('colour'), val('delivery'), addons()) || 0, $('#orderForm')).total;
    wirePayment($('#orderForm'), csTotal);
    $('#orderForm').addEventListener('change', () => drawFinancePreview($('#orderForm'), csTotal()));
    $('#orderForm').addEventListener('input', (e) => { if (e.target.id === 'd_value') drawFinancePreview($('#orderForm'), csTotal()); });
    $('#orderForm').addEventListener('change', (e) => {
      if (e.target.name === 'model') drawColours();
      if (e.target.name === 'colour') drawDelivery();
    });
    drawColours();
    $('#f_name').focus();

    $('#orderForm').onsubmit = (e) => {
      e.preventDefault();
      const { errs, values } = validateCommon('cs');
      if (!val('model')) errs.f_model = 'Choose a BDM model.';
      if (!val('colour')) errs.f_colour = 'Choose a colour.';
      else if (!val('delivery')) errs.f_delivery = 'Choose a delivery type.';
      const disc = readDiscount($('#orderForm'));
      if (disc.err) errs.f_disc = disc.err;
      const pay = readPayment($('#orderForm'));
      if (pay.err) errs.f_pay = pay.err;
      if (!showErrors(['f_name', 'f_email', 'f_phone', 'f_orderId', 'f_serial', 'f_model', 'f_colour', 'f_delivery', 'f_disc', 'f_pay'], errs)) return;
      const c = s.colours.find((x) => x.id === val('colour'));
      const addonIds = addons();
      createOrder(OT.applyDiscount({
        business: 'cs', ...values,
        model: val('model'), colourId: c.id, colourName: c.name, swatch: c.swatch,
        delivery: val('delivery'),
        addonIds, addonNames: addonIds.map((id) => (s.addons.find((a) => a.id === id) || {}).name).filter(Boolean),
        price: OT.csPrice(S(), c.id, val('delivery'), addonIds),
        payment: pay.p, notes: $('#f_notes').value.trim()
      }, disc.d));
    };
  }

  // ---------- Hackulator form ----------
  function renderHackForm() {
    const h = S().hack;
    main.innerHTML = `
      <button class="back" data-nav="hack">${icon('back')}${esc(bizName('hack'))} orders</button>
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>${esc(bizName('hack'))}</div><h1>New order</h1></div></div>
      <div class="formlayout">
        <form class="card" id="orderForm" novalidate>
          ${customerSection(1)}
          ${section(2, 'Order', null, idFields('hack'))}
          ${section(3, 'Calculator', null, `<div class="grid">${field('f_donor', 'Donor calculator', `<input type="text" id="f_donor" placeholder="For example TI-84 Plus CE">`, null, 'full')}</div>`)}
          ${section(4, 'Games', `${h.includedGames.length ? esc(h.includedGames.join(', ')) + ' are' : 'The base games are'} included in the ${money(h.basePrice)} base price.`, `
            <div class="tiles addons" style="margin-bottom:16px">${h.includedGames.map((g) => `<div class="tile" style="cursor:default;background:var(--surface-warm)"><span class="box" style="background:var(--ink);border-color:var(--ink)">${icon('check').replace('class="ic', 'style="opacity:1" class="ic')}</span><span class="t-main"><span class="t-title">${esc(g)}</span></span><span class="t-sub">Included</span></div>`).join('')}</div>
            ${field('f_games', 'Extra games', `<textarea id="f_games" placeholder="One game per line"></textarea>`, `One game per line, ${money(h.extraGamePrice)} each.`)}`)}
          ${section(5, 'Discount', 'Optional. Pick a saved discount or enter a custom one.', discountPicker(null))}
          ${section(6, 'Payment', 'How the customer is paying.', paymentPicker(null))}
          ${notesSection(7)}
        </form>
        <div id="sumSlot"></div>
      </div>`;

    const games = $('#f_games');
    function drawSummary() {
      const extra = OT.parseGames(games.value);
      const disc = discountSummary(OT.hackPrice(S(), extra), $('#orderForm'));
      summaryCard('hack',
        sumRow('Customer', esc($('#f_name').value.trim())) +
        sumRow('Serial', $('#f_serial').value.length > 2 ? `<span class="mono">${esc($('#f_serial').value)}</span>` : '') +
        sumRow('Calculator', esc($('#f_donor').value.trim())) +
        sumRow('Base price', money(h.basePrice)) +
        sumRow(`Extra games (${extra.length})`, extra.length ? `${extra.length} x ${money(h.extraGamePrice)}` : '<span class="empty-val">None</span>') +
        sumRow('Payment', esc(payShort(readPayment($('#orderForm')).p) || 'Check finance details')) +
        disc.rows,
        disc.total, 'Total');
    }
    wireCommon('hack', drawSummary);
    wireDiscount($('#orderForm'), drawSummary);
    const hackTotal = () => discountSummary(OT.hackPrice(S(), OT.parseGames(games.value)), $('#orderForm')).total;
    wirePayment($('#orderForm'), hackTotal);
    $('#orderForm').addEventListener('change', () => drawFinancePreview($('#orderForm'), hackTotal()));
    $('#orderForm').addEventListener('input', (e) => { if (e.target.id === 'd_value' || e.target.id === 'f_games') drawFinancePreview($('#orderForm'), hackTotal()); });
    drawSummary();
    $('#f_name').focus();
    $('#orderForm').onsubmit = (e) => {
      e.preventDefault();
      const { errs, values } = validateCommon('hack');
      const donor = $('#f_donor').value.trim();
      if (!donor) errs.f_donor = 'Enter the donor calculator.';
      const disc = readDiscount($('#orderForm'));
      if (disc.err) errs.f_disc = disc.err;
      const pay = readPayment($('#orderForm'));
      if (pay.err) errs.f_pay = pay.err;
      if (!showErrors(['f_name', 'f_email', 'f_phone', 'f_orderId', 'f_serial', 'f_donor', 'f_disc', 'f_pay'], errs)) return;
      const extraGames = OT.parseGames(games.value);
      createOrder(OT.applyDiscount({ business: 'hack', ...values, donor, includedGames: [...h.includedGames], extraGames, price: OT.hackPrice(S(), extraGames), payment: pay.p, notes: $('#f_notes').value.trim() }, disc.d));
    };
  }

  // ---------- Order view ----------
  function emailReady() {
    const e = S().email;
    return !!(e.host && e.user && hasSmtpPassword);
  }

  async function sendStatusEmail(order) {
    if (!order.customerEmail) { toast('This customer has no email address. Add one with Edit on the order page.', true); return 'none'; }
    const msg = OT.buildStatusEmail(S(), order);
    if (emailReady()) {
      const res = await api.sendEmail(S().email, msg);
      if (res.ok) { toast(`Update emailed to ${order.customerEmail}`); return 'sent'; }
      toast('Email failed: ' + res.error, true);
      return 'failed';
    }
    const url = `mailto:${encodeURIComponent(msg.to)}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.text)}`;
    await api.openMailto(url);
    toast('Email opened in your mail app');
    return 'mail app';
  }

  const EMAIL_NOTE = { sent: 'Customer emailed', resent: 'Email resent', failed: 'Email failed', 'mail app': 'Opened in Mail' };

  function renderOrder() {
    const o = DB.orders.find((x) => x.id === route.id);
    if (!o) { go('cs'); return; }
    const cancelled = o.status === 'cancelled';
    const idx = OT.STATUSES.findIndex((s) => s.id === (cancelled ? (o.cancelledFrom || 'pending') : o.status));
    const cancelEntry = cancelled ? [...o.history].reverse().find((h) => h.status === 'cancelled' && !h.note) : null;
    const reached = {};
    o.history.forEach((h) => { if (!h.note) reached[h.status] = h.at; });
    const custOrders = DB.orders.filter((x) => custKey(x) === custKey(o)).length;
    const details = OT.orderLines(S(), o).filter(([k]) => !['Order ID', 'Serial number', 'Price', 'Subtotal', 'Discount', 'Payment'].includes(k));
    const hasDisc = !!(o.discount && o.discount.amount > 0);
    const discWhy = hasDisc ? (o.discount.label ? `${o.discount.label}, ${OT.discountText(o.discount)}` : OT.discountText(o.discount)) : '';
    const priceNote = o.business === 'cs' ? 'Installation included' : `${(o.extraGames || []).length} extra game${(o.extraGames || []).length === 1 ? '' : 's'}`;

    main.innerHTML = `
      <button class="back" data-nav="${o.business}">${icon('back')}${esc(bizName(o.business))} orders</button>
      <section class="card hero">
        <div class="hero-top">
          <div>
            <div style="display:flex;gap:10px;align-items:center">${bizChip(o.business)}${pill(o.status)}</div>
            <h1>${esc(o.orderId)}</h1>
            <div class="meta"><span class="chip mono">${esc(o.serial)}</span><span>Created ${fmtDateTime(o.createdAt)}</span></div>
          </div>
          <div class="price">${hasDisc ? `<div class="was">${money(o.subtotal)}</div>` : ''}<div class="amt">${money(o.price)}</div><div class="lbl">${hasDisc ? `<span class="disc-val">${esc(discWhy)}</span>` : esc(priceNote)}</div></div>
        </div>
        ${cancelled ? `<div class="cancel-banner">${icon('x')}<div><b>This order was cancelled${cancelEntry ? ` on ${fmtDate(cancelEntry.at)}` : ''}.</b><span>It stays on record but is left out of open orders and totals.</span></div><button class="btn sm" data-action="reopenOrder">Reopen order</button></div>` : ''}
        <div class="tracker${cancelled ? ' is-cancelled' : ''}">${OT.STATUSES.map((s, i) => `<button ${cancelled ? 'disabled ' : ''}class="tstep ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}" data-status="${s.id}" title="${i === idx ? 'Current status' : `Mark as ${s.label}`}">
          <span class="rail"><span class="node">${i < idx ? icon('check') : i + 1}</span></span>
          <span class="tl">${s.label}</span>
          <span class="tw">${i <= idx && reached[s.id] ? ago(reached[s.id]) : ''}</span></button>`).join('')}</div>
      </section>
      <div class="ordergrid">
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>Product details</h2></div>
            <div class="card-pad" style="padding-top:8px">
              <dl class="dl">${details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k === 'Colour' ? swatch(swatchOf(o)) : ''}${esc(v)}</dd>`).join('')}</dl>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><h2>Extra notes</h2><button class="btn sm" data-action="editNotes">${icon('edit')}${o.notes ? 'Edit' : 'Add notes'}</button></div>
            <div class="card-pad" style="padding-top:12px">${o.notes ? `<div class="notes-text">${esc(o.notes)}</div>` : '<p class="muted" style="margin:0;font-size:13.5px">No notes yet. Notes are private and never sent to the customer.</p>'}</div>
          </section>
          <section class="card">
            <div class="card-head"><h2>Activity</h2><span class="meta">${o.history.length} update${o.history.length === 1 ? '' : 's'}</span></div>
            <div class="card-pad">
              <ul class="activity">${[...o.history].reverse().map((h) => `<li><span class="dot"></span><div>
                <b>${h === o.history[0] ? 'Order created' : h.note ? esc(h.note) : h.status === 'cancelled' ? 'Order cancelled' : `Marked as ${esc(OT.statusLabel(h.status))}`}</b>${EMAIL_NOTE[h.email] ? `<span class="mail">${icon('mail')}${EMAIL_NOTE[h.email]}</span>` : ''}
                <div class="when">${fmtDateTime(h.at)}</div></div></li>`).join('')}</ul>
            </div>
          </section>
        </div>
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>Customer</h2><button class="btn sm" data-action="editContact">${icon('edit')}Edit</button></div>
            <div class="card-pad">
              <div class="custcard">${avatar(o.customerName, custKey(o), true)}<div style="min-width:0"><b>${esc(o.customerName)}</b>
                ${o.customerEmail ? `<span class="contact">${icon('mail', 'sm')}${esc(o.customerEmail)}</span>` : ''}
                ${o.customerPhone ? `<span class="contact">${icon('phone', 'sm')}${esc(o.customerPhone)}</span>` : ''}</div></div>
              <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
                <button class="btn sm" data-action="viewCustomer">${icon('users')}${custOrders} order${custOrders === 1 ? '' : 's'} in total</button>
              </div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><h2>Price</h2><button class="btn sm" data-action="editDiscount">${icon('tag')}${hasDisc ? 'Change discount' : 'Add discount'}</button></div>
            <div class="card-pad" style="padding-top:8px">
              <dl class="dl">
                ${hasDisc ? `<dt>Subtotal</dt><dd class="num">${money(o.subtotal)}</dd><dt>Discount</dt><dd><span class="disc-val num">-${money(o.discount.amount)}</span><span class="muted" style="font-weight:500">${esc(discWhy)}</span></dd>` : ''}
                <dt>Total</dt><dd class="num" style="font-size:16px">${money(o.price)}</dd>
              </dl>
            </div>
          </section>
          ${paymentCard(o)}
          <section class="card">
            <div class="card-head"><h2>Notify customer</h2></div>
            <div class="card-pad" style="display:grid;gap:12px">
              <p class="muted" style="margin:0;font-size:13.5px">Each status change asks whether to email the customer. You can also resend the current status at any time.</p>
              <button class="btn block" data-action="resend" ${o.customerEmail ? '' : 'disabled'}>${icon('send')}Email current status</button>
              ${!o.customerEmail ? `<div class="callout">${icon('info')}<div>No email address on this order${o.customerPhone ? `, so contact the customer on ${esc(o.customerPhone)}` : ''}. <button class="linkbtn" data-action="editContact">Add an email</button></div></div>` : emailReady() ? '' : `<div class="callout">${icon('info')}<div>Direct sending is not set up, so emails open in your mail app. <button class="linkbtn" data-nav="settings">Set up email</button></div></div>`}
            </div>
          </section>
          <section class="card">
            <div class="card-head"><h2>Manage order</h2></div>
            <div class="card-pad manage">
              ${cancelled
                ? `<div class="manage-row"><div><b>Reopen order</b><span>Put it back to ${esc(OT.statusLabel(o.cancelledFrom || 'pending'))}.</span></div><button class="btn sm" data-action="reopenOrder">Reopen</button></div>`
                : `<div class="manage-row"><div><b>Cancel order</b><span>Keeps it on record as Cancelled. You can reopen it later.</span></div><button class="btn sm" data-action="cancelOrder">${icon('x')}Cancel order</button></div>`}
              <div class="manage-row"><div><b>Delete permanently</b><span>Removes the order completely. This cannot be undone.</span></div><button class="btn sm danger" data-action="deleteOrder">${icon('trash')}Delete</button></div>
            </div>
          </section>
        </div>
      </div>`;

    $$('[data-status]').forEach((b) => b.onclick = () => changeStatus(o, b.dataset.status));
    $$('[data-inst]').forEach((cb) => cb.onchange = async () => {
      const i = Number(cb.dataset.inst);
      o.payment.paid = o.payment.paid || [];
      o.payment.paid[i] = cb.checked;
      await persist(cb.checked ? `Payment ${i + 1} marked as paid` : `Payment ${i + 1} marked as unpaid`);
      renderOrder();
    });
  }

  function paymentCard(o) {
    const pay = o.payment || { method: 'upfront', paid: false };
    const head = `<div class="card-head"><h2>Payment</h2><button class="btn sm" data-action="editPayment">${icon('edit')}Change</button></div>`;
    if (pay.method !== 'finance') {
      return `<section class="card">${head}<div class="card-pad pay-up">
        <div><b>Pay upfront</b><span class="sub">${money(o.price)} in one payment</span></div>
        ${pay.paid ? `<span class="pill s-delivered">Paid</span>` : `<span class="pill s-pending">Not paid</span>`}
        <button class="btn sm ${pay.paid ? 'ghost' : 'dark'}" data-action="toggleUpfront">${pay.paid ? 'Mark as not paid' : `${icon('check')}Mark as paid`}</button>
      </div></section>`;
    }
    const sched = OT.paymentSchedule(o);
    const paidSum = sched.filter((x) => x.paid).reduce((a, x) => a + x.amount, 0);
    const paidCount = sched.filter((x) => x.paid).length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return `<section class="card">${head}<div class="card-pad" style="padding-top:12px">
      <div class="fin-sum"><b>${sched.length} ${pay.frequency} payments</b><span>${paidCount} of ${sched.length} paid, ${money(Math.max(o.price - paidSum, 0))} left</span></div>
      <div class="progress"><i style="width:${Math.round(paidCount / sched.length * 100)}%"></i></div>
      <ul class="inst">${sched.map((x, i) => {
        const late = !x.paid && x.due < today;
        return `<li class="${x.paid ? 'paid' : ''}${late ? ' late' : ''}"><label><input type="checkbox" data-inst="${i}" ${x.paid ? 'checked' : ''}><span class="box">${icon('check')}</span>
          <span class="i-main"><b>Payment ${x.n}</b><span>${late ? 'Overdue, was due ' : 'Due '}${fmtDate(x.due)}</span></span><span class="num i-amt">${money(x.amount)}</span></label></li>`;
      }).join('')}</ul>
    </div></section>`;
  }

  function editPayment(o) {
    modal(`<div class="m-body"><h2>Payment for ${esc(o.orderId)}</h2><p>Total ${money(o.price)}.</p>
      <div style="margin-top:16px" id="payRoot">${paymentPicker(o.payment)}</div></div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn dark" id="okBtn">Save payment</button></div>`, (m, close) => {
      const root = $('#payRoot', m);
      wirePayment(root, () => o.price);
      $('#okBtn', m).onclick = async () => {
        const r = readPayment(root);
        if (r.err) { setErr('f_pay', r.err); return; }
        const old = o.payment || {};
        if (r.p.method === 'finance' && old.method === 'finance') r.p.paid = (old.paid || []).slice(0, r.p.count);
        if (r.p.method === 'upfront' && old.method === 'upfront') r.p.paid = !!old.paid;
        o.payment = r.p;
        o.history.push({ status: o.status, at: Date.now(), email: 'none', note: `Payment changed to ${r.p.method === 'finance' ? `finance, ${r.p.count} ${r.p.frequency} payments` : 'upfront'}` });
        close();
        await persist('Payment updated');
        renderOrder();
      };
    }, o.business);
  }

  function editNotes(o) {
    modal(`<div class="m-body"><h2>Extra notes</h2><p>Only you see these. They are never sent to the customer.</p>
      <textarea id="n_text" style="margin-top:16px;min-height:160px" placeholder="Anything to remember about this order">${esc(o.notes || '')}</textarea></div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn dark" id="okBtn">Save notes</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        o.notes = $('#n_text', m).value.trim();
        close();
        await persist('Notes saved');
        renderOrder();
      };
    }, o.business);
  }

  function changeStatus(o, status) {
    if (status === o.status) return;
    const label = OT.statusLabel(status);
    modal(`<div class="m-body"><h2>Mark ${esc(o.orderId)} as ${esc(label)}?</h2>
      <p>${esc(OT.STATUSES.find((s) => s.id === status).line)}</p>
      ${notifyBox(o)}</div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="okBtn">Mark as ${esc(label)}</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        const send = !!($('#sendMail', m) || {}).checked;
        close();
        o.status = status;
        const entry = { status, at: Date.now(), email: 'none' };
        o.history.push(entry);
        await persist(`Marked as ${label}`);
        renderOrder();
        if (send) {
          entry.email = await sendStatusEmail(o);
          await persist();
          if (route.page === 'order' && route.id === o.id) renderOrder();
        }
      };
    }, o.business);
  }

  function notifyBox(o) {
    if (!o.customerEmail) {
      return `<div class="notify" style="cursor:default"><span style="color:var(--ink-3);margin-top:1px">${icon('info', 'sm')}</span><div><b>No email on this order</b>
        <span>${o.customerPhone ? `Let the customer know on ${esc(o.customerPhone)}.` : 'Add an email with Edit to send updates.'}</span></div></div>`;
    }
    return `<label class="notify"><input type="checkbox" id="sendMail" checked><div><b>${emailReady() ? 'Email the customer' : 'Write an email to the customer'}</b>
      <span>${emailReady() ? `Sends the update to ${esc(o.customerEmail)}` : `Opens a ready-written email to ${esc(o.customerEmail)} in your mail app`}</span></div></label>`;
  }

  function cancelOrder(o) {
    modal(`<div class="m-body"><h2>Cancel ${esc(o.orderId)}?</h2>
      <p>The order stays on record as Cancelled and is left out of open orders and totals. You can reopen it later.</p>
      ${notifyBox(o)}</div>
      <div class="m-foot"><button class="btn ghost" data-close>Keep order</button><button class="btn danger" id="okBtn">${icon('x')}Cancel order</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        const send = !!($('#sendMail', m) || {}).checked;
        close();
        o.cancelledFrom = o.status;
        o.status = 'cancelled';
        const entry = { status: 'cancelled', at: Date.now(), email: 'none' };
        o.history.push(entry);
        await persist(`${o.orderId} cancelled`);
        renderOrder();
        if (send) {
          entry.email = await sendStatusEmail(o);
          await persist();
          if (route.page === 'order' && route.id === o.id) renderOrder();
        }
      };
    }, o.business);
  }

  async function reopenOrder(o) {
    const back = o.cancelledFrom || 'pending';
    o.status = back;
    delete o.cancelledFrom;
    o.history.push({ status: back, at: Date.now(), email: 'none', note: `Order reopened as ${OT.statusLabel(back)}` });
    await persist(`${o.orderId} reopened`);
    renderOrder();
  }

  function editDiscount(o) {
    const subtotal = o.subtotal != null ? o.subtotal : o.price;
    modal(`<div class="m-body"><h2>Discount for ${esc(o.orderId)}</h2><p>Subtotal before discount: ${money(subtotal)}</p>
      <div style="margin-top:16px" id="discRoot">${discountPicker(o.discount && o.discount.amount > 0 ? o.discount : null)}</div>
      <div class="disc-preview"><span>New total</span><b id="discTotal"></b></div></div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn dark" id="okBtn">Save discount</button></div>`, (m, close) => {
      const root = $('#discRoot', m);
      const update = () => {
        const r = readDiscount(root);
        $('#discTotal', m).textContent = r.err ? '...' : money(subtotal - (r.d ? OT.discountAmount(subtotal, r.d) : 0));
      };
      wireDiscount(root, update);
      update();
      $('#okBtn', m).onclick = async () => {
        const r = readDiscount(root);
        if (r.err) { setErr('f_disc', r.err); return; }
        const before = JSON.stringify(o.discount || null);
        OT.applyDiscount(o, r.d);
        if (JSON.stringify(o.discount || null) !== before) {
          o.history.push({ status: o.status, at: Date.now(), email: 'none', note: o.discount ? `Discount set: -${money(o.discount.amount)}` : 'Discount removed' });
        }
        close();
        await persist(o.discount ? `Discount saved, new total ${money(o.price)}` : 'Discount removed');
        renderOrder();
      };
    }, o.business);
  }

  function editContact(o) {
    modal(`<div class="m-body"><h2>Edit customer</h2><p>Changes apply to this order only.</p>
      <div class="stack" style="margin-top:18px">
        <div class="field" data-field="e_name"><label for="e_name">Name</label><input type="text" id="e_name" value="${esc(o.customerName)}"><div class="err" hidden></div></div>
        <div class="field" data-field="e_email"><label for="e_email">Email</label><input type="email" id="e_email" value="${esc(o.customerEmail || '')}"><div class="err" hidden></div></div>
        <div class="field" data-field="e_phone"><label for="e_phone">Phone</label><input type="tel" id="e_phone" value="${esc(o.customerPhone || '')}"><div class="hint">An email, a phone number, or both.</div><div class="err" hidden></div></div>
      </div></div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn dark" id="okBtn">Save changes</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        const name = $('#e_name', m).value.trim(), email = $('#e_email', m).value.trim(), phone = $('#e_phone', m).value.trim();
        const eErr = !email && !phone ? 'Enter an email or a phone number.' : email && !isEmail(email) ? 'Enter a valid email address.' : '';
        const pErr = OT.validatePhone(phone) || '';
        setErr('e_name', name ? '' : 'Name is required.');
        setErr('e_email', eErr);
        setErr('e_phone', pErr);
        if (!name || eErr || pErr) return;
        o.customerName = name; o.customerEmail = email; o.customerPhone = phone;
        close();
        await persist('Customer updated');
        renderOrder();
      };
    }, o.business);
  }

  // ---------- Search ----------
  function find(q) {
    q = q.trim().toUpperCase();
    if (!q) return;
    const openIt = (o) => { $('#findInput').value = ''; $('#findInput').blur(); go('order', { id: o.id, biz: o.business }); };
    const exact = DB.orders.find((o) => o.serial.toUpperCase() === q) || DB.orders.find((o) => o.orderId.toUpperCase() === q);
    if (exact) return openIt(exact);
    const partial = DB.orders.filter((o) => o.serial.toUpperCase().includes(q) || o.orderId.toUpperCase().includes(q));
    if (partial.length === 1) return openIt(partial[0]);
    if (!partial.length) return toast(`No order matches ${q}`, true);
    go('results', { q, ids: partial.map((o) => o.id) });
  }

  function renderResults() {
    const list = DB.orders.filter((o) => route.ids.includes(o.id)).sort((a, b) => b.createdAt - a.createdAt);
    main.innerHTML = `<div class="pagehead"><div><div class="crumb"><span class="bar"></span>Find order</div><h1>${list.length} matches</h1><p class="lede">Orders whose serial number or order ID contains ${esc(route.q)}.</p></div></div>
      <div class="card" style="overflow:hidden">${orderTable(list, true)}</div>`;
  }

  // ---------- Customers ----------
  function renderCustomers() {
    const all = OT.customers(DB.orders);
    const total = all.reduce((s, c) => s + c.total, 0);
    main.innerHTML = `
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>Both businesses</div><h1>Customers</h1>
        <p class="lede">${all.length} customer${all.length === 1 ? '' : 's'}, ${money(total)} in orders.</p></div></div>
      <div class="card" style="overflow:hidden">
        <div class="toolbar" style="padding:10px 16px"><div class="filterbox" style="padding:0;flex:1">${icon('search')}<input type="text" id="custSearch" placeholder="Search by name, email or phone" value="${esc(customerQuery)}" style="width:100%;max-width:360px"></div></div>
        <div id="custList" class="custlist"></div>
      </div>`;
    const draw = () => {
      const q = customerQuery.trim().toLowerCase();
      const qd = OT.phoneDigits(q);
      const list = q ? all.filter((c) => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (qd.length >= 3 && OT.phoneDigits(c.phone).includes(qd))) : all;
      $('#custList').innerHTML = list.length ? list.map((c) => {
        const cs = c.orders.filter((o) => o.business === 'cs').length, hk = c.orders.length - cs;
        const open = c.orders.filter(OT.isOpen).length;
        return `<details class="cust" data-key="${esc(c.key)}" ${openCustomer === c.key ? 'open' : ''}>
          <summary>
            <div class="person">${avatar(c.name, c.key)}<div><b>${esc(c.name)}</b><span class="sub">${esc([c.email, c.phone].filter(Boolean).join(' \u00B7 '))}</span></div></div>
            <div class="bizes">${cs ? `<span class="bizchip cs"><i></i>${cs} ${esc(bizName('cs'))}</span>` : ''}${hk ? `<span class="bizchip hack"><i></i>${hk} ${esc(bizName('hack'))}</span>` : ''}</div>
            <div class="tot"><b>${money(c.total)}</b><span class="sub">${c.orders.length} order${c.orders.length === 1 ? '' : 's'}${open ? `, ${open} open` : ''}</span></div>
            <span class="chev">${icon('chev')}</span>
          </summary>
          <div class="body">${orderTable(c.orders, true)}</div>
        </details>`;
      }).join('') : `<div class="empty"><div class="art">${icon('users')}</div><h3>${all.length ? 'No matching customers' : 'No customers yet'}</h3><p>${all.length ? 'Try a different name or email.' : 'Customers appear here once you create orders.'}</p></div>`;
      $$('.cust').forEach((d) => d.addEventListener('toggle', () => { if (d.open) openCustomer = d.dataset.key; }));
    };
    draw();
    $('#custSearch').oninput = (e) => { customerQuery = e.target.value; draw(); };
  }

  // ---------- Settings ----------
  function setPath(obj, path, val) {
    const keys = path.split('.'); const last = keys.pop();
    keys.reduce((o, k) => o[k], obj)[last] = val;
  }

  const SETTINGS_SECTIONS = [
    ['set-colours', 'Colours'], ['set-models', 'BDM models'], ['set-options', 'Options'], ['set-discounts', 'Discounts'], ['set-delivery', 'Delivery wording'],
    ['set-hack', 'Hackulator'], ['set-email', 'Email'], ['set-general', 'Business names'], ['set-pass', 'Passcode'], ['set-data', 'Data and backup']
  ];

  async function renderSettings() {
    const s = S();
    hasSmtpPassword = await api.hasSmtpPassword();
    const location = await api.dataLocation();
    const priceInput = (attrs, val) => `<div class="prefix"><input type="number" step="0.01" min="0" ${attrs} value="${esc(val)}"></div>`;
    const sset = (id, title, desc, body) => `<section class="card sset" id="${id}"><div class="sset-head"><h2>${title}</h2>${desc ? `<p>${desc}</p>` : ''}</div><div class="sset-body">${body}</div></section>`;
    const sw = (attrs, checked, label) => `<label class="switch"><input type="checkbox" ${attrs} ${checked ? 'checked' : ''}><span class="track"></span>${label}</label>`;

    main.innerHTML = `
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>Preferences</div><h1>Settings</h1><p class="lede">Changes save automatically. Existing orders keep the prices they were created with.</p></div></div>
      <div class="settings-layout">
        <nav class="subnav">${SETTINGS_SECTIONS.map(([id, l]) => `<button data-jump="${id}">${l}</button>`).join('')}</nav>
        <div class="stack">
          ${sset('set-colours', `${esc(bizName('cs'))} colours`, 'Set the swatch, prices and delivery types for each colour, and tick the BDM models it fits. Click a swatch to change it.', `
            ${s.cs.colours.map((c) => `<div class="colour-row" data-colour="${c.id}">
              <div class="colour-pick" title="Change swatch">${swatch(c.swatch, true)}<input type="color" data-cf="swatch" value="${esc(c.swatch)}" aria-label="Swatch colour"></div>
              <div>
                <div class="colour-line"><input type="text" data-cf="name" value="${esc(c.name)}" aria-label="Colour name"><button class="iconbtn" data-action="delColour" title="Remove colour" aria-label="Remove colour">${icon('trash')}</button></div>
                <div class="deliv">
                  <div class="deliv-opt ${c.standard.available ? '' : 'off'}">${sw('data-cf="standard.available"', c.standard.available, 'Non express')}${priceInput('data-cf="standard.price" aria-label="Non express price"', c.standard.price)}</div>
                  <div class="deliv-opt ${c.express.available ? '' : 'off'}">${sw('data-cf="express.available"', c.express.available, 'Express')}${priceInput('data-cf="express.price" aria-label="Express price"', c.express.price)}</div>
                </div>
                <div class="chips">${s.cs.models.map((m) => `<label class="mchip"><input type="checkbox" data-cmodel="${esc(m)}" ${c.models.includes(m) ? 'checked' : ''}>${esc(m)}</label>`).join('')}</div>
              </div>
            </div>`).join('')}
            <div class="addrow"><input type="text" id="newColour" placeholder="New colour name"><button class="btn" data-action="addColour">${icon('plus')}Add colour</button></div>`)}

          ${sset('set-models', 'BDM models', 'The models offered on the order form. Removing a model also removes it from every colour.', `
            <div class="taglist">${s.cs.models.map((m) => `<span class="tag-item">${esc(m)}<button data-action="delModel" data-model="${esc(m)}" aria-label="Remove ${esc(m)}">${icon('x')}</button></span>`).join('')}</div>
            <div class="addrow"><input type="text" id="newModel" placeholder="For example BDM-060"><button class="btn" data-action="addModel">${icon('plus')}Add model</button></div>`)}

          ${sset('set-options', `${esc(bizName('cs'))} options`, 'Optional add-ons on the order form. Give one a price above zero to add it to the total.', `
            ${s.cs.addons.map((a) => `<div class="addon-row" data-addon="${a.id}"><input type="text" data-af="name" value="${esc(a.name)}" aria-label="Option name">${priceInput('data-af="price" aria-label="Option price"', a.price)}<button class="iconbtn" data-action="delAddon" aria-label="Remove option">${icon('trash')}</button></div>`).join('')}
            <div class="addrow"><input type="text" id="newAddon" placeholder="New option, for example Keep original D-pad"><button class="btn" data-action="addAddon">${icon('plus')}Add option</button></div>`)}

          ${sset('set-discounts', 'Saved discounts', `One-click discounts on both order forms. You can still enter a custom discount on any order. Changing these does not affect existing orders.`, `
            ${(s.discounts || []).length ? s.discounts.map((d) => `<div class="disc-row" data-disc="${d.id}">
              <input type="text" data-df="name" value="${esc(d.name)}" aria-label="Discount name">
              <select data-df="type" aria-label="Discount type"><option value="percent" ${d.type === 'percent' ? 'selected' : ''}>Percent off</option><option value="fixed" ${d.type === 'fixed' ? 'selected' : ''}>Amount off (£)</option></select>
              <input type="number" min="0" step="0.01" data-df="value" value="${esc(d.value)}" aria-label="Discount value">
              <button class="iconbtn" data-action="delDisc" aria-label="Remove discount">${icon('trash')}</button></div>`).join('') : '<div class="placeholder-note">No saved discounts yet. Add one below, for example Returning customer, 10 percent off.</div>'}
            <div class="addrow"><input type="text" id="newDisc" placeholder="New discount name, for example Returning customer"><button class="btn" data-action="addDisc">${icon('plus')}Add discount</button></div>`)}

          ${sset('set-delivery', 'Delivery wording', 'Shown on the order form, the order page and customer emails.', `<div class="grid">
            <div class="field"><label>Express</label><input type="text" data-set="cs.expressWording" value="${esc(s.cs.expressWording)}"></div>
            <div class="field"><label>Non express</label><input type="text" data-set="cs.standardWording" value="${esc(s.cs.standardWording)}"></div></div>`)}

          ${sset('set-hack', `${esc(bizName('hack'))} pricing`, 'The base price covers the included games. Each extra game line adds the extra game price.', `<div class="grid">
            <div class="field"><label>Base price</label>${priceInput('data-set="hack.basePrice" data-num', s.hack.basePrice)}</div>
            <div class="field"><label>Extra game price</label>${priceInput('data-set="hack.extraGamePrice" data-num', s.hack.extraGamePrice)}</div>
            <div class="field full"><label>Included games, one per line</label><textarea data-set="hack.includedGames" data-lines>${esc(s.hack.includedGames.join('\n'))}</textarea></div></div>`)}

          ${sset('set-email', 'Email', 'Used to send status updates directly. For Gmail use host smtp.gmail.com, port 587, your Gmail address as the username, and an app password from your Google account. Until this is set up, emails open in your mail app.', `<div class="grid">
            <div class="field"><label>SMTP host</label><input type="text" data-set="email.host" value="${esc(s.email.host)}" placeholder="smtp.gmail.com" spellcheck="false"></div>
            <div class="field"><label>Port</label><input type="number" data-set="email.port" data-num value="${esc(s.email.port)}"></div>
            <div class="field"><label>Username</label><input type="text" data-set="email.user" value="${esc(s.email.user)}" spellcheck="false" placeholder="you@gmail.com"></div>
            <div class="field"><label>Password ${hasSmtpPassword ? `<span class="saved-note">${icon('check')}Saved</span>` : ''}</label>
              <div style="display:flex;gap:8px"><input type="password" id="smtpPass" placeholder="${hasSmtpPassword ? 'Enter a new one to replace' : 'App password'}"><button class="btn" data-action="savePass">Save</button></div>
              <div class="hint">Encrypted with your Mac keychain, never stored with orders.</div></div>
            <div class="field"><label>From name</label><input type="text" data-set="email.fromName" value="${esc(s.email.fromName)}"></div>
            <div class="field"><label>From and reply-to address</label><input type="email" data-set="email.fromEmail" value="${esc(s.email.fromEmail)}" placeholder="Same as username"></div>
            <div class="field full"><label>Sign-off</label><textarea data-set="email.signOff" style="min-height:80px">${esc(s.email.signOff)}</textarea></div></div>
            <div class="addrow"><span style="flex:1"></span><button class="btn" data-action="testEmail">${icon('send')}Send test email to myself</button></div>`)}

          ${sset('set-general', 'Business names', 'Used across the app and in customer emails.', `<div class="grid">
            <div class="field"><label>Controller business</label><input type="text" data-set="businessNames.cs" value="${esc(s.businessNames.cs)}"></div>
            <div class="field"><label>Calculator business</label><input type="text" data-set="businessNames.hack" value="${esc(s.businessNames.hack)}"></div></div>`)}

          ${sset('set-pass', 'Passcode', 'Asked for every time the app opens or is locked.', `<div class="grid">
            <div class="field full" style="max-width:calc(50% - 9px)"><label>Current passcode</label><input type="password" id="pcOld"></div>
            <div class="field"><label>New passcode</label><input type="password" id="pcNew"></div>
            <div class="field"><label>Confirm new passcode</label><input type="password" id="pcNew2"></div></div>
            <div class="addrow"><span style="flex:1"></span><button class="btn dark" data-action="changePass">Change passcode</button></div>`)}

          ${sset('set-data', 'Data and backup', `Orders and settings are saved on this Mac at <span class="mono" style="overflow-wrap:anywhere;color:var(--ink-2)">${esc(location)}</span>. The previous save is kept alongside it.`, `
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="export">${icon('download')}Export backup</button><button class="btn" data-action="import">${icon('upload')}Import backup</button></div>`)}
        </div>
      </div>`;

    // Sub-navigation with active section tracking.
    $$('[data-jump]', main).forEach((b) => b.onclick = () => document.getElementById(b.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' }));
    const markActive = () => {
      let current = SETTINGS_SECTIONS[0][0];
      for (const [id] of SETTINGS_SECTIONS) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 140) current = id; }
      $$('[data-jump]', main).forEach((b) => b.classList.toggle('active', b.dataset.jump === current));
    };
    content.onscroll = route.page === 'settings' ? markActive : null;
    markActive();

    $$('[data-set]', main).forEach((el) => el.addEventListener('change', () => {
      let v = el.value;
      if (el.hasAttribute('data-num')) v = num(v);
      if (el.hasAttribute('data-lines')) v = OT.parseGames(v);
      setPath(s, el.dataset.set, v);
      persist('Saved');
    }));

    $$('[data-colour]', main).forEach((row) => {
      const c = s.cs.colours.find((x) => x.id === row.dataset.colour);
      $$('[data-cf]', row).forEach((el) => {
        if (el.type === 'color') el.addEventListener('input', () => { $('.swatch', row).style.background = el.value; });
        el.addEventListener('change', () => {
          const path = el.dataset.cf;
          const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? num(el.value) : el.value.trim();
          if (path === 'name' && !v) { el.value = c.name; toast('Colour name cannot be empty', true); return; }
          setPath(c, path, v);
          if (el.type === 'checkbox') el.closest('.deliv-opt').classList.toggle('off', !el.checked);
          persist('Saved');
        });
      });
      $$('[data-cmodel]', row).forEach((el) => el.addEventListener('change', () => {
        const m = el.dataset.cmodel;
        c.models = el.checked ? [...new Set([...c.models, m])] : c.models.filter((x) => x !== m);
        persist('Saved');
      }));
    });

    $$('[data-addon]', main).forEach((row) => {
      const a = s.cs.addons.find((x) => x.id === row.dataset.addon);
      $$('[data-af]', row).forEach((el) => el.addEventListener('change', () => {
        const v = el.dataset.af === 'price' ? num(el.value) : el.value.trim();
        if (el.dataset.af === 'name' && !v) { el.value = a.name; toast('Option name cannot be empty', true); return; }
        a[el.dataset.af] = v;
        persist('Saved');
      }));
    });

    $$('[data-disc]', main).forEach((row) => {
      const d = s.discounts.find((x) => x.id === row.dataset.disc);
      $$('[data-df]', row).forEach((el) => el.addEventListener('change', () => {
        const f = el.dataset.df;
        let v = f === 'value' ? num(el.value) : el.value.trim();
        if (f === 'name' && !v) { el.value = d.name; toast('Discount name cannot be empty', true); return; }
        if (f === 'value' && (v < 0 || (d.type === 'percent' && v > 100))) { el.value = d.value; toast('Percent discounts must be between 0 and 100', true); return; }
        if (f === 'type' && v === 'percent' && num(d.value) > 100) { d.value = 100; $('[data-df=value]', row).value = 100; }
        d[f] = v;
        persist('Saved');
      }));
    });

    const enter = (id, action) => { const el = $(id); if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAction(action, el); } }); };
    enter('#newColour', 'addColour'); enter('#newModel', 'addModel'); enter('#newAddon', 'addAddon'); enter('#newDisc', 'addDisc'); enter('#smtpPass', 'savePass');
  }

  async function settingsAction(action, el) {
    const s = S();
    const reRender = async (msg, focusId) => {
      await persist(msg);
      const y = content.scrollTop;
      await renderSettings();
      content.scrollTop = y;
      if (focusId && $(focusId)) $(focusId).focus({ preventScroll: true });
    };
    switch (action) {
      case 'addColour': {
        const name = $('#newColour').value.trim();
        if (!name) return toast('Enter a colour name first', true);
        if (s.cs.colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) return toast('That colour already exists', true);
        s.cs.colours.push({ id: OT.uid(), name, models: [], swatch: OT.guessSwatch(name), standard: { available: true, price: 30 }, express: { available: false, price: 37 } });
        return reRender(`Added ${name}. Now tick the models it fits.`, '#newColour');
      }
      case 'delColour': {
        const id = el.closest('[data-colour]').dataset.colour;
        const c = s.cs.colours.find((x) => x.id === id);
        if (!(await confirmBox(`Remove ${c.name}?`, 'It will no longer be offered on new orders. Existing orders are not changed.', 'Remove colour', true))) return;
        s.cs.colours = s.cs.colours.filter((x) => x.id !== id);
        return reRender('Colour removed');
      }
      case 'addModel': {
        const name = $('#newModel').value.trim().toUpperCase();
        if (!name) return toast('Enter a model name first', true);
        if (s.cs.models.includes(name)) return toast('That model already exists', true);
        s.cs.models.push(name);
        return reRender(`Added ${name}. Tick it on the colours it supports.`, '#newModel');
      }
      case 'delModel': {
        const m = el.dataset.model;
        if (!(await confirmBox(`Remove ${m}?`, 'It will be removed from the order form and from every colour.', 'Remove model', true))) return;
        s.cs.models = s.cs.models.filter((x) => x !== m);
        s.cs.colours.forEach((c) => { c.models = c.models.filter((x) => x !== m); });
        return reRender('Model removed');
      }
      case 'addAddon': {
        const name = $('#newAddon').value.trim();
        if (!name) return toast('Enter an option name first', true);
        s.cs.addons.push({ id: OT.uid(), name, price: 0 });
        return reRender('Option added', '#newAddon');
      }
      case 'delAddon': {
        const id = el.closest('[data-addon]').dataset.addon;
        s.cs.addons = s.cs.addons.filter((x) => x.id !== id);
        return reRender('Option removed');
      }
      case 'addDisc': {
        const name = $('#newDisc').value.trim();
        if (!name) return toast('Enter a discount name first', true);
        if (!s.discounts) s.discounts = [];
        s.discounts.push({ id: OT.uid(), name, type: 'percent', value: 10 });
        return reRender(`Added ${name} at 10 percent off. Change the amount if needed.`, '#newDisc');
      }
      case 'delDisc': {
        const id = el.closest('[data-disc]').dataset.disc;
        s.discounts = s.discounts.filter((x) => x.id !== id);
        return reRender('Discount removed');
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
        el.disabled = true;
        const res = await api.sendEmail(s.email, { to, subject: 'OrderTrack test email', text: 'Email sending from OrderTrack is working.', html: '<p>Email sending from OrderTrack is working.</p>' });
        el.disabled = false;
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
        if (!(await confirmBox('Replace all data?', `This replaces your ${DB.orders.length} current orders and settings with the ${data.orders.length} orders in the backup. Your passcode stays the same.`, 'Replace data', true))) return;
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
      case 'openNav': return $('#shell').classList.add('nav-open');
      case 'closeNav': return $('#shell').classList.remove('nav-open');
      case 'resend':
        if (order && order.customerEmail) {
          const r = await sendStatusEmail(order);
          order.history.push({ status: order.status, at: Date.now(), email: r === 'sent' ? 'resent' : r });
          await persist();
          renderOrder();
        }
        return;
      case 'editContact': return order && editContact(order);
      case 'editDiscount': return order && editDiscount(order);
      case 'cancelOrder': return order && cancelOrder(order);
      case 'editPayment': return order && editPayment(order);
      case 'editNotes': return order && editNotes(order);
      case 'toggleUpfront':
        if (order) {
          order.payment = { method: 'upfront', paid: !(order.payment && order.payment.paid) };
          await persist(order.payment.paid ? 'Marked as paid' : 'Marked as not paid');
          renderOrder();
        }
        return;
      case 'reopenOrder': return order && reopenOrder(order);
      case 'viewCustomer':
        if (order) { customerQuery = order.customerEmail || order.customerPhone || order.customerName; openCustomer = custKey(order); go('customers'); }
        return;
      case 'deleteOrder':
        if (order && await confirmBox(`Delete ${order.orderId}?`, `The order for ${esc(order.customerName)} will be removed completely, including its history. This cannot be undone. To keep a record instead, cancel the order.`, 'Delete permanently', true)) {
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

  document.addEventListener('keydown', (e) => {
    if ($('#shell').hidden) return;
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) { $('#modal').hidden = true; $('#modal').innerHTML = ''; return; }
      $('#shell').classList.remove('nav-open');
    }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (window.matchMedia('(max-width: 760px)').matches) $('#shell').classList.add('nav-open');
      $('#findInput').focus(); $('#findInput').select();
    }
    if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      go('new', { biz: route.biz || (route.page === 'hack' ? 'hack' : 'cs') });
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
    renderSidebar();
    showLock();
  })();
})();
