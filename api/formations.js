const pool = require('./db');
const auth  = require('./auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const school   = auth.getFromReq(req);
  const schoolId = school?.schoolId || 'demo';

  try {
    if (req.method === 'GET') {
      const [rows] = await pool.query(
        'SELECT * FROM formations WHERE school_id = ? ORDER BY name',
        [schoolId]
      );
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { id, name, description, group_name, start_date, end_date } = req.body;
      await pool.query(
        'INSERT INTO formations (id, name, description, group_name, start_date, end_date, school_id) VALUES (?,?,?,?,?,?,?)',
        [id, name, description || null, group_name || name, start_date || null, end_date || null, schoolId]
      );
      await pool.query(
        'INSERT IGNORE INTO sessions (id, name, school_id) VALUES (?,?,?)',
        [id, name, schoolId]
      );
      return res.status(201).json({ id });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, description, group_name, start_date, end_date } = req.body;
      await pool.query(
        'UPDATE formations SET name=?, description=?, group_name=?, start_date=?, end_date=? WHERE id=? AND school_id=?',
        [name, description || null, group_name || name, start_date || null, end_date || null, id, schoolId]
      );
      await pool.query('UPDATE sessions SET name=? WHERE id=? AND school_id=?', [name, id, schoolId]);
      return res.json({ updated: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM formations WHERE id=? AND school_id=?', [id, schoolId]);
      return res.json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('formations error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
