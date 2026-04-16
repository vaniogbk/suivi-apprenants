// GET /api/students        → liste tous les apprenants
// POST /api/students       → ajoute un apprenant
// PUT /api/students?id=xx  → modifie un apprenant
// DELETE /api/students?id= → supprime un apprenant

const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await pool.getConnection();
  try {
    if (req.method === 'GET') {
      const [rows] = await db.query('SELECT * FROM students ORDER BY name');
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { id, name, email, group: grp, photo, created_at } = req.body;
      await db.query(
        'INSERT INTO students (id, name, email, `group`, photo, created_at) VALUES (?,?,?,?,?,?)',
        [id, name, email || null, grp || null, photo || null, created_at || new Date()]
      );
      return res.status(201).json({ id });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, email, group: grp, photo } = req.body;
      await db.query(
        'UPDATE students SET name=?, email=?, `group`=?, photo=? WHERE id=?',
        [name, email || null, grp || null, photo || null, id]
      );
      return res.json({ updated: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await db.query('DELETE FROM students WHERE id=?', [id]);
      return res.json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } finally {
    db.release();
  }
};
