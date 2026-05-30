const pool   = require('./db');
const auth   = require('./auth');
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Token validation (page formateur — no school auth needed)
    if (req.method === 'GET' && req.query.token) {
      const [rows] = await pool.query(
        `SELECT f.*, fm.name AS formation_name, fm.group_name, fm.id AS formation_id
         FROM formateurs f
         LEFT JOIN formations fm ON f.formation_id = fm.id
         WHERE f.token = ?`,
        [req.query.token]
      );
      if (!rows.length) return res.status(404).json({ error: 'Token invalide' });
      const formateur = rows[0];
      const groupFilter = formateur.group_name || formateur.formation_name;
      const [students] = groupFilter
        ? await pool.query('SELECT * FROM students WHERE `group` = ? AND school_id = ? ORDER BY name', [groupFilter, formateur.school_id || 'demo'])
        : await pool.query('SELECT * FROM students WHERE school_id = ? ORDER BY name', [formateur.school_id || 'demo']);
      return res.json({ formateur, students });
    }

    const school   = auth.getFromReq(req);
    const schoolId = school?.schoolId || 'demo';

    if (req.method === 'GET') {
      const { formation_id } = req.query;
      let sql = `SELECT f.*, fm.name AS formation_name FROM formateurs f LEFT JOIN formations fm ON f.formation_id = fm.id WHERE f.school_id = ?`;
      const params = [schoolId];
      if (formation_id) { sql += ' AND f.formation_id = ?'; params.push(formation_id); }
      sql += ' ORDER BY f.name';
      const [rows] = await pool.query(sql, params);
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { name, email, formation_id } = req.body;
      const id    = auth.generateId();
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'INSERT INTO formateurs (id, name, email, formation_id, token, school_id) VALUES (?,?,?,?,?,?)',
        [id, name, email || null, formation_id || null, token, schoolId]
      );
      return res.status(201).json({ id, token });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, email, formation_id } = req.body;
      await pool.query(
        'UPDATE formateurs SET name=?, email=?, formation_id=? WHERE id=? AND school_id=?',
        [name, email || null, formation_id || null, id, schoolId]
      );
      return res.json({ updated: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM formateurs WHERE id=? AND school_id=?', [id, schoolId]);
      return res.json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('formateurs error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
