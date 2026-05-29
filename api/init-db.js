// GET /api/init-db → crée toutes les tables si elles n'existent pas

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
        note       TEXT,
        UNIQUE KEY uniq_att (date, session_id, student_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS formations (
        id          VARCHAR(100) PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        group_name  VARCHAR(255),
        start_date  DATE,
        end_date    DATE,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS formateurs (
        id           VARCHAR(100) PRIMARY KEY,
        name         VARCHAR(255) NOT NULL,
        email        VARCHAR(255),
        formation_id VARCHAR(100),
        token        VARCHAR(64) UNIQUE NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE SET NULL
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS formateur_presence (
        id           BIGINT AUTO_INCREMENT PRIMARY KEY,
        date         DATE NOT NULL,
        formateur_id VARCHAR(100),
        status       VARCHAR(20) NOT NULL DEFAULT 'present',
        note         TEXT,
        UNIQUE KEY uniq_fp (date, formateur_id),
        FOREIGN KEY (formateur_id) REFERENCES formateurs(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      INSERT IGNORE INTO sessions (id, name) VALUES
        ('default',   'Formation Principale'),
        ('marketing', 'Marketing Digital'),
        ('web',       'Développement Web et Mobile')
    `);

    return res.json({ success: true, message: 'Toutes les tables créées avec succès' });
  } finally {
    db.release();
  }
};
