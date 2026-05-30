/* ============================================
   EXPORTS & ARCHIVES — EducTrack
   PDF (jsPDF) + CSV pour toutes les listes
   ============================================ */

const Exports = {

  // ── Helpers ──
  _school() {
    return typeof Auth !== 'undefined' ? Auth.getSchool() : null;
  },

  _schoolName() {
    return this._school()?.name || 'EducTrack';
  },

  _dateStr(d) {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  },

  _today() {
    return new Date().toLocaleDateString('fr-FR');
  },

  _fileName(prefix) {
    return `${prefix}_${new Date().toISOString().split('T')[0]}`;
  },

  _newDoc() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    return doc;
  },

  _header(doc, title, subtitle = '') {
    // Band colorée
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('EducTrack', 14, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this._schoolName(), 14, 17);

    // Titre
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, 14, 32);
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(subtitle, 14, 39);
    }
    doc.setTextColor(30, 41, 59);
    return subtitle ? 46 : 39;
  },

  _footer(doc) {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`EducTrack — ${this._schoolName()} — Généré le ${this._today()}`, 14, 290);
      doc.text(`Page ${i}/${pages}`, 196, 290, { align: 'right' });
    }
  },

  _tableHeader(doc, y, cols, widths) {
    doc.setFillColor(238, 242, 255);
    doc.rect(14, y - 5, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    let x = 14;
    cols.forEach((col, i) => { doc.text(col, x + 2, y); x += widths[i]; });
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    return y + 6;
  },

  // ──────────────────────────────────────────
  // 1. LISTE DES APPRENANTS (PDF)
  // ──────────────────────────────────────────
  studentListPDF(groupFilter = null) {
    const doc  = this._newDoc();
    const all  = dataManager.getStudents();
    const list = groupFilter ? all.filter(s => s.group === groupFilter) : all;
    const title    = groupFilter ? `Liste des apprenants — ${groupFilter}` : 'Liste complète des apprenants';
    const subtitle = `Total : ${list.length} apprenant(s) — ${this._today()}`;
    let y = this._header(doc, title, subtitle) + 4;

    const cols   = ['N°', 'Nom complet', 'Formation / Groupe', 'Email'];
    const widths = [12, 70, 60, 40];
    y = this._tableHeader(doc, y, cols, widths);

    list.forEach((s, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 4, 182, 7, 'F'); }
      doc.setFontSize(9);
      let x = 14;
      [String(i + 1), s.name, s.group || '—', s.email || '—'].forEach((v, j) => {
        doc.text(String(v).substring(0, j === 1 ? 35 : 25), x + 2, y);
        x += widths[j];
      });
      y += 7;
    });

    this._footer(doc);
    doc.save(`${this._fileName('apprenants' + (groupFilter ? '_' + groupFilter : ''))}.pdf`);
    ui.toast('Liste exportée en PDF', 'success');
  },

  // ──────────────────────────────────────────
  // 2. LISTE DES APPRENANTS (CSV)
  // ──────────────────────────────────────────
  studentListCSV(groupFilter = null) {
    const all  = dataManager.getStudents();
    const list = groupFilter ? all.filter(s => s.group === groupFilter) : all;
    const rows = [['N°', 'Nom complet', 'Formation', 'Email']];
    list.forEach((s, i) => rows.push([i + 1, `"${s.name}"`, s.group || '', s.email || '']));
    this._downloadCSV(rows, `apprenants${groupFilter ? '_' + groupFilter : ''}`);
    ui.toast('Liste exportée en CSV', 'success');
  },

  // ──────────────────────────────────────────
  // 3. FEUILLE DE PRÉSENCE (PDF imprimable)
  // ──────────────────────────────────────────
  attendanceSheetPDF(date, sessionId, students, records) {
    const doc      = this._newDoc();
    const session  = dataManager.data.sessions.find(s => s.id === sessionId);
    const sesName  = session?.name || sessionId;
    const title    = `Feuille de présence`;
    const subtitle = `${sesName} — ${this._dateStr(date)}`;
    let y = this._header(doc, title, subtitle) + 4;

    const cols   = ['N°', 'Nom de l\'apprenant', 'P', 'A', 'R', 'Observation'];
    const widths = [10, 80, 10, 10, 10, 62];
    y = this._tableHeader(doc, y, cols, widths);

    students.forEach((s, i) => {
      if (y > 268) { doc.addPage(); y = 20; }
      const rec   = records[s.id] || { status: 'present' };
      const isP   = rec.status === 'present';
      const isA   = rec.status === 'absent';
      const isR   = rec.status === 'late';
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 4, 182, 8, 'F'); }
      doc.setFontSize(9);
      let x = 14;
      doc.text(String(i + 1), x + 2, y); x += widths[0];
      doc.text(s.name.substring(0, 38), x + 2, y); x += widths[1];

      // Checkboxes
      const checkColor = (checked, color) => {
        if (checked) {
          doc.setFillColor(...color);
          doc.circle(x + 4, y - 1, 3, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.text('✓', x + 2.5, y + 0.5);
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'normal');
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.circle(x + 4, y - 1, 3, 'S');
        }
        x += widths[['P','A','R'][['present','absent','late'].indexOf(rec.status === 'present' ? (checked ? 'present' : '') : '')]];
      };

      // Simple text checkboxes
      doc.text(isP ? '✓' : '○', x + 3, y); x += widths[2];
      doc.text(isA ? '✓' : '○', x + 3, y); x += widths[3];
      doc.text(isR ? '✓' : '○', x + 3, y); x += widths[4];
      doc.text(rec.note || '', x + 2, y);
      y += 8;
    });

    // Footer signature block
    if (y + 30 > 275) doc.addPage();
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 100, y);
    doc.line(120, y, 196, y);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Signature du formateur', 14, y + 5);
    doc.text('Cachet de l\'établissement', 120, y + 5);
    doc.text(`P = Présent   A = Absent   R = Retard`, 14, y + 14);
    doc.text(`Total : ${students.length} apprenants`, 196, y + 14, { align: 'right' });

    this._footer(doc);
    doc.save(`${this._fileName('presence_' + sessionId)}.pdf`);
    ui.toast('Feuille de présence exportée', 'success');
  },

  // ──────────────────────────────────────────
  // 4. HISTORIQUE DES PRÉSENCES (PDF)
  // ──────────────────────────────────────────
  async attendanceHistoryPDF(sessionFilter = null) {
    ui.toast('Génération du rapport…', 'info');
    try {
      const url = sessionFilter
        ? `/api/attendance?all=true&session=${sessionFilter}`
        : '/api/attendance?all=true';
      const resp    = await fetch(url, { headers: Auth.headers() });
      const history = await resp.json();

      const doc   = this._newDoc();
      const title = sessionFilter
        ? `Historique des présences — ${dataManager.data.sessions.find(s => s.id === sessionFilter)?.name || sessionFilter}`
        : 'Historique complet des présences';
      let y = this._header(doc, title, `Généré le ${this._today()}`) + 4;

      if (!history.length) {
        doc.setFontSize(11); doc.setTextColor(107, 114, 128);
        doc.text('Aucun enregistrement trouvé.', 14, y + 10);
        this._footer(doc);
        doc.save(`${this._fileName('historique_presence')}.pdf`);
        return;
      }

      // Group by date
      const byDate = {};
      history.forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = [];
        byDate[r.date].push(r);
      });

      const cols   = ['Date', 'Apprenant', 'Formation', 'Statut', 'Note'];
      const widths = [24, 65, 45, 22, 26];

      Object.entries(byDate).forEach(([date, records]) => {
        if (y > 255) { doc.addPage(); y = 20; }
        doc.setFillColor(238, 242, 255);
        doc.rect(14, y - 4, 182, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229);
        doc.text(`📅 ${this._dateStr(date)}  — ${records.length} enregistrement(s)`, 16, y);
        doc.setTextColor(30, 41, 59);
        y += 8;
        y = this._tableHeader(doc, y, cols, widths);

        records.forEach((r, i) => {
          if (y > 275) { doc.addPage(); y = 20; }
          if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 4, 182, 7, 'F'); }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          const statusLabel = r.status === 'present' ? 'Présent' : r.status === 'absent' ? 'Absent' : 'Retard';
          const statusColor = r.status === 'present' ? [5, 150, 105] : r.status === 'absent' ? [220, 38, 38] : [217, 119, 6];
          let x = 14;
          doc.setTextColor(30, 41, 59);
          doc.text(this._dateStr(r.date), x + 2, y); x += widths[0];
          doc.text((r.student_name || '—').substring(0, 30), x + 2, y); x += widths[1];
          doc.text((r.student_group || r.session_id || '—').substring(0, 22), x + 2, y); x += widths[2];
          doc.setTextColor(...statusColor);
          doc.setFont('helvetica', 'bold');
          doc.text(statusLabel, x + 2, y); x += widths[3];
          doc.setTextColor(107, 114, 128);
          doc.setFont('helvetica', 'normal');
          doc.text((r.note || '').substring(0, 14), x + 2, y);
          y += 7;
        });
        y += 4;
      });

      this._footer(doc);
      doc.save(`${this._fileName('historique_presence')}.pdf`);
      ui.toast('Historique exporté en PDF', 'success');
    } catch (e) {
      ui.toast('Erreur export : ' + e.message, 'error');
    }
  },

  // ──────────────────────────────────────────
  // 5. HISTORIQUE DES PRÉSENCES (CSV)
  // ──────────────────────────────────────────
  async attendanceHistoryCSV(sessionFilter = null) {
    try {
      const url  = sessionFilter ? `/api/attendance?all=true&session=${sessionFilter}` : '/api/attendance?all=true';
      const resp = await fetch(url, { headers: Auth.headers() });
      const rows = await resp.json();
      const csv  = [['Date', 'Apprenant', 'Formation', 'Statut', 'Note']];
      rows.forEach(r => csv.push([
        r.date, `"${r.student_name || ''}"`,
        r.student_group || r.session_id || '',
        r.status, `"${r.note || ''}"`,
      ]));
      this._downloadCSV(csv, 'historique_presence');
      ui.toast('Historique exporté en CSV', 'success');
    } catch (e) { ui.toast('Erreur export', 'error'); }
  },

  // ──────────────────────────────────────────
  // 6. LISTE DES FORMATEURS (PDF)
  // ──────────────────────────────────────────
  async formateursPDF() {
    try {
      const resp = await fetch('/api/formateurs', { headers: Auth.headers() });
      const list = await resp.json();
      const doc  = this._newDoc();
      let y = this._header(doc, 'Liste des formateurs', `Total : ${list.length} formateur(s) — ${this._today()}`) + 4;

      const cols   = ['N°', 'Nom complet', 'Formation assignée', 'Email'];
      const widths = [10, 65, 70, 37];
      y = this._tableHeader(doc, y, cols, widths);

      list.forEach((f, i) => {
        if (y > 275) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 4, 182, 7, 'F'); }
        doc.setFontSize(9);
        let x = 14;
        [String(i + 1), f.name, f.formation_name || '—', f.email || '—'].forEach((v, j) => {
          doc.text(String(v).substring(0, j === 1 ? 30 : j === 2 ? 34 : 22), x + 2, y);
          x += widths[j];
        });
        y += 7;
      });

      this._footer(doc);
      doc.save(`${this._fileName('formateurs')}.pdf`);
      ui.toast('Liste des formateurs exportée', 'success');
    } catch (e) { ui.toast('Erreur export', 'error'); }
  },

  // ──────────────────────────────────────────
  // 7. LISTE DES FORMATEURS (CSV)
  // ──────────────────────────────────────────
  async formateursCSV() {
    const resp = await fetch('/api/formateurs', { headers: Auth.headers() });
    const list = await resp.json();
    const rows = [['N°', 'Nom', 'Formation', 'Email']];
    list.forEach((f, i) => rows.push([i + 1, `"${f.name}"`, f.formation_name || '', f.email || '']));
    this._downloadCSV(rows, 'formateurs');
    ui.toast('Exporté en CSV', 'success');
  },

  // ──────────────────────────────────────────
  // 8. RAPPORT STATISTIQUES (PDF)
  // ──────────────────────────────────────────
  statisticsPDF() {
    const doc      = this._newDoc();
    const students = dataManager.getStudents();
    let y = this._header(doc, 'Rapport statistiques de présence', `Total apprenants : ${students.length} — ${this._today()}`) + 4;

    // Global rate
    let totalP = 0, totalT = 0;
    students.forEach(s => { const st = statisticsManager.getStudentStats(s.id); totalP += st.present + st.late; totalT += st.total; });
    const globalRate = totalT > 0 ? Math.round((totalP / totalT) * 100) : 0;

    doc.setFillColor(globalRate >= 80 ? 236 : globalRate >= 50 ? 255 : 254, globalRate >= 80 ? 253 : globalRate >= 50 ? 251 : 242, globalRate >= 80 ? 245 : globalRate >= 50 ? 235 : 242);
    doc.rect(14, y, 182, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(globalRate >= 80 ? 5 : globalRate >= 50 ? 217 : 220, globalRate >= 80 ? 150 : globalRate >= 50 ? 119 : 38, globalRate >= 80 ? 105 : globalRate >= 50 ? 6 : 38);
    doc.text(`Taux de présence global : ${globalRate}%`, 16, y + 10);
    doc.setTextColor(30, 41, 59);
    y += 22;

    // Per group summary
    const groups = dataManager.getGroups();
    if (groups.length) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Résumé par formation', 14, y); y += 7;
      const gcols = ['Formation', 'Apprenants', 'Taux', 'Présences', 'Absences'];
      const gwidths = [70, 25, 25, 30, 32];
      y = this._tableHeader(doc, y, gcols, gwidths);
      groups.forEach(g => {
        const ss = dataManager.getStudents(g);
        let gp = 0, gt = 0, ga = 0;
        ss.forEach(s => { const st = statisticsManager.getStudentStats(s.id); gp += st.present + st.late; gt += st.total; ga += st.absent; });
        const gr = gt > 0 ? Math.round((gp / gt) * 100) : 0;
        let x = 14;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        [g.substring(0, 32), String(ss.length), `${gr}%`, String(gp), String(ga)].forEach((v, j) => {
          if (j === 2) { doc.setTextColor(gr >= 80 ? 5 : gr >= 50 ? 217 : 220, gr >= 80 ? 150 : gr >= 50 ? 119 : 38, gr >= 80 ? 105 : gr >= 50 ? 6 : 38); doc.setFont('helvetica', 'bold'); }
          doc.text(v, x + 2, y); x += gwidths[j];
          doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal');
        });
        y += 7;
      });
      y += 8;
    }

    // Per student detail
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Détail par apprenant', 14, y); y += 7;
    const cols   = ['Apprenant', 'Formation', 'Taux', 'Présences', 'Absences', 'Retards'];
    const widths = [56, 46, 20, 22, 22, 16];
    y = this._tableHeader(doc, y, cols, widths);

    students.forEach((s, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const st = statisticsManager.getStudentStats(s.id);
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y - 4, 182, 7, 'F'); }
      doc.setFontSize(8.5);
      let x = 14;
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal');
      doc.text(s.name.substring(0, 26), x + 2, y); x += widths[0];
      doc.text((s.group || '—').substring(0, 22), x + 2, y); x += widths[1];
      const rColor = st.rate >= 80 ? [5, 150, 105] : st.rate >= 50 ? [217, 119, 6] : [220, 38, 38];
      doc.setTextColor(...rColor); doc.setFont('helvetica', 'bold');
      doc.text(`${st.rate}%`, x + 2, y); x += widths[2];
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal');
      [String(st.present + st.late), String(st.absent), String(st.late)].forEach((v, j) => {
        doc.text(v, x + 2, y); x += widths[j + 3];
      });
      y += 7;
    });

    this._footer(doc);
    doc.save(`${this._fileName('statistiques')}.pdf`);
    ui.toast('Rapport statistiques exporté', 'success');
  },

  // ── CSV helper ──
  _downloadCSV(rows, name) {
    const content = 'data:text/csv;charset=utf-8,﻿' + rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(content);
    a.download = `${this._fileName(name)}.csv`;
    a.click();
  },
};
