const pool = require('../lib/db');
const auth = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const [rows] = await pool.query(
      'SELECT * FROM schools WHERE email = ? AND subscription_status != ?',
      [email, 'suspended']
    );
    if (!rows.length) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const school = rows[0];
    if (!auth.checkPassword(password, school.password_hash)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    if (school.subscription_status === 'pending') {
      return res.status(403).json({ error: 'Abonnement en attente de paiement', status: 'pending' });
    }
    if (school.subscription_status === 'expired') {
      return res.status(403).json({ error: 'Abonnement expiré — veuillez renouveler', status: 'expired' });
    }

    const token = auth.createToken(school.id, school.name);
    return res.json({
      token,
      school: {
        id:   school.id,
        name: school.name,
        email: school.email,
        responsible_name: school.responsible_name,
        subscription_expires: school.subscription_expires,
      },
    });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
