/* PWA Install — partagé entre index.html et trainer.html */

(function () {
  window._pwaInstallPrompt = null;

  const isIOS      = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isFirefox  = /Firefox/i.test(navigator.userAgent);
  const isChromium = !isFirefox && (
    /Chrome/i.test(navigator.userAgent) ||
    /Edg/i.test(navigator.userAgent)    ||
    /SamsungBrowser/i.test(navigator.userAgent)
  );

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
  }

  /* ── Dès que Chrome est prêt → bannière automatique ── */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._pwaInstallPrompt = e;
    if (!isStandalone()) _showBanner();
  });

  window.addEventListener('appinstalled', () => {
    window._pwaInstallPrompt = null;
    _removeBanner();
  });

  /* ── Bannière flottante (apparaît automatiquement) ── */
  function _showBanner() {
    if (document.getElementById('pwa-banner')) return;
    _injectStyles();
    const b = document.createElement('div');
    b.id = 'pwa-banner';
    b.innerHTML = `
      <img src="/icons/icon-192.png" class="pwa-b-icon" alt="">
      <div class="pwa-b-text">
        <strong>EducTrack</strong>
        <span>Ajouter à l'écran d'accueil</span>
      </div>
      <button class="pwa-b-install" onclick="pwaInstall()">Installer</button>
      <button class="pwa-b-close" onclick="_removeBanner()" title="Fermer">✕</button>
    `;
    document.body.appendChild(b);
  }

  window._removeBanner = function () {
    const b = document.getElementById('pwa-banner');
    if (b) b.remove();
  };

  /* ── Bouton "Installer" dans les Paramètres ── */
  window.pwaInstall = function () {
    _removeBanner();

    /* Chromium avec prompt disponible → installation native directe */
    if (window._pwaInstallPrompt) {
      window._pwaInstallPrompt.prompt();
      window._pwaInstallPrompt.userChoice.then(() => {
        window._pwaInstallPrompt = null;
      });
      return;
    }

    /* Déjà installée */
    if (isStandalone()) {
      _toast('EducTrack est déjà installé ✓');
      return;
    }

    /* iOS → overlay flèche vers bouton Partager */
    if (isIOS) { _showOverlay('ios'); return; }

    /* Firefox → overlay flèche vers menu */
    if (isFirefox) { _showOverlay('firefox'); return; }

    /* Chromium sans prompt (cooldown Chrome ou déjà proposé) */
    _toast("Chrome prépare l'installation… Réessayez dans quelques secondes.");
  };

  /* ── Toast léger ── */
  function _toast(msg) {
    if (typeof ui !== 'undefined' && ui.toast) { ui.toast(msg, 'info'); return; }
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
      + 'background:#1e1b4b;color:#fff;padding:12px 20px;border-radius:10px;'
      + 'font-size:.9rem;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.3);'
      + 'white-space:nowrap;max-width:90vw;text-align:center';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  /* ── Overlay animé iOS / Firefox ── */
  function _showOverlay(type) {
    const existing = document.getElementById('pwa-overlay');
    if (existing) { existing.remove(); return; }
    _injectStyles();

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let steps, arrowDown;

    if (type === 'ios') {
      arrowDown = true;
      steps = [
        `Appuyez sur <strong>⬆ Partager</strong> en bas de Safari`,
        `Faites défiler et appuyez sur <strong>« Sur l'écran d'accueil »</strong>`,
        `Appuyez sur <strong>Ajouter</strong> en haut à droite`,
      ];
    } else {
      arrowDown = false;
      steps = isMobile
        ? [`Appuyez sur le menu <strong>⋮</strong> en haut à droite`,
           `Choisissez <strong>« Installer »</strong>`]
        : [`Cliquez sur l'icône <strong>⊕</strong> dans la barre d'adresse`,
           `Ou menu <strong>☰</strong> → <strong>« Installer EducTrack »</strong>`];
    }

    const overlay = document.createElement('div');
    overlay.id = 'pwa-overlay';
    overlay.className = arrowDown ? 'pwa-ov-bottom' : 'pwa-ov-top';
    overlay.innerHTML = arrowDown
      ? `<div class="pwa-card">
           <img src="/icons/icon-192.png" class="pwa-card-icon" alt="EducTrack">
           <p class="pwa-card-title">Installer EducTrack</p>
           <p class="pwa-card-sub">Suivez ces étapes dans Safari</p>
           <ol class="pwa-steps">${steps.map(s=>`<li>${s}</li>`).join('')}</ol>
           <button class="pwa-card-btn" onclick="document.getElementById('pwa-overlay').remove()">Compris !</button>
         </div>${_arrowHTML(true)}`
      : `${_arrowHTML(false)}
         <div class="pwa-card">
           <img src="/icons/icon-192.png" class="pwa-card-icon" alt="EducTrack">
           <p class="pwa-card-title">Installer EducTrack</p>
           <p class="pwa-card-sub">Suivez ces étapes dans votre navigateur</p>
           <ol class="pwa-steps">${steps.map(s=>`<li>${s}</li>`).join('')}</ol>
           <button class="pwa-card-btn" onclick="document.getElementById('pwa-overlay').remove()">Compris !</button>
         </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function _arrowHTML(down) {
    const cls = down ? 'pwa-arr-down' : 'pwa-arr-up';
    const svg = down
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
    return `<div class="pwa-arrow ${cls}">${svg}</div>`;
  }

  function _injectStyles() {
    if (document.getElementById('pwa-overlay-css')) return;
    const s = document.createElement('style');
    s.id = 'pwa-overlay-css';
    s.textContent = `
      /* ── Bannière auto ── */
      #pwa-banner {
        position:fixed;bottom:0;left:0;right:0;z-index:99998;
        background:#fff;border-top:1px solid #e5e7eb;
        display:flex;align-items:center;gap:12px;
        padding:12px 16px;
        box-shadow:0 -4px 24px rgba(0,0,0,.12);
        animation:pwa-slide-up .3s ease-out;
      }
      @keyframes pwa-slide-up {
        from { transform:translateY(100%); }
        to   { transform:translateY(0);    }
      }
      .pwa-b-icon  { width:44px;height:44px;border-radius:10px;flex-shrink:0; }
      .pwa-b-text  { flex:1;display:flex;flex-direction:column;gap:1px;min-width:0; }
      .pwa-b-text strong { font-size:.95rem;color:#1e1b4b;font-family:inherit; }
      .pwa-b-text span   { font-size:.78rem;color:#6b7280;font-family:inherit; }
      .pwa-b-install {
        background:#6366F1;color:#fff;border:none;border-radius:10px;
        padding:9px 18px;font-size:.9rem;font-weight:700;cursor:pointer;
        font-family:inherit;white-space:nowrap;flex-shrink:0;
      }
      .pwa-b-close {
        background:none;border:none;color:#9ca3af;font-size:1.1rem;
        cursor:pointer;padding:4px 6px;flex-shrink:0;line-height:1;
      }

      /* ── Overlay plein écran ── */
      #pwa-overlay {
        position:fixed;inset:0;z-index:99999;
        background:rgba(15,10,40,.75);
        display:flex;flex-direction:column;align-items:center;
        backdrop-filter:blur(3px);
      }
      #pwa-overlay.pwa-ov-bottom { justify-content:flex-end; padding:0 20px 68px; }
      #pwa-overlay.pwa-ov-top    { justify-content:flex-start; padding:64px 20px 0; }
      .pwa-card {
        background:#fff;border-radius:22px;padding:26px 24px 20px;
        max-width:340px;width:100%;
        box-shadow:0 24px 64px rgba(0,0,0,.35);text-align:center;
      }
      .pwa-card-icon { width:60px;height:60px;border-radius:14px;margin:0 auto 12px;display:block; }
      .pwa-card-title { font-weight:700;font-size:1.1rem;color:#1e1b4b;margin:0 0 4px; }
      .pwa-card-sub   { font-size:.82rem;color:#6b7280;margin:0 0 16px; }
      .pwa-steps { text-align:left;padding-left:22px;margin:0;color:#374151;font-size:.92rem;line-height:1.85; }
      .pwa-steps li { margin-bottom:2px; }
      .pwa-card-btn {
        margin-top:18px;padding:13px;width:100%;
        background:#6366F1;color:#fff;border:none;border-radius:12px;
        font-size:1rem;font-weight:600;cursor:pointer;font-family:inherit;
      }
      .pwa-arr-down { animation:pwa-bounce-down .85s ease-in-out infinite; }
      .pwa-arr-up   { animation:pwa-bounce-up   .85s ease-in-out infinite; }
      .pwa-arrow    { width:48px;height:48px;color:#818CF8;flex-shrink:0; }
      @keyframes pwa-bounce-down {
        0%,100% { transform:translateY(0);    opacity:1;  }
        50%      { transform:translateY(10px); opacity:.6; }
      }
      @keyframes pwa-bounce-up {
        0%,100% { transform:translateY(0);     opacity:1;  }
        50%      { transform:translateY(-10px); opacity:.6; }
      }
    `;
    document.head.appendChild(s);
  }

  /* Register SW */
  window.pwaRegisterSW = function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
    }
  };
})();
