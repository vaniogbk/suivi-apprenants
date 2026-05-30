// Callback FedaPay après paiement réussi
const pool = require('./db');
const { sendCredentials } = require('./register');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { id, status } = req.query; // id = FedaPay transaction ID
    const appUrl = process.env.APP_URL || 'https://eductrack-eosin.vercel.app';

    if (status !== 'approved') {
      return res.redirect(`${appUrl}/register.html?payment=failed`);
    }

    // Vérifier la transaction avec FedaPay
    const fedaKey = process.env.FEDAPAY_SECRET_KEY;
    if (fedaKey && fedaKey !== 'sandbox') {
      const check = await fetch(`https://api.fedapay.com/v1/transactions/${id}`, {
        headers: { 'Authorization': `Bearer ${fedaKey}` },
      });
      const data = await check.json();
      if (data.v1?.status !== 'approved') {
        return res.redirect(`${appUrl}/register.html?payment=failed`);
      }
    }

    // Récupérer l'école par payment_ref
    const [schools] = await pool.query('SELECT * FROM schools WHERE payment_ref = ?', [String(id)]);
    if (!schools.length) return res.redirect(`${appUrl}/login.html?registered=1`);

    const school  = schools[0];
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    await pool.query(
      `UPDATE schools SET subscription_status='active', subscription_expires=? WHERE id=?`,
      [expires.toISOString().split('T')[0], school.id]
    );

    // Récupérer le mot de passe depuis les metadata FedaPay
    let password = '';
    if (fedaKey && fedaKey !== 'sandbox') {
      try {
        const txResp = await fetch(`https://api.fedapay.com/v1/transactions/${id}`, {
          headers: { 'Authorization': `Bearer ${fedaKey}` },
        });
        const tx = await txResp.json();
        password = tx.v1?.metadata?.password || '';
      } catch (_) {}
    }

    if (password) {
      await sendCredentials(school.email, school.name, password, appUrl);
    }

    return res.redirect(`${appUrl}/login.html?registered=1`);
  } catch (err) {
    console.error('activate-school error:', err.message);
    res.redirect(`${process.env.APP_URL || 'https://eductrack-eosin.vercel.app'}/register.html?error=1`);
  }
};
