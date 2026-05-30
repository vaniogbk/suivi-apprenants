const pool = require('../lib/db');
const auth  = require('../lib/auth');

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
        'SELECT * FROM students WHERE school_id = ? ORDER BY name',
        [schoolId]
      );
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { id, name, email, group: grp, photo, created_at } = req.body;
      await pool.query(
        'INSERT INTO students (id, name, email, `group`, photo, created_at, school_id) VALUES (?,?,?,?,?,?,?)',
        [id, name, email || null, grp || null, photo || null, created_at || new Date(), schoolId]
      );
      return res.status(201).json({ id });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, email, group: grp, photo } = req.body;
      await pool.query(
        'UPDATE students SET name=?, email=?, `group`=?, photo=? WHERE id=? AND school_id=?',
        [name, email || null, grp || null, photo || null, id, schoolId]
      );
      return res.json({ updated: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM students WHERE id=? AND school_id=?', [id, schoolId]);
      return res.json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('students error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
