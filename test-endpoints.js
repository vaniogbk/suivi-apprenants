// test-endpoints.js — vérifie les correctifs de sécurité contre la vraie base Railway
//
// Usage :
//   1) npx vercel env pull .env.local     (récupère les vraies variables d'env depuis Vercel)
//   2) node test-endpoints.js
//
// N'envoie aucun email, ne crée aucun compte payant réel — se limite aux routes
// sans effet de bord destructeur (init-db et les migrations sont idempotentes).

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([\w.-]+)\s*=\s*(.*)?$/);
    if (m) {
      let val = (m[2] || '').trim();
      val = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
} else {
  console.error("⚠️  .env.local introuvable — lance d'abord : npx vercel env pull .env.local");
  process.exit(1);
}

function mockRes() {
  const res = { statusCode: undefined, body: null };
  res.setHeader = () => res;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  res.redirect = (u) => { res.statusCode = res.statusCode || 302; res.body = { redirect: u }; return res; };
  return res;
}

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function run() {
  console.log('--- EducTrack : vérification des correctifs P0/P1 contre la base réelle ---\n');

  // 1) init-db sans clé → doit être rejeté (P0)
  const initDb = require('./api/init-db.js');
  let res = mockRes();
  await initDb({ method: 'GET', headers: {}, query: {} }, res);
  check('init-db refuse une requête sans clé superadmin', res.statusCode === 401, `status=${res.statusCode}`);

  // 2) init-db avec la bonne clé → doit réussir et initialiser/valider le schéma
  res = mockRes();
  await initDb({ method: 'GET', headers: { authorization: `Bearer ${process.env.SUPERADMIN_KEY}` }, query: {} }, res);
  check('init-db accepte la bonne clé superadmin', (res.statusCode ?? 200) === 200, JSON.stringify(res.body));

  // 3) students sans token → doit être 401, plus de repli sur 'demo' (P0)
  const students = require('./api/students.js');
  res = mockRes();
  await students({ method: 'GET', headers: {}, query: {} }, res);
  check("students refuse une requête sans token (ne tombe plus sur 'demo')", res.statusCode === 401, `status=${res.statusCode}`);

  // 4) login avec le compte démo → doit renvoyer un token
  const login = require('./api/login.js');
  res = mockRes();
  await login({ method: 'POST', headers: {}, body: { email: 'demo@eductrack.app', password: process.env.DEMO_PASSWORD || 'EducTrack2026!' } }, res);
  const token = res.body?.token;
  check('login (compte démo) renvoie un token', !!token, token ? 'token reçu' : JSON.stringify(res.body));

  if (token) {
    const sessions   = require('./api/sessions.js');
    const formations = require('./api/formations.js');

    res = mockRes();
    await students({ method: 'GET', headers: { authorization: `Bearer ${token}` }, query: {} }, res);
    check('students accepte un token valide', Array.isArray(res.body), `type=${typeof res.body}`);

    res = mockRes();
    await sessions({ method: 'GET', headers: { authorization: `Bearer ${token}` }, query: {} }, res);
    check('sessions accepte un token valide', Array.isArray(res.body), `type=${typeof res.body}`);

    res = mockRes();
    await formations({ method: 'GET', headers: { authorization: `Bearer ${token}` }, query: {} }, res);
    check('formations accepte un token valide', Array.isArray(res.body), `type=${typeof res.body}`);
  }

  // 5) superadmin sans clé → 401
  const superadmin = require('./api/superadmin.js');
  res = mockRes();
  await superadmin({ method: 'GET', headers: {}, query: { action: 'stats' } }, res);
  check('superadmin refuse une requête sans clé', res.statusCode === 401, `status=${res.statusCode}`);

  // 6) superadmin avec la bonne clé → doit réussir
  res = mockRes();
  await superadmin({ method: 'GET', headers: { authorization: `Bearer ${process.env.SUPERADMIN_KEY}` }, query: { action: 'stats' } }, res);
  check('superadmin accepte la bonne clé', (res.statusCode ?? 200) === 200, JSON.stringify(res.body));

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests passés.`);
  console.log('\nNote : register/activate-school/send-email ne sont pas couverts ici (effets de bord réels : email, paiement) — à tester manuellement dans le navigateur si besoin.');
  process.exitCode = failed.length ? 1 : 0;
  process.exit(process.exitCode);
}

run().catch(e => { console.error('Erreur script de test:', e); process.exit(1); });
