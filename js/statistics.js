/* ============================================
   STATISTICS & EXPORT - Suivi des Apprenants
   ============================================ */

/* Imports removed for local compatibility */

const statisticsManager = {
    init() {
        this.bindEvents();
        this.renderDashboardStats();
    },

    bindEvents() {
        document.getElementById('export-csv-btn')?.addEventListener('click', () => {
            this.exportCSV();
        });

        document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
            this.exportPDF();
        });

        // Refresh stats when navigating to stats view?
    },

    async renderDashboardStats() {
        const students = dataManager.getStudents();
        let formationsCount = 0;
        try {
            const r = await fetch('/api/formations');
            const f = await r.json();
            formationsCount = Array.isArray(f) ? f.length : 0;
        } catch (e) { formationsCount = 0; }

        let totalPresent = 0;
        let totalRecords = 0;

        // Calculate global attendance rate
        Object.values(dataManager.data.attendance).forEach(dateRecord => {
            Object.values(dateRecord).forEach(sessionRecord => {
                Object.values(sessionRecord).forEach(rec => {
                    if (rec.status) {
                        totalRecords++;
                        if (rec.status === 'present' || rec.status === 'late') {
                            totalPresent++;
                        }
                    }
                });
            });
        });

        const rate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

        // Update Dashboard KPIs
        this.updateElement('kpi-total-students', students.length);
        this.updateElement('kpi-attendance-rate', `${rate}%`);
        this.updateElement('kpi-total-sessions', formationsCount);

        // Update Trend Indicator (Simple logic for now: compare last session with avg)
        // ...

        this.renderDonut(rate);
        this.renderFormationBars();
    },

    renderStatsTable() {
        const tbody = document.getElementById('stats-tbody');
        if (!tbody) return;

        const students = dataManager.getStudents();
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4">Aucune donnée disponible</td></tr>`;
            return;
        }

        students.forEach(student => {
            const stats = this.getStudentStats(student.id);
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td class="font-medium">${student.name}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <div style="width: 100px; height: 6px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${stats.rate}%; height: 100%; background: var(${stats.rate >= 80 ? '--success-500' : stats.rate >= 50 ? '--warning-500' : '--danger-500'});"></div>
                        </div>
                        <span>${stats.rate}%</span>
                    </div>
                </td>
                <td class="text-success-600 font-bold">${stats.present + stats.late}</td>
                <td class="text-danger-600 font-bold">${stats.absent}</td>
                <td class="text-warning-600 font-bold">${stats.late}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    getStudentStats(studentId) {
        let present = 0;
        let absent = 0;
        let late = 0;
        let total = 0;

        // Iterate all records
        Object.values(dataManager.data.attendance).forEach(dateRecord => {
            Object.values(dateRecord).forEach(sessionRecord => {
                const rec = sessionRecord[studentId];
                if (rec) {
                    total++;
                    if (rec.status === 'present') present++;
                    else if (rec.status === 'absent') absent++;
                    else if (rec.status === 'late') late++;
                }
            });
        });

        const effectivePresent = present + late; // Late counts as present for rate? Yes usually.
        const rate = total > 0 ? Math.round((effectivePresent / total) * 100) : 0;

        return { present, absent, late, total, rate };
    },

    updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    renderDonut(rate) {
        const el = document.getElementById('stats-chart-placeholder');
        if (!el) return;
        const r   = 54;
        const circ = 2 * Math.PI * r;
        const dash = (rate / 100) * circ;
        const color = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';

        el.innerHTML = `
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--bg-tertiary)" stroke-width="16"/>
            <circle cx="70" cy="70" r="${r}" fill="none" stroke="${color}" stroke-width="16"
              stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ / 4}"
              stroke-linecap="round" style="transition:stroke-dasharray .6s ease"/>
            <text x="70" y="65" text-anchor="middle" font-size="22" font-weight="800"
              fill="var(--text-primary)" font-family="Inter,sans-serif">${rate}%</text>
            <text x="70" y="84" text-anchor="middle" font-size="11"
              fill="var(--text-tertiary)" font-family="Inter,sans-serif">présence</text>
          </svg>
          <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;font-size:.8rem">
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:10px;border-radius:50%;background:#10B981;display:inline-block"></span>≥ 80% Bon
            </span>
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:10px;border-radius:50%;background:#F59E0B;display:inline-block"></span>50–79% Moyen
            </span>
            <span style="display:flex;align-items:center;gap:5px">
              <span style="width:10px;height:10px;border-radius:50%;background:#EF4444;display:inline-block"></span>< 50% Faible
            </span>
          </div>`;
    },

    renderFormationBars() {
        const el = document.getElementById('stats-formation-bars');
        if (!el) return;

        const groups = dataManager.getGroups();
        if (!groups.length) {
            el.innerHTML = `<div class="empty-state"><i class="ph ph-chart-bar empty-icon"></i><p class="empty-text">Enregistrez des présences pour voir les statistiques par formation</p></div>`;
            return;
        }

        const rows = groups.map(group => {
            const students = dataManager.getStudents(group);
            if (!students.length) return null;

            let present = 0, absent = 0, late = 0, total = 0;
            students.forEach(s => {
                const st = this.getStudentStats(s.id);
                present += st.present; absent += st.absent; late += st.late; total += st.total;
            });
            const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
            const color = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';
            return { group, rate, color, students: students.length, total };
        }).filter(Boolean);

        if (!rows.length) {
            el.innerHTML = `<div class="empty-state"><i class="ph ph-chart-bar empty-icon"></i><p class="empty-text">Aucune présence enregistrée</p></div>`;
            return;
        }

        el.innerHTML = rows.map(r => `
          <div style="margin-bottom:var(--spacing-md)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-weight:600;font-size:.9rem;color:var(--text-primary)">${r.group}</span>
              <div style="display:flex;align-items:center;gap:12px;font-size:.8rem;color:var(--text-secondary)">
                <span>${r.students} apprenants</span>
                <span style="font-weight:700;color:${r.color};font-size:1rem">${r.rate}%</span>
              </div>
            </div>
            <div style="height:10px;background:var(--bg-tertiary);border-radius:5px;overflow:hidden">
              <div style="height:100%;width:${r.rate}%;background:${r.color};border-radius:5px;transition:width .6s ease"></div>
            </div>
          </div>`).join('');
    },

    exportCSV() {
        const students = dataManager.getStudents();
        const headers = ['ID', 'Nom', 'Email', 'Groupe', 'Taux Présence', 'Présences', 'Absences', 'Retards'];

        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

        students.forEach(student => {
            const stats = this.getStudentStats(student.id);
            const row = [
                student.id,
                `"${student.name}"`,
                student.email || '',
                student.group || '',
                `${stats.rate}%`,
                stats.present,
                stats.absent,
                stats.late
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `suivi_apprenants_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("Rapport de Suivi des Apprenants", 20, 20);

        doc.setFontSize(12);
        doc.text(`Date du rapport: ${new Date().toLocaleDateString()}`, 20, 30);

        const students = dataManager.getStudents();
        let y = 50;

        students.forEach((student, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const stats = this.getStudentStats(student.id);
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(`${student.name} (${student.group || 'Sans groupe'})`, 20, y);

            doc.setFont(undefined, 'normal');
            doc.text(`Présence: ${stats.rate}%   Présents: ${stats.present}   Absents: ${stats.absent}   Retards: ${stats.late}`, 20, y + 6);

            doc.setDrawColor(200);
            doc.line(20, y + 10, 190, y + 10);

            y += 18;
        });

        doc.save(`rapport_suivi_${new Date().toISOString().split('T')[0]}.pdf`);
    }
};
