/* ============================================
   FORMATEURS MANAGER — EducTrack
   ============================================ */

const formateursManager = {
  formateurs: [],
  currentFormationId: null,

  async init() {
    this.bindEvents();
  },

  async load() {
    const url = this.currentFormationId
      ? `/api/formateurs?formation_id=${this.currentFormationId}`
      : '/api/formateurs';
    try {
      const resp = await fetch(url);
      this.formateurs = await resp.json();
    } catch (e) {
      this.formateurs = [];
    }
  },

  bindEvents() {
    document.getElementById('add-formateur-btn')
      ?.addEventListener('click', () => this.openModal());
    document.getElementById('save-formateur-btn')
      ?.addEventListener('click', () => this.save());
    document.getElementById('formateur-filter-formation')
      ?.addEventListener('change', e => {
        this.currentFormationId = e.target.value || null;
        this.render();
      });
  },

  filterByFormation(formationId) {
    this.currentFormationId = formationId;
    app.navigateTo('formateurs');
  },

  async render() {
    await this.load();

    // Populate filter dropdown
    const formations = formationsManager.formations.length
      ? formationsManager.formations
      : await formationsManager.load();

    const filterSel = document.getElementById('formateur-filter-formation');
    if (filterSel) {
      const cur = filterSel.value;
      filterSel.innerHTML = '<option value="">Toutes les formations</option>'
        + formations.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
      filterSel.value = this.currentFormationId || cur || '';
    }

    const tbody = document.getElementById('formateurs-tbody');
    if (!tbody) return;

    if (!this.formateurs.length) {
      tbody.innerHTML = `<tr><td colspan="4">
        <div class="empty-state">
          <i class="ph ph-user-gear empty-icon"></i>
          <p class="empty-text">Aucun formateur enregistré.<br>Ajoutez-en un pour générer son lien d'accès.</p>
        </div>
      </td></tr>`;
      return;
    }

    const base = window.location.origin;
    tbody.innerHTML = this.formateurs.map(f => {
      const link = `${base}/trainer.html?token=${f.token}`;
      return `
        <tr>
          <td>
            <div style="font-weight:600">${f.name}</div>
            <div style="font-size:0.8rem;color:var(--text-tertiary)">${f.email || '—'}</div>
          </td>
          <td>
            <span class="badge badge-info">${f.formation_name || '—'}</span>
          </td>
          <td>
            <div class="flex gap-sm items-center" style="max-width:320px">
              <input type="text" readonly value="${link}" class="form-input input-mono"
                     style="font-size:0.7rem;flex:1" id="link-${f.id}">
              <button class="btn btn-sm btn-secondary" onclick="formateursManager.copyLink('${f.id}')" title="Copier">
                <i class="ph ph-copy"></i>
              </button>
              ${f.email ? `<a href="mailto:${f.email}?subject=Votre espace EducTrack&body=Bonjour ${encodeURIComponent(f.name)},%0D%0A%0D%0AVotre espace formateur :%0D%0A${encodeURIComponent(link)}"
                  class="btn btn-sm btn-secondary" title="Envoyer par email">
                  <i class="ph ph-envelope"></i>
                </a>` : ''}
            </div>
          </td>
          <td>
            <div class="flex gap-sm">
              <button class="btn btn-sm btn-secondary" onclick="formateursManager.openModal('${f.id}')">
                <i class="ph ph-pencil"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="formateursManager.delete('${f.id}')">
                <i class="ph ph-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  copyLink(id) {
    const input = document.getElementById(`link-${id}`);
    if (!input) return;
    navigator.clipboard.writeText(input.value)
      .then(() => ui.toast('Lien copié !', 'success'))
      .catch(() => { input.select(); document.execCommand('copy'); ui.toast('Lien copié !', 'success'); });
  },

  openModal(id = null) {
    const f = id ? this.formateurs.find(x => x.id === id) : null;
    document.getElementById('formateur-id').value    = id || '';
    document.getElementById('formateur-name').value  = f?.name  || '';
    document.getElementById('formateur-email').value = f?.email || '';

    const sel = document.getElementById('formateur-formation-sel');
    const formations = formationsManager.formations;
    sel.innerHTML = '<option value="">— Aucune formation —</option>'
      + formations.map(fm =>
          `<option value="${fm.id}" ${f?.formation_id === fm.id ? 'selected' : ''}>${fm.name}</option>`
        ).join('');
    if (f?.formation_id) sel.value = f.formation_id;
    else if (this.currentFormationId) sel.value = this.currentFormationId;

    document.getElementById('formateur-modal-title').textContent = id ? 'Modifier le formateur' : 'Nouveau formateur';
    ui.openModal('formateur-modal');
  },

  async save() {
    const id   = document.getElementById('formateur-id').value;
    const name = document.getElementById('formateur-name').value.trim();
    if (!name) { ui.toast('Le nom est requis', 'error'); return; }

    const data = {
      name,
      email:        document.getElementById('formateur-email').value.trim() || null,
      formation_id: document.getElementById('formateur-formation-sel').value  || null,
    };

    try {
      if (id) {
        await fetch(`/api/formateurs?id=${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        ui.toast('Formateur mis à jour', 'success');
      } else {
        const resp = await fetch('/api/formateurs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error();
        ui.toast('Formateur créé — lien d\'accès généré', 'success');
      }
      ui.closeModal('formateur-modal');
      this.render();
    } catch (e) {
      ui.toast('Erreur lors de la sauvegarde', 'error');
    }
  },

  async delete(id) {
    const ok = await ui.confirm('Supprimer ce formateur ? Son accès sera immédiatement révoqué.');
    if (!ok) return;
    await fetch(`/api/formateurs?id=${id}`, { method: 'DELETE' });
    ui.toast('Formateur supprimé', 'success');
    this.render();
  },
};
