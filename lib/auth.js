const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'eductrack-secret-2026-change-me';

module.exports = {
  createToken(schoolId, schoolName) {
    const payload = JSON.stringify({ schoolId, schoolName, iat: Date.now() });
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
      if (sig !== expected) return null;
      return JSON.parse(Buffer.from(b64, 'base64url').toString());
    } catch { return null; }
  },

  getFromReq(req) {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return null;
    return this.verifyToken(h.slice(7));
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
