// POST /api/send-email — envoie le lien d'accès formateur par email (Resend)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Service email non configuré (RESEND_API_KEY manquant)' });
  }

  const { to, name, link } = req.body;
  if (!to || !link) return res.status(400).json({ error: 'to et link requis' });

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="background:linear-gradient(135deg,#6366F1,#4338CA);border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:24px">
        <h1 style="color:#fff;font-size:1.5rem;margin:0">EducTrack</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:0.95rem">Suivi des Apprenants</p>
      </div>

      <p style="color:#374151;font-size:1rem">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#6B7280;font-size:0.95rem;line-height:1.6">
        Votre espace formateur EducTrack a été créé. Utilisez le lien ci-dessous
        pour accéder à votre liste d'appel et enregistrer les présences de vos apprenants.
      </p>

      <div style="text-align:center;margin:32px 0">
        <a href="${link}"
           style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;
                  padding:14px 28px;border-radius:8px;font-weight:600;font-size:1rem">
          Accéder à mon espace formateur
        </a>
      </div>

      <div style="background:#F3F4F6;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="color:#6B7280;font-size:0.8rem;margin:0 0 6px;font-weight:600">Ou copiez ce lien :</p>
        <p style="color:#4F46E5;font-size:0.8rem;word-break:break-all;margin:0;font-family:monospace">${link}</p>
      </div>

      <p style="color:#9CA3AF;font-size:0.8rem;line-height:1.5">
        ⚠️ Ce lien vous est personnel — ne le partagez pas. Il vous donne un accès direct sans mot de passe.<br>
        Pour toute question, contactez votre administrateur.
      </p>

      <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
      <p style="color:#D1D5DB;font-size:0.75rem;text-align:center;margin:0">EducTrack — Suivi des Apprenants</p>
    </div>
  `;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'EducTrack <noreply@eductrack.app>',
        to:      [to],
        subject: `Votre espace formateur EducTrack — ${name}`,
        html,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Erreur Resend');
    return res.json({ sent: true, id: data.id });
  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: err.message });
  }
};
