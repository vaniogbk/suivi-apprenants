// GET /api/attendance?date=YYYY-MM-DD&session=xxx  → présences du jour
// POST /api/attendance  → enregistre les présences (tableau)

const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = await pool.getConnection();
  try {
    if (req.method === 'GET') {
      const { date, session = 'default' } = req.query;
      if (!date) return res.status(400).json({ error: 'date required' });

      const [rows] = await db.query(
        'SELECT student_id, status, note FROM attendance WHERE date=? AND session_id=?',
        [date, session]
      );
      // Retourne un objet { studentId: { status, note } }
      const result = {};
      rows.forEach(r => { result[r.student_id] = { status: r.status, note: r.note }; });
      return res.json(result);
    }

    if (req.method === 'POST') {
      // body: { date, session_id, records: { studentId: { status, note } } }
      const { date, session_id = 'default', records } = req.body;
      if (!date || !records) return res.status(400).json({ error: 'date and records required' });

      // Upsert chaque enregistrement
      for (const [student_id, rec] of Object.entries(records)) {
        await db.query(
          `INSERT INTO attendance (date, session_id, student_id, status, note)
           VALUES (?,?,?,?,?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), note=VALUES(note)`,
          [date, session_id, student_id, rec.status || 'present', rec.note || '']
        );
      }
      return res.json({ saved: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } finally {
    db.release();
  }
};
