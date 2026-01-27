(function () {
  'use strict';

  function normalizePath(p) {
    // Remove query/hash, trim trailing slash, return last segment (or 'index' for root)
    if (!p) return 'index';
    p = p.split('#')[0].split('?')[0];
    // If it's a full URL, keep only pathname
    try { p = new URL(p, location.origin).pathname; } catch (e) {}
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    var seg = p.split('/').pop();
    return (seg && seg.length) ? seg.toLowerCase() : 'index';
  }

  function setActiveLinks() {
    var cur = normalizePath(location.pathname);
    var links = document.querySelectorAll('a[data-nav]');
    links.forEach(function (a) {
      a.classList.remove('active');
      var href = (a.getAttribute('href') || '');
      if (!href) return;
      var h = normalizePath(href);
      if (h === cur) a.classList.add('active');
    });
  }

  function initMobileMenu() {
    var btn = document.getElementById('menuBtn');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    function openMenu() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu() {
      if (menu.hidden) openMenu();
      else closeMenu();
    }

    // Known initial state
    if (btn.getAttribute('aria-expanded') !== 'true') btn.setAttribute('aria-expanded', 'false');
    menu.hidden = true;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggleMenu();
    });

    menu.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link) closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (menu.hidden) return;
      var within = e.target.closest('#mobileMenu') || e.target.closest('#menuBtn');
      if (!within) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // GA4 (GDPR-compliant) + Cookie banner (localtop.it only)
  var GA_MEASUREMENT_ID = 'G-WSYXHEDL7J';
  var ALLOWED_HOSTS = { 'localtop.it': true, 'www.localtop.it': true };

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
    var el = document.getElementById('cookieBanner');
    if (!el) return;
    el.style.display = 'block';
  }

  function hideCookieBanner() {
    var el = document.getElementById('cookieBanner');
    if (!el) return;
    el.style.display = 'none';
  }

  window.loadGA = function loadGA() {
    if (!isHostAllowed()) return;
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    s.onload = function () {
      ensureGtagStub();
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
    };
    document.head.appendChild(s);
  };

  window.track = function track(eventName, params) {
    if (!isHostAllowed()) return;
    if (localStorage.getItem('cookieConsent') !== 'accepted') return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params || {});
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

  
  function initPremiumEntryFlag() {
    // Mark direct entry to Premium demo without polluting URL
    var KEY = 'lt_premium_entry';
    var links = Array.from(document.querySelectorAll('a[href]'));

    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;

      var u;
      try { u = new URL(href, window.location.origin); }
      catch (e) { return; }

      if (u.pathname !== '/premium-demo') return;

      a.addEventListener('click', function () {
        try {
          localStorage.setItem(KEY, JSON.stringify({ v: 1, ts: Date.now() }));
        } catch (e) {}
      });
    });
  }

function initCookieBannerAndGA() {
    if (!isHostAllowed()) return;

    ensureGtagStub();

    var consent = localStorage.getItem('cookieConsent');
    if (consent === 'accepted') {
      window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied' });
      window.loadGA();
    } else if (consent === 'rejected') {
      // Do nothing: no banner, no GA
    } else {
      showCookieBanner();
    }

    var banner = document.getElementById('cookieBanner');
    if (banner) {
      banner.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cookie-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-cookie-action');
        if (action === 'accept') window.acceptCookies();
        if (action === 'reject') window.rejectCookies();
      });
    }

    // view_demo (only on demo pages)
    var plan = document.body && document.body.getAttribute('data-demo-plan');
    if (plan) {
      var sp = new URLSearchParams(window.location.search);
      var from = sp.get('from') || 'direct';
      window.track('view_demo', { plan: plan, from: from });
    }

    // purchase_success (only on thank-you page)
    var isSuccess = document.body && document.body.getAttribute('data-purchase-success') === 'true';
    if (isSuccess) {
      var sp2 = new URLSearchParams(window.location.search);
      var plan2 = sp2.get('plan') || sp2.get('piano') || 'unknown';
      window.track('purchase_success', { plan: plan2, source: 'stripe' });
    }

    // CTA buy click + start_checkout
    var buyLinks = document.querySelectorAll('[data-track="buy"][data-plan][data-location]');
    buyLinks.forEach(function (el) {
      el.addEventListener('click', function () {
        var p = el.getAttribute('data-plan');
        var loc = el.getAttribute('data-location');
        window.track('cta_buy_click', { plan: p, location: loc });
        window.track('start_checkout', { plan: p, provider: 'stripe', type: 'payment_link' });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initCookieBannerAndGA);

  setActiveLinks();
  initMobileMenu();
  initPremiumEntryFlag();
})();