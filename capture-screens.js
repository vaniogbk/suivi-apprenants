/**
 * capture-screens.js — EducTrack v2
 * Capture les screenshots depuis l'app live Vercel :
 *   - 9 captures Desktop 1440×900
 *   - 8 captures Mobile  390×844
 * Usage : node capture-screens.js
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs   = require('fs');

const BASE_URL    = 'https://eductrack-eosin.vercel.app';
const TRAINER_URL = BASE_URL + '/trainer.html?token=b8875194653a590e54a94aba53044c40818341653a1e19d869b145af699f4db0';
const OUT         = path.join(__dirname, 'screens');

const DESKTOP_SCREENS = [
  { view: 'dashboard',   label: 'desktop-01-dashboard',    title: 'Dashboard'        },
  { view: 'attendance',  label: 'desktop-02-presence',     title: 'Présence'         },
  { view: 'students',    label: 'desktop-03-apprenants',   title: 'Apprenants'       },
  { view: 'formations',  label: 'desktop-04-formations',   title: 'Formations'       },
  { view: 'formateurs',  label: 'desktop-05-formateurs',   title: 'Formateurs'       },
  { view: 'statistics',  label: 'desktop-06-statistiques', title: 'Statistiques'     },
  { view: 'settings',    label: 'desktop-07-parametres',   title: 'Paramètres'       },
  { view: 'dashboard',   label: 'desktop-08-dashboard-dark', title: 'Dashboard Dark', dark: true },
  { url: TRAINER_URL,    label: 'desktop-09-trainer',      title: 'Espace Formateur' },
];

const MOBILE_SCREENS = [
  { view: 'dashboard',   label: 'mobile-01-dashboard',     title: 'Dashboard'        },
  { view: 'attendance',  label: 'mobile-02-presence',      title: 'Présence'         },
  { view: 'students',    label: 'mobile-03-apprenants',    title: 'Apprenants'       },
  { view: 'formations',  label: 'mobile-04-formations',    title: 'Formations'       },
  { view: 'formateurs',  label: 'mobile-05-formateurs',    title: 'Formateurs'       },
  { view: 'statistics',  label: 'mobile-06-statistiques',  title: 'Statistiques'     },
  { view: 'settings',    label: 'mobile-07-parametres',    title: 'Paramètres'       },
  { url: TRAINER_URL,    label: 'mobile-08-trainer',       title: 'Espace Formateur' },
];

const wait = ms => new Promise(r => setTimeout(r, ms));

async function getToken() {
  const https = require('https');
  return new Promise((resolve) => {
    const body = JSON.stringify({ email: 'demo@eductrack.app', password: 'EducTrack2026!' });
    const opts = {
      hostname: 'eductrack-eosin.vercel.app', path: '/api/login',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data).token || ''); } catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.write(body); req.end();
  });
}

async function navigateTo(page, view) {
  await page.evaluate((v) => {
    const btn = document.querySelector(`.nav-item[data-view="${v}"]`);
    if (btn) btn.click();
  }, view);
  await wait(600);
}

async function setDarkMode(page) {
  await page.evaluate(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('eductrack_theme', 'dark');
  });
  await wait(400);
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

  console.log('🚀 Lancement de Chrome...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  /* ─────────────────────────────────
     DESKTOP  1440 × 900
  ───────────────────────────────── */
  console.log('\n📐 Desktop 1440×900\n');
  const dPage = await browser.newPage();
  await dPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // Authentification via localStorage (compte démo)
  console.log('  🔑 Authentification...');
  await dPage.goto(BASE_URL + '/login.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await dPage.evaluate((token, school) => {
    localStorage.setItem('eductrack_token',  token);
    localStorage.setItem('eductrack_school', school);
  }, await getToken(), JSON.stringify({ id: 'demo', name: 'École Numérique du Bénin (DÉMO)' }));

  // Charge l'app principale
  console.log('  ⏳ Chargement de l\'app...');
  await dPage.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await dPage.waitForFunction(() => document.fonts.ready);
  await wait(1500); // Laisser l'API charger les données

  for (const s of DESKTOP_SCREENS) {
    process.stdout.write(`  📸 ${s.title}... `);

    if (s.url) {
      // Page séparée (trainer)
      await dPage.goto(s.url, { waitUntil: 'networkidle0', timeout: 15000 });
      await wait(800);
    } else {
      if (s.dark) await setDarkMode(dPage);
      await navigateTo(dPage, s.view);
    }

    await dPage.screenshot({
      path: path.join(OUT, s.label + '.png'),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    console.log('✅');

    // Retour à l'app principale si besoin
    if (s.url) {
      await dPage.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      await wait(1000);
    }
    // Reset dark mode
    if (s.dark) {
      await dPage.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await wait(300);
    }
  }

  await dPage.close();

  /* ─────────────────────────────────
     MOBILE  390 × 844
  ───────────────────────────────── */
  console.log('\n📱 Mobile 390×844\n');
  const mPage = await browser.newPage();
  await mPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // Authentification mobile
  await mPage.goto(BASE_URL + '/login.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await mPage.evaluate((token, school) => {
    localStorage.setItem('eductrack_token',  token);
    localStorage.setItem('eductrack_school', school);
  }, await getToken(), JSON.stringify({ id: 'demo', name: 'École Numérique du Bénin (DÉMO)' }));

  console.log('  ⏳ Chargement de l\'app...');
  await mPage.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await mPage.waitForFunction(() => document.fonts.ready);
  await wait(1500);

  for (const s of MOBILE_SCREENS) {
    process.stdout.write(`  📸 ${s.title}... `);

    if (s.url) {
      await mPage.goto(s.url, { waitUntil: 'networkidle0', timeout: 15000 });
      await wait(800);
    } else {
      await navigateTo(mPage, s.view);
    }

    await mPage.screenshot({
      path: path.join(OUT, s.label + '.png'),
      clip: { x: 0, y: 0, width: 390, height: 844 },
    });
    console.log('✅');

    if (s.url) {
      await mPage.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
      await wait(1000);
    }
  }

  await mPage.close();
  await browser.close();

  console.log('\n🎉 Terminé ! 17 captures dans ./screens/\n');
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log('  Desktop :');
  files.filter(f => f.startsWith('desktop')).forEach(f => {
    const size = (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0);
    console.log(`    📄 ${f}  (${size} KB)`);
  });
  console.log('  Mobile :');
  files.filter(f => f.startsWith('mobile')).forEach(f => {
    const size = (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0);
    console.log(`    📱 ${f}  (${size} KB)`);
  });
  console.log('\n👉 Maintenant : git add screens/ && git push → puis relance le plugin Figma');
})();
