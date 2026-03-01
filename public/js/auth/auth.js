/**
 * Auth: intercepta fetch para añadir token, redirige a login si no hay sesión.
 * Incluir en todas las páginas excepto login.html (antes de otros scripts).
 */
(function () {
  const TOKEN_KEY = 'kuma_token';
  const USER_KEY = 'kuma_user';

  if (window.location.search.indexOf('clearSession=1') !== -1) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (_) {}
    var cleanUrl = window.location.pathname + (window.location.hash || '');
    if (window.history.replaceState) window.history.replaceState(null, '', cleanUrl);
  }

  const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname === '/login.html' || window.location.pathname.endsWith('/login');

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function redirectToLogin() {
    const here = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace('/login.html?redirect=' + here);
  }

  if (!isLoginPage) {
    if (!getToken()) {
      redirectToLogin();
      return;
    }
  }

  const originalFetch = window.fetch;
  function isOurApiRequest(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    var path = urlStr;
    try {
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        var u = new URL(urlStr);
        if (u.origin !== window.location.origin) return false;
        path = u.pathname + u.search;
      }
    } catch (_) {}
    return path.indexOf('/api/') !== -1 && path.indexOf('/api/auth/login') === -1;
  }
  window.fetch = function (url, opts) {
    var urlStr = typeof url === 'string' ? url : (url && url.url);
    var ourApi = isOurApiRequest(urlStr);
    if (ourApi && getToken()) {
      opts = opts || {};
      var h = opts.headers;
      if (!h) h = opts.headers = {};
      var authSet = false;
      if (h instanceof Headers) authSet = h.has('Authorization');
      else if (h && typeof h === 'object') authSet = !!h.Authorization;
      if (!authSet) {
        var newHeaders = {};
        if (h instanceof Headers) { h.forEach(function (v, k) { newHeaders[k] = v; }); }
        else if (h && typeof h === 'object') { Object.keys(h).forEach(function (k) { newHeaders[k] = h[k]; }); }
        newHeaders.Authorization = 'Bearer ' + getToken();
        opts = { ...opts, headers: newHeaders };
      }
    }
    var args = opts !== undefined ? [url, opts] : [url];
    return originalFetch.apply(this, args).then(function (res) {
      if (res.status === 401 && ourApi) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        redirectToLogin();
      }
      return res;
    });
  };

  window.getAuthToken = getToken;
  window.getAuthUser = function () {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  };
  window.logout = function () {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.replace('/login.html');
  };
})();
