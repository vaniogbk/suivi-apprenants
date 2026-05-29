/* ============================================
   FORMATIONS MANAGER — EducTrack
   ============================================ */

const formationsManager = {
  formations: [],

  async init() {
    this.bindEvents();
  },

  async load() {
    try {
      const resp = await fetch('/api/formations');
      this.formations = Array.isArray(await resp.clone().json()) ? await resp.json() : [];
    } catch (e) {
      this.formations = [];
    }
    return this.formations;
  },

  bindEvents() {
    document.getElementById('add-formation-btn')
      ?.addEventListener('click', () => this.openModal());
    document.getElementById('save-formation-btn')
      ?.addEventListener('click', () => this.save());
  },

  async render() {
    await this.load();
    const container = document.getElementById('formations-list');
    if (!container) return;

    if (!this.formations.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="ph ph-chalkboard-teacher empty-icon"></i>
          <p class="empty-text">Aucune formation créée pour le moment.<br>Commencez par en ajouter une.</p>
          <button class="btn btn-primary" onclick="formationsManager.openModal()">
            <i class="ph ph-plus"></i> Créer une formation
          </button>
        </div>`;
      return;
    }

    container.innerHTML = this.formations.map(f => `
      <div class="card fade-in">
        <div class="card-header">
          <div>
            <h3 style="font-size:1.1rem;font-weight:600;color:var(--text-primary)">${f.name}</h3>
            ${f.group_name ? `<p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:2px">
              <i class="ph ph-users"></i> Groupe : ${f.group_name}</p>` : ''}
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-sm btn-secondary" onclick="formationsManager.openModal('${f.id}')">
              <i class="ph ph-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="formationsManager.delete('${f.id}')">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </div>
        ${f.description ? `<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:var(--spacing-md)">${f.description}</p>` : ''}
        <div class="flex gap-sm flex-wrap">
          ${f.start_date ? `<span class="badge badge-info"><i class="ph ph-calendar-blank"></i> Début : ${new Date(f.start_date).toLocaleDateString('fr-FR')}</span>` : ''}
          ${f.end_date   ? `<span class="badge badge-late"><i class="ph ph-calendar-check"></i> Fin : ${new Date(f.end_date).toLocaleDateString('fr-FR')}</span>`   : ''}
        </div>
        <div class="card-footer-actions">
          <button class="btn btn-sm btn-secondary" onclick="formationsManager.goToAttendance('${f.id}','${f.name.replace(/'/g,"\\'")}')">
            <i class="ph ph-check-circle"></i> Faire l'appel
          </button>
          <button class="btn btn-sm btn-secondary" onclick="formateursManager.filterByFormation('${f.id}')">
            <i class="ph ph-user-gear"></i> Formateurs
          </button>
        </div>
      </div>
    `).join('');
  },

  goToAttendance(formationId, formationName) {
    app.navigateTo('attendance');
    setTimeout(() => {
      const sel = document.getElementById('attendance-session');
      if (!sel) return;
      let opt = Array.from(sel.options).find(o => o.value === formationId);
      if (!opt) {
        opt = new Option(formationName, formationId);
        sel.add(opt);
      }
      sel.value = formationId;
      attendanceManager.loadAttendance();
    }, 150);
  },

  openModal(id = null) {
    const f = id ? this.formations.find(x => x.id === id) : null;
    document.getElementById('formation-id').value        = id || '';
    document.getElementById('formation-name').value      = f?.name        || '';
    document.getElementById('formation-desc').value      = f?.description || '';
    document.getElementById('formation-group').value     = f?.group_name  || '';
    document.getElementById('formation-start').value     = f?.start_date?.split('T')[0] || '';
    document.getElementById('formation-end').value       = f?.end_date?.split('T')[0]   || '';
    document.getElementById('formation-modal-title').textContent = id ? 'Modifier la formation' : 'Nouvelle formation';
    ui.openModal('formation-modal');
  },

  async save() {
    const id   = document.getElementById('formation-id').value;
    const name = document.getElementById('formation-name').value.trim();
    if (!name) { ui.toast('Le nom est requis', 'error'); return; }

    const data = {
      name,
      description: document.getElementById('formation-desc').value.trim()  || null,
      group_name:  document.getElementById('formation-group').value.trim() || name,
      start_date:  document.getElementById('formation-start').value        || null,
      end_date:    document.getElementById('formation-end').value          || null,
    };

    try {
      if (id) {
        const r = await fetch(`/api/formations?id=${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (!r.ok) throw new Error();
        ui.toast('Formation mise à jour', 'success');
      } else {
        data.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const r = await fetch('/api/formations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (!r.ok) throw new Error();
        ui.toast('Formation créée', 'success');
        // Reload sessions so attendance dropdown reflects new formation
        dataManager.init();
      }
      ui.closeModal('formation-modal');
      this.render();
    } catch (e) {
      ui.toast('Erreur lors de la sauvegarde', 'error');
    }
  },

  async delete(id) {
    const ok = await ui.confirm('Supprimer cette formation ? Les présences associées seront conservées.');
    if (!ok) return;
    try {
      await fetch(`/api/formations?id=${id}`, { method: 'DELETE' });
      ui.toast('Formation supprimée', 'success');
      this.render();
    } catch (e) {
      ui.toast('Erreur lors de la suppression', 'error');
    }
  },
};
