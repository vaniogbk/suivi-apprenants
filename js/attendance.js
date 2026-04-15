/* ============================================
   ATTENDANCE Management - Suivi des Apprenants
   ============================================ */

/* Imports removed for local compatibility */

const attendanceManager = {
    currentDate: new Date().toISOString().split('T')[0],
    currentSession: 'default',

    init() {
        this.bindEvents();

        // Set date input to today
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            dateInput.value = this.currentDate;
        }

        this.updateSummary();
    },

    bindEvents() {
        document.getElementById('attendance-date')?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.currentDate = e.target.value;
                this.loadAttendance();
            }
        });

        document.getElementById('load-attendance-btn')?.addEventListener('click', () => {
            this.loadAttendance();
        });

        document.getElementById('save-attendance-btn')?.addEventListener('click', () => {
            this.saveAttendance();
        });
    },

    loadAttendance() {
        const tbody = document.getElementById('attendance-tbody');
        if (!tbody) return;

        const students = dataManager.getStudents();
        const records = dataManager.getAttendance(this.currentDate, this.currentSession);

        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4">Aucun apprenant enregistré. Ajoutez des apprenants d'abord.</td></tr>`;
            return;
        }

        students.forEach(student => {
            const tr = document.createElement('tr');
            const status = records[student.id]?.status || '';
            const note = records[student.id]?.note || '';

            let avatarHtml = `<div class="avatar avatar-sm">${ui.createAvatar(student.name)}</div>`;
            if (student.photo) {
                avatarHtml = `<img src="${student.photo}" class="avatar avatar-sm">`;
            }

            tr.innerHTML = `
                <td class="flex items-center gap-md">
                    ${avatarHtml}
                    <div>
                        <div class="font-bold">${student.name}</div>
                        <div class="text-sm text-secondary">${student.group || ''}</div>
                    </div>
                </td>
                <td>
                    <div class="attendance-options">
                        <label>
                            <input type="radio" name="status-${student.id}" value="present" class="attendance-radio" ${status === 'present' ? 'checked' : ''}>
                            <div class="attendance-label" title="Présent">P</div>
                        </label>
                        <label>
                            <input type="radio" name="status-${student.id}" value="absent" class="attendance-radio" ${status === 'absent' ? 'checked' : ''}>
                            <div class="attendance-label" title="Absent">A</div>
                        </label>
                        <label>
                            <input type="radio" name="status-${student.id}" value="late" class="attendance-radio" ${status === 'late' ? 'checked' : ''}>
                            <div class="attendance-label" title="Retard">R</div>
                        </label>
                    </div>
                </td>
                <td>
                    <input type="text" class="form-input text-sm" placeholder="Note / Heure" value="${note}" id="note-${student.id}">
                </td>
                <td>
                    <button class="btn btn-ghost btn-sm" title="Effacer" onclick="document.querySelectorAll('input[name=\\'status-${student.id}\\']').forEach(r => r.checked = false)">
                        <i class="ph ph-eraser"></i>
                    </button>
                </td>
            `;

            // Auto-update counters on change
            tr.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', () => this.updateCounters());
            });

            tbody.appendChild(tr);
        });

        this.updateCounters();
    },

    saveAttendance() {
        const students = dataManager.getStudents();
        const records = {};
        let hasData = false;

        students.forEach(student => {
            const radios = document.getElementsByName(`status-${student.id}`);
            let status = null;
            radios.forEach(r => { if (r.checked) status = r.value; });

            const note = document.getElementById(`note-${student.id}`).value;

            if (status) {
                records[student.id] = { status, note };
                hasData = true;
            }
        });

        if (hasData) {
            dataManager.saveAttendance(this.currentDate, this.currentSession, records);
            ui.toast('Présences enregistrées avec succès', 'success');
            this.updateSummary();
        } else {
            ui.toast('Aucune donnée à enregistrer', 'warning');
        }
    },

    updateCounters() {
        let present = 0;
        let absent = 0;

        document.querySelectorAll('input[value="present"]:checked').forEach(() => present++);
        document.querySelectorAll('input[value="absent"]:checked').forEach(() => absent++);
        // Late counts as present for the simple counters, or separate. Let's keep simple.

        document.getElementById('count-present').textContent = `${present} Présents`;
        document.getElementById('count-absent').textContent = `${absent} Absents`;
    },

    updateSummary() {
        // Update dashboard KPIs
        const today = new Date().toISOString().split('T')[0];
        const records = dataManager.getAttendance(today, 'default');
        const count = Object.keys(records).length;

        const summary = document.getElementById('today-summary');
        if (summary) {
            if (count > 0) {
                // Calculate stats
                let p = 0, a = 0, r = 0;
                Object.values(records).forEach(rec => {
                    if (rec.status === 'present') p++;
                    if (rec.status === 'absent') a++;
                    if (rec.status === 'late') r++;
                });

                summary.innerHTML = `
                    <div class="flex flex-col gap-4">
                        <div class="flex justify-around text-center w-full">
                            <div><div class="text-success-600 font-bold text-2xl">${p}</div><div class="text-sm">Présents</div></div>
                            <div><div class="text-danger-600 font-bold text-2xl">${a}</div><div class="text-sm">Absents</div></div>
                            <div><div class="text-warning-600 font-bold text-2xl">${r}</div><div class="text-sm">Retards</div></div>
                        </div>
                        <p class="text-secondary text-sm mt-2">Dernière mise à jour : ${new Date().toLocaleTimeString()}</p>
                    </div>
                `;
                summary.className = 'p-4';
            } else {
                summary.innerHTML = `
                    <i class="ph ph-calendar-x empty-icon"></i>
                    <p class="empty-text">Aucune présence enregistrée aujourd'hui</p>
                    <button class="btn btn-primary" onclick="window.app.navigateTo('attendance')">Commencer</button>
                `;
                summary.className = 'empty-state';
            }
        }
    }
};
