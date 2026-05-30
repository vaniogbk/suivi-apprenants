const pool = require('../lib/db');
const auth  = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const school   = auth.getFromReq(req);
  const schoolId = school?.schoolId || 'demo';

  try {
    if (req.method === 'GET') {
      // ── Historique complet (export) ──
      if (req.query.all === 'true') {
        const { session } = req.query;
        let sql = `
          SELECT a.date, a.session_id, a.student_id, a.status, a.note,
                 s.name AS student_name, s.\`group\` AS student_group
          FROM attendance a
          LEFT JOIN students s ON a.student_id = s.id AND s.school_id = a.school_id
          WHERE a.school_id = ?`;
        const params = [schoolId];
        if (session) { sql += ' AND a.session_id = ?'; params.push(session); }
        sql += ' ORDER BY a.date DESC, s.name';
        const [rows] = await pool.query(sql, params);
        return res.json(rows);
      }

      // ── Présence d'un jour ──
      const { date, session = 'default' } = req.query;
      if (!date) return res.status(400).json({ error: 'date required' });
      const [rows] = await pool.query(
        'SELECT student_id, status, note FROM attendance WHERE date=? AND session_id=? AND school_id=?',
        [date, session, schoolId]
      );
      const result = {};
      rows.forEach(r => { result[r.student_id] = { status: r.status, note: r.note }; });
      return res.json(result);
    }

    if (req.method === 'POST') {
      const { date, session_id = 'default', records } = req.body;
      if (!date || !records) return res.status(400).json({ error: 'date and records required' });
      for (const [student_id, rec] of Object.entries(records)) {
        await pool.query(
          `INSERT INTO attendance (date, session_id, student_id, status, note, school_id)
           VALUES (?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), note=VALUES(note)`,
          [date, session_id, student_id, rec.status || 'present', rec.note || '', schoolId]
        );
      }
      return res.json({ saved: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('attendance error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
