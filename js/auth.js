/* ============================================
   AUTH — EducTrack frontend
   ============================================ */

const Auth = {
  TOKEN_KEY:  'eductrack_token',
  SCHOOL_KEY: 'eductrack_school',

  getToken()  { return localStorage.getItem(this.TOKEN_KEY); },
  getSchool() {
    try { return JSON.parse(localStorage.getItem(this.SCHOOL_KEY) || 'null'); } catch { return null; }
  },
  isLoggedIn() { return !!this.getToken(); },

  save(token, school) {
    localStorage.setItem(this.TOKEN_KEY,  token);
    localStorage.setItem(this.SCHOOL_KEY, JSON.stringify(school));
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.SCHOOL_KEY);
    window.location.href = '/login.html';
  },

  headers() {
    const t = this.getToken();
    return t
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` }
      : { 'Content-Type': 'application/json' };
  },

  // Redirect to login if not authenticated
  guard() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },
};
