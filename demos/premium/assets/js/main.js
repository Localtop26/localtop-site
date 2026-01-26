/* LocalTop – Demo PLUS su misura (WOW)
   - Mobile drawer menu (hamburger)
   - Anchor highlighting
   - Reveal on scroll (IntersectionObserver)
   No tracking.
*/
(() => {
  const menuBtn = document.querySelector('[data-menu-open]');
  const backdrop = document.querySelector('[data-backdrop]');
  const drawer = document.querySelector('[data-drawer]');
  const closeBtn = document.querySelector('[data-menu-close]');
  const drawerLinks = Array.from(document.querySelectorAll('[data-drawer] a[href^="#"]'));
  const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  const openMenu = () => {
    backdrop.classList.add('open');
    drawer.classList.add('open');
    menuBtn?.setAttribute('aria-expanded', 'true');
    drawer?.querySelector('a')?.focus();
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  menuBtn?.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);
  backdrop?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  drawerLinks.forEach(a => a.addEventListener('click', () => closeMenu()));

  // Reveal on scroll
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) en.target.classList.add('in-view');
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  // Active anchor highlighting
  const setActive = (id) => {
    navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === `#${id}` ? 'true' : 'false'));
  };

  const sectionIO = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    setActive(visible.target.id);
  }, { rootMargin: '-40% 0px -55% 0px', threshold: [0.1, 0.2, 0.35] });

  sections.forEach(s => sectionIO.observe(s));
})();

// Show premium compare only if coming from hero
(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("from") !== "hero") return;
  const box = document.querySelector(".premium-compare");
  if (!box) return;
  box.classList.remove("hidden");
  box.setAttribute("aria-hidden","false");
})();
