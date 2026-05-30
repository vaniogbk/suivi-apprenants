/* ============================================
   PDF IMPORT — EducTrack
   Lecture client-side via PDF.js
   ============================================ */

const pdfImport = {
  extractedNames: [],

  init() {
    document.getElementById('import-pdf-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('pdf-file-input')?.addEventListener('change', e => {
      if (e.target.files[0]) this.readPDF(e.target.files[0]);
    });

    // Drag & drop
    const zone = document.getElementById('pdf-drop-zone');
    if (zone) {
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--primary-500)'; zone.style.background = 'var(--primary-50)'; });
      zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; zone.style.background = ''; });
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.style.borderColor = ''; zone.style.background = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') this.readPDF(file);
        else ui.toast('Veuillez déposer un fichier PDF', 'error');
      });
    }
  },

  openModal() {
    // Populate formation dropdown
    const sel = document.getElementById('pdf-formation-select');
    if (sel) {
      const groups = dataManager.getGroups();
      const formations = formationsManager.formations;
      const options = [{ value: '', label: '— Sélectionner une formation —' }];

      formations.forEach(f => options.push({ value: f.group_name || f.name, label: f.name }));
      groups.filter(g => !formations.find(f => f.group_name === g || f.name === g))
            .forEach(g => options.push({ value: g, label: g }));

      sel.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');

      sel.onchange = () => {
        document.getElementById('pdf-group-override').value = sel.value;
      };
    }

    // Reset state
    document.getElementById('pdf-step-1').classList.remove('hidden');
    document.getElementById('pdf-step-2').classList.add('hidden');
    document.getElementById('pdf-import-confirm-btn').classList.add('hidden');
    document.getElementById('pdf-parsing-msg').classList.add('hidden');
    document.getElementById('pdf-file-input').value = '';
    this.extractedNames = [];

    ui.openModal('pdf-import-modal');
  },

  async readPDF(file) {
    document.getElementById('pdf-parsing-msg').classList.remove('hidden');

    try {
      // Configure PDF.js worker
      if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      } else {
        ui.toast('PDF.js non chargé, réessayez', 'error');
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lines   = content.items.map(item => item.str).join('\n');
        fullText += lines + '\n';
      }

      this.extractedNames = this.parseNames(fullText);
      document.getElementById('pdf-parsing-msg').classList.add('hidden');

      if (!this.extractedNames.length) {
        ui.toast('Aucun nom détecté dans ce PDF. Vérifiez le format.', 'error');
        return;
      }

      this.showPreview();
    } catch (err) {
      document.getElementById('pdf-parsing-msg').classList.add('hidden');
      ui.toast('Erreur de lecture du PDF : ' + err.message, 'error');
    }
  },

  parseNames(text) {
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 1);
    const names = [];
    const nameRegex = /^[A-ZÀ-Ÿa-zà-ÿ][a-zà-ÿA-ZÀ-Ÿ'\-]{1,}(\s+[A-ZÀ-Ÿa-zà-ÿ][a-zà-ÿA-ZÀ-Ÿ'\-]{1,}){1,4}$/;

    for (const line of lines) {
      // Nettoyer numéros, puces, tirets de liste
      let cleaned = line
        .replace(/^\d{1,3}[\.\)\-\s]+/, '')  // "1. " ou "12) "
        .replace(/^[-•·▪◦]\s+/, '')           // puces
        .replace(/\s{2,}/g, ' ')              // espaces multiples
        .trim();

      // Ignorer les lignes trop courtes, trop longues ou avec des chiffres
      if (cleaned.length < 4 || cleaned.length > 60) continue;
      if (/\d/.test(cleaned)) continue;
      if (/[@#%&*()+=\[\]{}<>\/\\|]/.test(cleaned)) continue;

      // Ignorer mots-clés courants dans les listes (entêtes de tableau, etc.)
      const skip = ['nom', 'prenom', 'prénom', 'nom et', 'apprenant', 'étudiant', 'date', 'liste', 'classe', 'groupe', 'formation', 'numéro', 'matricule'];
      if (skip.some(s => cleaned.toLowerCase().startsWith(s))) continue;

      if (nameRegex.test(cleaned)) {
        // Capitaliser proprement
        const formatted = cleaned.split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        names.push(formatted);
      }
    }

    return [...new Set(names)]; // dédupliquer
  },

  showPreview() {
    const list = document.getElementById('pdf-names-list');
    const count = document.getElementById('pdf-name-count');

    count.textContent = this.extractedNames.length;

    list.innerHTML = this.extractedNames.map((name, i) => `
      <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;cursor:pointer;transition:background .1s" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background=''">
        <input type="checkbox" id="pdf-name-${i}" checked style="width:16px;height:16px;accent-color:var(--primary-500);flex-shrink:0">
        <span style="font-size:.9rem;color:var(--text-primary)">${name}</span>
      </label>
    `).join('');

    // Préremplir le groupe depuis le sélecteur
    const sel = document.getElementById('pdf-formation-select');
    if (sel && sel.value) {
      document.getElementById('pdf-group-override').value = sel.value;
    }

    document.getElementById('pdf-step-1').classList.add('hidden');
    document.getElementById('pdf-step-2').classList.remove('hidden');
    document.getElementById('pdf-import-confirm-btn').classList.remove('hidden');
  },

  toggleAll(checked) {
    document.querySelectorAll('#pdf-names-list input[type="checkbox"]')
      .forEach(cb => cb.checked = checked);
  },

  async confirmImport() {
    const group = document.getElementById('pdf-group-override').value.trim();
    if (!group) { ui.toast('Veuillez sélectionner ou saisir un groupe', 'error'); return; }

    const selected = [];
    this.extractedNames.forEach((name, i) => {
      const cb = document.getElementById(`pdf-name-${i}`);
      if (cb && cb.checked) selected.push(name);
    });

    if (!selected.length) { ui.toast('Aucun apprenant sélectionné', 'error'); return; }

    const btn = document.getElementById('pdf-import-confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner" style="animation:spin 1s linear infinite"></i> Import en cours…';

    let ok = 0;
    for (const name of selected) {
      await dataManager.addStudent({ name, group, email: '' });
      ok++;
    }

    ui.closeModal('pdf-import-modal');
    studentManager.renderStudents();
    studentManager.updateStats();
    ui.toast(`${ok} apprenant(s) importé(s) dans le groupe "${group}"`, 'success');

    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-user-plus"></i> Importer les apprenants sélectionnés';
  },
};
