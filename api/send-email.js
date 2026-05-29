// POST /api/send-email — envoie le lien d'accès formateur via Brevo (ex-Sendinblue)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey      = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@eductrack.app';
  const senderName  = process.env.BREVO_SENDER_NAME  || 'EducTrack';

  if (!apiKey) {
    return res.status(503).json({ error: 'Service email non configuré (BREVO_API_KEY manquant)' });
  }

  const { to, name, link } = req.body;
  if (!to || !link) return res.status(400).json({ error: 'to et link requis' });

  const htmlContent = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366F1,#4338CA);border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:28px">
        <h1 style="color:#ffffff;font-size:1.6rem;margin:0;font-weight:700">EducTrack</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:0.9rem">Suivi des Apprenants</p>
      </div>

      <p style="color:#374151;font-size:1rem;margin-bottom:8px">Bonjour <strong>${name}</strong>,</p>
      <p style="color:#6B7280;font-size:0.95rem;line-height:1.7;margin-bottom:28px">
        Votre espace formateur <strong>EducTrack</strong> a été créé avec succès.<br>
        Cliquez sur le bouton ci-dessous pour accéder à votre liste d'appel et enregistrer les présences de vos apprenants.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0">
        <a href="${link}"
           style="display:inline-block;background:#6366F1;color:#ffffff;text-decoration:none;
                  padding:15px 32px;border-radius:8px;font-weight:600;font-size:1rem;
                  letter-spacing:0.01em">
          Accéder à mon espace formateur →
        </a>
      </div>

      <!-- Link fallback -->
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="color:#6B7280;font-size:0.8rem;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">
          Ou copiez ce lien dans votre navigateur :
        </p>
        <p style="color:#4F46E5;font-size:0.8rem;word-break:break-all;margin:0;font-family:'Courier New',monospace">
          ${link}
        </p>
      </div>

      <!-- Warning -->
      <div style="background:#FFFBEB;border-left:4px solid #F59E0B;border-radius:4px;padding:12px 16px;margin-bottom:24px">
        <p style="color:#92400E;font-size:0.85rem;margin:0">
          <strong>⚠️ Lien personnel</strong> — Ce lien vous donne un accès direct sans mot de passe.
          Ne le partagez pas avec d'autres personnes.
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
      <p style="color:#9CA3AF;font-size:0.75rem;text-align:center;margin:0">
        EducTrack — Suivi des Apprenants &nbsp;|&nbsp; Ce message a été envoyé automatiquement
      </p>
    </div>
  `;

  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'accept':      'application/json',
        'api-key':     apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender:      { name: senderName, email: senderEmail },
        to:          [{ email: to, name }],
        subject:     `Votre espace formateur EducTrack`,
        htmlContent,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || JSON.stringify(data));
    return res.json({ sent: true, messageId: data.messageId });
  } catch (err) {
    console.error('Brevo error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
