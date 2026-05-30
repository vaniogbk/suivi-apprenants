const pool = require('../lib/db');
const auth = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, phone, responsible_name, responsible_contact } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });

    const [existing] = await pool.query('SELECT id FROM schools WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }

    const id       = auth.generateId();
    const password = auth.generatePassword(14);
    const hash     = auth.hashPassword(password);
    const price    = parseInt(process.env.SUBSCRIPTION_PRICE_XOF || '50000');
    const fedaKey  = process.env.FEDAPAY_SECRET_KEY;
    const appUrl   = process.env.APP_URL || 'https://eductrack-eosin.vercel.app';

    await pool.query(
      `INSERT INTO schools (id, name, email, phone, responsible_name, responsible_contact, password_hash, subscription_status)
       VALUES (?,?,?,?,?,?,?,'pending')`,
      [id, name, email, phone || null, responsible_name || null, responsible_contact || null, hash]
    );

    // Mode sandbox (no FEDAPAY_SECRET_KEY configured)
    if (!fedaKey || fedaKey === 'sandbox') {
      // Activate immediately for demo/sandbox
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      await pool.query(
        `UPDATE schools SET subscription_status='active', subscription_expires=? WHERE id=?`,
        [expires.toISOString().split('T')[0], id]
      );
      // Send credentials email
      await sendCredentials(email, name, password, appUrl);
      return res.json({ mode: 'sandbox', activated: true });
    }

    // FedaPay real payment
    const fedaResp = await fetch('https://api.fedapay.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fedaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description:   `Abonnement EducTrack 1 an — ${name}`,
        amount:        price,
        currency:      { iso: 'XOF' },
        callback_url:  `${appUrl}/api/activate-school`,
        customer:      { email, firstname: (responsible_name || name).split(' ')[0], lastname: (responsible_name || name).split(' ').slice(1).join(' ') || '' },
        metadata:      { school_id: id, password },
      }),
    });
    const fdata = await fedaResp.json();
    if (!fedaResp.ok) throw new Error(fdata.message || 'FedaPay error');

    await pool.query('UPDATE schools SET payment_ref=? WHERE id=?', [String(fdata.v1?.id || ''), id]);
    return res.json({ mode: 'fedapay', token: fdata.v1?.token });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

async function sendCredentials(email, name, password, appUrl) {
  const key = process.env.BREVO_API_KEY;
  if (!key) return;
  const sender = process.env.BREVO_SENDER_EMAIL || 'eductrack0@gmail.com';
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="background:linear-gradient(135deg,#6366F1,#4338CA);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px">
        <h1 style="color:#fff;margin:0;font-size:1.6rem;font-weight:800">EducTrack</h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:.9rem">Votre compte est activé</p>
      </div>
      <p style="color:#374151;font-size:1rem">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#6B7280;font-size:.95rem;line-height:1.7;margin:12px 0 24px">
        Votre abonnement EducTrack a été activé avec succès. Voici vos identifiants de connexion :
      </p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;color:#6B7280;font-size:.8rem;font-weight:600;text-transform:uppercase">Email</p>
        <p style="margin:0 0 16px;color:#1F2937;font-weight:600">${email}</p>
        <p style="margin:0 0 8px;color:#6B7280;font-size:.8rem;font-weight:600;text-transform:uppercase">Mot de passe</p>
        <p style="margin:0;color:#4F46E5;font-weight:700;font-size:1.2rem;font-family:monospace;letter-spacing:.05em">${password}</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="${appUrl}/login.html" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:1rem">
          Accéder à mon tableau de bord →
        </a>
      </div>
      <div style="background:#FFFBEB;border-left:4px solid #F59E0B;border-radius:4px;padding:12px 16px">
        <p style="color:#92400E;font-size:.85rem;margin:0">
          <strong>⚠️</strong> Conservez ce mot de passe en lieu sûr — il ne sera plus visible après cet email.
          Vous pourrez le modifier depuis vos paramètres.
        </p>
      </div>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
      <p style="color:#9CA3AF;font-size:.75rem;text-align:center;margin:0">EducTrack — Suivi des Apprenants</p>
    </div>`;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: 'EducTrack', email: sender },
      to:          [{ email, name }],
      subject:     'Votre compte EducTrack est activé — Identifiants de connexion',
      htmlContent: html,
    }),
  }).catch(e => console.error('email error:', e.message));
}

module.exports.sendCredentials = sendCredentials;
