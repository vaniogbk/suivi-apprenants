const pool = require('../lib/db');
const auth = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, phone, responsible_name, responsible_contact, country } = req.body;
    let { language } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    if (!country) return res.status(400).json({ error: 'Pays requis' });
    language = language === 'en' ? 'en' : 'fr';

    const [existing] = await pool.query(
      'SELECT id, subscription_status FROM schools WHERE email = ?',
      [email]
    );
    // Un compte déjà actif ou en attente de paiement ne peut pas se
    // ré-inscrire — en revanche un compte expiré/suspendu est autorisé à
    // repasser ici : on le traite comme un renouvellement (même ligne,
    // même historique) plutôt que de bloquer ou de dupliquer l'école.
    if (existing.length > 0 && ['active', 'pending'].includes(existing[0].subscription_status)) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }
    const isRenewal = existing.length > 0;
    const id        = isRenewal ? existing[0].id : auth.generateId();

    const password = auth.generatePassword(14);
    const hash     = auth.hashPassword(password);
    // Tarif unique : 20 $ US / an. FedaPay (Bénin, Côte d'Ivoire, Togo — carte
    // + mobile money MTN/Moov) traite en XOF ; SUBSCRIPTION_PRICE_XOF permet
    // d'ajuster l'équivalent local si le taux de change bouge, 12000 XOF ≈ 20$.
    const price    = parseInt(process.env.SUBSCRIPTION_PRICE_XOF || '12000');
    const fedaKey  = process.env.FEDAPAY_SECRET_KEY;
    const appUrl   = process.env.APP_URL || 'https://eductrack-app.vercel.app';

    if (isRenewal) {
      await pool.query(
        `UPDATE schools SET name=?, phone=?, responsible_name=?, responsible_contact=?,
           country=?, language=?, password_hash=?, subscription_status='pending', payment_ref=NULL WHERE id=?`,
        [name, phone || null, responsible_name || null, responsible_contact || null, country, language, hash, id]
      );
    } else {
      await pool.query(
        `INSERT INTO schools (id, name, email, phone, responsible_name, responsible_contact, country, language, password_hash, subscription_status)
         VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
        [id, name, email, phone || null, responsible_name || null, responsible_contact || null, country, language, hash]
      );
    }

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
      await sendCredentials(email, name, password, appUrl, language);
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
        description:   `Abonnement EducTrack 1 an (20$ US) — ${name}`,
        amount:        price,
        currency:      { iso: 'XOF' },
        callback_url:  `${appUrl}/api/activate-school`,
        customer:      { email, firstname: (responsible_name || name).split(' ')[0], lastname: (responsible_name || name).split(' ').slice(1).join(' ') || '' },
        // Le mot de passe ne transite plus par un tiers (FedaPay) : un nouveau
        // mot de passe est généré et haché côté serveur au moment de
        // l'activation (voir api/activate-school.js), jamais transmis ici.
        metadata:      { school_id: id },
      }),
    });
    const fdata = await fedaResp.json();
    if (!fedaResp.ok) throw new Error(fdata.message || 'FedaPay error');

    await pool.query('UPDATE schools SET payment_ref=? WHERE id=?', [String(fdata.v1?.id || ''), id]);
    return res.json({ mode: 'fedapay', token: fdata.v1?.token });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Erreur serveur — réessayez plus tard' });
  }
};

async function sendCredentials(email, name, password, appUrl, language = 'fr') {
  const key = process.env.BREVO_API_KEY;
  if (!key) return;
  const sender = process.env.BREVO_SENDER_EMAIL || 'eductrack0@gmail.com';
  const isEn = language === 'en';

  const t = isEn ? {
    preheader: 'Your account is active',
    hello:     `Hello <strong>${name}</strong>,`,
    intro:     'Your EducTrack subscription has been activated. Here are your login credentials:',
    emailLbl:  'Email', pwdLbl: 'Password',
    cta:       'Go to my dashboard →',
    warn:      '<strong>Note</strong> — Keep this password safe: it will not be shown again by email. You can change it from your settings.',
    plan:      'Plan: <strong>Annual subscription — $20 USD / year</strong>, billed once, renewable every year.',
    subject:   'Your EducTrack account is active — Login credentials',
  } : {
    preheader: 'Votre compte est activé',
    hello:     `Bonjour <strong>${name}</strong>,`,
    intro:     'Votre abonnement EducTrack a été activé avec succès. Voici vos identifiants de connexion :',
    emailLbl:  'Email', pwdLbl: 'Mot de passe',
    cta:       'Accéder à mon tableau de bord →',
    warn:      '<strong>⚠️</strong> Conservez ce mot de passe en lieu sûr — il ne sera plus visible après cet email. Vous pourrez le modifier depuis vos paramètres.',
    plan:      'Formule : <strong>Abonnement annuel — 20 $ US / an</strong>, facturé une fois, renouvelable chaque année.',
    subject:   'Votre compte EducTrack est activé — Identifiants de connexion',
  };

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="background:linear-gradient(135deg,#6366F1,#4338CA);border-radius:12px;padding:28px;text-align:center;margin-bottom:28px">
        <h1 style="color:#fff;margin:0;font-size:1.6rem;font-weight:800">EducTrack</h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:.9rem">${t.preheader}</p>
      </div>
      <p style="color:#374151;font-size:1rem">${t.hello}</p>
      <p style="color:#6B7280;font-size:.95rem;line-height:1.7;margin:12px 0 24px">${t.intro}</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;color:#6B7280;font-size:.8rem;font-weight:600;text-transform:uppercase">${t.emailLbl}</p>
        <p style="margin:0 0 16px;color:#1F2937;font-weight:600">${email}</p>
        <p style="margin:0 0 8px;color:#6B7280;font-size:.8rem;font-weight:600;text-transform:uppercase">${t.pwdLbl}</p>
        <p style="margin:0;color:#4F46E5;font-weight:700;font-size:1.2rem;font-family:monospace;letter-spacing:.05em">${password}</p>
      </div>
      <p style="color:#374151;font-size:.9rem;margin:0 0 24px">${t.plan}</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${appUrl}/login.html" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:1rem">
          ${t.cta}
        </a>
      </div>
      <div style="background:#FFFBEB;border-left:4px solid #F59E0B;border-radius:4px;padding:12px 16px">
        <p style="color:#92400E;font-size:.85rem;margin:0">${t.warn}</p>
      </div>
      <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
      <p style="color:#9CA3AF;font-size:.75rem;text-align:center;margin:0">EducTrack — Suivi des Apprenants</p>
    </div>`;

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'EducTrack', email: sender },
        to:          [{ email, name }],
        subject:     t.subject,
        htmlContent: html,
      }),
    });
    if (!resp.ok) {
      console.error('email error: Brevo a refusé l\'envoi', resp.status, await resp.text());
    }
  } catch (e) {
    console.error('email error:', e.message);
  }
}

module.exports.sendCredentials = sendCredentials;
