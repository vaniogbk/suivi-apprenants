// Callback FedaPay après paiement réussi
const pool = require('../lib/db');
const auth = require('../lib/auth');
const { sendCredentials } = require('./register');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const appUrl = process.env.APP_URL || 'https://eductrack-app.vercel.app';

  try {
    const { id } = req.query; // id = FedaPay transaction ID
    if (!id) return res.redirect(`${appUrl}/register.html?payment=failed`);

    const fedaKey         = process.env.FEDAPAY_SECRET_KEY;
    const expectedAmount  = parseInt(process.env.SUBSCRIPTION_PRICE_XOF || '50000');
    const isSandbox       = !fedaKey || fedaKey === 'sandbox';

    if (!isSandbox) {
      // Ne jamais faire confiance aux paramètres de l'URL de redirection
      // (status, montant, etc.) — ils viennent du navigateur du client et
      // peuvent être falsifiés. On revérifie systématiquement auprès de
      // l'API FedaPay elle-même, avec la clé secrète serveur.
      const check = await fetch(`https://api.fedapay.com/v1/transactions/${id}`, {
        headers: { 'Authorization': `Bearer ${fedaKey}` },
      });
      const data = await check.json();
      const tx = data.v1;
      if (!tx || tx.status !== 'approved') {
        return res.redirect(`${appUrl}/register.html?payment=failed`);
      }
      if (Number(tx.amount) !== expectedAmount) {
        console.error('activate-school: montant inattendu', tx.amount, 'attendu', expectedAmount);
        return res.redirect(`${appUrl}/register.html?payment=failed`);
      }
    } else if (req.query.status !== 'approved') {
      // Mode sandbox uniquement : pas d'API tierce à interroger, on se
      // contente d'un check basique (ce mode ne doit jamais tourner en prod).
      return res.redirect(`${appUrl}/register.html?payment=failed`);
    }

    // Récupérer l'école par payment_ref
    const [schools] = await pool.query('SELECT * FROM schools WHERE payment_ref = ?', [String(id)]);
    if (!schools.length) return res.redirect(`${appUrl}/login.html?registered=1`);

    const school  = schools[0];
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    // Le mot de passe définitif est généré ici, côté serveur, au moment de
    // l'activation — jamais transmis à FedaPay ni stocké en clair. Il
    // remplace le hash placeholder créé à l'inscription.
    const password = auth.generatePassword(14);
    const hash     = auth.hashPassword(password);

    await pool.query(
      `UPDATE schools SET subscription_status='active', subscription_expires=?, password_hash=? WHERE id=?`,
      [expires.toISOString().split('T')[0], hash, school.id]
    );

    await sendCredentials(school.email, school.name, password, appUrl, school.language);

    return res.redirect(`${appUrl}/login.html?registered=1`);
  } catch (err) {
    console.error('activate-school error:', err.message);
    res.redirect(`${appUrl}/register.html?error=1`);
  }
};
