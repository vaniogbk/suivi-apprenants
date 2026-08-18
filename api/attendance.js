const pool = require('../lib/db');
const auth  = require('../lib/auth');

// Les formateurs accèdent à cette route via leur lien magique (token dédié,
// distinct du JWT école) plutôt que via Authorization: Bearer — on accepte
// donc soit un JWT école valide, soit un token de formateur valide, et on
// rejette (401) si aucun des deux n'est présent. On ne retombe plus jamais
// silencieusement sur l'école 'demo'.
async function resolveSchoolId(req) {
  const school = auth.getFromReq(req);
  if (school?.schoolId) return school.schoolId;

  const token = req.query?.token || req.body?.token;
  if (token) {
    const [rows] = await pool.query('SELECT school_id FROM formateurs WHERE token = ?', [token]);
    if (rows.length) return rows[0].school_id || 'demo';
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const schoolId = await resolveSchoolId(req);
    if (!schoolId) return res.status(401).json({ error: 'Authentification requise' });

    const { active, status } = await auth.checkSubscriptionActive(schoolId);
    if (!active) {
      return res.status(402).json({
        error: 'Abonnement inactif — veuillez vous réabonner pour retrouver l\'accès',
        code: 'SUBSCRIPTION_INACTIVE',
        status,
      });
    }

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
    res.status(500).json({ error: 'Erreur serveur — réessayez plus tard' });
  }
};
