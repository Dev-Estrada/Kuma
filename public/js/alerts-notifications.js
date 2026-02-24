/**
 * Alertas emergentes (modal) y panel de notificaciones (botón + lista).
 * Depende de que existan #alert-modal-root, #btn-notifications, #notifications-dropdown, #notifications-badge.
 */
(function () {
  const API = '';
  const NOTIFICATIONS_SEEN_KEY = 'kuma-notifications-seen';
  let notificationsData = { items: [], rateOutdated: false, lowStockCount: 0, expiringCount: 0 };

  async function getJson(url) {
    const res = await fetch((API || '') + url);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }

  function showAlertModal(options) {
    const root = document.getElementById('alert-modal-root');
    if (!root) return;
    const { title = 'Aviso', message = '', type = 'warning', link = '', linkText = '', skipNotificationSeen = false } = options;
    root.innerHTML = `
      <div class="alert-modal-overlay" id="alert-modal-overlay">
        <div class="alert-modal">
          <div class="alert-modal__icon alert-modal__icon--${type}">${type === 'warning' ? '⚠' : type === 'error' ? '✕' : type === 'success' ? '✓' : 'ℹ'}</div>
          <h3 class="alert-modal__title">${title.replace(/</g, '&lt;')}</h3>
          <p class="alert-modal__message">${message.replace(/</g, '&lt;')}</p>
          ${link ? `<a href="${link}" class="btn btn--primary alert-modal__link">${(linkText || 'Ir').replace(/</g, '&lt;')}</a>` : ''}
          <button type="button" class="btn btn--ghost alert-modal__close" id="alert-modal-close">Entendido</button>
        </div>
      </div>
    `;
    root.style.display = 'block';
    document.body.classList.add('alert-modal-open');
    const overlay = document.getElementById('alert-modal-overlay');
    const closeBtn = document.getElementById('alert-modal-close');
    function close() {
      if (!skipNotificationSeen) try { sessionStorage.setItem(NOTIFICATIONS_SEEN_KEY, '1'); } catch (_) {}
      root.style.display = 'none';
      root.innerHTML = '';
      document.body.classList.remove('alert-modal-open');
    }
    if (overlay) overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  function updateNotificationsUI() {
    const badge = document.getElementById('notifications-badge');
    const dropdown = document.getElementById('notifications-dropdown');
    const listEl = document.getElementById('notifications-list');
    if (badge) {
      const n = notificationsData.items.length;
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.style.display = n > 0 ? 'flex' : 'none';
    }
    if (listEl) {
      if (notificationsData.items.length === 0) {
        listEl.innerHTML = '<p class="notifications-dropdown__empty">No hay notificaciones.</p>';
      } else {
        listEl.innerHTML = notificationsData.items
          .map(
            (item) => `
          <div class="notifications-dropdown__item notifications-dropdown__item--${item.type || 'info'}">
            <strong class="notifications-dropdown__title">${(item.title || '').replace(/</g, '&lt;')}</strong>
            <p class="notifications-dropdown__message">${(item.message || '').replace(/</g, '&lt;')}</p>
            ${item.link ? `<a href="${item.link}" class="notifications-dropdown__link">${(item.linkText || 'Ver').replace(/</g, '&lt;')}</a>` : ''}
          </div>
        `
          )
          .join('');
      }
    }
  }

  function toggleDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (!dropdown) return;
    const isOpen = dropdown.classList.contains('notifications-dropdown--open');
    dropdown.classList.toggle('notifications-dropdown--open', !isOpen);
  }

  function loadNotifications() {
    getJson('/api/notifications')
      .then((data) => {
        notificationsData = {
          items: data.items || [],
          rateOutdated: !!data.rateOutdated,
          lowStockCount: data.lowStockCount || 0,
          expiringCount: data.expiringCount || 0,
        };
        updateNotificationsUI();
        try {
          if (notificationsData.items.length > 0 && !sessionStorage.getItem(NOTIFICATIONS_SEEN_KEY)) {
            const first = notificationsData.items[0];
            showAlertModal({
            title: first.title,
            message: first.message,
            type: first.type || 'warning',
            link: first.link,
            linkText: first.linkText,
          });
          }
        } catch (_) {}
      })
      .catch(() => {
        notificationsData = { items: [], rateOutdated: false, lowStockCount: 0, expiringCount: 0 };
        updateNotificationsUI();
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('btn-notifications');
    const dropdown = document.getElementById('notifications-dropdown');
    if (btn && dropdown) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDropdown();
      });
      document.addEventListener('click', function () {
        dropdown.classList.remove('notifications-dropdown--open');
      });
      dropdown.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
    loadNotifications();
  });

  window.showAlert = showAlertModal;
  window.refreshNotifications = loadNotifications;
})();
