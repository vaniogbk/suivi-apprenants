/* PWA Install — partagé entre index.html et trainer.html */

(function () {
  window._pwaInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._pwaInstallPrompt = e;
    _updateInstallUI(true);
  });

  window.addEventListener('appinstalled', () => {
    window._pwaInstallPrompt = null;
    _updateInstallUI(false);
  });

  function _updateInstallUI(canInstall) {
    // Affiche le bouton natif ou les instructions manuelles
    const btnEl    = document.getElementById('pwa-install-btn');
    const infoEl   = document.getElementById('pwa-install-info');
    if (btnEl)  btnEl.style.display  = canInstall ? '' : 'none';
    if (infoEl) infoEl.style.display = canInstall ? 'none' : '';
  }

  /* Appelé par onclick du bouton */
  window.pwaInstall = function () {
    if (window._pwaInstallPrompt) {
      window._pwaInstallPrompt.prompt();
      window._pwaInstallPrompt.userChoice.then(() => {
        window._pwaInstallPrompt = null;
        _updateInstallUI(false);
      });
    }
  };

  /* Register SW (appelé une fois au chargement de chaque page) */
  window.pwaRegisterSW = function () {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () =>
        navigator.serviceWorker.register('/sw.js')
      );
    }
  };
})();
