const crypto = require('crypto');

const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

// ⚠️ JWT_SECRET DOIT être défini dans les variables d'environnement Vercel.
// En dev seulement, on retombe sur une valeur par défaut (jamais utilisée en prod
// si la variable est bien configurée). On ne fait pas planter le process ici pour
// ne pas casser un déploiement existant qui aurait oublié la variable — mais on
// log une alerte bien visible à chaque cold start.
const SECRET = process.env.JWT_SECRET || 'eductrack-dev-secret-do-not-use-in-prod';
if (!process.env.JWT_SECRET) {
  console.error(
    '[SECURITY] JWT_SECRET absent des variables d\'environnement — ' +
    (isProd
      ? 'DANGER : un secret par défaut est utilisé en production, les tokens sont falsifiables. Configure JWT_SECRET sur Vercel immédiatement.'
      : 'utilisation d\'un secret de développement.')
  );
}

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

module.exports = {
  createToken(schoolId, schoolName) {
    const now = Date.now();
    const payload = JSON.stringify({ schoolId, schoolName, iat: now, exp: now + TOKEN_TTL_MS });
    const b64 = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
    return `${b64}.${sig}`;
  },

  verifyToken(token) {
    if (!token) return null;
    try {
      const [b64, sig] = token.split('.');
      if (!b64 || !sig) return null;
      const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
      const sigBuf = Buffer.from(sig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
      const data = JSON.parse(Buffer.from(b64, 'base64url').toString());
      if (!data.exp || Date.now() > data.exp) return null; // token expiré
      return data;
    } catch { return null; }
  },

  getFromReq(req) {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return null;
    return this.verifyToken(h.slice(7));
  },

  // Rejette avec 401 si aucun token école valide n'est présent. Retourne le
  // payload décodé (schoolId, schoolName) sinon. À utiliser dans toutes les
  // routes qui ne doivent jamais retomber silencieusement sur les données 'demo'.
  requireAuth(req, res) {
    const school = this.getFromReq(req);
    if (!school || !school.schoolId) {
      res.status(401).json({ error: 'Authentification requise' });
      return null;
    }
    return school;
  },

  // Comparaison à temps constant pour les clés/secrets (ex: SUPERADMIN_KEY).
  safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA); // évite une fuite de timing sur la longueur
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  },

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  },

  checkPassword(password, stored) {
    try {
      const [salt, hash] = stored.split(':');
      const attempt = crypto.scryptSync(password, salt, 64).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(hash, 'hex'));
    } catch { return false; }
  },

  generatePassword(len = 12) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    return Array.from(crypto.randomBytes(len)).map(b => chars[b % chars.length]).join('');
  },

  generateId() {
    return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  },
};
