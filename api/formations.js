// CRUD formations + sync sessions table
const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const [rows] = await pool.query('SELECT * FROM formations ORDER BY name');
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { id, name, description, group_name, start_date, end_date } = req.body;
      await pool.query(
        'INSERT INTO formations (id, name, description, group_name, start_date, end_date) VALUES (?,?,?,?,?,?)',
        [id, name, description || null, group_name || name, start_date || null, end_date || null]
      );
      // Sync into sessions so attendance dropdown shows formation
      await pool.query('INSERT IGNORE INTO sessions (id, name) VALUES (?,?)', [id, name]);
      return res.status(201).json({ id });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, description, group_name, start_date, end_date } = req.body;
      await pool.query(
        'UPDATE formations SET name=?, description=?, group_name=?, start_date=?, end_date=? WHERE id=?',
        [name, description || null, group_name || name, start_date || null, end_date || null, id]
      );
      await pool.query('UPDATE sessions SET name=? WHERE id=?', [name, id]);
      return res.json({ updated: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM formations WHERE id=?', [id]);
      return res.json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
