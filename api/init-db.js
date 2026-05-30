const pool = require('./db');
const auth = require('./auth');

// Helper: try ALTER TABLE, ignore "Duplicate column" error
async function addCol(table, col, def) {
  try { await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${col} ${def}`); } catch (_) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    // ── Core tables ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id                  VARCHAR(100) PRIMARY KEY,
        name                VARCHAR(255) NOT NULL,
        email               VARCHAR(255) UNIQUE NOT NULL,
        phone               VARCHAR(50),
        responsible_name    VARCHAR(255),
        responsible_contact VARCHAR(255),
        password_hash       VARCHAR(255) NOT NULL,
        subscription_status VARCHAR(20)  DEFAULT 'active',
        subscription_expires DATE,
        payment_ref         VARCHAR(255),
        created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id        VARCHAR(100) PRIMARY KEY,
        name      VARCHAR(255) NOT NULL,
        school_id VARCHAR(100) DEFAULT 'demo'
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id         VARCHAR(100) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255),
        \`group\`  VARCHAR(255),
        photo      LONGTEXT,
        school_id  VARCHAR(100) DEFAULT 'demo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         BIGINT AUTO_INCREMENT PRIMARY KEY,
        date       DATE NOT NULL,
        session_id VARCHAR(100),
        student_id VARCHAR(100),
        status     VARCHAR(20) NOT NULL DEFAULT 'present',
        note       TEXT,
        school_id  VARCHAR(100) DEFAULT 'demo',
        UNIQUE KEY uniq_att (date, session_id, student_id, school_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS formations (
        id          VARCHAR(100) PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        group_name  VARCHAR(255),
        start_date  DATE,
        end_date    DATE,
        school_id   VARCHAR(100) DEFAULT 'demo',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS formateurs (
        id           VARCHAR(100) PRIMARY KEY,
        name         VARCHAR(255) NOT NULL,
        email        VARCHAR(255),
        formation_id VARCHAR(100),
        token        VARCHAR(64) UNIQUE NOT NULL,
        school_id    VARCHAR(100) DEFAULT 'demo',
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS formateur_presence (
        id           BIGINT AUTO_INCREMENT PRIMARY KEY,
        date         DATE NOT NULL,
        formateur_id VARCHAR(100),
        status       VARCHAR(20) NOT NULL DEFAULT 'present',
        note         TEXT,
        UNIQUE KEY uniq_fp (date, formateur_id)
      )
    `);

    // ── Migrations: add school_id to existing tables if missing ──
    await addCol('sessions',   'school_id VARCHAR(100) DEFAULT \'demo\'', '');
    await addCol('students',   'school_id VARCHAR(100) DEFAULT \'demo\'', '');
    await addCol('attendance', 'school_id VARCHAR(100) DEFAULT \'demo\'', '');
    await addCol('formations', 'school_id VARCHAR(100) DEFAULT \'demo\'', '');
    await addCol('formateurs', 'school_id VARCHAR(100) DEFAULT \'demo\'', '');

    // Backfill existing rows
    await pool.query("UPDATE sessions   SET school_id='demo' WHERE school_id IS NULL");
    await pool.query("UPDATE students   SET school_id='demo' WHERE school_id IS NULL");
    await pool.query("UPDATE attendance SET school_id='demo' WHERE school_id IS NULL");
    await pool.query("UPDATE formations SET school_id='demo' WHERE school_id IS NULL");
    await pool.query("UPDATE formateurs SET school_id='demo' WHERE school_id IS NULL");

    // ── Seed: default sessions ──
    await pool.query(`
      INSERT IGNORE INTO sessions (id, name, school_id) VALUES
        ('default',          'Formation Principale',          'demo'),
        ('tit',              'Technicien d\'Intervention Télécom (TIT)', 'demo'),
        ('referent-digital', 'Référent Digital',              'demo'),
        ('tmee',             'Technicien Maintenance Élec.',  'demo'),
        ('cybersecurite',    'Analyste Cybersécurité',        'demo')
    `);

    // ── Demo school account ──
    const demoPassword = process.env.DEMO_PASSWORD || 'EducTrack2026!';
    const demoHash     = auth.hashPassword(demoPassword);
    await pool.query(`
      INSERT IGNORE INTO schools
        (id, name, email, responsible_name, password_hash, subscription_status, subscription_expires)
      VALUES
        ('demo', 'École Numérique du Bénin (DÉMO)',
         'demo@eductrack.app', 'Administrateur Démo',
         ?, 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR))
    `, [demoHash]);

    return res.json({ success: true, message: 'Base initialisée — compte démo: demo@eductrack.app / EducTrack2026!' });
  } catch (err) {
    console.error('init-db error:', err);
    return res.status(500).json({ error: err.message });
  }
};
