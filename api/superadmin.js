const pool = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth super admin
  const key = process.env.SUPERADMIN_KEY;
  const provided = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!key || provided !== key) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }

  try {
    if (req.method === 'GET') {
      const { action } = req.query;

      if (action === 'stats') {
        const [[total]]  = await pool.query('SELECT COUNT(*) as n FROM schools');
        const [[active]] = await pool.query("SELECT COUNT(*) as n FROM schools WHERE subscription_status='active'");
        const [[pending]]= await pool.query("SELECT COUNT(*) as n FROM schools WHERE subscription_status='pending'");
        const [[expired]]= await pool.query("SELECT COUNT(*) as n FROM schools WHERE subscription_status='expired'");
        return res.json({ total: total.n, active: active.n, pending: pending.n, expired: expired.n });
      }

      // Default: list schools
      const [rows] = await pool.query(`
        SELECT id, name, email, phone, responsible_name, responsible_contact,
               subscription_status, subscription_expires, created_at
        FROM schools ORDER BY created_at DESC
      `);
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { action, school_id } = req.body;

      if (action === 'suspend') {
        await pool.query("UPDATE schools SET subscription_status='suspended' WHERE id=?", [school_id]);
        return res.json({ done: true });
      }
      if (action === 'activate') {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        await pool.query(
          "UPDATE schools SET subscription_status='active', subscription_expires=? WHERE id=?",
          [expires.toISOString().split('T')[0], school_id]
        );
        return res.json({ done: true });
      }
    }

    res.status(400).json({ error: 'Action invalide' });
  } catch (err) {
    console.error('superadmin error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
