const pool = require('../lib/db');
const auth  = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const school = await auth.requireAuth(req, res);
  if (!school) return;
  const schoolId = school.schoolId;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE school_id = ? OR school_id IS NULL ORDER BY name',
      [schoolId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('sessions error:', err.message);
    res.status(500).json({ error: 'Erreur serveur — réessayez plus tard' });
  }
};
