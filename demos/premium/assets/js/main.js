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

/* GA4 (GDPR-compliant) + Cookie banner (localtop.it only) */
(() => {
  'use strict';

  const GA_MEASUREMENT_ID = 'G-WSYXHEDL7J';
  const ALLOWED_HOSTS = { 'localtop.it': true, 'www.localtop.it': true };

  function isHostAllowed() {
    return !!ALLOWED_HOSTS[window.location.hostname];
  }

  function ensureGtagStub() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
  }

  function showCookieBanner() {
    const el = document.getElementById('cookieBanner');
    if (!el) return;
    el.style.display = 'block';
  }

  function hideCookieBanner() {
    const el = document.getElementById('cookieBanner');
    if (!el) return;
    el.style.display = 'none';
  }

  window.loadGA = function loadGA() {
    if (!isHostAllowed()) return;
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    s.onload = function () {
      ensureGtagStub();
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
    };
    document.head.appendChild(s);
  };

  window.track = function track(eventName, params = {}) {
    if (!isHostAllowed()) return;
    if (localStorage.getItem('cookieConsent') !== 'accepted') return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  };

  window.acceptCookies = function acceptCookies() {
    localStorage.setItem('cookieConsent', 'accepted');
    if (isHostAllowed()) {
      ensureGtagStub();
      window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied' });
      window.loadGA();
    }
    hideCookieBanner();
  };

  window.rejectCookies = function rejectCookies() {
    localStorage.setItem('cookieConsent', 'rejected');
    hideCookieBanner();
  };

  function initCookieBannerAndGA() {
    if (!isHostAllowed()) return;

    ensureGtagStub();

    const consent = localStorage.getItem('cookieConsent');
    if (consent === 'accepted') {
      window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied' });
      window.loadGA();
    } else if (consent === 'rejected') {
      // Do nothing: no banner, no GA
    } else {
      showCookieBanner();
    }

    const banner = document.getElementById('cookieBanner');
    if (banner) {
      banner.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cookie-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-cookie-action');
        if (action === 'accept') window.acceptCookies();
        if (action === 'reject') window.rejectCookies();
      });
    }

    // view_demo (only on demo pages)
    const plan = document.body && document.body.getAttribute('data-demo-plan');
    if (plan) {
      const sp = new URLSearchParams(window.location.search);
      const from = sp.get('from') || 'direct';
      window.track('view_demo', { plan, from });
    }

    // purchase_success (only on thank-you page)
    const isSuccess = document.body && document.body.getAttribute('data-purchase-success') === 'true';
    if (isSuccess) {
      const sp2 = new URLSearchParams(window.location.search);
      const plan2 = sp2.get('plan') || sp2.get('piano') || 'unknown';
      window.track('purchase_success', { plan: plan2, source: 'stripe' });
    }

    // CTA buy click + start_checkout
    document.querySelectorAll('[data-track="buy"][data-plan][data-location]').forEach((el) => {
      el.addEventListener('click', () => {
        const p = el.getAttribute('data-plan');
        const loc = el.getAttribute('data-location');
        window.track('cta_buy_click', { plan: p, location: loc });
        window.track('start_checkout', { plan: p, provider: 'stripe', type: 'payment_link' });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initCookieBannerAndGA);
})();
