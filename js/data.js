/* ============================================
   DATA Management — EducTrack
   API REST → Railway MySQL via Vercel functions
   Auth headers injected from Auth.headers()
   ============================================ */

const dataManager = {
  data: {
    students:   [],
    attendance: {},
    sessions:   [{ id: 'default', name: 'Formation Principale' }],
    settings:   {}
  },

  _h() { return typeof Auth !== 'undefined' ? Auth.headers() : { 'Content-Type': 'application/json' }; },

  async init() {
    try {
      const [students, sessions] = await Promise.all([
        fetch('/api/students', { headers: this._h() }).then(r => r.json()),
        fetch('/api/sessions',  { headers: this._h() }).then(r => r.json()),
      ]);
      this.data.students = Array.isArray(students) ? students : [];
      this.data.sessions = Array.isArray(sessions) && sessions.length
        ? sessions
        : [{ id: 'default', name: 'Formation Principale' }];
      // L'API répond de nouveau : on tente de renvoyer ce qui n'avait pas pu
      // être synchronisé pendant une coupure, pour éviter une désync silencieuse.
      this._flushPendingSync();
    } catch (e) {
      console.warn('API indisponible, mode localStorage de secours', e);
      this._loadFromStorage();
    }
  },

  // ── Sync de secours (P2) ──
  // Quand un appel API échoue (réseau coupé, cold start, etc.), on garde une
  // trace de l'opération pour la rejouer dès que l'API redevient joignable,
  // au lieu de laisser la donnée locale et distante diverger sans le dire.
  _queuePendingSync(url, options) {
    try {
      const queue = JSON.parse(localStorage.getItem('eductrack_pending_sync') || '[]');
      queue.push({ url, options, ts: Date.now() });
      localStorage.setItem('eductrack_pending_sync', JSON.stringify(queue));
    } catch (_) {}
  },

  async _flushPendingSync() {
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem('eductrack_pending_sync') || '[]'); } catch (_) { return; }
    if (!queue.length) return;

    const remaining = [];
    for (const item of queue) {
      try {
        const res = await fetch(item.url, item.options);
        if (!res.ok) remaining.push(item);
      } catch (_) {
        remaining.push(item);
      }
    }
    localStorage.setItem('eductrack_pending_sync', JSON.stringify(remaining));
    if (remaining.length < queue.length) {
      console.info(`eductrack: ${queue.length - remaining.length} opération(s) resynchronisée(s) avec le serveur`);
    }
  },

  _loadFromStorage() {
    const stored = localStorage.getItem('eductrack_data');
    if (stored) { try { Object.assign(this.data, JSON.parse(stored)); } catch (_) {} }
  },
  _saveToStorage() {
    localStorage.setItem('eductrack_data', JSON.stringify(this.data));
  },

  // ── STUDENTS ──
  getStudents(groupId = null) {
    if (groupId && groupId !== 'all') return this.data.students.filter(s => s.group === groupId);
    return this.data.students;
  },

  async addStudent(student) {
    student.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    student.created_at = new Date().toISOString();
    try {
      await fetch('/api/students', {
        method: 'POST', headers: this._h(), body: JSON.stringify(student),
      });
    } catch (e) {
      console.warn('addStudent API error', e);
      this._queuePendingSync('/api/students', { method: 'POST', headers: this._h(), body: JSON.stringify(student) });
    }
    this.data.students.push(student);
    this._saveToStorage();
    return student;
  },

  async updateStudent(id, updates) {
    const index = this.data.students.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.data.students[index] = { ...this.data.students[index], ...updates };
    try {
      await fetch(`/api/students?id=${id}`, {
        method: 'PUT', headers: this._h(), body: JSON.stringify(updates),
      });
    } catch (e) {
      console.warn('updateStudent API error', e);
      this._queuePendingSync(`/api/students?id=${id}`, { method: 'PUT', headers: this._h(), body: JSON.stringify(updates) });
    }
    this._saveToStorage();
    return true;
  },

  async deleteStudent(id) {
    this.data.students = this.data.students.filter(s => s.id !== id);
    try { await fetch(`/api/students?id=${id}`, { method: 'DELETE', headers: this._h() }); }
    catch (e) {
      console.warn('deleteStudent API error', e);
      this._queuePendingSync(`/api/students?id=${id}`, { method: 'DELETE', headers: this._h() });
    }
    this._saveToStorage();
  },

  // ── ATTENDANCE ──
  async getAttendance(date, sessionId = 'default') {
    try {
      const res  = await fetch(`/api/attendance?date=${date}&session=${sessionId}`, { headers: this._h() });
      const data = await res.json();
      if (!this.data.attendance[date]) this.data.attendance[date] = {};
      this.data.attendance[date][sessionId] = data;
      return data;
    } catch (e) {
      return (this.data.attendance[date] || {})[sessionId] || {};
    }
  },

  async saveAttendance(date, sessionId, records) {
    if (!this.data.attendance[date]) this.data.attendance[date] = {};
    this.data.attendance[date][sessionId] = records;
    this._saveToStorage();
    try {
      await fetch('/api/attendance', {
        method: 'POST', headers: this._h(),
        body: JSON.stringify({ date, session_id: sessionId, records }),
      });
    } catch (e) {
      console.warn('saveAttendance API error', e);
      this._queuePendingSync('/api/attendance', {
        method: 'POST', headers: this._h(),
        body: JSON.stringify({ date, session_id: sessionId, records }),
      });
    }
  },

  // ── UTILS ──
  getGroups() {
    return Array.from(new Set(this.data.students.map(s => s.group).filter(Boolean)));
  },
  exportData()  { return JSON.stringify(this.data, null, 2); },
  importData(json) {
    try {
      const p = JSON.parse(json);
      if (p.students && p.attendance) { this.data = p; this._saveToStorage(); return true; }
      return false;
    } catch { return false; }
  },
  async resetData() {
    this.data = { students: [], attendance: {}, sessions: [{ id: 'default', name: 'Formation Principale' }], settings: {} };
    this._saveToStorage();
  },
  generateDemoData() { console.info('generateDemoData désactivé en mode API'); },
  save() { this._saveToStorage(); },
};
