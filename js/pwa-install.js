/* PWA Install — partagé entre index.html et trainer.html */

(function () {
  window._pwaInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._pwaInstallPrompt = e;
    // Passe en mode bouton natif
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
      btn.innerHTML = '<i class="ph ph-download-simple"></i> Installer';
      btn.onclick = pwaInstall;
    }
  });

  window.addEventListener('appinstalled', () => {
    window._pwaInstallPrompt = null;
  });

  /* Appelé par onclick du bouton */
  window.pwaInstall = function () {
    if (window._pwaInstallPrompt) {
      window._pwaInstallPrompt.prompt();
      window._pwaInstallPrompt.userChoice.then(() => {
        window._pwaInstallPrompt = null;
      });
    } else {
      // Pas de prompt natif (iOS, déjà installé, etc.) — affiche le modal d'instructions
      _showInstructions();
    }
  };

  function _showInstructions() {
    // Crée un modal léger avec les instructions selon la plateforme
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const existing = document.getElementById('pwa-modal');
    if (existing) { existing.style.display = 'flex'; return; }

    const modal = document.createElement('div');
    modal.id = 'pwa-modal';
    modal.style.cssText = [
      'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999',
      'display:flex;align-items:center;justify-content:center;padding:24px',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:#fff;border-radius:16px;padding:28px;max-width:380px;width:100%',
      'box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:inherit',
    ].join(';');

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <img src="/icons/icon-192.png" style="width:48px;height:48px;border-radius:12px" alt="EducTrack">
        <div>
          <div style="font-weight:700;font-size:1.1rem;color:#1e1b4b">Installer EducTrack</div>
          <div style="font-size:.85rem;color:#6b7280">Sur votre écran d'accueil</div>
        </div>
      </div>
      ${isIOS ? `
        <ol style="padding-left:20px;color:#374151;font-size:.9rem;line-height:2">
          <li>Appuyez sur le bouton <strong>Partager</strong> <span style="font-size:1.1em">⬆</span> en bas de Safari</li>
          <li>Faites défiler et choisissez <strong>« Sur l'écran d'accueil »</strong></li>
          <li>Appuyez sur <strong>Ajouter</strong></li>
        </ol>
      ` : `
        <ol style="padding-left:20px;color:#374151;font-size:.9rem;line-height:2">
          <li>Appuyez sur le menu <strong>⋮</strong> en haut à droite du navigateur</li>
          <li>Choisissez <strong>« Ajouter à l'écran d'accueil »</strong></li>
          <li>Confirmez en appuyant sur <strong>Ajouter</strong></li>
        </ol>
      `}
      <button onclick="document.getElementById('pwa-modal').style.display='none'"
        style="margin-top:20px;width:100%;padding:12px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer">
        Compris
      </button>
    `;

    modal.appendChild(card);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    document.body.appendChild(modal);
  }

  /* Register SW (appelé une fois au chargement de chaque page) */
  window.pwaRegisterSW = function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () =>
        navigator.serviceWorker.register('/sw.js')
      );
    }
  };
})();
