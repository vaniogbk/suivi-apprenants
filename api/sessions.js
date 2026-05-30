const pool = require('./db');
const auth  = require('./auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const school   = auth.getFromReq(req);
  const schoolId = school?.schoolId || 'demo';

  try {
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE school_id = ? OR school_id IS NULL ORDER BY name',
      [schoolId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('sessions error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
