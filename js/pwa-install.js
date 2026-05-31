/* PWA Install — partagé entre index.html et trainer.html */

(function () {
  window._pwaInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._pwaInstallPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    window._pwaInstallPrompt = null;
  });

  /* ── Appelé par onclick du bouton Installer ── */
  window.pwaInstall = function () {
    if (window._pwaInstallPrompt) {
      // Chrome / Edge / Samsung Internet → prompt natif 1 clic
      window._pwaInstallPrompt.prompt();
      window._pwaInstallPrompt.userChoice.then(() => {
        window._pwaInstallPrompt = null;
      });
    } else {
      // iOS Safari / Firefox → overlay animé guidé
      _showOverlay();
    }
  };

  /* ── Overlay animé ── */
  function _showOverlay() {
    // Toggle : second clic ferme
    const existing = document.getElementById('pwa-overlay');
    if (existing) { existing.remove(); return; }

    const isIOS     = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isFirefox = /Firefox/i.test(navigator.userAgent);
    const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent);

    // Détermine le contenu et la direction de la flèche
    let steps, arrowDown;

    if (isIOS) {
      arrowDown = true;
      steps = [
        `Appuyez sur <strong>⬆ Partager</strong> en bas de Safari`,
        `Faites défiler et choisissez <strong>« Sur l'écran d'accueil »</strong>`,
        `Appuyez sur <strong>Ajouter</strong> en haut à droite`,
      ];
    } else if (isFirefox && isAndroid) {
      arrowDown = false;
      steps = [
        `Appuyez sur le menu <strong>⋮</strong> en haut à droite`,
        `Choisissez <strong>« Installer »</strong>`,
      ];
    } else if (isFirefox) {
      arrowDown = false;
      steps = [
        `Cliquez sur l'icône <strong>⊕</strong> dans la barre d'adresse`,
        `Ou menu <strong>☰</strong> → <strong>« Installer EducTrack »</strong>`,
      ];
    } else {
      // Fallback générique
      arrowDown = false;
      steps = [
        `Ouvrez le menu de votre navigateur`,
        `Choisissez <strong>« Ajouter à l'écran d'accueil »</strong>`,
      ];
    }

    _injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'pwa-overlay';
    overlay.className = arrowDown ? 'pwa-ov-bottom' : 'pwa-ov-top';

    const arrowHTML = `<div class="pwa-arrow ${arrowDown ? 'pwa-arr-down' : 'pwa-arr-up'}">
      ${ arrowDown
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`
      }
    </div>`;

    const cardHTML = `<div class="pwa-card">
      <img src="/icons/icon-192.png" class="pwa-card-icon" alt="EducTrack">
      <p class="pwa-card-title">Installer EducTrack</p>
      <p class="pwa-card-sub">Suivez ces étapes dans votre navigateur</p>
      <ol class="pwa-steps">
        ${steps.map(s => `<li>${s}</li>`).join('')}
      </ol>
      <button class="pwa-card-btn" onclick="document.getElementById('pwa-overlay').remove()">
        Compris !
      </button>
    </div>`;

    overlay.innerHTML = arrowDown ? cardHTML + arrowHTML : arrowHTML + cardHTML;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function _injectStyles() {
    if (document.getElementById('pwa-overlay-css')) return;
    const s = document.createElement('style');
    s.id = 'pwa-overlay-css';
    s.textContent = `
      #pwa-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(15,10,40,.75);
        display: flex; flex-direction: column; align-items: center;
        backdrop-filter: blur(3px);
      }
      #pwa-overlay.pwa-ov-bottom {
        justify-content: flex-end;
        padding: 0 20px 68px;
      }
      #pwa-overlay.pwa-ov-top {
        justify-content: flex-start;
        padding: 64px 20px 0;
      }
      .pwa-card {
        background: #fff; border-radius: 22px; padding: 26px 24px 20px;
        max-width: 340px; width: 100%;
        box-shadow: 0 24px 64px rgba(0,0,0,.35);
        text-align: center;
      }
      .pwa-card-icon {
        width: 60px; height: 60px; border-radius: 14px;
        margin-bottom: 12px; display: block; margin-inline: auto;
      }
      .pwa-card-title {
        font-weight: 700; font-size: 1.1rem; color: #1e1b4b; margin: 0 0 4px;
      }
      .pwa-card-sub {
        font-size: .82rem; color: #6b7280; margin: 0 0 16px;
      }
      .pwa-steps {
        text-align: left; padding-left: 22px; margin: 0;
        color: #374151; font-size: .92rem; line-height: 1.85;
      }
      .pwa-steps li { margin-bottom: 2px; }
      .pwa-card-btn {
        margin-top: 18px; padding: 13px; width: 100%;
        background: #6366F1; color: #fff; border: none;
        border-radius: 12px; font-size: 1rem; font-weight: 600;
        cursor: pointer; font-family: inherit;
        transition: background .15s;
      }
      .pwa-card-btn:hover { background: #4F46E5; }
      .pwa-arrow {
        width: 48px; height: 48px; color: #818CF8;
        flex-shrink: 0;
      }
      .pwa-arr-down { animation: pwa-bounce-down .85s ease-in-out infinite; }
      .pwa-arr-up   { animation: pwa-bounce-up   .85s ease-in-out infinite; }
      @keyframes pwa-bounce-down {
        0%,100% { transform: translateY(0);    opacity: 1;  }
        50%      { transform: translateY(10px); opacity: .6; }
      }
      @keyframes pwa-bounce-up {
        0%,100% { transform: translateY(0);     opacity: 1;  }
        50%      { transform: translateY(-10px); opacity: .6; }
      }
    `;
    document.head.appendChild(s);
  }

  /* Register SW */
  window.pwaRegisterSW = function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () =>
        navigator.serviceWorker.register('/sw.js')
      );
    }
  };
})();
