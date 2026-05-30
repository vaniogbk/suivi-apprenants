/* ============================================
   ATTENDANCE Management - Suivi des Apprenants
   ============================================ */

const attendanceManager = {
    currentDate:    new Date().toISOString().split('T')[0],
    currentSession: 'default',

    init() {
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) dateInput.value = this.currentDate;
        this.bindEvents();
        this.updateSummary();
    },

    bindEvents() {
        document.getElementById('attendance-date')?.addEventListener('change', e => {
            if (e.target.value) { this.currentDate = e.target.value; this.loadAttendance(); }
        });
        document.getElementById('load-attendance-btn')?.addEventListener('click', () => this.loadAttendance());
        document.getElementById('save-attendance-btn')?.addEventListener('click', () => this.saveAttendance());
        document.getElementById('download-attendance-btn')?.addEventListener('click', () => this.exportCurrentSheetPDF());
    },

    // Étudiants filtrés selon la formation sélectionnée
    _getStudentsForSession(sessionId) {
        const formations = formationsManager?.formations || [];
        const formation  = formations.find(f => f.id === sessionId);
        if (formation && formation.group_name) {
            return dataManager.getStudents(formation.group_name);
        }
        // session sans formation associée → tous les étudiants
        return dataManager.getStudents();
    },

    async loadAttendance() {
        const sessionEl = document.getElementById('attendance-session');
        if (sessionEl) this.currentSession = sessionEl.value || 'default';

        const tbody = document.getElementById('attendance-tbody');
        if (!tbody) return;

        // Masquer le bouton télécharger lors du rechargement
        const dlBtn = document.getElementById('download-attendance-btn');
        if (dlBtn) dlBtn.style.display = 'none';

        const students = this._getStudentsForSession(this.currentSession);
        const records  = await dataManager.getAttendance(this.currentDate, this.currentSession);

        tbody.innerHTML = '';

        if (!students.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:var(--spacing-xl)">
                <div class="empty-state">
                    <i class="ph ph-users empty-icon"></i>
                    <p class="empty-text">Aucun apprenant dans cette formation.<br>Ajoutez des apprenants depuis la page <strong>Apprenants</strong>.</p>
                </div>
            </td></tr>`;
            return;
        }

        students.forEach(student => {
            const tr     = document.createElement('tr');
            const status = records[student.id]?.status || '';
            const note   = records[student.id]?.note   || '';

            let avatarHtml = `<div class="avatar avatar-sm">${ui.createAvatar(student.name)}</div>`;
            if (student.photo) avatarHtml = `<img src="${student.photo}" class="avatar avatar-sm" alt="${student.name}">`;

            tr.innerHTML = `
                <td>
                    <div class="flex items-center gap-md">
                        ${avatarHtml}
                        <div>
                            <div class="font-bold">${student.name}</div>
                            <div style="font-size:.8rem;color:var(--text-secondary)">${student.group || ''}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="attendance-options">
                        ${['present','absent','late'].map(s => `
                        <label>
                            <input type="radio" name="status-${student.id}" value="${s}" class="attendance-radio" ${status === s ? 'checked' : ''}>
                            <div class="attendance-label" title="${s === 'present' ? 'Présent' : s === 'absent' ? 'Absent' : 'Retard'}">${s === 'present' ? 'P' : s === 'absent' ? 'A' : 'R'}</div>
                        </label>`).join('')}
                    </div>
                </td>
                <td>
                    <input type="text" class="form-input" style="font-size:.85rem" placeholder="Note / Heure" value="${note}" id="note-${student.id}" title="Note ou heure d'arrivée">
                </td>
                <td>
                    <button type="button" class="btn btn-ghost btn-sm" title="Effacer"
                        onclick="document.querySelectorAll('input[name=&quot;status-${student.id}&quot;]').forEach(r => r.checked = false); attendanceManager.updateCounters()">
                        <i class="ph ph-eraser"></i>
                    </button>
                </td>`;

            tr.querySelectorAll('input[type="radio"]').forEach(r => r.addEventListener('change', () => this.updateCounters()));
            tbody.appendChild(tr);
        });

        this.updateCounters();

        // Si des présences existent déjà, afficher le bouton télécharger
        if (Object.keys(records).length > 0 && dlBtn) {
            dlBtn.style.display = 'inline-flex';
        }
    },

    async saveAttendance() {
        const students = this._getStudentsForSession(this.currentSession);
        const records  = {};
        let hasData    = false;

        students.forEach(student => {
            const checked = document.querySelector(`input[name="status-${student.id}"]:checked`);
            const note    = document.getElementById(`note-${student.id}`)?.value || '';
            if (checked) { records[student.id] = { status: checked.value, note }; hasData = true; }
        });

        if (!hasData) { ui.toast('Aucune donnée à enregistrer', 'warning'); return; }

        await dataManager.saveAttendance(this.currentDate, this.currentSession, records);
        ui.toast('Présences enregistrées ✓', 'success');
        this.updateSummary();

        // Afficher le bouton télécharger après enregistrement
        const dlBtn = document.getElementById('download-attendance-btn');
        if (dlBtn) dlBtn.style.display = 'inline-flex';
    },

    updateCounters() {
        let present = 0, absent = 0, late = 0;
        document.querySelectorAll('.attendance-radio:checked').forEach(r => {
            if (r.value === 'present') present++;
            else if (r.value === 'absent') absent++;
            else if (r.value === 'late') late++;
        });
        const el = id => document.getElementById(id);
        if (el('count-present')) el('count-present').textContent = `${present + late} Présents`;
        if (el('count-absent'))  el('count-absent').textContent  = `${absent} Absents`;
    },

    updateSummary() {
        const today   = new Date().toISOString().split('T')[0];
        const records = (dataManager.data.attendance[today] || {});
        let p = 0, a = 0, r = 0;
        Object.values(records).forEach(sess =>
            Object.values(sess).forEach(rec => {
                if (rec.status === 'present') p++;
                else if (rec.status === 'absent') a++;
                else if (rec.status === 'late') r++;
            })
        );
        const count   = p + a + r;
        const summary = document.getElementById('today-summary');
        if (!summary) return;

        if (count > 0) {
            summary.innerHTML = `
                <div style="display:flex;justify-content:space-around;text-align:center;width:100%;padding:var(--spacing-md) 0">
                    <div><div style="font-size:2rem;font-weight:800;color:var(--success-600)">${p}</div><div style="font-size:.85rem;color:var(--text-secondary)">Présents</div></div>
                    <div><div style="font-size:2rem;font-weight:800;color:var(--danger-600)">${a}</div><div style="font-size:.85rem;color:var(--text-secondary)">Absents</div></div>
                    <div><div style="font-size:2rem;font-weight:800;color:var(--warning-600)">${r}</div><div style="font-size:.85rem;color:var(--text-secondary)">Retards</div></div>
                </div>
                <p style="font-size:.8rem;color:var(--text-tertiary);margin-top:var(--spacing-sm)">Mis à jour à ${new Date().toLocaleTimeString('fr-FR')}</p>`;
            summary.className = 'p-4';
        } else {
            summary.innerHTML = `
                <i class="ph ph-calendar-x empty-icon"></i>
                <p class="empty-text">Aucune présence enregistrée aujourd'hui</p>
                <button type="button" class="btn btn-primary" onclick="window.app.navigateTo('attendance')">Commencer l'appel</button>`;
            summary.className = 'empty-state';
        }
    },

    exportCurrentSheetPDF() {
        const students = this._getStudentsForSession(this.currentSession);
        const records  = (dataManager.data.attendance[this.currentDate] || {})[this.currentSession] || {};
        if (!students.length) { ui.toast('Aucun apprenant à exporter', 'error'); return; }
        if (typeof Exports !== 'undefined') {
            Exports.attendanceSheetPDF(this.currentDate, this.currentSession, students, records);
        } else {
            ui.toast('Module export non disponible', 'error');
        }
    },
};
