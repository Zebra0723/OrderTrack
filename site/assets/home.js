// The overview page: shifting hero, colour studio, model finder.
(function () {
  const C = window.CHAMELEON;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const groupText = (g) => (g === 'early' ? 'BDM-010 and BDM-020' : 'BDM-030, BDM-040 and BDM-050');

  // A visible accent for text and the brand mark, even for very dark or very pale shells.
  function accentFor(hex) {
    const l = window.Pad.lum(hex);
    return l < 0.12 || l > 0.82 ? '#FF6B5A' : hex;
  }

  // ---------- Hero: the controller changes colour, like a chameleon ----------
  const stage = $('#heroStage');
  const hero = window.Pad.create('hero-pad');
  stage.insertBefore(hero.el, stage.querySelector('.hero-name'));
  const order = ['Scarlet', 'Emerald Clear', 'Anime', 'Purple Clear', 'Lime Green Clear', 'Dragon', 'Clear', 'Black'];
  const cycle = order.map((n) => C.colours.find((c) => c.name === n)).filter(Boolean);
  let hi = 0;
  let paused = false;
  function showHero(c) {
    hero.set(c);
    const accent = accentFor(c.hex);
    $('.hero').style.setProperty('--glow', accent);
    stage.style.setProperty('--glow', c.hex);
    $('#heroName').textContent = c.name;
    window.setBrandColour(accent);
  }
  showHero(cycle[0]);
  if (!reduce) {
    setInterval(() => {
      if (paused || document.hidden) return;
      hi = (hi + 1) % cycle.length;
      showHero(cycle[hi]);
    }, 2600);
    // A gentle 3D tilt that follows the pointer.
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      hero.el.style.transform = `perspective(900px) rotateY(${x * 16}deg) rotateX(${-y * 12}deg) translateY(${y * -6}px)`;
    });
    stage.addEventListener('pointerleave', () => (hero.el.style.transform = ''));
  }
  stage.addEventListener('mouseenter', () => (paused = true));
  stage.addEventListener('mouseleave', () => (paused = false));
  // Tap the controller to skip to the next colour.
  hero.el.addEventListener('click', () => { hi = (hi + 1) % cycle.length; showHero(cycle[hi]); });
  hero.el.style.cursor = 'pointer';

  // ---------- Marquee of colour names ----------
  const items = C.colours.map((c) => `<span><i class="dot" style="background:${c.hex}"></i>${esc(c.name)}</span>`).join('');
  $('#marquee').innerHTML = items + items;

  // ---------- Counting stats ----------
  const counters = document.querySelectorAll('[data-count]');
  const countIo = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = Number(el.dataset.count);
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 1100);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      reduce ? (el.textContent = end) : requestAnimationFrame(tick);
      countIo.unobserve(el);
    });
  }, { threshold: 0.5 }) : null;
  counters.forEach((el) => { el.dataset.count = el.dataset.count || '0'; if (countIo) countIo.observe(el); else el.textContent = el.dataset.count; });
  const colourCount = document.querySelector('.stat [data-count="11"]');
  if (colourCount) colourCount.dataset.count = String(C.colours.length);
  const priceCount = document.querySelector('.stat [data-count="30"]');
  if (priceCount) priceCount.dataset.count = String(C.fromPrice);

  // ---------- Colour studio ----------
  const view = $('#studioView');
  const studio = window.Pad.create('studio-pad');
  // eXtremeRate's own photo of the shell fitted on a controller, with the drawing as a fallback.
  const photo = document.createElement('figure');
  photo.className = 'photo';
  photo.innerHTML = '<img alt="" decoding="async"><figcaption><a target="_blank" rel="noopener">Photo: eXtremeRate</a></figcaption>';
  const img = photo.querySelector('img');
  view.insertBefore(photo, view.firstChild);
  view.insertBefore(studio.el, view.firstChild);
  img.addEventListener('load', () => { photo.classList.add('loaded'); studio.el.hidden = true; photo.hidden = false; });
  img.addEventListener('error', () => { photo.hidden = true; studio.el.hidden = false; });
  const swatches = $('#swatches');
  swatches.innerHTML = C.colours.map((c, i) => `
    <button class="swatch" type="button" aria-pressed="false" data-i="${i}" data-group="${c.group}">
      <span class="sw ${c.name.toLowerCase().includes('clear') ? 'clear' : ''} ${c.photo ? 'has-photo' : ''}" style="background:${c.hex}">${c.photo ? `<img src="${c.photo}?width=160" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>
      <span><b>${esc(c.name)}</b><small>${c.group === 'early' ? 'BDM-010 and 020' : 'BDM-030 to 050'}</small></span>
    </button>`).join('');
  function pick(i) {
    const c = C.colours[i];
    studio.set(c);
    if (c.photo) {
      photo.hidden = false; studio.el.hidden = true;
      photo.classList.remove('loaded');
      img.alt = `${c.name} shell fitted on a PS5 controller`;
      img.src = `${c.photo}?width=900`;
      photo.querySelector('a').href = c.product || 'https://extremerate.com';
    } else {
      photo.hidden = true; studio.el.hidden = false;
    }
    view.style.setProperty('--glow', c.hex);
    $('#studioName').textContent = c.name;
    $('#studioBlurb').textContent = c.blurb;
    $('#studioChips').innerHTML =
      `<span class="chip">Fits ${groupText(c.group)}</span>` +
      `<span class="chip ${c.express ? 'fast' : 'off'}">Express</span>` +
      `<span class="chip ${c.standard ? 'ok' : 'off'}">Non express</span>`;
    swatches.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i)));
  }
  swatches.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    pick(Number(b.dataset.i));
    if (window.innerWidth < 860) view.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });
  pick(0);

  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    const g = tab.dataset.group;
    let first = -1;
    swatches.querySelectorAll('.swatch').forEach((b) => {
      const show = g === 'all' || b.dataset.group === g;
      b.hidden = !show;
      if (show && first < 0) first = Number(b.dataset.i);
    });
    const current = swatches.querySelector('.swatch[aria-pressed="true"]');
    if (!current || current.hidden) pick(first);
  }));

  // ---------- Model finder: the 2nd character of the serial gives the model ----------
  const input = $('#finderInput');
  const out = $('#finderOut');
  input.addEventListener('input', () => {
    const raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    input.value = raw;
    const digits = raw.slice(0, 10).split('').map((ch, i) => `<span class="${i === 1 ? 'on' : ''}">${esc(ch)}</span>`).join('');
    if (raw.length < 2) {
      out.className = 'finder-out';
      out.innerHTML = raw ? `Keep going...<div class="digits">${digits}</div>` : 'Start typing and the model appears here.';
      return;
    }
    const d = raw[1];
    const model = C.models.find((m) => m.id === `BDM-0${d}0`);
    if (!model) {
      out.className = 'finder-out';
      out.innerHTML = `That does not look like a DualSense serial. Check the grey text on the back and try again.<div class="digits">${digits}</div>`;
      return;
    }
    const fits = C.colours.filter((c) => c.group === model.group).length;
    out.className = 'finder-out found';
    out.innerHTML = `You have a<strong>${model.id}</strong>${esc(model.note)} ${fits} colours fit it.<div class="digits">${digits}</div>`;
  });

  // ---------- Wording ----------
  $('#expressText').textContent = `Back to you ${C.express}.`;
  $('#standardText').textContent = `Back to you ${C.standard}.`;
  $('#faqTime').textContent = `With express, ${C.express}. Non express takes ${C.standard}. You get updates from us as it moves along.`;
  root.classList.add('ready');
})();
