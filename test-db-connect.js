// test-db-connect.js — diagnostic de connexion brute à la base MySQL Railway
// Usage : node test-db-connect.js   (après avoir généré .env.local)

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

console.log('Variables présentes (noms uniquement, pas les valeurs) :');
['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'JWT_SECRET', 'SUPERADMIN_KEY', 'DEMO_PASSWORD', 'BREVO_API_KEY', 'FEDAPAY_SECRET_KEY']
  .forEach(k => console.log(`  ${k}: ${process.env[k] ? 'présente (' + process.env[k].length + ' caractères)' : 'ABSENTE'}`));

console.log('\nTest de connexion brute à MySQL...');
const pool = require('./lib/db');

(async () => {
  try {
    const [rows] = await pool.query('SELECT 1+1 AS r');
    console.log('✅ Connexion MySQL OK:', rows);

    try {
      const [tables] = await pool.query("SHOW TABLES");
      console.log('Tables existantes:', tables.map(t => Object.values(t)[0]));
    } catch (e) {
      console.log('Impossible de lister les tables:', e.message);
    }

    try {
      const [schools] = await pool.query("SELECT id, email, subscription_status FROM schools WHERE id='demo'");
      console.log("Compte démo:", schools.length ? schools[0] : 'INTROUVABLE (init-db n\'a probablement jamais tourné avec succès sur cette base)');
    } catch (e) {
      console.log("Erreur lecture table 'schools':", e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur de connexion MySQL:');
    console.error('  message:', JSON.stringify(err.message));
    console.error('  code:', err.code);
    console.error('  errno:', err.errno);
    console.error('  stack:', err.stack);
    process.exit(1);
  }
})();
