/* LocalTop demo - minimal JS (no tracking) */
(() => {

  function clearPremiumEntryFlag() {
    try { localStorage.removeItem('lt_premium_entry'); } catch (e) {}
  }

  // Ensure entering Premium from other demos never triggers the Premium compare box
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;

    var u;
    try { u = new URL(a.getAttribute('href'), window.location.origin); } catch (e) { return; }
    if (u.pathname !== '/premium-demo') return;

    clearPremiumEntryFlag();
  }, true);

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
