/**
 * Branding: logo de empresa solo de fondo en las pantallas (efecto minimalista).
 * La barra siempre muestra el logo KUMA. La URL del logo se guarda en localStorage
 * y/o se obtiene del servidor (archivo en public/assets/branding/).
 */
(function () {
  const STORAGE_KEY = 'kuma_custom_logo_url';

  function getCustomLogo() {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch (_) {
      return null;
    }
  }

  function setCustomLogoUrl(url) {
    try {
      if (url) localStorage.setItem(STORAGE_KEY, url);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function ensureBgElement() {
    let el = document.getElementById('branding-bg');
    if (!el) {
      el = document.createElement('div');
      el.id = 'branding-bg';
      el.className = 'branding-bg';
      el.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(el, document.body.firstChild);
    }
    return el;
  }

  function removeBgElement() {
    const el = document.getElementById('branding-bg');
    if (el) el.remove();
  }

  function applyBackground(url) {
    if (!url) {
      removeBgElement();
      document.body.classList.remove('branding-bg-active');
      return;
    }
    const el = ensureBgElement();
    el.style.backgroundImage = 'url(' + url + ')';
    document.body.classList.add('branding-bg-active');
  }

  function apply() {
    const url = getCustomLogo();
    applyBackground(url);
  }

  function fetchBrandingFromServer() {
    var api = typeof window.API !== 'undefined' ? window.API : '';
    fetch(api + '/api/settings/branding-logo', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.url) {
          setCustomLogoUrl(data.url);
          apply();
        }
      })
      .catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    var url = getCustomLogo();
    if (url) {
      apply();
    } else {
      fetchBrandingFromServer();
    }
  });

  window.getCustomLogo = getCustomLogo;
  window.setCustomLogoUrl = setCustomLogoUrl;
  window.applyCustomBranding = apply;
  window.brandingStorageKey = STORAGE_KEY;
})();
