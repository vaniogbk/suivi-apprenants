/* ============================================
   STUDENT Management - Suivi des Apprenants
   ============================================ */

/* Imports removed for local compatibility */

const studentManager = {
    init() {
        this.bindEvents();
        this.renderStudents();
        this.updateStats();
    },

    bindEvents() {
        // Add Student Button
        document.getElementById('add-student-btn')?.addEventListener('click', () => {
            this.openStudentModal();
        });

        // Save Student Button
        document.getElementById('save-student-btn')?.addEventListener('click', () => {
            this.saveStudent();
        });

        // Search Input
        document.getElementById('student-search')?.addEventListener('input', (e) => {
            this.renderStudents(e.target.value);
        });

        // Photo Upload Preview
        document.getElementById('student-photo-input')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const avatar = document.getElementById('student-avatar-preview');
                    avatar.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    avatar.dataset.image = e.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    },

    openStudentModal(studentId = null) {
        const modal = document.getElementById('student-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('student-form');
        const avatarPreview = document.getElementById('student-avatar-preview');

        // Reset form
        form.reset();
        avatarPreview.innerHTML = '<i class="ph ph-user"></i>';
        delete avatarPreview.dataset.image;
        document.getElementById('student-id').value = '';

        if (studentId) {
            const student = dataManager.getStudents().find(s => s.id === studentId);
            if (student) {
                title.textContent = 'Modifier l\'apprenant';
                document.getElementById('student-id').value = student.id;
                document.getElementById('student-name').value = student.name;
                document.getElementById('student-email').value = student.email || '';
                document.getElementById('student-group').value = student.group || '';

                if (student.photo) {
                    avatarPreview.innerHTML = `<img src="${student.photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    avatarPreview.dataset.image = student.photo;
                }
            }
        } else {
            title.textContent = 'Ajouter un apprenant';
        }

        ui.openModal('student-modal');
    },

    async saveStudent() {
        const id = document.getElementById('student-id').value;
        const name = document.getElementById('student-name').value;
        const email = document.getElementById('student-email').value;
        const group = document.getElementById('student-group').value;
        const photo = document.getElementById('student-avatar-preview').dataset.image;

        if (!name) {
            ui.toast('Le nom est obligatoire', 'error');
            return;
        }

        const studentData = { name, email, group, photo };

        if (id) {
            await dataManager.updateStudent(id, studentData);
            ui.toast('Apprenant modifié avec succès', 'success');
        } else {
            await dataManager.addStudent(studentData);
            ui.toast('Apprenant ajouté avec succès', 'success');
        }

        ui.closeModal('student-modal');
        this.renderStudents();
        this.updateStats();
    },

    deleteStudent(id) {
        ui.confirm('Êtes-vous sûr de vouloir supprimer cet apprenant ?').then(async confirmed => {
            if (confirmed) {
                await dataManager.deleteStudent(id);
                this.renderStudents();
                this.updateStats();
                ui.toast('Apprenant supprimé', 'success');
            }
        });
    },

    renderStudents(filter = '') {
        const grid = document.getElementById('students-grid');
        if (!grid) return;

        const students = dataManager.getStudents();
        const filtered = students.filter(s =>
            s.name.toLowerCase().includes(filter.toLowerCase()) ||
            (s.group && s.group.toLowerCase().includes(filter.toLowerCase()))
        );

        grid.innerHTML = '';

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full empty-state">
                    <i class="ph ph-users empty-icon"></i>
                    <p class="empty-text">Aucun apprenant trouvé</p>
                    ${filter ? '' : '<button class="btn btn-primary" onclick="document.getElementById(\'add-student-btn\').click()">Ajouter le premier</button>'}
                </div>
            `;
            return;
        }

        filtered.forEach(student => {
            const card = document.createElement('div');
            card.className = 'card student-card';

            let avatarHtml = `<div class="avatar avatar-lg mx-auto mb-4">${ui.createAvatar(student.name)}</div>`;
            if (student.photo) {
                avatarHtml = `<img src="${student.photo}" class="avatar avatar-lg mx-auto mb-4" style="object-fit:cover">`;
            }

            card.innerHTML = `
                <div class="text-center p-4">
                    ${avatarHtml}
                    <h3 class="font-bold text-lg mb-1">${student.name}</h3>
                    <p class="text-secondary text-sm mb-4">${student.group || 'Aucun groupe'}</p>
                    
                    <div class="flex justify-center gap-2 mt-4">
                        <button class="btn btn-sm btn-secondary edit-btn" data-id="${student.id}">
                            <i class="ph ph-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${student.id}">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            card.querySelector('.edit-btn').addEventListener('click', () => this.openStudentModal(student.id));
            card.querySelector('.delete-btn').addEventListener('click', () => this.deleteStudent(student.id));

            grid.appendChild(card);
        });
    },

    updateStats() {
        const container = document.getElementById('kpi-total-students');
        if (container) {
            container.textContent = dataManager.getStudents().length;
        }
    }
};
