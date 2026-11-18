// The repair form: live validation, a ticket that fills in as you type, saved drafts.
(function () {
  const $ = (s) => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRAFT = 'chameleon-repair-draft';
  const ICON = {
    button: '<circle cx="12" cy="5.5" r="2.5"/><circle cx="12" cy="18.5" r="2.5"/><circle cx="5.5" cy="12" r="2.5"/><circle cx="18.5" cy="12" r="2.5"/>',
    trigger: '<path d="M6 20V9a6 6 0 0 1 12 0v11"/><path d="M6 13h12"/>',
    joystick: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    broken: '<path d="M4 4l7 7-3 3 5 6"/><path d="M14 4l6 6-4 1 3 5"/>',
    touchpad: '<rect x="4" y="6" width="16" height="12" rx="3"/><path d="M9 14l2-2 2 2 2-2"/>',
    other: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>'
  };
  const REASONS = [
    { id: 'button', label: 'Button not working' },
    { id: 'trigger', label: 'Trigger not working' },
    { id: 'joystick', label: 'Joystick not working' },
    { id: 'broken', label: 'Broken parts' },
    { id: 'touchpad', label: 'Touchpad malfunction' },
    { id: 'other', label: 'Other' }
  ];

  const form = $('#repairForm');
  const serial = $('#serial'), name = $('#name'), email = $('#email'), other = $('#other');
  const startedAt = Date.now();
  const refStart = () => `REPAIR TICKET · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`;

  $('#reasons').innerHTML = REASONS.map((r) => `
    <div class="reason">
      <input type="radio" name="reason" id="r-${r.id}" value="${r.label}">
      <label for="r-${r.id}"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[r.id]}</svg></i>${r.label}</label>
    </div>`).join('');

  $('#tRef').textContent = refStart();

  // ---------- Rules (the server checks the same ones) ----------
  const reasonValue = () => (form.querySelector('input[name="reason"]:checked') || {}).value || '';
  function serialError(v) {
    if (!v) return 'Please enter the serial number from your order.';
    if (!v.startsWith('CS')) return 'The serial number starts with CS.';
    if (v.length !== 10) return `The serial number is 10 characters (you have ${v.length}).`;
    if (!/^CS[A-Z0-9]{8}$/.test(v)) return 'Only letters and numbers, please.';
    return '';
  }
  const nameOk = (v) => v.trim().length >= 2 && /\S+\s+\S+/.test(v.trim());
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  function reasonError() {
    const r = reasonValue();
    if (!r) return 'Please choose a reason.';
    if (r === 'Other' && other.value.trim().length < 3) return 'Please describe the problem in the box.';
    return '';
  }

  function mark(id, bad, msg) {
    const f = $(id);
    f.classList.toggle('bad', !!bad);
    if (msg !== undefined) f.querySelector('.err').textContent = msg;
  }

  // ---------- Live ticket ----------
  function paint() {
    const s = serial.value;
    const tSerial = $('#tSerial');
    tSerial.textContent = (s || 'CS').padEnd(10, '_');
    tSerial.classList.toggle('empty', !s || s === 'CS');
    const tName = $('#tName');
    tName.textContent = name.value.trim() || 'Your name';
    tName.classList.toggle('empty', !name.value.trim());
    const r = reasonValue();
    const tReason = $('#tReason');
    tReason.textContent = r === 'Other' ? (other.value.trim() ? `Other: ${other.value.trim().slice(0, 90)}${other.value.trim().length > 90 ? '…' : ''}` : 'Other') : r || 'Not chosen yet';
    tReason.classList.toggle('empty', !r);

    const count = $('#serialCount');
    count.textContent = `${s.length}/10`;
    count.classList.toggle('ok', !serialError(s));
    $('#otherCount').textContent = other.value.length;

    const done = { serial: !serialError(s), name: nameOk(name.value), email: emailOk(email.value), reason: !reasonError() };
    document.querySelectorAll('.progress i').forEach((i) => i.classList.toggle('done', done[i.dataset.step]));
    const ready = Object.values(done).every(Boolean);
    const st = $('#tStatus');
    st.textContent = ready ? 'Ready to send' : 'Draft';
    st.classList.toggle('ready', ready);
    $('#f-serial').classList.toggle('good', done.serial);
  }

  // ---------- Inputs ----------
  serial.addEventListener('input', () => {
    const pos = serial.selectionStart;
    serial.value = serial.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    try { serial.setSelectionRange(pos, pos); } catch (e) { /* not supported on this input */ }
    if ($('#f-serial').classList.contains('bad')) mark('#f-serial', serialError(serial.value), serialError(serial.value));
    changed();
  });
  serial.addEventListener('focus', () => { if (!serial.value) serial.value = 'CS'; paint(); });
  serial.addEventListener('blur', () => {
    if (serial.value === 'CS') serial.value = '';
    if (serial.value) mark('#f-serial', serialError(serial.value), serialError(serial.value));
    paint();
  });
  name.addEventListener('input', () => { if (nameOk(name.value)) mark('#f-name', false); changed(); });
  name.addEventListener('blur', () => { if (name.value) mark('#f-name', !nameOk(name.value), 'Please enter your first and last name.'); });
  email.addEventListener('input', () => { if (emailOk(email.value)) mark('#f-email', false); changed(); });
  email.addEventListener('blur', () => { if (email.value) mark('#f-email', !emailOk(email.value)); });
  other.addEventListener('input', () => { if (!reasonError()) mark('#f-reason', false); changed(); });
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'reason') return;
    const isOther = reasonValue() === 'Other';
    $('#otherBox').classList.toggle('show', isOther);
    other.required = isOther;
    if (isOther) setTimeout(() => other.focus(), reduce ? 0 : 250);
    if (!reasonError()) mark('#f-reason', false);
    changed();
  });

  // ---------- Draft saved on this device ----------
  function changed() {
    paint();
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ serial: serial.value, name: name.value, email: email.value, reason: reasonValue(), other: other.value }));
    } catch (e) { /* storage off: fine */ }
  }
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    if (d) {
      serial.value = d.serial || ''; name.value = d.name || ''; email.value = d.email || ''; other.value = d.other || '';
      const r = form.querySelector(`input[name="reason"][value="${CSS.escape(d.reason || '')}"]`);
      if (r) { r.checked = true; $('#otherBox').classList.toggle('show', d.reason === 'Other'); }
      if (d.serial || d.name) window.toast('Picked up where you left off');
    }
  } catch (e) { /* no draft */ }
  // A serial in the link (?sn=CS...) fills itself in.
  const fromLink = new URLSearchParams(location.search).get('sn');
  if (fromLink) serial.value = fromLink.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  paint();

  // ---------- Submit ----------
  const alertBox = $('#formAlert');
  function showAlert(text) { alertBox.textContent = text; alertBox.classList.toggle('show', !!text); }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAlert('');
    const se = serialError(serial.value);
    const checks = [
      ['#f-serial', se, se, serial],
      ['#f-name', !nameOk(name.value), 'Please enter your first and last name.', name],
      ['#f-email', !emailOk(email.value), undefined, email],
      ['#f-reason', reasonError(), reasonError(), form.querySelector('input[name="reason"]') ]
    ];
    let first = null;
    for (const [id, bad, msg, el] of checks) { mark(id, bad, msg); if (bad && !first) first = el; }
    if (first) {
      if (first === form.querySelector('input[name="reason"]') && reasonValue() === 'Other') first = other;
      first.focus();
      return;
    }

    const btn = $('#submitBtn');
    btn.disabled = true;
    btn.classList.add('sending');
    $('#submitText').textContent = 'Sending...';
    try {
      const res = await fetch('/api/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial: serial.value, name: name.value.trim(), email: email.value.trim(),
          reason: reasonValue(), other: reasonValue() === 'Other' ? other.value.trim() : '',
          website: $('#website').value, elapsed: Date.now() - startedAt
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'We could not send your ticket. Please try again in a moment.');
      finish(data);
    } catch (err) {
      showAlert(err.message || 'Something went wrong. Please try again.');
      alertBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    } finally {
      btn.disabled = false;
      btn.classList.remove('sending');
      $('#submitText').textContent = 'Submit repair ticket';
    }
  });

  function finish(data) {
    try { localStorage.removeItem(DRAFT); } catch (e) { /* fine */ }
    form.style.display = 'none';
    $('#doneName').textContent = name.value.trim().split(/\s+/)[0];
    $('#doneEmail').textContent = email.value.trim();
    $('#doneRef').textContent = data.ref;
    $('#tRef').textContent = data.ref;
    $('#tStatus').textContent = 'Sent';
    $('#tStatus').classList.add('ready');
    $('#doneCopy').hidden = !data.confirmationSent;
    $('#done').classList.add('show');
    $('#done').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (!reduce) confetti();
  }

  $('#copyRef').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#doneRef').textContent); window.toast('Ticket number copied'); }
    catch (e) { window.toast($('#doneRef').textContent); }
  });
  $('#printBtn').addEventListener('click', () => window.print());
  $('#againBtn').addEventListener('click', () => {
    form.reset();
    serial.value = '';
    $('#otherBox').classList.remove('show');
    $('#tRef').textContent = refStart();
    $('#done').classList.remove('show');
    form.style.display = '';
    paint();
    serial.focus();
  });

  // ---------- A small burst of colour ----------
  function confetti() {
    const c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const colours = (window.CHAMELEON.colours || []).map((x) => x.hex).concat(['#FF6B5A', '#F5A524']);
    const bits = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
      col: colours[Math.floor(Math.random() * colours.length)]
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const b of bits) {
        b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.a += b.va;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = b.col;
        ctx.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2); ctx.restore();
      }
      if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }
})();
