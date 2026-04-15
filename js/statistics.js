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

    renderDashboardStats() {
        const students = dataManager.getStudents();
        const sessions = dataManager.data.sessions.length;

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
        this.updateElement('kpi-total-sessions', sessions);

        // Update Trend Indicator (Simple logic for now: compare last session with avg)
        // ...

        // Update Stats Chart Placeholder
        this.renderChart(rate);
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

    // Simple textual chart render or SVG injection
    renderChart(rate) {
        const container = document.getElementById('stats-chart-placeholder');
        if (!container) return;

        // Simple Pie Chart using conic-gradient
        const color = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';

        container.innerHTML = `
            <div style="
                width: 150px; 
                height: 150px; 
                border-radius: 50%; 
                background: conic-gradient(${color} ${rate}%, var(--bg-tertiary) 0);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            ">
                <div style="
                    width: 120px;
                    height: 120px;
                    background: var(--bg-primary);
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                ">
                    <span style="font-size: 2rem; font-weight: bold; color: var(--text-primary);">${rate}%</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Présence Globale</span>
                </div>
            </div>
        `;
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
