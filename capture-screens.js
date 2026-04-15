/**
 * capture-screens.js — EducTrack
 * Génère les captures PNG pour Figma :
 *   - 6 captures Desktop 1440×900 (2x)
 *   - 5 captures Mobile  390×844  (2x)
 *   - 1 capture Desktop Dark mode
 * Usage : node capture-screens.js
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const FILE = 'file:///' + path.join(__dirname, 'maquette.html').replace(/\\/g, '/');
const OUT  = path.join(__dirname, 'screens');

const DESKTOP_SCREENS = [
  { id:'dashboard',  label:'desktop-01-dashboard',   title:'Dashboard'   },
  { id:'attendance', label:'desktop-02-presence',    title:'Présence'    },
  { id:'students',   label:'desktop-03-apprenants',  title:'Apprenants'  },
  { id:'statistics', label:'desktop-04-statistiques',title:'Statistiques'},
  { id:'settings',   label:'desktop-05-parametres',  title:'Paramètres'  },
];

const MOBILE_SCREENS = [
  { id:'dashboard',  label:'mobile-01-dashboard',    title:'Mobile Dashboard'   },
  { id:'attendance', label:'mobile-02-presence',     title:'Mobile Présence'    },
  { id:'students',   label:'mobile-03-apprenants',   title:'Mobile Apprenants'  },
  { id:'statistics', label:'mobile-04-statistiques', title:'Mobile Statistiques'},
  { id:'settings',   label:'mobile-05-parametres',   title:'Mobile Paramètres'  },
];

async function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

  console.log('🚀 Lancement de Chrome...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox','--disable-setuid-sandbox'],
  });

  /* ──────────────────────────────────────────────
     DESKTOP  1440 × 900
  ────────────────────────────────────────────── */
  console.log('\n📐 Desktop 1440×900 (2x)\n');
  const dPage = await browser.newPage();
  await dPage.setViewport({ width:1440, height:900, deviceScaleFactor:2 });
  await dPage.goto(FILE, { waitUntil:'networkidle0', timeout:30000 });
  await dPage.waitForFunction(() => document.fonts.ready);
  await wait(1200);

  for (const s of DESKTOP_SCREENS) {
    process.stdout.write(`  📸 ${s.title}... `);
    await dPage.evaluate((id) => dShow(id, document.getElementById('d-nav-'+id)), s.id);
    await wait(350);
    await dPage.screenshot({ path: path.join(OUT, s.label+'.png'), clip:{x:0,y:0,width:1440,height:900} });
    console.log('✅');
  }

  // Dark mode desktop — Dashboard
  process.stdout.write('  🌙 Dashboard Sombre... ');
  await dPage.evaluate(() => { dShow('dashboard'); if(!dark) toggleTheme(); });
  await wait(350);
  await dPage.screenshot({ path: path.join(OUT,'desktop-06-dashboard-dark.png'), clip:{x:0,y:0,width:1440,height:900} });
  console.log('✅');

  await dPage.close();

  /* ──────────────────────────────────────────────
     MOBILE  390 × 844
     On switche en mode mobile dans la maquette
     puis on capture uniquement le téléphone
  ────────────────────────────────────────────── */
  console.log('\n📱 Mobile 390×844 (2x)\n');
  const mPage = await browser.newPage();
  await mPage.setViewport({ width:900, height:960, deviceScaleFactor:2 });
  await mPage.goto(FILE, { waitUntil:'networkidle0', timeout:30000 });
  await mPage.waitForFunction(() => document.fonts.ready);

  // Activer le mode mobile
  await mPage.evaluate(() => setMode('mobile'));
  await wait(600);

  // Trouver la position du téléphone dans la page
  const phoneBox = await mPage.$eval('.phone', el => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  });

  for (const s of MOBILE_SCREENS) {
    process.stdout.write(`  📸 ${s.title}... `);
    await mPage.evaluate((id, idx) => mShow(id, idx), s.id, MOBILE_SCREENS.findIndex(x=>x.id===s.id));
    await wait(350);
    await mPage.screenshot({
      path: path.join(OUT, s.label+'.png'),
      clip: { x: phoneBox.x, y: phoneBox.y, width: phoneBox.w, height: phoneBox.h },
    });
    console.log('✅');
  }

  await mPage.close();
  await browser.close();

  console.log('\n🎉 Terminé ! Captures dans ./screens/\n');
  const files = fs.readdirSync(OUT).sort();
  console.log('  Desktop :');
  files.filter(f=>f.startsWith('desktop')).forEach(f=>{
    console.log(`    📄 ${f}  (${(fs.statSync(path.join(OUT,f)).size/1024).toFixed(0)} KB)`);
  });
  console.log('  Mobile :');
  files.filter(f=>f.startsWith('mobile')).forEach(f=>{
    console.log(`    📱 ${f}  (${(fs.statSync(path.join(OUT,f)).size/1024).toFixed(0)} KB)`);
  });
  console.log('\n👉 Figma : glisse-dépose tous les PNG → renomme les frames → connecte le prototype');
})();
