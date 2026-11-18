// Shared by every page: header, menu, reveal on scroll, footer details.
(function () {
  const C = window.CHAMELEON || {};
  const head = document.querySelector('.site-head');
  const onScroll = () => head && head.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menu = document.querySelector('.menu-btn');
  if (menu) {
    menu.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      menu.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      menu.setAttribute('aria-expanded', 'false');
    }));
  }

  // Fade sections in as they arrive; also starts the timeline bars.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    if (io) io.observe(el); else el.classList.add('in');
  });

  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  document.querySelectorAll('[data-mail]').forEach((a) => {
    if (!C.email) return;
    a.href = 'mailto:' + C.email;
    if (!a.textContent.trim()) a.textContent = C.email;
  });

  // A shared little toast.
  window.toast = function (text) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(window.toast._t);
    window.toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  };

  // The brand tail takes on whatever colour the page is showing.
  window.setBrandColour = function (hex) {
    document.querySelectorAll('#brandTail').forEach((p) => (p.style.stroke = hex));
  };
})();
