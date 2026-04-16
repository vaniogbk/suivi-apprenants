// GET /api/sessions → liste toutes les sessions

const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await pool.getConnection();
  try {
    const [rows] = await db.query('SELECT * FROM sessions ORDER BY name');
    return res.json(rows);
  } finally {
    db.release();
  }
};
