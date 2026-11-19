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
    openMailto: async () => true,
    invoicePdf: async (html) => { window.__lastInvoice = html; return btoa('pdf'); },
    saveInvoice: async (html, name) => { window.__lastInvoice = html; window.__lastInvoiceName = name; return true; }
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
    home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    chart: '<path d="M3 20h18M6.5 16v-5M11.5 16V6M16.5 16v-8"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4M12 16.8h.01"/>',
    file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    coins: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    board: '<rect x="3.5" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="11" rx="1.5"/><rect x="15.5" y="4" width="5" height="7" rx="1.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    truck: '<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    tag: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  const MARK = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#FFFDF9"/><rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" stroke="#E6DDCE"/><rect x="13" y="15" width="38" height="9" rx="4.5" fill="#1A1D29"/><circle cx="17.5" cy="19.5" r="2.6" fill="#FF6B5A"/><rect x="13" y="27.5" width="38" height="9" rx="4.5" fill="#FF6B5A"/><circle cx="17.5" cy="32" r="2.6" fill="#FFFDF9"/><rect x="13" y="40" width="27" height="9" rx="4.5" fill="#F5A524"/><circle cx="17.5" cy="44.5" r="2.6" fill="#FFFDF9"/></svg>`;

  let DB = OT.emptyDB();
  let route = { page: 'home' };
  const listState = { cs: { tab: 'active', q: '', view: 'list' }, hack: { tab: 'active', q: '', view: 'list' } };
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
      <button class="sb-item" data-nav="home">${icon('home')}Home<span class="sb-count" id="count-att"></span></button>
      <div class="sb-label">Orders</div>
      <button class="sb-item" data-nav="cs"><span class="sb-dot cs">${icon('pad')}</span><span id="nm-cs"></span><span class="sb-count" id="count-cs"></span></button>
      <button class="sb-item" data-nav="hack"><span class="sb-dot hack">${icon('calc')}</span><span id="nm-hack"></span><span class="sb-count" id="count-hack"></span></button>
      <div class="sb-label">Records</div>
      <button class="sb-item" data-nav="customers">${icon('users')}Customers<span class="sb-count" id="count-cust"></span></button>
      <button class="sb-item" data-nav="reports">${icon('chart')}Reports</button>
      <button class="sb-item" data-nav="stock">${icon('box')}Stock<span class="sb-count" id="count-stock"></span></button>
      <div class="sb-spacer"></div>
      <div class="sb-foot">
        <button class="sb-item" data-nav="settings">${icon('gear')}Settings</button>
        <button class="sb-item" data-action="lock">${icon('lock')}Lock</button>
        <div class="sb-version" id="appVersion"></div>
      </div>`;
    if (api.version) api.version().then((v) => { $('#appVersion').textContent = 'Version ' + v; });
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
    const lowN = OT.lowStock(S()).length;
    $('#count-stock').textContent = lowN || '';
    $('#count-stock').classList.toggle('warn', lowN > 0);
    const attN = attentionItems().filter((a) => a.tone === 'bad').length;
    $('#count-att').textContent = attN || '';
    $('#count-att').classList.toggle('warn', attN > 0);
  }

  // ---------- Routing ----------
  function go(page, extra) {
    route = { page, ...(extra || {}) };
    $('#shell').classList.remove('nav-open');
    content.onscroll = null;
    render();
    content.scrollTop = 0;
  }

  const PAGE_TITLES = { home: 'Home', customers: 'Customers', settings: 'Settings', results: 'Search', reports: 'Reports', stock: 'Stock' };

  function render() {
    const activeBiz = route.biz || (route.page === 'cs' || route.page === 'hack' ? route.page : null);
    const navKey = activeBiz && ['cs', 'hack', 'new', 'order', 'edit'].includes(route.page) ? activeBiz : route.page;
    $$('.sb-item[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === navKey));
    main.dataset.biz = activeBiz || 'cs';
    $('#mbTitle').textContent = activeBiz && route.page !== 'customers' ? bizName(activeBiz) : (PAGE_TITLES[route.page] || 'OrderTrack');
    switch (route.page) {
      case 'cs': case 'hack': return renderList(route.page);
      case 'new': return route.biz === 'cs' ? renderCsForm() : renderHackForm();
      case 'edit': {
        const ed = DB.orders.find((x) => x.id === route.id);
        if (!ed) return go('cs');
        return ed.business === 'cs' ? renderCsForm(ed) : renderHackForm(ed);
      }
      case 'order': return renderOrder();
      case 'customers': return renderCustomers();
      case 'settings': return renderSettings();
      case 'home': return renderHome();
      case 'reports': return renderReports();
      case 'stock': return renderStock();
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
        <div class="kpi"><div class="k"><i style="background:var(--coral)"></i>Due soon or overdue</div><div class="v">${active.filter((o) => { const t = OT.turnaround(S(), o); return t && ['due_soon', 'overdue'].includes(t.state); }).length}</div></div>
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
          <div class="tools"><div class="viewseg seg"><label title="List"><input type="radio" name="lview" value="list" ${st.view !== 'board' ? 'checked' : ''}><span>${icon('list')}List</span></label><label title="Board"><input type="radio" name="lview" value="board" ${st.view === 'board' ? 'checked' : ''}><span>${icon('board')}Board</span></label></div>
          <div class="filterbox">${icon('search')}<input type="text" id="listQ" placeholder="Filter by name, email, phone, serial" value="${esc(st.q)}"></div></div>
        </div>
        <div id="listBody"></div>
      </div>`;

    const draw = () => {
      $$('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === st.tab));
      const q = st.q.trim().toLowerCase();
      let shown = st.tab === 'all' ? all : st.tab === 'active' ? active : all.filter((o) => o.status === st.tab);
      if (q) shown = shown.filter((o) => [o.customerName, o.customerEmail, o.customerPhone, o.serial, o.orderId, o.colourName, o.donor, o.model, o.notes].some((v) => String(v || '').toLowerCase().includes(q)));
      $('.tabs').hidden = st.view === 'board';
      if (st.view === 'board') {
        const boardOrders = q ? all.filter((o) => shown.includes(o) || [o.customerName, o.customerEmail, o.customerPhone, o.serial, o.orderId, o.colourName, o.donor].some((v) => String(v || '').toLowerCase().includes(q))) : all;
        $('#listBody').innerHTML = all.length ? boardHtml(boardOrders.filter((o) => o.status !== 'cancelled')) : emptyState(0, biz, q);
        wireBoard($('#listBody'));
        return;
      }
      $('#listBody').innerHTML = shown.length ? orderTable(shown, false) : emptyState(all.length, biz, q);
    };
    $$('input[name=lview]').forEach((r) => r.onchange = () => { st.view = r.value; draw(); });
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
      <thead><tr><th>Order</th><th class="hide-sm"></th><th>Customer</th><th class="hide-sm">Item</th><th class="r">Price</th><th>Status</th><th class="hide-md">Updated</th></tr></thead>
      <tbody>${orders.map((o) => {
        const last = o.history && o.history.length ? o.history[o.history.length - 1].at : o.createdAt;
        return `<tr data-open="${o.id}">
        <td><b>${esc(o.orderId)}</b><span class="sub mono">${showBiz ? `${esc(bizName(o.business))}, ` : ''}${esc(o.serial)}</span></td>
        <td class="hide-sm" style="width:64px;padding-right:0"><div class="row-art">${orderArt(o, 'mini')}</div></td>
        <td><div class="person">${avatar(o.customerName, custKey(o))}<div><b>${esc(o.customerName)}</b><span class="sub hide-sm">${esc(contactLine(o))}</span></div></div></td>
        <td class="hide-sm">${itemCell(o)}</td>
        <td class="r num"><b>${money(o.price)}</b></td>
        <td><div class="statuscell">${pill(o.status)}${dueBadge(o)}</div></td>
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

  function customerSection(n, ed) {
    const known = OT.customers(DB.orders);
    const v = (k) => (ed ? ` value="${esc(ed[k] || '')}"` : '');
    return section(n, 'Customer', 'Enter an email, a phone number, or both. Start typing to reuse an existing customer.', `<div class="grid">
      ${field('f_name', 'Name', `<input type="text" id="f_name" list="dl_names" autocomplete="off" placeholder="Full name"${v('customerName')}>`, null, 'full')}
      ${field('f_email', 'Email', `<input type="email" id="f_email" list="dl_emails" autocomplete="off" placeholder="name@example.com"${v('customerEmail')}>`, 'Needed for status update emails.')}
      ${field('f_phone', 'Phone', `<input type="tel" id="f_phone" list="dl_phones" autocomplete="off" placeholder="07700 900123"${v('customerPhone')}>`, 'Optional if you have an email.')}
      <datalist id="dl_names">${known.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
      <datalist id="dl_emails">${known.filter((c) => c.email).map((c) => `<option value="${esc(c.email)}">${esc(c.name)}</option>`).join('')}</datalist>
      <datalist id="dl_phones">${known.filter((c) => c.phone).map((c) => `<option value="${esc(c.phone)}">${esc(c.name)}</option>`).join('')}</datalist>
    </div>`);
  }

  function idFields(biz, ed) {
    const prefix = biz === 'cs' ? 'CS' : 'HC';
    return `<div class="grid">
      ${field('f_orderId', 'Order ID', `<input type="text" id="f_orderId" value="${esc(ed ? ed.orderId : OT.nextOrderId(DB.orders, biz))}" spellcheck="false">`, ed ? 'Must not match another order.' : 'Suggested automatically, change it if you need to.')}
      ${field('f_serial', 'Serial number', `<div class="serial-wrap"><input type="text" id="f_serial" value="${esc(ed ? ed.serial : prefix)}" maxlength="10" spellcheck="false"><span class="counter" id="serialCount">2/10</span></div>`, `10 characters, starting with ${prefix}.`)}
    </div>`;
  }

  function wireCommon(biz, onChange) {
    const known = OT.customers(DB.orders);
    const name = $('#f_name'), email = $('#f_email'), phone = $('#f_phone'), serial = $('#f_serial'), oid = $('#f_orderId');
    const fill = (c) => {
      if (!c) return;
      const filled = [];
      if (!name.value) { name.value = c.name; filled.push(name); }
      if (!email.value && c.email) { email.value = c.email; filled.push(email); }
      if (!phone.value && c.phone) { phone.value = c.phone; filled.push(phone); }
      // If the cursor is in a box we just filled, select it so typing replaces it
      // rather than adding on to the end.
      const active = document.activeElement;
      if (filled.includes(active)) active.select();
      else if (filled.length) setTimeout(() => { if (filled.includes(document.activeElement)) document.activeElement.select(); }, 0);
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

  function validateCommon(biz, selfId) {
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
    else if (DB.orders.some((o) => o.id !== selfId && o.orderId.toUpperCase() === orderId)) errs.f_orderId = `${orderId} is already used by another order.`;
    const sErr = OT.validateSerial(serial, biz === 'cs' ? 'CS' : 'HC');
    if (sErr) errs.f_serial = sErr;
    else if (DB.orders.some((o) => o.id !== selfId && o.serial.toUpperCase() === serial)) errs.f_serial = `${serial} is already used by another order.`;
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
    OT.takeStock(S(), order);
    order.costs = OT.costBreakdown(S(), order);
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
  function summaryCard(biz, rowsHtml, total, totalLbl, ed, note) {
    const slot = $('#sumSlot');
    if (!$('#summary', slot)) {
      slot.innerHTML = `<aside class="card summary" id="summary">
        <div class="s-top"><div class="s-eyebrow">Order summary</div><div class="s-id" id="sumId"></div></div>
        <div class="rows" id="sumRows"></div>
        <div class="total"><span class="lbl" id="sumLbl"></span><span class="amt" id="sumAmt"></span></div>
        <div class="s-actions"><button type="submit" form="orderForm" class="btn primary lg block">${icon('check')}${ed ? 'Save changes' : 'Create order'}</button>
          <button type="button" class="btn ghost block" ${ed ? `data-open="${ed.id}"` : `data-nav="${biz}"`}>Cancel</button></div>
        <p class="note" id="sumNote"></p>
      </aside>`;
    }
    $('#sumId').textContent = $('#f_orderId') ? $('#f_orderId').value : '';
    $('#sumRows').innerHTML = rowsHtml;
    $('#sumLbl').textContent = totalLbl;
    $('#sumAmt').textContent = money(total);
    $('#sumNote').innerHTML = note || (ed ? 'Status, history and payments already ticked as paid are kept.' : 'New orders start as Pending. You can change the status from the order page.');
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

  function notesSection(n, ed) {
    return section(n, 'Extra notes', 'Optional. Only you see these, they are never sent to the customer.',
      `<div class="field" data-field="f_notes"><textarea id="f_notes" placeholder="Anything to remember about this order">${esc(ed ? ed.notes || '' : '')}</textarea></div>`);
  }

  const formHead = (biz, ed) => ed
    ? `<button class="back" data-open="${ed.id}">${icon('back')}Back to ${esc(ed.orderId)}</button>
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>${esc(bizName(biz))}</div><h1>Edit ${esc(ed.orderId)}</h1><p class="lede">Change anything below, then save.</p></div></div>`
    : `<button class="back" data-nav="${biz}">${icon('back')}${esc(bizName(biz))} orders</button>
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>${esc(bizName(biz))}</div><h1>New order</h1></div></div>`;

  const origSubtotal = (o) => (o.subtotal != null ? o.subtotal : o.price);
  const sameList = (a, b) => a.length === b.length && [...a].sort().join('\u0001') === [...b].sort().join('\u0001');

  // Saves an edited order: records which fields changed, keeps status and history,
  // keeps payments already ticked as paid, and re-applies the discount to the new subtotal.
  async function saveEdit(o, fields, subtotal, disc, pay) {
    const fmtDisc = (d) => (d && d.amount > 0 ? `${d.type}:${d.value}:${d.label || ''}` : '');
    const fmtPay = (p) => (p && p.method === 'finance' ? `f:${p.frequency}:${p.count}:${p.start}` : 'u');
    const labels = {
      customerName: 'name', customerEmail: 'email', customerPhone: 'phone', orderId: 'order ID', serial: 'serial',
      model: 'model', colourId: 'colour', delivery: 'delivery', addonIds: 'options', donor: 'donor calculator', extraGames: 'extra games', notes: 'notes'
    };
    const changed = Object.keys(labels).filter((k) => k in fields && JSON.stringify(fields[k] ?? '') !== JSON.stringify(o[k] ?? '')).map((k) => labels[k]);
    const oldDisc = fmtDisc(o.discount), oldPay = fmtPay(o.payment), oldPrice = o.price, oldColour = o.colourId, oldDelivery = o.delivery;
    Object.assign(o, fields);
    const shellChanged = o.colourId !== oldColour || o.delivery !== oldDelivery;
    if (shellChanged && o.status !== 'cancelled') { OT.returnStock(S(), o); OT.takeStock(S(), o); }
    if (shellChanged) o.costs = OT.costBreakdown(S(), o);
    o.subtotal = subtotal;
    o.price = subtotal;
    OT.applyDiscount(o, disc);
    if (fmtDisc(o.discount) !== oldDisc) changed.push('discount');
    const old = o.payment || {};
    if (pay.method === 'finance' && old.method === 'finance') pay.paid = (old.paid || []).slice(0, pay.count);
    if (pay.method === 'upfront' && old.method === 'upfront') pay.paid = !!old.paid;
    if (fmtPay(pay) !== oldPay) changed.push('payment');
    o.payment = pay;
    if (o.price !== oldPrice) changed.push(`price ${money(oldPrice)} to ${money(o.price)}`);
    if (changed.length) o.history.push({ status: o.status, at: Date.now(), email: 'none', note: `Edited ${changed.join(', ')}` });
    if (await persist(changed.length ? `${o.orderId} updated` : 'No changes to save')) go('order', { id: o.id, biz: o.business });
  }

  // ---------- Chameleon form ----------
  function renderCsForm(ed) {
    const s = S().cs;
    let initColour = ed ? ed.colourId : null;
    let initDelivery = ed ? ed.delivery : null;
    main.innerHTML = `
      ${formHead('cs', ed)}
      <div class="formlayout">
        <form class="card" id="orderForm" novalidate>
          ${customerSection(1, ed)}
          ${section(2, 'Order', null, idFields('cs', ed))}
          ${section(3, 'Controller', 'Pick the BDM model, then the colour. Installation is always included.', `
            <div class="field" data-field="f_model"><span class="flabel">BDM model</span>
              <div class="tiles models">${s.models.map((m) => `<label class="tile"><input type="radio" name="model" value="${esc(m)}" ${ed && ed.model === m ? 'checked' : ''}>${esc(m)}</label>`).join('')}</div><div class="err" hidden></div></div>
            <div class="field" data-field="f_colour" style="margin-top:18px"><span class="flabel">Colour</span><div id="colourBox"></div><div class="err" hidden></div></div>
            <div class="field" data-field="f_delivery" style="margin-top:18px"><span class="flabel">Delivery</span><div id="deliveryBox"></div><div class="err" hidden></div></div>`)}
          ${section(4, 'Options', 'Optional. Tick any that apply.', s.addons.length ? `<div class="tiles addons">${s.addons.map((a) => `<label class="tile"><input type="checkbox" name="addon" value="${a.id}" ${ed && (ed.addonIds || []).includes(a.id) ? 'checked' : ''}><span class="box">${icon('check')}</span><span class="t-main"><span class="t-title">${esc(a.name)}</span></span>${num(a.price) ? `<span class="t-price">+${money(a.price)}</span>` : ''}</label>`).join('')}</div>` : '<div class="placeholder-note">No options set up. Add them in Settings.</div>')}
          ${section(5, 'Discount', 'Optional. Pick a saved discount or enter a custom one.', discountPicker(ed && ed.discount && ed.discount.amount > 0 ? ed.discount : null))}
          ${section(6, 'Payment', 'How the customer is paying.', paymentPicker(ed ? ed.payment : null))}
          ${notesSection(7, ed)}
        </form>
        <div id="sumSlot"></div>
      </div>`;

    const val = (n) => ($(`input[name=${n}]:checked`) || {}).value || '';
    const addons = () => $$('input[name=addon]:checked').map((i) => i.value);
    // While editing, the original price is kept unless the product itself changes.
    const sameProduct = () => !!ed && val('model') === ed.model && val('colour') === ed.colourId && val('delivery') === ed.delivery && sameList(addons(), ed.addonIds || []);
    const subtotalNow = () => (sameProduct() ? origSubtotal(ed) : OT.csPrice(S(), val('colour'), val('delivery'), addons()));

    function drawColours() {
      const model = val('model');
      const prev = val('colour') || initColour;
      initColour = null;
      const list = OT.coloursFor(S(), model);
      const missing = ed && model === ed.model && prev === ed.colourId && !list.some((c) => c.id === ed.colourId);
      $('#colourBox').innerHTML = !model
        ? '<div class="placeholder-note">Choose a model to see its colours.</div>'
        : list.length ? `<div class="tiles colours">${list.map((c) => {
          const prices = OT.deliveryOptions(c).map((o) => o.price);
          return `<label class="tile"><input type="radio" name="colour" value="${c.id}" ${c.id === prev ? 'checked' : ''}><span class="tile-art">${controllerArt(c.swatch, c.name, 'mini')}</span><span class="t-main"><span class="t-title">${esc(c.name)}</span><span class="t-sub">from ${money(Math.min(...prices))}${colourStockChip(c)}</span></span></label>`;
        }).join('')}</div>` : '<div class="placeholder-note">No colours are set up for this model.</div>';
      if (missing) $('#colourBox').insertAdjacentHTML('afterbegin', `<div class="callout" style="margin-bottom:10px">${icon('info')}<div>This order's colour, ${esc(ed.colourName)}, is no longer offered for ${esc(model)} in Settings. Choose a colour to save changes.</div></div>`);
      drawDelivery();
    }
    function drawDelivery() {
      const c = s.colours.find((x) => x.id === val('colour'));
      const prev = val('delivery') || initDelivery;
      initDelivery = null;
      const opts = OT.deliveryOptions(c);
      $('#deliveryBox').innerHTML = !opts.length
        ? '<div class="placeholder-note">Choose a colour to see delivery options.</div>'
        : `<div class="tiles delivery">${opts.map((o) => `<label class="tile"><input type="radio" name="delivery" value="${o.id}" ${o.id === prev || opts.length === 1 ? 'checked' : ''}><span class="radio"></span><span class="t-main"><span class="t-title">${o.label}</span><span class="t-sub">${esc(o.id === 'express' ? s.expressWording : s.standardWording)}</span>${c[o.id] && c[o.id].stock != null ? `<span class="stk ${OT.stockState(c[o.id])}" style="margin:4px 0 0">${stockLabel(c[o.id])}</span>` : ''}</span><span class="t-price">${money(o.price)}</span></label>`).join('')}</div>`;
      drawSummary();
    }
    function drawSummary() {
      const c = s.colours.find((x) => x.id === val('colour'));
      const d = val('delivery');
      const price = subtotalNow();
      const names = addons().map((id) => (s.addons.find((a) => a.id === id) || {}).name).filter(Boolean);
      const disc = discountSummary(price || 0, $('#orderForm'));
      const note = ed && price != null && !sameProduct() && price !== origSubtotal(ed)
        ? `The product changed, so the price before discount is now ${money(price)} (was ${money(origSubtotal(ed))}), using current Settings prices.` : '';
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
        price == null ? 0 : disc.total, price == null ? 'Choose colour and delivery' : 'Total', ed, note);
    }

    wireCommon('cs', drawSummary);
    wireDiscount($('#orderForm'), drawSummary);
    const csTotal = () => discountSummary(subtotalNow() || 0, $('#orderForm')).total;
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
      const { errs, values } = validateCommon('cs', ed && ed.id);
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
      if (ed) {
        const keep = sameProduct();
        return saveEdit(ed, {
          ...values, model: val('model'), colourId: c.id, colourName: keep ? ed.colourName : c.name, swatch: c.swatch,
          delivery: val('delivery'), addonIds,
          addonNames: keep ? ed.addonNames : addonIds.map((id) => (s.addons.find((a) => a.id === id) || {}).name).filter(Boolean),
          notes: $('#f_notes').value.trim()
        }, subtotalNow(), disc.d, pay.p);
      }
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
  function renderHackForm(ed) {
    const h = S().hack;
    main.innerHTML = `
      ${formHead('hack', ed)}
      <div class="formlayout">
        <form class="card" id="orderForm" novalidate>
          ${customerSection(1, ed)}
          ${section(2, 'Order', null, idFields('hack', ed))}
          ${section(3, 'Calculator', null, `<div class="grid">${field('f_donor', 'Donor calculator', `<input type="text" id="f_donor" placeholder="For example TI-84 Plus CE" value="${esc(ed ? ed.donor : '')}">`, null, 'full')}</div>`)}
          ${section(4, 'Games', `${h.includedGames.length ? esc(h.includedGames.join(', ')) + ' are' : 'The base games are'} included in the ${money(h.basePrice)} base price.`, `
            <div class="tiles addons" style="margin-bottom:16px">${h.includedGames.map((g) => `<div class="tile" style="cursor:default;background:var(--surface-warm)"><span class="box" style="background:var(--ink);border-color:var(--ink)">${icon('check').replace('class="ic', 'style="opacity:1" class="ic')}</span><span class="t-main"><span class="t-title">${esc(g)}</span></span><span class="t-sub">Included</span></div>`).join('')}</div>
            ${field('f_games', 'Extra games', `<textarea id="f_games" placeholder="One game per line">${esc(ed ? (ed.extraGames || []).join('\n') : '')}</textarea>`, `One game per line, ${money(h.extraGamePrice)} each.`)}`)}
          ${section(5, 'Discount', 'Optional. Pick a saved discount or enter a custom one.', discountPicker(ed && ed.discount && ed.discount.amount > 0 ? ed.discount : null))}
          ${section(6, 'Payment', 'How the customer is paying.', paymentPicker(ed ? ed.payment : null))}
          ${notesSection(7, ed)}
        </form>
        <div id="sumSlot"></div>
      </div>`;

    const games = $('#f_games');
    const sameGames = () => !!ed && JSON.stringify(OT.parseGames(games.value)) === JSON.stringify(ed.extraGames || []);
    const subtotalNow = () => (sameGames() ? origSubtotal(ed) : OT.hackPrice(S(), OT.parseGames(games.value)));
    function drawSummary() {
      const extra = OT.parseGames(games.value);
      const sub = subtotalNow();
      const disc = discountSummary(sub, $('#orderForm'));
      const note = ed && !sameGames() && sub !== origSubtotal(ed)
        ? `The games changed, so the price before discount is now ${money(sub)} (was ${money(origSubtotal(ed))}), using current Settings prices.` : '';
      summaryCard('hack',
        sumRow('Customer', esc($('#f_name').value.trim())) +
        sumRow('Serial', $('#f_serial').value.length > 2 ? `<span class="mono">${esc($('#f_serial').value)}</span>` : '') +
        sumRow('Calculator', esc($('#f_donor').value.trim())) +
        sumRow('Base price', money(h.basePrice)) +
        sumRow(`Extra games (${extra.length})`, extra.length ? `${extra.length} x ${money(h.extraGamePrice)}` : '<span class="empty-val">None</span>') +
        sumRow('Payment', esc(payShort(readPayment($('#orderForm')).p) || 'Check finance details')) +
        disc.rows,
        disc.total, 'Total', ed, note);
    }
    wireCommon('hack', drawSummary);
    wireDiscount($('#orderForm'), drawSummary);
    const hackTotal = () => discountSummary(subtotalNow(), $('#orderForm')).total;
    wirePayment($('#orderForm'), hackTotal);
    $('#orderForm').addEventListener('change', () => drawFinancePreview($('#orderForm'), hackTotal()));
    $('#orderForm').addEventListener('input', (e) => { if (e.target.id === 'd_value' || e.target.id === 'f_games') drawFinancePreview($('#orderForm'), hackTotal()); });
    drawSummary();
    $('#f_name').focus();
    $('#orderForm').onsubmit = (e) => {
      e.preventDefault();
      const { errs, values } = validateCommon('hack', ed && ed.id);
      const donor = $('#f_donor').value.trim();
      if (!donor) errs.f_donor = 'Enter the donor calculator.';
      const disc = readDiscount($('#orderForm'));
      if (disc.err) errs.f_disc = disc.err;
      const pay = readPayment($('#orderForm'));
      if (pay.err) errs.f_pay = pay.err;
      if (!showErrors(['f_name', 'f_email', 'f_phone', 'f_orderId', 'f_serial', 'f_donor', 'f_disc', 'f_pay'], errs)) return;
      const extraGames = OT.parseGames(games.value);
      if (ed) return saveEdit(ed, { ...values, donor, extraGames, notes: $('#f_notes').value.trim() }, subtotalNow(), disc.d, pay.p);
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
      <div class="ordertop"><button class="back" data-nav="${o.business}">${icon('back')}${esc(bizName(o.business))} orders</button>
        <button class="btn" data-action="editOrder">${icon('edit')}Edit order</button></div>
      <section class="card hero">
        <div class="hero-top">
          <div class="hero-art ${o.business}">${orderArt(o)}</div>
          <div class="hero-main">
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
            <div class="card-head"><h2>${hchip(o.business === 'cs' ? 'pad' : 'calc')}Product details</h2></div>
            <div class="card-pad" style="padding-top:8px">
              <dl class="dl">${details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k === 'Colour' ? swatch(swatchOf(o)) : ''}${esc(v)}</dd>`).join('')}</dl>
            </div>
          </section>
          ${turnaroundCard(o)}
          <section class="card">
            <div class="card-head"><h2>${hchip('edit')}Extra notes</h2><button class="btn sm" data-action="editNotes">${icon('edit')}${o.notes ? 'Edit' : 'Add notes'}</button></div>
            <div class="card-pad" style="padding-top:12px">${o.notes ? `<div class="notes-text">${esc(o.notes)}</div>` : '<p class="muted" style="margin:0;font-size:13.5px">No notes yet. Notes are private and never sent to the customer.</p>'}</div>
          </section>
          <section class="card">
            <div class="card-head"><h2>${hchip('clock')}Activity</h2><span class="meta">${o.history.length} update${o.history.length === 1 ? '' : 's'}</span></div>
            <div class="card-pad">
              <ul class="activity">${[...o.history].reverse().map((h) => `<li><span class="dot"></span><div>
                <b>${h === o.history[0] ? 'Order created' : h.note ? esc(h.note) : h.status === 'cancelled' ? 'Order cancelled' : `Marked as ${esc(OT.statusLabel(h.status))}`}</b>${EMAIL_NOTE[h.email] ? `<span class="mail">${icon('mail')}${EMAIL_NOTE[h.email]}</span>` : ''}
                <div class="when">${fmtDateTime(h.at)}</div></div></li>`).join('')}</ul>
            </div>
          </section>
        </div>
        <div class="stack">
          <section class="card">
            <div class="card-head"><h2>${hchip('users')}Customer</h2><button class="btn sm" data-action="editContact">${icon('edit')}Edit</button></div>
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
            <div class="card-head"><h2>${hchip('tag')}Price</h2><button class="btn sm" data-action="editDiscount">${icon('tag')}${hasDisc ? 'Change discount' : 'Add discount'}</button></div>
            <div class="card-pad" style="padding-top:8px">
              <dl class="dl">
                ${hasDisc ? `<dt>Subtotal</dt><dd class="num">${money(o.subtotal)}</dd><dt>Discount</dt><dd><span class="disc-val num">-${money(o.discount.amount)}</span><span class="muted" style="font-weight:500">${esc(discWhy)}</span></dd>` : ''}
                <dt>Total</dt><dd class="num" style="font-size:16px">${money(o.price)}</dd>
                ${profitRows(o)}
              </dl>
              <div class="inv-row"><button class="btn sm" data-action="invoiceSave">${icon('file')}Download invoice</button><button class="btn sm" data-action="invoiceEmail" ${o.customerEmail ? '' : 'disabled'}>${icon('send')}Email invoice</button></div>
            </div>
          </section>
          ${paymentCard(o)}
          <section class="card">
            <div class="card-head"><h2>${hchip('mail')}Notify customer</h2></div>
            <div class="card-pad" style="display:grid;gap:12px">
              <p class="muted" style="margin:0;font-size:13.5px">Each status change asks whether to email the customer. You can also resend the current status at any time.</p>
              <button class="btn block" data-action="resend" ${o.customerEmail ? '' : 'disabled'}>${icon('send')}Email current status</button>
              ${!o.customerEmail ? `<div class="callout">${icon('info')}<div>No email address on this order${o.customerPhone ? `, so contact the customer on ${esc(o.customerPhone)}` : ''}. <button class="linkbtn" data-action="editContact">Add an email</button></div></div>` : emailReady() ? '' : `<div class="callout">${icon('info')}<div>Direct sending is not set up, so emails open in your mail app. <button class="linkbtn" data-nav="settings">Set up email</button></div></div>`}
            </div>
          </section>
          <section class="card">
            <div class="card-head"><h2>${hchip('gear')}Manage order</h2></div>
            <div class="card-pad manage">
              ${cancelled
                ? `<div class="manage-row"><div><b>Reopen order</b><span>Put it back to ${esc(OT.statusLabel(o.cancelledFrom || 'pending'))}.</span></div><button class="btn sm" data-action="reopenOrder">Reopen</button></div>`
                : `<div class="manage-row"><div><b>Cancel order</b><span>Keeps it on record as Cancelled. You can reopen it later.</span></div><button class="btn sm" data-action="cancelOrder">${icon('x')}Cancel order</button></div>`}
              <div class="manage-row"><div><b>Edit order</b><span>Change the customer, product, discount, payment or notes.</span></div><button class="btn sm" data-action="editOrder">${icon('edit')}Edit</button></div>
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
    const head = `<div class="card-head"><h2>${hchip('coins')}Payment</h2><button class="btn sm" data-action="editPayment">${icon('edit')}Change</button></div>`;
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
      ${!o.receivedAt && ['confirmed', 'in_progress', 'shipped'].includes(status) ? `<label class="notify"><input type="checkbox" id="markRecv" ${status !== 'confirmed' ? 'checked' : ''}><div><b>The ${o.business === 'cs' ? 'controller' : 'calculator'} arrived today</b><span>Starts the turnaround window. You can change the date later.</span></div></label>` : ''}
      ${notifyBox(o)}</div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="okBtn">Mark as ${esc(label)}</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        const send = !!($('#sendMail', m) || {}).checked;
        const recv = !!($('#markRecv', m) || {}).checked;
        close();
        if (recv) o.receivedAt = todayStr();
        o.status = status;
        const entry = { status, at: Date.now(), email: 'none' };
        o.history.push(entry);
        await persist(`${o.orderId} marked as ${label}`);
        const refresh = () => (route.page === 'order' && route.id === o.id ? renderOrder() : render());
        refresh();
        if (send) {
          entry.email = await sendStatusEmail(o);
          await persist();
          refresh();
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
        OT.returnStock(S(), o);
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
    OT.takeStock(S(), o);
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
        <p class="lede">${all.length} customer${all.length === 1 ? '' : 's'}, ${money(total)} in orders.</p></div>
        <div class="head-actions"><button class="btn primary lg" data-action="cometInvite">${icon('send')}Contact via Comet</button></div></div>
      ${outreachCard()}
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
          <div class="body">${orderTable(c.orders, true)}
            <div class="cust-actions"><button class="btn sm" data-action="cometInvite" data-contact="${esc(c.phone || c.email || '')}" data-name="${esc(c.name)}" data-biz="${esc(c.orders[0] ? c.orders[0].business : 'cs')}">${icon('send')}Message via Comet</button><button class="btn sm danger" data-action="deleteCustomer" data-key="${esc(c.key)}">${icon('trash')}Delete customer</button></div></div>
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
    ['set-hack', 'Hackulator'], ['set-comet', 'Comet (iMessage)'], ['set-web', 'Website'], ['set-costs', 'Costs'], ['set-invoice', 'Invoices'], ['set-turn', 'Turnaround'], ['set-email', 'Email'], ['set-general', 'Business names'], ['set-pass', 'Passcode'], ['set-data', 'Data and backup']
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
                <input type="url" class="xr-link" data-cf="extremerateUrl" value="${esc(c.extremerateUrl || '')}" placeholder="eXtremeRate product link for Comet photos (optional, found automatically if empty)" aria-label="eXtremeRate product link">
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

          ${sset('set-comet', 'Comet (iMessage orders)', 'Lets Comet, your iMessage assistant on this Mac, read your colours, prices and stock and create orders from customer chats. Only programs on this Mac with the key below can use it. Orders from Comet start as Pending, marked "Ordered over iMessage with Comet".', `
            <div class="comet-row">${sw('data-comet="enabled"', s.comet.enabled, 'Let Comet create orders')}<span class="comet-status" id="cometStatus">Checking...</span></div>
            <div class="grid" style="margin-top:14px">
              <div class="field"><label>Key</label><div style="display:flex;gap:8px"><input type="text" readonly class="mono" id="cometToken" value="${esc(s.comet.token || '')}" placeholder="Turn Comet on to create a key"><button class="btn" data-action="copyCometToken">Copy</button></div>
                <div class="hint">Put this in Comet's .env as ORDERTRACK_TOKEN. <button class="linkbtn" data-action="newCometToken">Make a new key</button></div></div>
              <div class="field"><label>Port</label><input type="number" min="1024" max="65535" data-set="comet.port" data-num value="${esc(s.comet.port)}"><div class="hint">Comet's .env: ORDERTRACK_URL=http://127.0.0.1:${esc(s.comet.port)}</div></div>
            </div>
            <div class="callout" style="margin-top:14px">${icon('info')}<div>OrderTrack must be open for Comet to create orders. Closing the window keeps it running; quitting with Cmd+Q stops it, and Comet will hold new orders until it is back.</div></div>`)}

          ${sset('set-web', 'Chameleon website', 'Sends your website the serial numbers of your Chameleon orders, so its repair form only accepts real ones and can show the model, colour and status. Only those are sent: no names, contact details or prices. It updates a few seconds after any change, while OrderTrack is open.', `
            <div class="comet-row">${sw('data-web="enabled"', s.website.enabled, 'Send serials to the website')}<span class="comet-status" id="webStatus">Checking...</span></div>
            <div class="grid" style="margin-top:14px">
              <div class="field"><label>Website address</label><input type="url" data-set="website.url" value="${esc(s.website.url || '')}" placeholder="https://..."></div>
              <div class="field"><label>Sync key</label><div style="display:flex;gap:8px"><input type="text" readonly class="mono" id="webKey" value="${esc(s.website.key || '')}" placeholder="Turn it on to create a key"><button class="btn" data-action="copyWebKey">Copy</button></div>
                <div class="hint">Add this in Vercel as the SYNC_TOKEN environment variable, then redeploy. <button class="linkbtn" data-action="syncWebNow">Send now</button></div></div>
            </div>`)}

          ${sset('set-costs', 'Costs and profit', 'What each order costs you, used to show profit on orders, Home and Reports. Shell and part costs are set on the Stock page. Each order keeps the costs from when it was created, and you can change any order by hand.', `<div class="grid">
            <div class="field"><label>Postage per order</label><div class="prefix"><input type="number" step="0.01" min="0" data-set="costs.postage" data-num value="${esc(s.costs.postage)}"></div></div>
            <div class="field"><label>${esc(bizName('cs'))}, other costs per order</label><div class="prefix"><input type="number" step="0.01" min="0" data-set="costs.csExtra" data-num value="${esc(s.costs.csExtra)}"></div><div class="hint">For example packaging or buttons. The shell cost comes from Stock.</div></div>
            <div class="field"><label>${esc(bizName('hack'))}, calculator and parts per order</label><div class="prefix"><input type="number" step="0.01" min="0" data-set="costs.hackDonor" data-num value="${esc(s.costs.hackDonor)}"></div><div class="hint">Leave at zero if customers send their own calculator.</div></div>
            <div class="field"><label>${esc(bizName('hack'))}, other costs per order</label><div class="prefix"><input type="number" step="0.01" min="0" data-set="costs.hackExtra" data-num value="${esc(s.costs.hackExtra)}"></div></div></div>
            <div class="addrow"><span style="flex:1"></span><button class="btn" data-nav="stock">${icon('box')}Set shell and part costs</button></div>`)}

          ${sset('set-invoice', 'Invoices', 'Shown on every invoice PDF. The invoice number is INV- followed by the order ID.', `<div class="grid">
            <div class="field"><label>Your address and contact details</label><textarea data-set="invoice.address" style="min-height:96px" placeholder="Name, address, email, phone">${esc(s.invoice.address)}</textarea></div>
            <div class="field"><label>How to pay</label><textarea data-set="invoice.paymentInstructions" style="min-height:96px" placeholder="For example bank details or a payment link">${esc(s.invoice.paymentInstructions)}</textarea><div class="hint">Shown until the order is fully paid.</div></div>
            <div class="field full"><label>Footer message</label><input type="text" data-set="invoice.footer" value="${esc(s.invoice.footer)}"></div></div>`)}

          ${sset('set-turn', 'Turnaround', 'Days counted from when the item arrives. Orders get a due date, and a warning when they are close to it or late. The wording customers see is set under Delivery wording.', `<div class="grid three">
            <div class="field"><label>Express, earliest (days)</label><input type="number" min="0" data-set="turnaround.expressMin" data-num value="${esc(s.turnaround.expressMin)}"></div>
            <div class="field"><label>Express, latest (days)</label><input type="number" min="0" data-set="turnaround.expressMax" data-num value="${esc(s.turnaround.expressMax)}"></div>
            <div class="field"><label>Warn this many days before</label><input type="number" min="0" data-set="turnaround.dueSoonDays" data-num value="${esc(s.turnaround.dueSoonDays)}"></div>
            <div class="field"><label>Non express, earliest (days)</label><input type="number" min="0" data-set="turnaround.standardMin" data-num value="${esc(s.turnaround.standardMin)}"></div>
            <div class="field"><label>Non express, latest (days)</label><input type="number" min="0" data-set="turnaround.standardMax" data-num value="${esc(s.turnaround.standardMax)}"></div>
            <div class="field"><label>${esc(bizName('hack'))}, latest (days)</label><input type="number" min="0" data-set="turnaround.hackMax" data-num value="${esc(s.turnaround.hackMax)}"></div></div>`)}

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

          ${sset('set-data', 'Data and backup', `${api.version ? `You are running OrderTrack version ${esc(await api.version())}. ` : ''}Orders and settings are saved on this Mac at <span class="mono" style="overflow-wrap:anywhere;color:var(--ink-2)">${esc(location)}</span>. The previous save is kept alongside it.`, `
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="export">${icon('download')}Export backup</button><button class="btn" data-action="import">${icon('upload')}Import backup</button></div>`)}
        </div>
      </div>`;

    const webToggle = $('[data-web="enabled"]', main);
    if (webToggle) {
      webToggle.addEventListener('change', async () => {
        s.website.enabled = webToggle.checked;
        if (s.website.enabled && !s.website.key) s.website.key = newToken();
        await persist(s.website.enabled ? 'Website sync on' : 'Website sync off');
        const y = content.scrollTop; await renderSettings(); content.scrollTop = y;
      });
      showWebStatus();
      // The first send happens a few seconds after a change: show how it went.
      setTimeout(showWebStatus, 6000);
      setTimeout(showWebStatus, 25000);
    }
    const cometToggle = $('[data-comet="enabled"]', main);
    if (cometToggle) {
      cometToggle.addEventListener('change', async () => {
        s.comet.enabled = cometToggle.checked;
        if (s.comet.enabled && !s.comet.token) s.comet.token = newToken();
        await persist(s.comet.enabled ? 'Comet can now create orders' : 'Comet turned off');
        const y = content.scrollTop; await renderSettings(); content.scrollTop = y;
      });
      const st = $('#cometStatus', main);
      const showStatus = async () => {
        if (!api.cometStatus) { st.textContent = 'Only available in the Mac app'; return; }
        const r = await api.cometStatus();
        st.className = 'comet-status ' + (r.listening ? 'on' : s.comet.enabled ? 'bad' : '');
        st.textContent = r.listening ? `Running on port ${r.port}` : s.comet.enabled ? 'Not running. Is the port in use?' : 'Off';
      };
      setTimeout(showStatus, 300);
    }

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
      case 'copyWebKey': {
        const t = $('#webKey');
        if (!t.value) return toast('Turn website sync on first to create a key', true);
        try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
        return toast('Sync key copied');
      }
      case 'syncWebNow': {
        if (!api.websiteSync) return toast('Only available in the Mac app', true);
        if (!S().website.enabled) return toast('Turn website sync on first', true);
        const st = $('#webStatus'); if (st) st.textContent = 'Sending...';
        const r = await api.websiteSync(DB);
        showWebStatus();
        return r.ok ? toast(`Sent ${r.count} serial${r.count === 1 ? '' : 's'} to the website`) : toast('Website sync failed: ' + r.error, true);
      }
      case 'copyCometToken': {
        const t = $('#cometToken');
        if (!t.value) return toast('Turn Comet on first to create a key', true);
        try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
        return toast('Key copied');
      }
      case 'newCometToken': {
        if (!(await confirmBox('Make a new key?', 'The old key stops working straight away. Update ORDERTRACK_TOKEN in Comet\'s .env and restart Comet.', 'Make new key', true))) return;
        s.comet.token = newToken();
        return reRender('New key created');
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

  // ======================================================================
  // Illustrations, charts and the Home, Reports, Stock and Board views
  // ======================================================================
  const hchip = (n) => `<span class="hchip">${icon(n)}</span>`;
  const STATUS_COLOR = { pending: '#B3B2B3', confirmed: '#3456A3', in_progress: '#F5A524', shipped: '#FF6B5A', delivered: '#2B7A57' };
  // Chart series colours, validated for colour-vision separation against white.
  const CHART = { cs: '#F06A55', hack: '#8C5A00' };
  const DAYMS = 86400000;
  const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
  const shortMoney = (v) => (v >= 1000 ? '£' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : '£' + Math.round(v));
  const live = (orders) => orders.filter((o) => o.status !== 'cancelled');
  let artSeq = 0;

  function hexLum(hex) {
    const h = String(hex || '#999').replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '9');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // A generic game controller, tinted with the order's colour. Clear colours are see-through,
  // Dragon gets scales and Anime gets a halftone with sparkles.
  const PAD_BODY = 'M70 40C95 28 130 30 160 30S225 28 250 40C280 52 300 100 306 150C311 185 290 200 268 192C248 185 236 160 220 150C200 140 120 140 100 150C84 160 72 185 52 192C30 200 9 185 14 150C20 100 40 52 70 40Z';
  function controllerArt(hex, name, cls) {
    const id = 'pa' + (++artSeq);
    const n = String(name || '').toLowerCase();
    const clear = n.includes('clear');
    const dark = hexLum(hex) < 0.35;
    const btn = n.includes('black button') ? '#1F1F23' : dark ? 'rgba(255,255,255,.22)' : 'rgba(26,29,41,.26)';
    const btnRing = dark ? 'rgba(255,255,255,.12)' : 'rgba(26,29,41,.12)';
    const pattern = n.includes('dragon') ? 'dragon' : n.includes('anime') ? 'anime' : '';
    return `<svg class="art art-pad ${cls || ''}" viewBox="0 0 320 210" aria-hidden="true">
      <defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
        <clipPath id="${id}c"><path d="${PAD_BODY}"/></clipPath>
        <pattern id="${id}d" width="18" height="13" patternUnits="userSpaceOnUse"><path d="M0 13Q9 0 18 13" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.6"/></pattern>
        <pattern id="${id}a" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.7" fill="#fff" fill-opacity=".45"/></pattern>
      </defs>
      <ellipse cx="160" cy="200" rx="122" ry="8" fill="#1A1D29" opacity=".08"/>
      <path d="${PAD_BODY}" fill="${esc(hex)}" fill-opacity="${clear ? 0.55 : 1}"/>
      <g clip-path="url(#${id}c)">
        ${clear ? `<rect x="58" y="58" width="204" height="76" rx="10" fill="#2B7A57" opacity=".28"/>
          <path d="M70 70h50v14h30M250 72h-40v20h-30M90 120h40l10-12h40M230 118h-30" fill="none" stroke="#1A1D29" stroke-opacity=".22" stroke-width="2"/>
          <circle cx="160" cy="96" r="9" fill="#1A1D29" opacity=".18"/>` : ''}
        ${pattern === 'dragon' ? `<rect width="320" height="210" fill="url(#${id}d)"/>` : ''}
        ${pattern === 'anime' ? `<rect width="320" height="210" fill="url(#${id}a)"/><path d="M90 60l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM235 150l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff" opacity=".8"/>` : ''}
        <rect width="320" height="210" fill="url(#${id}s)"/>
      </g>
      <path d="${PAD_BODY}" fill="none" stroke="rgba(26,29,41,.35)" stroke-width="2"/>
      <rect x="120" y="44" width="80" height="44" rx="9" fill="${dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.4)'}" stroke="${btnRing}" stroke-width="1.5"/>
      <path d="M72 80h12v-12h12v12h12v12h-12v12h-12v-12h-12z" fill="${btn}"/>
      <g fill="${btn}"><circle cx="242" cy="70" r="7.5"/><circle cx="242" cy="104" r="7.5"/><circle cx="225" cy="87" r="7.5"/><circle cx="259" cy="87" r="7.5"/></g>
      <g><circle cx="122" cy="122" r="18" fill="${btn}"/><circle cx="122" cy="122" r="11" fill="none" stroke="${btnRing}" stroke-width="3"/>
        <circle cx="198" cy="122" r="18" fill="${btn}"/><circle cx="198" cy="122" r="11" fill="none" stroke="${btnRing}" stroke-width="3"/></g>
      <rect x="146" y="98" width="28" height="4" rx="2" fill="${btn}" opacity=".7"/>
    </svg>`;
  }

  // A hacked calculator with a little game running on its screen.
  function calcArt(cls) {
    const keys = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
      const accent = (r === 4 && c === 3) || (r === 0 && c === 3);
      keys.push(`<rect x="${34 + c * 34}" y="${142 + r * 28}" width="26" height="19" rx="5" fill="${accent ? '#F5A524' : '#3A3F50'}"/>`);
    }
    const snake = [[4, 3], [5, 3], [6, 3], [6, 4], [6, 5], [7, 5], [8, 5]].map(([x, y]) => `<rect x="${42 + x * 9}" y="${38 + y * 9}" width="8" height="8" fill="#2E3A1F"/>`).join('');
    const blocks = [[11, 7], [12, 7], [12, 6], [13, 7], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8]].map(([x, y]) => `<rect x="${42 + x * 9}" y="${38 + y * 9}" width="8" height="8" fill="#2E3A1F" opacity=".75"/>`).join('');
    return `<svg class="art art-calc ${cls || ''}" viewBox="0 0 200 300" aria-hidden="true">
      <ellipse cx="100" cy="292" rx="80" ry="6" fill="#1A1D29" opacity=".08"/>
      <rect x="14" y="8" width="172" height="278" rx="22" fill="#262A36"/>
      <rect x="14" y="8" width="172" height="278" rx="22" fill="none" stroke="#1A1D29" stroke-width="2"/>
      <rect x="20" y="14" width="160" height="40" rx="16" fill="#fff" opacity=".05"/>
      <rect x="30" y="26" width="140" height="100" rx="8" fill="#9FB386"/>
      <rect x="30" y="26" width="140" height="100" rx="8" fill="none" stroke="#1A1D29" stroke-opacity=".4" stroke-width="2"/>
      ${snake}${blocks}<rect x="114" y="56" width="8" height="8" fill="#B9402F"/>
      <text x="40" y="118" font-family="monospace" font-size="10" fill="#2E3A1F" opacity=".8">SCORE 2048</text>
      ${keys.join('')}
    </svg>`;
  }

  const orderArt = (o, cls) => (o.business === 'cs' ? controllerArt(swatchOf(o), o.colourName, cls) : calcArt(cls));

  function spark(values, color) {
    const w = 120, h = 36, max = Math.max(...values, 1);
    const pts = values.map((v, i) => [i * (w / Math.max(values.length - 1, 1)), h - 3 - (v / max) * (h - 8)]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${line}L${w} ${h}L0 ${h}Z" fill="${color}" opacity=".12"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function weekBuckets(orders, weeks, fn) {
    const end = startOfDay(new Date()).getTime() + DAYMS;
    return Array.from({ length: weeks }, (_, i) => {
      const to = end - (weeks - 1 - i) * 7 * DAYMS, from = to - 7 * DAYMS;
      return orders.filter((o) => o.createdAt >= from && o.createdAt < to).reduce((s, o) => s + fn(o), 0);
    });
  }

  function monthKeys(n) {
    const now = new Date();
    return Array.from({ length: n }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - k), 1);
      return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'short' }), long: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
    });
  }
  function revenueSeries(orders, months, bizList) {
    return bizList.map((b) => ({
      key: b, name: bizName(b), color: CHART[b],
      values: months.map((mo) => live(orders).filter((o) => o.business === b && new Date(o.createdAt).getFullYear() === mo.y && new Date(o.createdAt).getMonth() === mo.m).reduce((s, o) => s + num(o.price), 0))
    }));
  }

  // Round axis: a 1, 2 or 5 step and a max that is a whole number of steps.
  function niceAxis(v) {
    if (v <= 0) return { max: 100, step: 25 };
    const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
    return { max: Math.ceil(v / step) * step, step };
  }

  // Stacked bar chart: thin bars, 2px gaps between segments, rounded tops, recessive grid,
  // hover tooltip per month, and a table view for exact numbers.
  function drawBarChart(host, cfg) {
    const { months, series } = cfg;
    const H = cfg.height || 240;
    const W = Math.max(host.clientWidth || 600, 280);
    const padL = 48, padR = 6, padT = 14, padB = 30;
    const iw = W - padL - padR, ih = H - padT - padB;
    const totals = months.map((_, i) => series.reduce((s, se) => s + se.values[i], 0));
    const axis = niceAxis(Math.max(...totals));
    const max = axis.max;
    const band = iw / months.length, bw = Math.min(34, band * 0.55);
    const yv = (v) => (v / max) * ih;
    const base = padT + ih;
    let svg = '';
    for (let v = 0; v <= max + 1e-9; v += axis.step) {
      const yy = base - yv(v), t = v;
      svg += `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" class="${t ? 'gl' : 'bl'}"/><text x="${padL - 8}" y="${yy + 4}" class="yl">${shortMoney(v)}</text>`;
    }
    const step = band < 30 ? 2 : 1;
    months.forEach((mo, i) => {
      const x = padL + band * i + (band - bw) / 2;
      svg += `<rect class="hl" data-i="${i}" x="${padL + band * i + 2}" y="${padT}" width="${band - 4}" height="${ih}" rx="6"/>`;
      let y0 = base;
      const segs = series.map((se) => se.values[i]).map((v, k) => ({ v, k })).filter((s) => s.v > 0);
      segs.forEach((s, j) => {
        const h = yv(s.v), top = j === segs.length - 1;
        const y1 = y0 - h, y2 = y0 - (j ? 2 : 0);
        const hh = Math.max(y2 - y1, 1), r = top ? Math.min(4, hh) : 0;
        svg += `<path fill="${series[s.k].color}" d="M${x} ${y2}V${y1 + r}${r ? `Q${x} ${y1} ${x + r} ${y1}` : ''}H${x + bw - r}${r ? `Q${x + bw} ${y1} ${x + bw} ${y1 + r}` : ''}V${y2}Z"/>`;
        y0 = y1;
      });
      if (i % step === 0 || i === months.length - 1) svg += `<text x="${x + bw / 2}" y="${H - 9}" class="xl">${esc(mo.label)}</text>`;
      svg += `<rect class="hit" data-i="${i}" x="${padL + band * i}" y="${padT}" width="${band}" height="${ih + padB}"/>`;
    });
    host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(cfg.label || 'Revenue by month')}">${svg}</svg><div class="tip" hidden></div>`;
    const tip = $('.tip', host);
    $$('.hit', host).forEach((r) => {
      r.addEventListener('mouseenter', () => {
        const i = Number(r.dataset.i);
        $$('.hl', host).forEach((h) => h.classList.toggle('on', h.dataset.i === r.dataset.i));
        tip.innerHTML = `<b>${esc(months[i].long)}</b>${series.map((se) => `<div><i style="background:${se.color}"></i>${esc(se.name)}<span>${money(se.values[i])}</span></div>`).join('')}${series.length > 1 ? `<div class="tt"><i></i>Total<span>${money(totals[i])}</span></div>` : ''}`;
        tip.hidden = false;
        const cx = padL + band * i + band / 2;
        tip.style.left = Math.min(Math.max(cx - tip.offsetWidth / 2, 0), W - tip.offsetWidth) + 'px';
        tip.style.top = Math.max(base - yv(totals[i]) - tip.offsetHeight - 10, 0) + 'px';
      });
    });
    host.addEventListener('mouseleave', () => { tip.hidden = true; $$('.hl', host).forEach((h) => h.classList.remove('on')); });
    host.__draw = () => drawBarChart(host, cfg);
  }

  function chartTable(cfg) {
    return `<table class="table ctable"><thead><tr><th>Month</th>${cfg.series.map((se) => `<th class="r">${esc(se.name)}</th>`).join('')}${cfg.series.length > 1 ? '<th class="r">Total</th>' : ''}</tr></thead>
      <tbody>${cfg.months.map((mo, i) => `<tr style="cursor:default"><td>${esc(mo.long)}</td>${cfg.series.map((se) => `<td class="r num">${money(se.values[i])}</td>`).join('')}${cfg.series.length > 1 ? `<td class="r num"><b>${money(cfg.series.reduce((s, se) => s + se.values[i], 0))}</b></td>` : ''}</tr>`).join('')}</tbody></table>`;
  }

  // A chart card with legend, a chart/table toggle and redraw on resize.
  function chartCard(id, title, cfg) {
    return `<section class="card chartcard" id="${id}">
      <div class="card-head"><h2>${hchip('chart')}${esc(title)}</h2>
        <div class="legend">${cfg.series.length > 1 ? cfg.series.map((se) => `<span><i style="background:${se.color}"></i>${esc(se.name)}</span>`).join('') : ''}
          <div class="seg sm"><label><input type="radio" name="${id}v" value="chart" checked><span>Chart</span></label><label><input type="radio" name="${id}v" value="table"><span>Table</span></label></div></div></div>
      <div class="card-pad"><div class="chartbox" data-chart></div></div>
    </section>`;
  }
  function mountChart(id, cfg) {
    const card = document.getElementById(id);
    if (!card) return;
    const box = $('.chartbox', card);
    const show = (mode) => { if (mode === 'table') { box.__draw = null; box.innerHTML = chartTable(cfg); } else drawBarChart(box, cfg); };
    $$(`input[name=${id}v]`, card).forEach((r) => r.addEventListener('change', () => show(r.value)));
    show('chart');
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { $$('[data-chart]').forEach((h) => h.__draw && h.__draw()); if (route.page === 'home') balanceHome(); }, 120);
  });

  function pipelineBar(orders) {
    const open = orders.filter((o) => o.status !== 'cancelled');
    const total = open.length || 1;
    return `<div class="pipe">${OT.STATUSES.map((s) => {
      const c = open.filter((o) => o.status === s.id).length;
      return c ? `<span style="flex:${c};background:${STATUS_COLOR[s.id]}" title="${s.label}: ${c}"></span>` : '';
    }).join('') || '<span style="flex:1;background:var(--sunken)"></span>'}</div>
    <div class="pipe-legend">${OT.STATUSES.map((s) => `<span><i style="background:${STATUS_COLOR[s.id]}"></i>${s.label}<b>${open.filter((o) => o.status === s.id).length}</b></span>`).join('')}</div>`;
  }

  function barList(rows, color, empty) {
    if (!rows.length) return `<p class="muted small-note">${empty || 'Nothing to show yet.'}</p>`;
    const max = Math.max(...rows.map((r) => r.value), 1);
    return `<ul class="barlist">${rows.map((r) => `<li><div class="bl-top"><span class="bl-label">${r.label}</span><span class="bl-val">${r.display}</span></div>
      <div class="bl-track"><i style="width:${Math.max((r.value / max) * 100, 2)}%;background:${r.color || color}"></i></div></li>`).join('')}</ul>`;
  }

  function paymentStats(orders) {
    const today = startOfDay(new Date());
    const out = { outstanding: 0, collected: 0, overdueCount: 0, overdueAmount: 0, overdue: [] };
    for (const o of live(orders)) {
      const p = o.payment || { method: 'upfront' };
      if (p.method === 'finance') {
        OT.paymentSchedule(o).forEach((x) => {
          if (x.paid) out.collected += x.amount;
          else {
            out.outstanding += x.amount;
            if (x.due < today) { out.overdueCount++; out.overdueAmount += x.amount; out.overdue.push({ o, x }); }
          }
        });
      } else if (p.paid) out.collected += num(o.price);
      else out.outstanding += num(o.price);
    }
    return out;
  }

  function dueBadge(o) {
    if (o.status === 'cancelled' || o.status === 'delivered') return '';
    const t = OT.turnaround(S(), o);
    if (!t) return ['confirmed', 'in_progress'].includes(o.status) ? `<span class="due wait">${o.business === 'cs' ? 'Controller' : 'Calculator'} not received</span>` : '';
    if (t.state === 'overdue') return `<span class="due bad">${icon('alert')}Overdue ${-t.daysLeft}d</span>`;
    if (t.state === 'due_soon') return `<span class="due warn">${icon('clock')}${t.daysLeft === 0 ? 'Due today' : `Due in ${t.daysLeft}d`}</span>`;
    if (t.state === 'on_track') return `<span class="due ok">${icon('clock')}Due ${t.by.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>`;
    return '';
  }

  // ---------- Home ----------
  function attentionItems() {
    const items = [];
    const s = S();
    for (const o of DB.orders.filter(OT.isOpen)) {
      const t = OT.turnaround(s, o);
      if (t && t.state === 'overdue') items.push({ tone: 'bad', icon: 'alert', title: `${o.orderId} is overdue by ${-t.daysLeft} day${t.daysLeft === -1 ? '' : 's'}`, sub: `${o.customerName}, was due ${fmtDate(t.by)}`, open: o.id, rank: 0 });
      else if (t && t.state === 'due_soon') items.push({ tone: 'warn', icon: 'clock', title: `${o.orderId} is due ${t.daysLeft === 0 ? 'today' : `in ${t.daysLeft} day${t.daysLeft === 1 ? '' : 's'}`}`, sub: `${o.customerName}, ship by ${fmtDate(t.by)}`, open: o.id, rank: 1 });
    }
    paymentStats(DB.orders).overdue.forEach(({ o, x }) => items.push({ tone: 'bad', icon: 'coins', title: `Payment ${x.n} for ${o.orderId} is overdue`, sub: `${money(x.amount)} from ${o.customerName}, due ${fmtDate(x.due)}`, open: o.id, rank: 0 }));
    OT.lowStock(s).forEach((x) => items.push({ tone: OT.stockState(x) === 'out' ? 'bad' : 'warn', icon: 'box', title: OT.stockState(x) === 'out' ? `${x.name} is out of stock` : `${x.name} is running low`, sub: `${num(x.stock)} left`, nav: 'stock', rank: 2 }));
    for (const b of ['cs', 'hack']) {
      const n = DB.orders.filter((o) => o.business === b && o.status === 'pending').length;
      if (n) items.push({ tone: 'info', icon: 'check', title: `${n} ${bizName(b)} order${n === 1 ? '' : 's'} to confirm`, sub: 'Waiting since they were created', pending: b, rank: 3 });
    }
    return items.sort((a, b) => a.rank - b.rank);
  }

  function activityFeed(limit) {
    const ev = [];
    DB.orders.forEach((o) => (o.history || []).forEach((h, i) => ev.push({ o, h, first: i === 0 })));
    return ev.sort((a, b) => b.h.at - a.h.at).slice(0, limit);
  }

  function renderHome() {
    const now = new Date();
    const hr = now.getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const orders = DB.orders;
    const L = live(orders);
    const ms = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const pms = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const thisMonth = L.filter((o) => o.createdAt >= ms).reduce((s, o) => s + num(o.price), 0);
    const lastMonth = L.filter((o) => o.createdAt >= pms && o.createdAt < ms).reduce((s, o) => s + num(o.price), 0);
    const delta = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
    const open = orders.filter(OT.isOpen);
    const dueWeek = open.filter((o) => { const t = OT.turnaround(S(), o); return t && t.daysLeft != null && t.daysLeft <= 7; });
    const overdue = dueWeek.filter((o) => OT.turnaround(S(), o).state === 'overdue').length;
    const pay = paymentStats(orders);
    const att = attentionItems();
    const feed = activityFeed(7);
    const months = monthKeys(6);
    const cfg = { months, series: revenueSeries(orders, months, ['cs', 'hack']), height: 300, label: 'Revenue for the last 6 months' };
    const custs = OT.customers(orders).sort((a, b) => b.total - a.total).slice(0, 5);
    const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-GB', { month: 'long' });

    if (!orders.length) {
      main.innerHTML = `<div class="welcome card">
        <div class="w-art">${controllerArt('#FF6B5A', 'scarlet')}${calcArt()}</div>
        <div class="w-text"><div class="crumb"><span class="bar"></span>Welcome</div><h1>${greet}. <em>Let's get your first order in.</em></h1>
          <p class="lede">OrderTrack keeps ${esc(bizName('cs'))} and ${esc(bizName('hack'))} orders, customers, payments and stock in one place.</p>
          <ol class="steps-list">
            <li><b>Set up email</b><span>So customers get status updates and invoices.</span><button class="btn sm" data-nav="settings">Open Settings</button></li>
            <li><b>Add your stock</b><span>Track shells per colour and get low stock warnings.</span><button class="btn sm" data-nav="stock">Open Stock</button></li>
            <li><b>Create an order</b><span>Everything else fills in from there.</span>
              <span class="row-btns"><button class="btn sm primary" data-action="new" data-biz="cs">${icon('plus')}${esc(bizName('cs'))}</button><button class="btn sm" data-action="new" data-biz="hack">${icon('plus')}${esc(bizName('hack'))}</button></span></li>
          </ol></div></div>`;
      return;
    }

    main.innerHTML = `
      <div class="pagehead home-head">
        <div><div class="crumb"><span class="bar"></span>${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>${greet}. <em>${att.length ? `${att.length} thing${att.length === 1 ? '' : 's'} need${att.length === 1 ? 's' : ''} you.` : 'All caught up.'}</em></h1></div>
        <div class="head-actions"><button class="btn lg ghost" data-action="cometInvite" title="Comet texts a new customer and takes their order">${icon('send')}Contact via Comet</button><button class="btn lg" data-action="new" data-biz="hack" style="--accent:var(--amber)">${icon('plus')}${esc(bizName('hack'))}</button><button class="btn primary lg" data-action="new" data-biz="cs">${icon('plus')}${esc(bizName('cs'))} order</button></div>
      </div>

      <div class="tiles4">
        <div class="card tile4"><div class="t4-top">${hchip('trend')}<span>Revenue this month</span></div><div class="t4-v">${money(thisMonth)}</div>
          <div class="t4-sub">${delta == null ? 'No orders last month' : `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}%</span> vs ${lastMonthName}`}</div>${profitLine(L.filter((o) => o.createdAt >= ms))}${spark(weekBuckets(L, 8, (o) => num(o.price)), '#F06A55')}</div>
        <div class="card tile4"><div class="t4-top">${hchip('box')}<span>Open orders</span></div><div class="t4-v">${open.length}</div>
          <div class="t4-sub">${open.filter((o) => o.status === 'in_progress').length} in progress, ${open.filter((o) => o.status === 'shipped').length} shipped</div>${spark(weekBuckets(orders, 8, () => 1), '#3456A3')}</div>
        <div class="card tile4"><div class="t4-top">${hchip('clock')}<span>Due this week</span></div><div class="t4-v">${dueWeek.length}</div>
          <div class="t4-sub">${overdue ? `<span class="down">${overdue} overdue</span>` : 'Nothing overdue'}</div>
          <div class="mini-dots">${dueWeek.slice(0, 12).map((o) => `<i class="${OT.turnaround(S(), o).state}"></i>`).join('')}</div></div>
        <div class="card tile4"><div class="t4-top">${hchip('coins')}<span>Still to collect</span></div><div class="t4-v">${money(pay.outstanding)}</div>
          <div class="t4-sub">${pay.overdueCount ? `<span class="down">${pay.overdueCount} payment${pay.overdueCount === 1 ? '' : 's'} overdue</span>` : `${money(pay.collected)} collected`}</div>
          <div class="progress slim"><i style="width:${Math.round((pay.collected / Math.max(pay.collected + pay.outstanding, 1)) * 100)}%"></i></div></div>
      </div>

      <div class="home-grid two pair">
        <section class="card attention">
          <div class="card-head"><h2>${hchip('alert')}Needs attention</h2><span class="meta">${att.length || 'None'}</span></div>
          <div class="card-pad">${att.length ? `<ul class="att">${att.slice(0, 10).map((a) => `<li class="${a.tone}"><button ${a.open ? `data-open="${a.open}"` : a.nav ? `data-nav="${a.nav}"` : `data-action="showPending" data-biz="${a.pending}"`}>
              <span class="att-ic">${icon(a.icon)}</span><span class="att-t"><b>${esc(a.title)}</b><span>${esc(a.sub)}</span></span>${icon('chev')}</button></li>`).join('')}</ul><p class="muted small-note att-more" data-total="${att.length}" hidden></p>`
            : `<div class="caught"><div class="art-ok">${icon('check')}</div><b>All caught up</b><span>Nothing needs you right now.</span>
              <ul class="allclear">
                <li>${icon('check')}<span>Every open order is on time</span><em>${open.length} open</em></li>
                <li>${icon('check')}<span>No late payments</span><em>${money(pay.outstanding)} to collect</em></li>
                <li>${icon('check')}<span>Stock levels are fine</span><em>${OT.shellItems(S()).filter((x) => x.stock != null).length ? 'tracked' : 'not tracked yet'}</em></li>
                <li>${icon('check')}<span>No orders waiting to be confirmed</span><em>${orders.filter((o) => o.status === 'pending').length} pending</em></li>
              </ul></div>`}</div>
        </section>
        ${comingUpCard(12)}
      </div>
      <div class="home-grid two bizrow">
          ${['cs', 'hack'].map((b) => {
            const bo = orders.filter((o) => o.business === b);
            const rev = live(bo).filter((o) => o.createdAt >= ms).reduce((s, o) => s + num(o.price), 0);
            return `<section class="card bizcard ${b}" data-biz="${b}">
              <div class="bz-art">${b === 'cs' ? controllerArt('#FF6B5A', 'scarlet') : calcArt()}</div>
              <div class="bz-body"><div class="bz-head"><h2>${esc(bizName(b))}</h2><button class="btn sm" data-nav="${b}">View orders${icon('chev')}</button></div>
                <div class="bz-stats"><div><b>${bo.filter(OT.isOpen).length}</b><span>open</span></div><div><b>${money(rev)}</b><span>this month</span></div><div><b>${bo.length}</b><span>all time</span></div></div>
                ${pipelineBar(bo)}</div>
            </section>`;
          }).join('')}
      </div>

      <div class="home-grid two">
        ${chartCard('homeChart', 'Revenue, last 6 months', cfg)}
        <section class="card">
          <div class="card-head"><h2>${hchip('clock')}Recent activity</h2></div>
          <div class="card-pad"><ul class="feed">${feed.map(({ o, h, first }) => `<li data-open="${o.id}">${avatar(o.customerName, custKey(o))}
            <div><b>${esc(o.orderId)}</b> ${first ? 'created' : h.note ? esc(h.note.charAt(0).toLowerCase() + h.note.slice(1)) : h.status === 'cancelled' ? 'cancelled' : `marked as ${esc(OT.statusLabel(h.status))}`}
            <span class="sub">${esc(o.customerName)}, ${ago(h.at)}</span></div>${!first && !h.note ? pill(h.status) : ''}</li>`).join('')}</ul></div>
        </section>
      </div>

      <div class="home-grid two">
        <section class="card">
          <div class="card-head"><h2>${hchip('users')}Top customers</h2><button class="btn sm ghost" data-nav="customers">All customers${icon('chev')}</button></div>
          <div class="card-pad">${barList(custs.map((c) => ({ label: `${avatar(c.name, c.key)}<span>${esc(c.name)}<em>${c.orders.length} order${c.orders.length === 1 ? '' : 's'}</em></span>`, value: c.total, display: money(c.total) })), '#868892')}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2>${hchip('box')}Stock</h2><button class="btn sm ghost" data-nav="stock">Manage stock${icon('chev')}</button></div>
          <div class="card-pad">${stockSnapshot()}</div>
        </section>
      </div>`;
    mountChart('homeChart', cfg);
    balanceHome();
    if (document.fonts) document.fonts.ready.then(() => { if (route.page === 'home') balanceHome(); });
  }

  // Row 1 holds two lists. Both cards stretch to the same height; if one list is much
  // longer, it is shortened (never below 4 items, with "And N more") so neither card is
  // left with a large empty area.
  function balanceHome() {
    const pair = $('.home-grid.pair');
    if (!pair) return;
    const attCard = $('.attention', pair), cu = $('.comingup', pair);
    const attItems = $$('.att > li', attCard), attMore = $('.att-more', attCard);
    const agItems = $$('.ag-it', cu), days = $$('.ag-day', cu).filter((d) => !d.closest('.waiting')), agMore = $('.ag-more', cu);
    const setAtt = (n) => {
      attItems.forEach((x, i) => { x.hidden = i >= n; });
      if (attMore) {
        const extra = Number(attMore.dataset.total) - Math.min(n, attItems.length);
        attMore.hidden = extra <= 0;
        attMore.textContent = `And ${extra} more. Overdue items also show on each order.`;
      }
    };
    pair.classList.remove('stretch');
    let a = Math.min(attItems.length, 6), g = Math.min(agItems.length, 6);
    setAtt(a);
    trimAgenda(agItems, days, agMore, g);
    if (getComputedStyle(pair).gridTemplateColumns.split(' ').length >= 2) {
      // Grow the shorter list first, then shorten the longer one; stop when level or stuck.
      let lastDir = 0;
      for (let guard = 0; guard < 30; guard++) {
        const diff = attCard.offsetHeight - cu.offsetHeight;
        let dir = 0;
        if (diff < -60) {
          if (a < attItems.length) { a++; setAtt(a); dir = 1; } else if (g > 4) { g--; trimAgenda(agItems, days, agMore, g); dir = 2; }
        } else if (diff > 60) {
          if (g < agItems.length) { g++; trimAgenda(agItems, days, agMore, g); dir = 3; } else if (a > 4) { a--; setAtt(a); dir = 4; }
        }
        if (!dir || (lastDir && ((lastDir === 1 && dir === 4) || (lastDir === 3 && dir === 2) || (lastDir === 4 && dir === 1) || (lastDir === 2 && dir === 3)))) break;
        lastDir = dir;
      }
    }
    pair.classList.add('stretch');
  }

  function trimAgenda(items, days, more, n) {
    items.forEach((x, i) => { x.hidden = i >= n; });
    days.forEach((d) => {
      let el = d.nextElementSibling, any = false;
      while (el && !el.classList.contains('ag-day')) { if (!el.hidden) any = true; el = el.nextElementSibling; }
      d.hidden = !any;
    });
    if (more) {
      const extra = Number(more.dataset.total) - Math.min(n, items.length);
      more.hidden = extra <= 0;
      more.textContent = `And ${extra} more in the next 2 weeks.`;
    }
  }

  // Ship-by deadlines and finance payments due over the next two weeks.
  function upcomingEvents(days) {
    const today = startOfDay(new Date());
    const end = today.getTime() + days * DAYMS;
    const ev = [];
    for (const o of DB.orders.filter(OT.isOpen)) {
      const t = OT.turnaround(S(), o);
      if (t && !t.shippedAt && t.by >= today && t.by.getTime() < end) {
        ev.push({ date: startOfDay(t.by), kind: 'ship', o, title: `Ship ${o.orderId}`, sub: `${o.customerName}, ${o.business === 'cs' ? o.colourName : o.donor}` });
      }
    }
    for (const o of live(DB.orders)) {
      if (!o.payment || o.payment.method !== 'finance') continue;
      const sched = OT.paymentSchedule(o);
      sched.forEach((x) => {
        if (!x.paid && x.due >= today && x.due.getTime() < end) ev.push({ date: startOfDay(x.due), kind: 'pay', o, title: `${money(x.amount)} due from ${o.customerName}`, sub: `Payment ${x.n} of ${sched.length} for ${o.orderId}` });
      });
    }
    return ev.sort((a, b) => a.date - b.date || (a.kind === 'ship' ? -1 : 1));
  }

  function comingUpCard(limit) {
    const today = startOfDay(new Date());
    const ev = upcomingEvents(14);
    const dayLabel = (d) => {
      const diff = Math.round((d - today) / DAYMS);
      return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };
    const week = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * DAYMS));
    const waiting = DB.orders.filter((o) => OT.isOpen(o) && !o.receivedAt && ['confirmed', 'in_progress'].includes(o.status));
    const shown = ev.slice(0, limit);
    let lastLabel = '';
    return `<section class="card comingup">
      <div class="card-head"><h2>${hchip('calendar')}Coming up</h2><span class="meta">next 2 weeks</span></div>
      <div class="card-pad">
        <div class="weekstrip">${week.map((d, i) => {
          const day = ev.filter((e) => e.date.getTime() === d.getTime());
          return `<div class="wd${i === 0 ? ' today' : ''}${day.length ? ' has' : ''}" title="${esc(d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}${day.length ? `: ${day.length} due` : ''}">
            <span>${d.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${d.getDate()}</b>
            <i>${day.filter((e) => e.kind === 'ship').length ? '<em class="ship"></em>' : ''}${day.filter((e) => e.kind === 'pay').length ? '<em class="pay"></em>' : ''}</i></div>`;
        }).join('')}</div>
        ${shown.length ? `<ul class="agenda">${shown.map((e) => {
          const lbl = dayLabel(e.date);
          const head = lbl !== lastLabel ? `<li class="ag-day">${esc(lbl)}</li>` : '';
          lastLabel = lbl;
          return `${head}<li class="ag-it ${e.kind}" data-open="${e.o.id}"><span class="ag-ic">${icon(e.kind === 'ship' ? 'truck' : 'coins')}</span><span class="ag-t"><b>${esc(e.title)}</b><span>${esc(e.sub)}</span></span>${icon('chev')}</li>`;
        }).join('')}</ul><p class="muted small-note ag-more" data-total="${ev.length}" ${ev.length > shown.length ? '' : 'hidden'}>And ${ev.length - shown.length} more in the next 2 weeks.</p>`
          : `<div class="ag-empty">${icon('calendar')}<div><b>Nothing due in the next 2 weeks</b><span>Ship-by dates and finance payments show up here once items arrive and plans are set.</span></div></div>`}
        ${waiting.length ? `<div class="waiting">
          <div class="ag-day">Waiting to arrive<span>${waiting.length}</span></div>
          <ul>${waiting.slice(0, 3).map((o) => {
            const since = (o.history.find((h) => h.status === 'confirmed') || o.history[0]).at;
            return `<li><span class="ag-ic wait" data-open="${o.id}">${icon(o.business === 'cs' ? 'pad' : 'calc')}</span>
              <span class="ag-t" data-open="${o.id}"><b>${esc(o.orderId)}, ${esc(o.customerName)}</b><span>${o.business === 'cs' ? 'Controller' : 'Calculator'} not here yet, confirmed ${ago(since).toLowerCase()}</span></span>
              <button class="btn sm" data-action="quickReceive" data-id="${o.id}" title="Mark as arrived today">${icon('check')}Arrived</button></li>`;
          }).join('')}</ul>
          ${waiting.length > 3 ? `<p class="muted small-note">And ${waiting.length - 3} more waiting.</p>` : ''}
        </div>` : ''}
        <div class="legend-mini"><span><em class="ship"></em>Ship by</span><span><em class="pay"></em>Payment due</span></div>
      </div>
    </section>`;
  }

  function stockSnapshot() {
    const tracked = [...OT.shellItems(S()), ...(S().parts || [])].filter((x) => x.stock != null);
    if (!tracked.length) return `<div class="caught"><div class="art-ok neutral">${icon('box')}</div><b>Stock is not tracked yet</b><span>Add counts on the Stock page to get low stock warnings.</span><button class="btn sm" data-nav="stock">Set up stock</button></div>`;
    const rows = tracked.sort((a, b) => num(a.stock) - num(b.stock)).slice(0, 6);
    return `<ul class="stocklist">${rows.map((x) => `<li>${x.swatch ? swatch(x.swatch) : `<span class="calcmark">${icon('box')}</span>`}<span>${esc(x.name)}</span><span class="stk ${OT.stockState(x)}">${stockLabel(x)}</span></li>`).join('')}</ul>`;
  }

  // One chip for a colour tile: the worst state across its tracked delivery types.
  function colourStockChip(c) {
    const vs = ['standard', 'express'].filter((v) => c[v] && c[v].available && c[v].stock != null).map((v) => c[v]);
    if (!vs.length) return '';
    const total = vs.reduce((t, x) => t + Math.max(num(x.stock), 0), 0);
    const states = vs.map((x) => OT.stockState(x));
    const st = states.every((x) => x === 'out') ? 'out' : states.includes('out') || states.includes('low') ? 'low' : 'ok';
    const label = st === 'out' ? 'Out of stock' : st === 'low' && states.includes('out') ? 'Some out' : st === 'low' ? `${total} left` : `${total} in stock`;
    return `<span class="stk ${st}">${label}</span>`;
  }

  const stockLabel = (x) => ({ untracked: 'Not tracked', out: 'Out of stock', low: `${num(x.stock)} left`, ok: `${num(x.stock)} in stock` })[OT.stockState(x)];

  // ---------- Reports ----------
  const reportState = { period: 'year', biz: 'both' };
  function renderReports() {
    const st = reportState;
    const now = new Date();
    const starts = { month: new Date(now.getFullYear(), now.getMonth(), 1), quarter: new Date(now.getFullYear(), now.getMonth() - 2, 1), year: new Date(now.getFullYear(), 0, 1), all: new Date(0) };
    const bizList = st.biz === 'both' ? ['cs', 'hack'] : [st.biz];
    const scope = live(DB.orders).filter((o) => bizList.includes(o.business) && o.createdAt >= starts[st.period].getTime());
    const revenue = scope.reduce((s, o) => s + num(o.price), 0);
    const discounts = scope.reduce((s, o) => s + (o.discount ? num(o.discount.amount) : 0), 0);
    const pay = paymentStats(scope);
    const months = monthKeys(12);
    const cfg = { months, series: revenueSeries(DB.orders, months, bizList), height: 260, label: 'Revenue by month' };
    const cs = scope.filter((o) => o.business === 'cs'), hk = scope.filter((o) => o.business === 'hack');
    const group = (arr, key) => { const m = new Map(); arr.forEach((o) => { const k = key(o); if (!k) return; const g = m.get(k) || { n: 0, rev: 0, o }; g.n++; g.rev += num(o.price); m.set(k, g); }); return [...m.entries()].sort((a, b) => b[1].n - a[1].n || b[1].rev - a[1].rev); };
    const colours = group(cs, (o) => o.colourName).slice(0, 8);
    const models = group(cs, (o) => o.model);
    const donors = group(hk, (o) => o.donor).slice(0, 6);
    const games = group(hk.flatMap((o) => (o.extraGames || []).map((g) => ({ ...o, _g: g, price: 0 }))), (o) => o._g).slice(0, 6);
    const turn = scope.map((o) => ({ o, t: OT.turnaround(S(), o) })).filter((x) => x.t && x.t.daysTaken != null);
    const avgOf = (arr) => (arr.length ? (arr.reduce((s, x) => s + x.t.daysTaken, 0) / arr.length) : null);
    const tGroups = [
      ['Chameleon express', turn.filter((x) => x.o.business === 'cs' && x.o.delivery === 'express')],
      ['Chameleon non express', turn.filter((x) => x.o.business === 'cs' && x.o.delivery !== 'express')],
      [bizName('hack'), turn.filter((x) => x.o.business === 'hack')]
    ].filter(([, a]) => a.length);
    const onTime = turn.filter((x) => x.t.state === 'on_time').length;
    const fin = scope.filter((o) => o.payment && o.payment.method === 'finance').length;
    const seg = (name, val, label) => `<label><input type="radio" name="${name}" value="${val}" ${st[name === 'rp' ? 'period' : 'biz'] === val ? 'checked' : ''}><span>${label}</span></label>`;

    main.innerHTML = `
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>Insights</div><h1>Reports</h1><p class="lede">How the businesses are doing. Cancelled orders are left out.</p></div>
        <div class="report-controls">
          <div class="seg">${seg('rp', 'month', 'This month')}${seg('rp', 'quarter', '3 months')}${seg('rp', 'year', 'This year')}${seg('rp', 'all', 'All time')}</div>
          <div class="seg">${seg('rb', 'both', 'Both')}${seg('rb', 'cs', esc(bizName('cs')))}${seg('rb', 'hack', esc(bizName('hack')))}</div>
        </div></div>

      <div class="tiles4 five">
        <div class="card tile4"><div class="t4-top">${hchip('trend')}<span>Revenue</span></div><div class="t4-v">${money(revenue)}</div><div class="t4-sub">${scope.length} order${scope.length === 1 ? '' : 's'}</div></div>
        ${OT.costsConfigured(S()) ? (() => { const pr = scope.reduce((t, o) => t + OT.profitOf(S(), o), 0); return `<div class="card tile4"><div class="t4-top">${hchip('coins')}<span>Profit</span></div><div class="t4-v ${pr < 0 ? 'down' : ''}">${money(pr)}</div><div class="t4-sub">${revenue ? Math.round((pr / revenue) * 100) : 0}% margin, ${money(scope.length ? revenue / scope.length : 0)} average order</div></div>`; })()
          : `<div class="card tile4"><div class="t4-top">${hchip('coins')}<span>Profit</span></div><div class="t4-v muted">Not set up</div><div class="t4-sub"><button class="linkbtn" data-nav="settings">Add your costs</button> to see profit</div></div>`}
        <div class="card tile4"><div class="t4-top">${hchip('tag')}<span>Discounts given</span></div><div class="t4-v">${money(discounts)}</div><div class="t4-sub">${scope.filter((o) => o.discount && o.discount.amount > 0).length} discounted orders</div></div>
        <div class="card tile4"><div class="t4-top">${hchip('coins')}<span>Still to collect</span></div><div class="t4-v">${money(pay.outstanding)}</div><div class="t4-sub">${pay.overdueCount ? `<span class="down">${money(pay.overdueAmount)} overdue</span>` : `${money(pay.collected)} collected`}</div></div>
        <div class="card tile4"><div class="t4-top">${hchip('truck')}<span>On time</span></div><div class="t4-v">${turn.length ? Math.round((onTime / turn.length) * 100) + '%' : 'No data'}</div><div class="t4-sub">${turn.length} shipped with a received date</div></div>
      </div>

      ${chartCard('repChart', 'Revenue by month, last 12 months', cfg)}

      <div class="home-grid two" style="margin-top:16px">
        ${st.biz !== 'hack' ? `<section class="card"><div class="card-head"><h2>${hchip('pad')}Top colours</h2><span class="meta">${esc(bizName('cs'))}</span></div>
          <div class="card-pad">${barList(colours.map(([k, g]) => ({ label: `${swatch(swatchOf(g.o))}<span>${esc(k)}<em>${money(g.rev)}${OT.costsConfigured(S()) ? `, ${money(cs.filter((o) => o.colourName === k).reduce((t, o) => t + OT.profitOf(S(), o), 0))} profit` : ''}</em></span>`, value: g.n, display: `${g.n} order${g.n === 1 ? '' : 's'}` })), CHART.cs, 'No Chameleon orders in this period.')}</div></section>
        <section class="card"><div class="card-head"><h2>${hchip('pad')}BDM models</h2><span class="meta">${esc(bizName('cs'))}</span></div>
          <div class="card-pad">${barList(models.map(([k, g]) => ({ label: `<span>${esc(k)}<em>${money(g.rev)}</em></span>`, value: g.n, display: `${g.n} order${g.n === 1 ? '' : 's'}` })), CHART.cs, 'No Chameleon orders in this period.')}</div></section>` : ''}
        ${st.biz !== 'cs' ? `<section class="card"><div class="card-head"><h2>${hchip('calc')}Donor calculators</h2><span class="meta">${esc(bizName('hack'))}</span></div>
          <div class="card-pad">${barList(donors.map(([k, g]) => ({ label: `<span>${esc(k)}<em>${money(g.rev)}</em></span>`, value: g.n, display: `${g.n} order${g.n === 1 ? '' : 's'}` })), CHART.hack, 'No Hackulator orders in this period.')}</div></section>
        <section class="card"><div class="card-head"><h2>${hchip('calc')}Most wanted extra games</h2><span class="meta">${esc(bizName('hack'))}</span></div>
          <div class="card-pad">${barList(games.map(([k, g]) => ({ label: `<span>${esc(k)}</span>`, value: g.n, display: `${g.n} order${g.n === 1 ? '' : 's'}` })), CHART.hack, 'No extra games ordered in this period.')}</div></section>` : ''}
        <section class="card"><div class="card-head"><h2>${hchip('box')}Orders by status</h2></div>
          <div class="card-pad">${pipelineBar(DB.orders.filter((o) => bizList.includes(o.business) && o.createdAt >= starts[st.period].getTime()))}</div></section>
        <section class="card"><div class="card-head"><h2>${hchip('coins')}Payments</h2></div>
          <div class="card-pad"><dl class="dl">
            <dt>Paid upfront</dt><dd>${scope.length - fin} order${scope.length - fin === 1 ? '' : 's'}</dd>
            <dt>On finance</dt><dd>${fin} order${fin === 1 ? '' : 's'}</dd>
            <dt>Collected</dt><dd class="num">${money(pay.collected)}</dd>
            <dt>Still to collect</dt><dd class="num">${money(pay.outstanding)}</dd>
            <dt>Overdue</dt><dd class="num">${pay.overdueCount ? `<span class="down">${money(pay.overdueAmount)}, ${pay.overdueCount} payment${pay.overdueCount === 1 ? '' : 's'}</span>` : 'None'}</dd></dl>
            <div class="progress" style="margin-top:14px"><i style="width:${Math.round((pay.collected / Math.max(pay.collected + pay.outstanding, 1)) * 100)}%"></i></div></div></section>
        <section class="card"><div class="card-head"><h2>${hchip('truck')}Turnaround</h2><span class="meta">received to shipped</span></div>
          <div class="card-pad">${tGroups.length ? barList(tGroups.map(([k, a]) => ({ label: `<span>${esc(k)}<em>${a.length} shipped, ${a.filter((x) => x.t.state === 'on_time').length} on time</em></span>`, value: avgOf(a), display: `${avgOf(a).toFixed(1)} days avg` })), '#3456A3') : '<p class="muted small-note">Mark orders as received to start measuring turnaround.</p>'}</div></section>
        <section class="card"><div class="card-head"><h2>${hchip('users')}Top customers</h2></div>
          <div class="card-pad">${barList(OT.customers(scope).sort((a, b) => b.total - a.total).slice(0, 6).map((c) => ({ label: `${avatar(c.name, c.key)}<span>${esc(c.name)}<em>${c.orders.length} order${c.orders.length === 1 ? '' : 's'}</em></span>`, value: c.total, display: money(c.total) })), '#868892', 'No orders in this period.')}</div></section>
      </div>`;
    $$('input[name=rp]').forEach((r) => r.onchange = () => { st.period = r.value; renderReports(); });
    $$('input[name=rb]').forEach((r) => r.onchange = () => { st.biz = r.value; renderReports(); });
    mountChart('repChart', cfg);
  }

  // ---------- Stock ----------
  function renderStock() {
    const s = S();
    const all = [...OT.shellItems(s), ...(s.parts || [])];
    const tracked = all.filter((x) => x.stock != null);
    const low = all.filter((x) => OT.stockState(x) === 'low').length, out = all.filter((x) => OT.stockState(x) === 'out').length;
    const stepper = (kind, id, x) => x.stock == null
      ? `<button class="btn sm" data-action="trackStock" data-kind="${kind}" data-id="${id}">${icon('plus')}Track stock</button>`
      : `<div class="stepper sm"><button type="button" data-action="stockStep" data-kind="${kind}" data-id="${id}" data-step="-1" aria-label="One less">${icon('minus')}</button><input type="number" data-stock="${kind}:${id}" value="${esc(x.stock)}" aria-label="Stock"><button type="button" data-action="stockStep" data-kind="${kind}" data-id="${id}" data-step="1" aria-label="One more">${icon('plus')}</button></div>`;
    main.innerHTML = `
      <div class="pagehead"><div><div class="crumb"><span class="bar"></span>Inventory</div><h1>Stock</h1><p class="lede">Stock goes down by one when an order is created and back up if it is cancelled or deleted before shipping.</p></div></div>
      <div class="tiles4">
        <div class="card tile4"><div class="t4-top">${hchip('box')}<span>Items tracked</span></div><div class="t4-v">${tracked.length}</div><div class="t4-sub">of ${all.length} colours and parts</div></div>
        <div class="card tile4"><div class="t4-top">${hchip('pad')}<span>Shells in stock</span></div><div class="t4-v">${OT.shellItems(s).filter((x) => x.stock != null).reduce((t, x) => t + Math.max(num(x.stock), 0), 0)}</div><div class="t4-sub">non express and express</div></div>
        <div class="card tile4"><div class="t4-top">${hchip('alert')}<span>Running low</span></div><div class="t4-v">${low}</div><div class="t4-sub">at or below the warning level</div></div>
        <div class="card tile4"><div class="t4-top">${hchip('alert')}<span>Out of stock</span></div><div class="t4-v">${out}</div><div class="t4-sub">${out ? '<span class="down">Restock soon</span>' : 'Nothing out'}</div></div>
      </div>
      <section class="card sset">
        <div class="sset-head"><h2>${esc(bizName('cs'))} shells</h2><p>Non express and express shells are stocked and costed separately. One is used per order, matching its colour and delivery type. Set a warning level to get low stock alerts on Home.</p></div>
        <div class="sset-body"><div class="shellgrid">${s.cs.colours.map((c) => {
          const vs = ['standard', 'express'].filter((v) => c[v] && c[v].available);
          const worst = vs.map((v) => OT.stockState(c[v])).sort((a, b) => ['out', 'low', 'ok', 'untracked'].indexOf(a) - ['out', 'low', 'ok', 'untracked'].indexOf(b))[0] || 'untracked';
          return `<div class="shell ${worst}">
            <div class="sh-art">${controllerArt(c.swatch, c.name)}</div>
            <div class="sh-name"><b>${esc(c.name)}</b></div>
            ${vs.map((v) => { const x = c[v]; const id = `${c.id}:${v}`; return `<div class="variant">
              <div class="vh"><span>${OT.VARIANT_LABEL[v]}</span><span class="stk ${OT.stockState(x)}">${stockLabel(x)}</span></div>
              <label class="costat">Cost per shell <span class="prefix"><input type="number" min="0" step="0.01" data-cost="colour:${id}" value="${esc(num(x.cost))}"></span></label>
              <div class="sh-ctl">${stepper('colour', id, x)}${x.stock != null ? `<label class="lowat">Warn at <input type="number" min="0" data-lowat="colour:${id}" value="${esc(x.lowAt != null ? x.lowAt : 2)}"></label>` : ''}</div>
            </div>`; }).join('')}
            ${vs.length ? '' : '<div class="placeholder-note">Not offered on any delivery type.</div>'}
          </div>`;
        }).join('')}</div></div>
      </section>
      <section class="card sset" style="margin-top:16px">
        <div class="sset-head"><h2>Other parts</h2><p>Anything else you keep in stock, like screws, screen protectors or batteries. Choose whether one is used automatically per order.</p></div>
        <div class="sset-body">
          ${(s.parts || []).length ? `<table class="table parts"><thead><tr><th>Part</th><th>Used automatically</th><th>Cost each</th><th>Stock</th><th>Warn at</th><th></th></tr></thead><tbody>
            ${s.parts.map((x) => `<tr style="cursor:default" data-part="${x.id}">
              <td><input type="text" data-pf="name" value="${esc(x.name)}" aria-label="Part name"></td>
              <td><select data-pf="perOrder" aria-label="Used automatically"><option value="none" ${x.perOrder === 'none' || !x.perOrder ? 'selected' : ''}>No, adjust by hand</option><option value="cs" ${x.perOrder === 'cs' ? 'selected' : ''}>One per ${esc(bizName('cs'))} order</option><option value="hack" ${x.perOrder === 'hack' ? 'selected' : ''}>One per ${esc(bizName('hack'))} order</option></select></td>
              <td><span class="prefix"><input type="number" min="0" step="0.01" class="cost-in" data-cost="part:${x.id}" value="${esc(num(x.cost))}" aria-label="Cost each"></span></td>
              <td>${stepper('part', x.id, x)}</td>
              <td>${x.stock != null ? `<input type="number" min="0" class="lowat-in" data-lowat="part:${x.id}" value="${esc(x.lowAt != null ? x.lowAt : 2)}" aria-label="Warn at">` : ''}</td>
              <td class="r"><button class="iconbtn" data-action="delPart" data-id="${x.id}" aria-label="Remove part">${icon('trash')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="placeholder-note">No other parts yet.</div>'}
          <div class="addrow"><input type="text" id="newPart" placeholder="New part, for example Screen protector"><button class="btn" data-action="addPart">${icon('plus')}Add part</button></div>
        </div>
      </section>`;
    const find = (key) => {
      const [kind, id, v] = key.split(':');
      if (kind !== 'colour') return s.parts.find((p) => p.id === id);
      const c = s.cs.colours.find((x) => x.id === id);
      return c[v || 'standard'];
    };
    $$('[data-stock]').forEach((el) => el.addEventListener('change', async () => { find(el.dataset.stock).stock = Math.round(num(el.value)); await persist('Stock updated'); renderStock(); }));
    $$('[data-cost]').forEach((el) => el.addEventListener('change', async () => { find(el.dataset.cost).cost = Math.max(0, Math.round(num(el.value) * 100) / 100); await persist('Cost saved. New orders use it for profit.'); }));
    $$('[data-lowat]').forEach((el) => el.addEventListener('change', async () => { find(el.dataset.lowat).lowAt = Math.max(0, Math.round(num(el.value))); await persist('Warning level saved'); renderStock(); }));
    $$('[data-part]').forEach((row) => {
      const part = s.parts.find((p) => p.id === row.dataset.part);
      $$('[data-pf]', row).forEach((el) => el.addEventListener('change', () => {
        const v = el.value.trim();
        if (el.dataset.pf === 'name' && !v) { el.value = part.name; return toast('Part name cannot be empty', true); }
        part[el.dataset.pf] = v;
        persist('Saved');
      }));
    });
    const np = $('#newPart');
    np.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); stockAction('addPart', np); } });
  }

  async function stockAction(action, el) {
    const s = S();
    const item = () => {
      if (el.dataset.kind !== 'colour') return s.parts.find((p) => p.id === el.dataset.id);
      const [id, v] = el.dataset.id.split(':');
      const c = s.cs.colours.find((x) => x.id === id);
      const x = c[v || 'standard'];
      Object.defineProperty(x, 'label', { value: `${c.name}, ${OT.VARIANT_LABEL[v || 'standard'].toLowerCase()}`, configurable: true, enumerable: false });
      return x;
    };
    const y = content.scrollTop;
    const redo = async (msg) => { await persist(msg); renderStock(); content.scrollTop = y; };
    if (action === 'trackStock') { const x = item(); x.stock = 0; if (x.lowAt == null) x.lowAt = 2; return redo(`Tracking ${x.label || x.name}. Enter how many you have.`); }
    if (action === 'stockStep') { const x = item(); x.stock = num(x.stock) + Number(el.dataset.step); return redo(); }
    if (action === 'addPart') {
      const name = $('#newPart').value.trim();
      if (!name) return toast('Enter a part name first', true);
      s.parts = s.parts || [];
      s.parts.push({ id: OT.uid(), name, stock: 0, lowAt: 2, perOrder: 'none' });
      return redo(`Added ${name}`);
    }
    if (action === 'delPart') {
      const x = s.parts.find((p) => p.id === el.dataset.id);
      if (!(await confirmBox(`Remove ${x.name}?`, 'It will no longer be tracked. Existing orders are not changed.', 'Remove part', true))) return;
      s.parts = s.parts.filter((p) => p.id !== x.id);
      return redo('Part removed');
    }
  }

  // ---------- Board view ----------
  function boardHtml(orders) {
    const cols = OT.STATUSES.map((s) => ({ s, items: orders.filter((o) => o.status === s.id) }));
    const card = (o) => {
      const pay = o.payment && o.payment.method === 'finance' ? (() => { const sc = OT.paymentSchedule(o); return `<span class="bc-pay">${sc.filter((x) => x.paid).length}/${sc.length} paid</span>`; })() : '';
      return `<div class="bcard" draggable="true" data-open="${o.id}" data-drag="${o.id}">
        <div class="bc-art">${orderArt(o, 'mini')}</div>
        <div class="bc-main"><div class="bc-top"><b>${esc(o.orderId)}</b><span class="num">${money(o.price)}</span></div>
          <div class="bc-item">${esc(o.business === 'cs' ? `${o.colourName}, ${o.model}` : o.donor)}</div>
          <div class="bc-cust">${avatar(o.customerName, custKey(o))}<span>${esc(o.customerName)}</span></div>
          ${dueBadge(o) || pay ? `<div class="bc-foot">${dueBadge(o)}${pay}</div>` : ''}</div>
      </div>`;
    };
    return `<div class="board">${cols.map((c) => {
      const items = c.s.id === 'delivered' ? c.items.slice(0, 12) : c.items;
      return `<div class="bcol" data-drop="${c.s.id}"><div class="bcol-h"><i style="background:${STATUS_COLOR[c.s.id]}"></i>${c.s.label}<span class="count">${c.items.length}</span></div>
        <div class="bcol-body">${items.map(card).join('') || '<div class="bempty">Drag orders here</div>'}${c.items.length > items.length ? `<div class="bempty">And ${c.items.length - items.length} older</div>` : ''}</div></div>`;
    }).join('')}</div>`;
  }

  function wireBoard(root) {
    let dragId = null;
    $$('[data-drag]', root).forEach((c) => {
      c.addEventListener('dragstart', (e) => { dragId = c.dataset.drag; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
      c.addEventListener('dragend', () => { c.classList.remove('dragging'); $$('.bcol', root).forEach((x) => x.classList.remove('over')); });
    });
    $$('.bcol', root).forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('over');
        const o = DB.orders.find((x) => x.id === (dragId || e.dataTransfer.getData('text/plain')));
        if (o && o.status !== col.dataset.drop) changeStatus(o, col.dataset.drop);
      });
    });
  }

  // ---------- Turnaround on the order page ----------
  function turnaroundCard(o) {
    const item = o.business === 'cs' ? 'controller' : 'calculator';
    const t = OT.turnaround(S(), o);
    const head = `<div class="card-head"><h2>${hchip('truck')}Turnaround</h2>${o.receivedAt ? `<div class="head-btns"><button class="btn sm ghost" data-action="unreceive" title="Undo: the item has not actually arrived">${icon('x')}Not received yet</button><button class="btn sm" data-action="markReceived">${icon('edit')}Change date</button></div>` : ''}</div>`;
    if (!t) {
      return `<section class="card">${head}<div class="card-pad turn-wait">
        <div><b>Waiting for the ${item}</b><span>${o.business === 'cs' ? `Delivery is ${esc(o.delivery === 'express' ? S().cs.expressWording : S().cs.standardWording)}, so the clock starts when it arrives.` : 'The clock starts when the calculator arrives.'}</span></div>
        <button class="btn dark sm" data-action="markReceived" ${o.status === 'cancelled' ? 'disabled' : ''}>${icon('check')}Mark as received</button></div></section>`;
    }
    const start = t.received.getTime();
    const endRef = Math.max(t.by.getTime(), Date.now(), t.shippedAt || 0) + DAYMS;
    const pct = (d) => Math.min(Math.max(((d - start) / (endRef - start)) * 100, 0), 100);
    const states = {
      on_track: ['ok', `On track, ${t.daysLeft} day${t.daysLeft === 1 ? '' : 's'} left`],
      due_soon: ['warn', t.daysLeft === 0 ? 'Due today' : `Due in ${t.daysLeft} day${t.daysLeft === 1 ? '' : 's'}`],
      overdue: ['bad', `Overdue by ${-t.daysLeft} day${t.daysLeft === -1 ? '' : 's'}`],
      on_time: ['ok', `Shipped on time, in ${t.daysTaken} day${t.daysTaken === 1 ? '' : 's'}`],
      late: ['bad', `Shipped ${t.daysLate} day${t.daysLate === 1 ? '' : 's'} late`],
      cancelled: ['', 'Order cancelled']
    }[t.state];
    const marker = t.shippedAt || Date.now();
    return `<section class="card">${head}<div class="card-pad">
      <div class="turn-state ${states[0]}">${icon(states[0] === 'bad' ? 'alert' : 'clock')}<b>${states[1]}</b></div>
      <div class="ttrack"><span class="win" style="left:${pct(t.from.getTime())}%;width:${Math.max(pct(t.by.getTime() + DAYMS) - pct(t.from.getTime()), 2)}%"></span>
        <span class="now ${states[0]}" style="left:${pct(marker)}%"><em>${t.shippedAt ? 'Shipped' : 'Today'}</em></span></div>
      <div class="tlabels"><span>Received<b>${fmtDate(t.received)}</b></span><span>Ship between<b>${t.from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} and ${fmtDate(t.by)}</b></span></div>
    </div></section>`;
  }

  function markReceived(o) {
    const item = o.business === 'cs' ? 'controller' : 'calculator';
    modal(`<div class="m-body"><h2>When did the ${item} arrive?</h2><p>The turnaround window for ${esc(o.orderId)} starts from this date.</p>
      <div class="field" style="margin-top:16px"><label for="recvDate">Received on</label><input type="date" id="recvDate" class="dateinput" value="${esc(o.receivedAt || todayStr())}" max="${todayStr()}"></div></div>
      <div class="m-foot">${o.receivedAt ? '<button class="btn ghost danger" id="clearBtn">Clear date</button><span style="flex:1"></span>' : ''}<button class="btn ghost" data-close>Cancel</button><button class="btn dark" id="okBtn">Save</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        const v = $('#recvDate', m).value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return toast('Choose a date', true);
        o.receivedAt = v;
        o.history.push({ status: o.status, at: Date.now(), email: 'none', note: `${item.charAt(0).toUpperCase() + item.slice(1)} received ${fmtDate(new Date(v + 'T12:00:00'))}` });
        close();
        await persist('Received date saved');
        renderOrder();
      };
      const clr = $('#clearBtn', m);
      if (clr) clr.onclick = async () => { delete o.receivedAt; close(); await persist('Received date cleared'); renderOrder(); };
    }, o.business);
  }

  // ---------- Invoices ----------
  async function saveInvoice(o) {
    const ok = await api.saveInvoice(OT.invoiceHtml(S(), o), `${OT.invoiceNumber(o)}.pdf`);
    if (ok) toast('Invoice saved and opened');
  }

  async function emailInvoice(o) {
    if (!o.customerEmail) return toast('This customer has no email address. Add one with Edit.', true);
    if (!emailReady()) return toast('Set up email in Settings to send invoices directly, or download the invoice and attach it yourself.', true);
    if (!(await confirmBox(`Email invoice to ${o.customerName}?`, `${esc(OT.invoiceNumber(o))} for ${money(o.price)} will be sent to ${esc(o.customerEmail)} as a PDF.`, 'Send invoice'))) return;
    const biz = bizName(o.business);
    const first = String(o.customerName || '').trim().split(/\s+/)[0] || 'there';
    const sign = S().email.signOff || '';
    const text = `Hi ${first},\n\nPlease find attached invoice ${OT.invoiceNumber(o)} for your ${biz} order ${o.orderId}.\n\nTotal: ${money(o.price)}\nPayment: ${OT.paymentText(o)}\n\n${sign}`;
    toast('Preparing invoice...');
    const base64 = await api.invoicePdf(OT.invoiceHtml(S(), o));
    const res = await api.sendEmail(S().email, {
      to: o.customerEmail, subject: `${biz} invoice ${OT.invoiceNumber(o)}`, text, html: `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;line-height:1.5">${esc(text).replace(/\n/g, '<br>')}</div>`,
      attachments: [{ filename: `${OT.invoiceNumber(o)}.pdf`, base64, contentType: 'application/pdf' }]
    });
    if (!res.ok) return toast('Email failed: ' + res.error, true);
    o.history.push({ status: o.status, at: Date.now(), email: 'none', note: `Invoice emailed to ${o.customerEmail}` });
    await persist(`Invoice sent to ${o.customerEmail}`);
    renderOrder();
  }


  // ---------- Profit ----------
  function profitRows(o) {
    if (!OT.costsConfigured(S()) && o.costOverride == null) {
      return `<dt>Profit</dt><dd><button class="linkbtn" data-nav="settings">Add your costs</button><span class="muted" style="font-weight:500">to see profit</span></dd>`;
    }
    const cost = OT.orderCost(S(), o), profit = num(o.price) - cost;
    const margin = num(o.price) ? Math.round((profit / num(o.price)) * 100) : 0;
    return `<dt>Cost</dt><dd class="num">${money(cost)}<button class="linkbtn" data-action="editCost">${o.costOverride != null ? 'Set by hand, change' : 'Change'}</button></dd>
      <dt>Profit</dt><dd class="num"><span class="${profit >= 0 ? 'up' : 'down'}">${money(profit)}</span><span class="muted" style="font-weight:500">${margin}% margin</span></dd>`;
  }

  function editCost(o) {
    const auto = (o.costs || OT.costBreakdown(S(), o));
    modal(`<div class="m-body"><h2>Costs for ${esc(o.orderId)}</h2><p>Used to work out profit. Set your usual costs in Settings and on the Stock page.</p>
      <ul class="costlist">${auto.map((x) => `<li><span>${esc(x.label)}</span><b class="num">${money(x.amount)}</b></li>`).join('') || '<li><span class="muted">No automatic costs for this order</span></li>'}
        <li class="tot"><span>Automatic total</span><b class="num">${money(auto.reduce((t, x) => t + num(x.amount), 0))}</b></li></ul>
      <label class="notify" style="margin-top:14px"><input type="checkbox" id="useOverride" ${o.costOverride != null ? 'checked' : ''}><div><b>Set the cost by hand</b><span>For orders that cost more or less than usual.</span></div></label>
      <div class="field prefix" style="margin-top:10px"><input type="number" step="0.01" min="0" id="costIn" value="${esc(o.costOverride != null ? o.costOverride : auto.reduce((t, x) => t + num(x.amount), 0))}" aria-label="Cost"></div></div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn dark" id="okBtn">Save</button></div>`, (m, close) => {
      $('#okBtn', m).onclick = async () => {
        if ($('#useOverride', m).checked) o.costOverride = Math.max(0, num($('#costIn', m).value));
        else delete o.costOverride;
        close();
        await persist('Cost saved');
        renderOrder();
      };
    }, o.business);
  }

  function profitLine(orders) {
    if (!OT.costsConfigured(S())) return '';
    const p = orders.reduce((t, o) => t + OT.profitOf(S(), o), 0);
    return `<div class="t4-sub">${money(p)} profit</div>`;
  }


  // ======================================================================
  // Orders created by Comet (the iMessage assistant) through the local API
  // ======================================================================
  const lc = (v) => String(v || '').trim().toLowerCase();

  // Validates a request from Comet and turns it into a normal order. Never trusts prices
  // from the request: everything is priced from Settings here.
  function buildApiOrder(p) {
    const s = S();
    const err = (m) => ({ ok: false, error: m });
    if (!p || typeof p !== 'object') return err('Missing order details');
    const business = p.business === 'hack' ? 'hack' : p.business === 'cs' ? 'cs' : null;
    if (!business) return err('business must be "cs" or "hack"');
    const name = String(p.customerName || '').trim().slice(0, 120);
    const email = String(p.customerEmail || '').trim().slice(0, 200);
    const phone = String(p.customerPhone || '').trim().slice(0, 40);
    if (!name) return err('customerName is required');
    if (!email && !phone) return err('customerEmail or customerPhone is required');
    if (email && !isEmail(email)) return err('customerEmail is not a valid email address');
    const pErr = OT.validatePhone(phone);
    if (pErr) return err(pErr);

    const base = {
      business, customerName: name, customerEmail: email, customerPhone: phone,
      orderId: OT.nextOrderId(DB.orders, business), serial: OT.nextSerial(DB.orders, business),
      notes: String(p.notes || '').trim().slice(0, 1000)
    };

    let order;
    if (business === 'cs') {
      const model = s.cs.models.find((m) => lc(m) === lc(p.model) || lc(m).replace('-', '') === lc(p.model).replace(/[\s-]/g, ''));
      if (!model) return err(`Unknown model "${p.model}". Models: ${s.cs.models.join(', ')}`);
      const colours = OT.coloursFor(s, model);
      const c = colours.find((x) => x.id === p.colourId) || colours.find((x) => lc(x.name) === lc(p.colourName));
      if (!c) return err(`Colour not available for ${model}. Available: ${colours.map((x) => x.name).join(', ')}`);
      const delivery = p.delivery === 'express' ? 'express' : p.delivery === 'standard' || lc(p.delivery) === 'non express' ? 'standard' : null;
      const opt = OT.deliveryOptions(c).find((d) => d.id === delivery);
      if (!opt) return err(`${c.name} is available as: ${OT.deliveryOptions(c).map((d) => d.label).join(' or ')}`);
      const wanted = Array.isArray(p.options) ? p.options : [];
      const addons = [];
      for (const w of wanted) {
        const a = s.cs.addons.find((x) => x.id === w || lc(x.name) === lc(w));
        if (!a) return err(`Unknown option "${w}". Options: ${s.cs.addons.map((x) => x.name).join(', ')}`);
        if (!addons.includes(a)) addons.push(a);
      }
      order = {
        ...base, model, colourId: c.id, colourName: c.name, swatch: c.swatch, delivery,
        addonIds: addons.map((a) => a.id), addonNames: addons.map((a) => a.name),
        price: OT.csPrice(s, c.id, delivery, addons.map((a) => a.id))
      };
    } else {
      const donor = String(p.donor || '').trim().slice(0, 120);
      if (!donor) return err('donor (the calculator model) is required');
      const extraGames = (Array.isArray(p.extraGames) ? p.extraGames : []).map((g) => String(g).trim().slice(0, 60)).filter(Boolean).slice(0, 30);
      order = { ...base, donor, includedGames: [...s.hack.includedGames], extraGames, price: OT.hackPrice(s, extraGames) };
    }

    const pay = p.payment || {};
    if (pay.method === 'finance') {
      const count = Math.round(num(pay.count));
      const frequency = pay.frequency === 'weekly' ? 'weekly' : 'monthly';
      if (count < 2 || count > 52) return err('Finance needs between 2 and 52 payments');
      const start = /^\d{4}-\d{2}-\d{2}$/.test(pay.start || '') && pay.start >= todayStr() ? pay.start : todayStr();
      order.payment = { method: 'finance', frequency, count, start, paid: [] };
    } else {
      order.payment = { method: 'upfront', paid: false };
    }
    OT.applyDiscount(order, null);
    return { ok: true, order };
  }

  async function apiCreateOrder(p) {
    const built = buildApiOrder(p);
    if (!built.ok) return built;
    const o = built.order;
    const now = Date.now();
    o.id = OT.uid();
    o.status = 'pending';
    o.createdAt = now;
    o.source = 'comet';
    o.history = [{ status: 'pending', at: now, email: 'none' }, { status: 'pending', at: now + 1, email: 'none', note: 'Ordered over iMessage with Comet' }];
    OT.takeStock(S(), o);
    o.costs = OT.costBreakdown(S(), o);
    DB.orders.push(o);
    markOutreachOrdered(o);
    if (!(await persist())) return { ok: false, error: 'OrderTrack could not save the order' };
    // Do not redraw over a form the owner is typing in.
    if (!['new', 'edit', 'settings'].includes(route.page) && !$('#shell').hidden) render();
    else updateCounts();
    toast(`New order ${o.orderId} from ${o.customerName}, via Comet`);
    return {
      ok: true,
      order: {
        orderId: o.orderId, serial: o.serial, business: o.business, price: o.price, priceText: money(o.price),
        summary: OT.orderLines(S(), o).map(([k, v]) => `${k}: ${v}`).join('\n'),
        payment: OT.paymentText(o)
      }
    };
  }

  if (api.onApiCreateOrder) {
    api.onApiCreateOrder(async ({ reqId, payload }) => {
      let result;
      try { result = await apiCreateOrder(payload); } catch (e) { result = { ok: false, error: e.message }; }
      api.apiRespond(reqId, result);
    });
  }

  async function showWebStatus() {
    const st = $('#webStatus');
    if (!st) return;
    if (!api.websiteStatus) { st.textContent = 'Only available in the Mac app'; return; }
    const r = await api.websiteStatus();
    const on = S().website && S().website.enabled;
    st.className = 'comet-status ' + (r.ok ? 'on' : r.ok === false && on ? 'bad' : '');
    st.textContent = !on ? 'Off' : r.ok ? `Sent ${r.count} serial${r.count === 1 ? '' : 's'} at ${new Date(r.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : r.ok === false ? `Not sent: ${r.error}` : 'Waiting for the next change';
  }

  function newToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  }


  // ======================================================================
  // Contact via Comet: the owner adds someone, Comet texts them first
  // ======================================================================
  const contactKey = (contact) => { const c = String(contact || '').trim(); return isEmail(c) ? c.toLowerCase() : OT.phoneDigits(c); };
  const cometReady = () => !!(S().comet && S().comet.enabled && S().comet.token);
  const OUTREACH_STATUS = {
    queued: ['s-pending', 'Waiting for Comet'],
    sent: ['s-confirmed', 'Messaged'],
    failed: ['s-shipped', 'Could not reach'],
    ordered: ['s-delivered', 'Ordered']
  };

  async function openCometInvite(prefill) {
    prefill = prefill || {};
    if (!cometReady()) {
      if (await confirmBox('Turn on Comet first', 'Comet needs to be switched on in Settings, Comet (iMessage), before it can contact customers.', 'Open Settings')) go('settings');
      return;
    }
    const biz = prefill.business === 'hack' ? 'hack' : 'cs';
    const tile = (value, title, sub) => `<label class="tile"><input type="radio" name="ibiz" value="${value}" ${biz === value ? 'checked' : ''}><span class="radio"></span><span class="t-main"><span class="t-title">${esc(title)}</span><span class="t-sub">${esc(sub)}</span></span></label>`;
    modal(`<div class="m-body"><h2>Contact a customer via Comet</h2>
      <p>Comet texts them from its own iMessage number, says what they are interested in and starts the order. Their replies go to Comet, and the order appears here once they confirm it.</p>
      <div class="stack" style="margin-top:16px">
        <div class="grid">
          <div class="field" data-field="i_contact"><label for="i_contact">iMessage email or phone</label><input type="text" id="i_contact" value="${esc(prefill.contact || '')}" placeholder="name@icloud.com or 07700 900123" autocomplete="off"><div class="err" hidden></div></div>
          <div class="field" data-field="i_name"><label for="i_name">Name (optional)</label><input type="text" id="i_name" value="${esc(prefill.name || '')}" placeholder="So Comet can greet them"><div class="err" hidden></div></div>
        </div>
        <div class="field"><span class="flabel">Product</span><div class="tiles paymethod">${tile('cs', bizName('cs'), 'Custom PS5 controller housing')}${tile('hack', bizName('hack'), 'Calculator that plays games')}</div></div>
        <div class="field" data-field="i_product"><label for="i_product">What they want (optional)</label><input type="text" id="i_product" value="${esc(prefill.product || '')}" placeholder="For example Scarlet, express, keep original buttons"><div class="hint">Comet mentions this and still checks the details with them.</div></div>
        <div class="field"><label for="i_note">Note for Comet (optional)</label><textarea id="i_note" style="min-height:70px" placeholder="For example: met at the market, asked for a quote">${esc(prefill.note || '')}</textarea><div class="hint">Comet uses this to word its first message. The customer does not see it.</div></div>
      </div></div>
      <div class="m-foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="okBtn">${icon('send')}Send via Comet</button></div>`, (m, close) => {
      $('#i_contact', m).addEventListener('input', () => setErr('i_contact', ''));
      $('#okBtn', m).onclick = async () => {
        const contact = $('#i_contact', m).value.trim();
        const name = $('#i_name', m).value.trim().slice(0, 120);
        const valid = isEmail(contact) || (contact && !OT.validatePhone(contact));
        setErr('i_contact', !contact ? 'Enter their iMessage email or phone number.' : valid ? '' : 'That is not a valid email or phone number.');
        if (!valid) return;
        const key = contactKey(contact);
        if ((DB.outreach || []).some((x) => x.status === 'queued' && contactKey(x.contact) === key)) {
          setErr('i_contact', 'Comet is already about to message this person.');
          return;
        }
        const req = {
          id: OT.uid(), name, contact, business: ($('input[name=ibiz]:checked', m) || {}).value === 'hack' ? 'hack' : 'cs',
          product: $('#i_product', m).value.trim().slice(0, 300), note: $('#i_note', m).value.trim().slice(0, 600),
          status: 'queued', createdAt: Date.now()
        };
        DB.outreach = DB.outreach || [];
        DB.outreach.push(req);
        close();
        await persist(`Comet will message ${name || contact} within a minute`);
        if (['customers', 'home'].includes(route.page)) render();
      };
    });
  }

  function outreachCard() {
    const list = [...(DB.outreach || [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    if (!list.length) return '';
    return `<section class="card outreach">
      <div class="card-head"><h2>${hchip('send')}Contacted via Comet</h2><span class="meta">${(DB.outreach || []).length} total</span></div>
      <div class="card-pad"><ul class="olist">${list.map((x) => {
        const [cls, label] = OUTREACH_STATUS[x.status] || OUTREACH_STATUS.queued;
        const when = x.status === 'sent' && x.sentAt ? `messaged ${ago(x.sentAt).toLowerCase()}` : x.status === 'ordered' && x.orderId ? `order ${x.orderId}` : `added ${ago(x.createdAt).toLowerCase()}`;
        return `<li>${avatar(x.name || x.contact, contactKey(x.contact))}
          <div class="o-main"><b>${esc(x.name || x.contact)}</b><span>${esc([x.name ? x.contact : '', bizName(x.business), x.product].filter(Boolean).join(', '))}</span>
            ${x.status === 'failed' && x.error ? `<span class="o-err">${esc(x.error)}</span>` : ''}</div>
          <div class="o-side"><span class="pill ${cls}">${label}</span><span class="o-when">${esc(when)}</span></div>
          <div class="o-act">${x.status === 'failed' ? `<button class="btn sm" data-action="outreachRetry" data-id="${x.id}">Try again</button>` : ''}${x.status === 'ordered' && x.orderId ? `<button class="btn sm" data-action="outreachOpen" data-id="${x.id}">Open order</button>` : ''}
            ${['queued', 'failed'].includes(x.status) ? `<button class="iconbtn" data-action="outreachRemove" data-id="${x.id}" title="Remove" aria-label="Remove">${icon('x')}</button>` : ''}</div></li>`;
      }).join('')}</ul></div></section>`;
  }

  async function outreachAction(action, el) {
    const x = (DB.outreach || []).find((r) => r.id === el.dataset.id);
    if (!x) return;
    if (action === 'outreachRemove') {
      DB.outreach = DB.outreach.filter((r) => r !== x);
      await persist(x.status === 'queued' ? 'Cancelled before Comet sent anything' : 'Removed');
    } else if (action === 'outreachRetry') {
      x.status = 'queued'; delete x.error;
      await persist(`Comet will try ${x.name || x.contact} again`);
    } else if (action === 'outreachOpen') {
      const o = DB.orders.find((r) => r.orderId === x.orderId);
      if (o) return go('order', { id: o.id, biz: o.business });
    }
    render();
  }

  // Comet reports back after texting someone.
  if (api.onApiOutreachUpdate) {
    api.onApiOutreachUpdate(async ({ reqId, payload }) => {
      const x = (DB.outreach || []).find((r) => r.id === payload.id);
      if (!x) return api.apiRespond(reqId, { ok: false, error: 'No such request' });
      if (x.status === 'queued') {
        x.status = payload.status;
        if (payload.status === 'sent') { x.sentAt = Date.now(); delete x.error; } else x.error = payload.error || 'Comet could not send the message';
        await persist();
        if (payload.status === 'failed') toast(`Comet could not reach ${x.name || x.contact}: ${x.error}`, true);
        else toast(`Comet messaged ${x.name || x.contact}`);
        if (['customers', 'home'].includes(route.page) && !$('#shell').hidden) render();
      }
      api.apiRespond(reqId, { ok: true });
    });
  }

  // An order from someone Comet contacted marks their request as ordered.
  function markOutreachOrdered(o) {
    const keys = [contactKey(o.customerEmail), contactKey(o.customerPhone)].filter(Boolean);
    for (const x of DB.outreach || []) {
      if (['sent', 'queued'].includes(x.status) && keys.includes(contactKey(x.contact))) { x.status = 'ordered'; x.orderId = o.orderId; }
    }
  }


  // ---------- Delete a customer ----------
  // A customer is everyone sharing an email or phone across orders, so deleting
  // one deletes their orders, gives back stock for anything not yet shipped, and
  // removes their Contact via Comet requests.
  async function deleteCustomer(key) {
    const c = OT.customers(DB.orders).find((x) => x.key === key);
    if (!c) return;
    const n = c.orders.length;
    const open = c.orders.filter(OT.isOpen);
    const ids = c.orders.map((o) => esc(o.orderId)).join(', ');
    const warn = open.length ? `<br><br><b style="color:var(--coral-ink)">${open.length} of these ${open.length === 1 ? 'is' : 'are'} still open.</b> To keep a record instead, cancel the orders.` : '';
    if (!(await confirmBox(`Delete ${c.name}?`, `This permanently deletes ${c.name} and ${n === 1 ? 'their order' : `all ${n} of their orders`} (${ids}), ${money(c.total)} in total. It cannot be undone.${warn}`, n === 1 ? 'Delete customer and order' : `Delete customer and ${n} orders`, true))) return;
    for (const o of c.orders) if (!['shipped', 'delivered'].includes(o.status)) OT.returnStock(S(), o);
    const gone = new Set(c.orders);
    DB.orders = DB.orders.filter((o) => !gone.has(o));
    const keys = new Set([contactKey(c.email), contactKey(c.phone)].filter(Boolean));
    DB.outreach = (DB.outreach || []).filter((x) => !keys.has(contactKey(x.contact)));
    openCustomer = null;
    await persist(`Deleted ${c.name} and ${n} order${n === 1 ? '' : 's'}`);
    render();
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
      case 'editOrder': return order && go('edit', { id: order.id, biz: order.business });
      case 'deleteCustomer': return deleteCustomer(el.dataset.key);
      case 'cometInvite': return openCometInvite({ contact: el.dataset.contact, name: el.dataset.name, business: el.dataset.biz });
      case 'outreachRemove': case 'outreachRetry': case 'outreachOpen': return outreachAction(action, el);
      case 'markReceived': return order && markReceived(order);
      case 'unreceive': {
        if (!order || !order.receivedAt) return;
        const item = order.business === 'cs' ? 'controller' : 'calculator';
        if (!(await confirmBox(`Mark the ${item} as not received?`, `The received date (${esc(fmtDate(new Date(order.receivedAt + 'T12:00:00')))}) and the ship-by date are removed. ${esc(order.orderId)} goes back to waiting for the ${item}, and you can mark it received again when it arrives.`, 'Not received yet'))) return;
        delete order.receivedAt;
        order.history.push({ status: order.status, at: Date.now(), email: 'none', note: `Marked as not received yet: the ${item} has not arrived` });
        await persist(`${order.orderId} is waiting for the ${item} again`);
        return renderOrder();
      }
      case 'editCost': return order && editCost(order);
      case 'quickReceive': {
        const o = DB.orders.find((x) => x.id === el.dataset.id);
        if (!o) return;
        o.receivedAt = todayStr();
        o.history.push({ status: o.status, at: Date.now(), email: 'none', note: `${o.business === 'cs' ? 'Controller' : 'Calculator'} received ${fmtDate(new Date())}` });
        await persist();
        render();
        const t = OT.turnaround(S(), o);
        toast(`${o.orderId} marked as arrived. Ship by ${fmtDate(t.by)}.`);
        return;
      }
      case 'invoiceSave': return order && saveInvoice(order);
      case 'invoiceEmail': return order && emailInvoice(order);
      case 'showPending': listState[el.dataset.biz].tab = 'pending'; listState[el.dataset.biz].view = 'list'; return go(el.dataset.biz);
      case 'trackStock': case 'stockStep': case 'addPart': case 'delPart': return stockAction(action, el);
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
          if (!['shipped', 'delivered'].includes(order.status)) OT.returnStock(S(), order);
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
    if (mod && e.key.toLowerCase() === 'e' && route.page === 'order') {
      e.preventDefault();
      go('edit', { id: route.id, biz: route.biz });
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
