// A DualSense-style controller drawn in SVG, recoloured live.
// Clear colours are see-through, Dragon gets scales, Anime gets a halftone with sparkles.
(function () {
  const BODY = 'M70 40C95 28 130 30 160 30S225 28 250 40C280 52 300 100 306 150C311 185 290 200 268 192C248 185 236 160 220 150C200 140 120 140 100 150C84 160 72 185 52 192C30 200 9 185 14 150C20 100 40 52 70 40Z';
  let seq = 0;

  function lum(hex) {
    const h = String(hex).replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '9');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** Builds the SVG once; returns { el, set(colour) } to recolour it with a smooth fade. */
  function create(cls) {
    const id = 'pad' + (++seq);
    const wrap = document.createElement('div');
    wrap.className = 'pad ' + (cls || '');
    wrap.innerHTML = `<svg viewBox="0 0 320 210" role="img" aria-label="A PS5 controller in the chosen colour">
      <defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
        <clipPath id="${id}c"><path d="${BODY}"/></clipPath>
        <pattern id="${id}d" width="18" height="13" patternUnits="userSpaceOnUse"><path d="M0 13Q9 0 18 13" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.6"/></pattern>
        <pattern id="${id}a" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.7" fill="#fff" fill-opacity=".45"/></pattern>
      </defs>
      <ellipse class="shadow" cx="160" cy="202" rx="122" ry="8" fill="#1A1D29" opacity=".1"/>
      <path class="body" d="${BODY}"/>
      <g clip-path="url(#${id}c)">
        <g class="layer insides">
          <rect x="58" y="58" width="204" height="76" rx="10" fill="#2B7A57" opacity=".3"/>
          <path d="M70 70h50v14h30M250 72h-40v20h-30M90 120h40l10-12h40M230 118h-30" fill="none" stroke="#1A1D29" stroke-opacity=".24" stroke-width="2"/>
          <circle cx="160" cy="96" r="9" fill="#1A1D29" opacity=".2"/>
          <circle cx="78" cy="126" r="5" fill="#C9A227" opacity=".5"/><circle cx="242" cy="126" r="5" fill="#C9A227" opacity=".5"/>
        </g>
        <rect class="layer scales" width="320" height="210" fill="url(#${id}d)"/>
        <g class="layer dots"><rect width="320" height="210" fill="url(#${id}a)"/><path d="M90 60l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM235 150l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff" opacity=".85"/></g>
        <rect width="320" height="210" fill="url(#${id}s)"/>
      </g>
      <path d="${BODY}" fill="none" stroke="rgba(26,29,41,.35)" stroke-width="2"/>
      <rect class="pad-touch" x="120" y="44" width="80" height="44" rx="9" stroke-width="1.5"/>
      <path class="btn" d="M72 80h12v-12h12v12h12v12h-12v12h-12v-12h-12z"/>
      <g class="btn"><circle cx="242" cy="70" r="7.5"/><circle cx="242" cy="104" r="7.5"/><circle cx="225" cy="87" r="7.5"/><circle cx="259" cy="87" r="7.5"/></g>
      <g><circle class="btn" cx="122" cy="122" r="18"/><circle class="ring" cx="122" cy="122" r="11" fill="none" stroke-width="3"/>
        <circle class="btn" cx="198" cy="122" r="18"/><circle class="ring" cx="198" cy="122" r="11" fill="none" stroke-width="3"/></g>
      <rect class="btn" x="146" y="98" width="28" height="4" rx="2" opacity=".7"/>
    </svg>`;
    const q = (s) => wrap.querySelectorAll(s);
    function set(colour) {
      const name = String(colour.name || '').toLowerCase();
      const clear = name.includes('clear');
      const dark = lum(colour.hex) < 0.35;
      const btn = name.includes('black button') ? '#1F1F23' : dark ? 'rgba(255,255,255,.24)' : 'rgba(26,29,41,.26)';
      const ring = dark ? 'rgba(255,255,255,.14)' : 'rgba(26,29,41,.12)';
      const body = wrap.querySelector('.body');
      body.style.fill = colour.hex;
      body.style.fillOpacity = clear ? 0.55 : 1;
      q('.btn').forEach((e) => (e.style.fill = btn));
      q('.ring').forEach((e) => (e.style.stroke = ring));
      const touch = wrap.querySelector('.pad-touch');
      touch.style.fill = dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.42)';
      touch.style.stroke = ring;
      wrap.querySelector('.insides').style.opacity = clear ? 1 : 0;
      wrap.querySelector('.scales').style.opacity = name.includes('dragon') ? 1 : 0;
      wrap.querySelector('.dots').style.opacity = name.includes('anime') ? 1 : 0;
      wrap.style.setProperty('--glow', colour.hex);
    }
    return { el: wrap, set };
  }

  window.Pad = { create, lum };
})();
