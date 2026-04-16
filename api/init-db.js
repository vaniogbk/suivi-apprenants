// GET /api/init-db → crée les tables si elles n'existent pas (à appeler une seule fois)

const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const db = await pool.getConnection();
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id   VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS students (
        id         VARCHAR(100) PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255),
        \`group\`  VARCHAR(255),
        photo      LONGTEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         BIGINT AUTO_INCREMENT PRIMARY KEY,
        date       DATE NOT NULL,
        session_id VARCHAR(100),
        student_id VARCHAR(100),
        status     VARCHAR(20) NOT NULL DEFAULT 'present',
        note       TEXT DEFAULT '',
        UNIQUE KEY uniq_att (date, session_id, student_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      INSERT IGNORE INTO sessions (id, name) VALUES
        ('default',   'Formation Principale'),
        ('marketing', 'Marketing Digital'),
        ('web',       'Développement Web et Mobile')
    `);

    return res.json({ success: true, message: 'Tables créées avec succès' });
  } finally {
    db.release();
  }
};
