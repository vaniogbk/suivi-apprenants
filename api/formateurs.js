// CRUD formateurs + token validation pour la page trainer
const pool   = require('./db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── Validation token (page formateur) ──
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
        ? await pool.query('SELECT * FROM students WHERE `group` = ? ORDER BY name', [groupFilter])
        : await pool.query('SELECT * FROM students ORDER BY name');

      return res.json({ formateur, students });
    }

    // ── Liste formateurs ──
    if (req.method === 'GET') {
      const { formation_id } = req.query;
      let sql = `SELECT f.*, fm.name AS formation_name
                 FROM formateurs f
                 LEFT JOIN formations fm ON f.formation_id = fm.id`;
      const params = [];
      if (formation_id) { sql += ' WHERE f.formation_id = ?'; params.push(formation_id); }
      sql += ' ORDER BY f.name';
      const [rows] = await pool.query(sql, params);
      return res.json(rows);
    }

    // ── Créer formateur ──
    if (req.method === 'POST') {
      const { name, email, formation_id } = req.body;
      const id    = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'INSERT INTO formateurs (id, name, email, formation_id, token) VALUES (?,?,?,?,?)',
        [id, name, email || null, formation_id || null, token]
      );
      return res.status(201).json({ id, token });
    }

    // ── Modifier formateur ──
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { name, email, formation_id } = req.body;
      await pool.query(
        'UPDATE formateurs SET name=?, email=?, formation_id=? WHERE id=?',
        [name, email || null, formation_id || null, id]
      );
      return res.json({ updated: true });
    }

    // ── Supprimer formateur ──
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM formateurs WHERE id=?', [id]);
      return res.json({ deleted: true });
    }

    // ── Présence formateur (admin) ──
    // POST /api/formateurs?action=presence
    if (req.method === 'POST' && req.query.action === 'presence') {
      const { date, formateur_id, status, note } = req.body;
      await pool.query(
        `INSERT INTO formateur_presence (date, formateur_id, status, note)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), note=VALUES(note)`,
        [date, formateur_id, status || 'present', note || null]
      );
      return res.json({ saved: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
