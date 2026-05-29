/* ============================================
   TRAINER PAGE — EducTrack
   Page admin du formateur (accès par token)
   ============================================ */

(async function () {
  const token = new URLSearchParams(window.location.search).get('token');

  // Theme toggle
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.querySelector('#theme-btn i').className = isDark ? 'ph ph-moon' : 'ph ph-sun';
  });

  if (!token) { showError(); return; }

  // Init date
  const dateInput = document.getElementById('trainer-date');
  dateInput.value = new Date().toISOString().split('T')[0];

  let trainerData = null;

  // Load formateur data via token
  try {
    const resp = await fetch(`/api/formateurs?token=${token}`);
    if (!resp.ok) throw new Error('Token invalide');
    trainerData = await resp.json();
  } catch (e) {
    showError(); return;
  }

  const { formateur, students } = trainerData;

  document.getElementById('trainer-name').textContent      = formateur.name;
  document.getElementById('trainer-formation').textContent = formateur.formation_name || 'Formateur EducTrack';
  document.title = `${formateur.name} — EducTrack`;

  document.getElementById('trainer-content').classList.remove('hidden');
  await loadAttendance();

  // ── Load attendance for a date ──
  async function loadAttendance() {
    const date      = dateInput.value;
    const sessionId = formateur.formation_id || 'default';
    let existing    = {};
    try {
      const r = await fetch(`/api/attendance?date=${date}&session=${sessionId}`);
      existing = await r.json();
    } catch (e) { /* offline — use empty */ }
    renderRows(students, existing);
  }

  // ── Render student rows ──
  function renderRows(students, existing) {
    const tbody = document.getElementById('trainer-tbody');
    if (!students.length) {
      tbody.innerHTML = `<tr><td colspan="3">
        <div class="empty-state">
          <i class="ph ph-users empty-icon"></i>
          <p class="empty-text">Aucun apprenant dans ce groupe.<br>Vérifiez que le groupe correspond à la formation.</p>
        </div>
      </td></tr>`;
      updateCounts();
      return;
    }

    tbody.innerHTML = students.map(s => {
      const rec = existing[s.id] || { status: 'present', note: '' };
      return `
        <tr>
          <td style="font-weight:500">${s.name}</td>
          <td>
            <div class="attendance-options">
              ${['present', 'absent', 'late'].map(st => `
                <input type="radio" class="attendance-radio" name="att-${s.id}" value="${st}"
                       id="att-${s.id}-${st}" ${rec.status === st ? 'checked' : ''}
                       onchange="updateCounts()">
                <label class="attendance-label" for="att-${s.id}-${st}"
                       title="${st === 'present' ? 'Présent' : st === 'absent' ? 'Absent' : 'Retard'}">
                  <i class="ph ph-${st === 'present' ? 'check' : st === 'absent' ? 'x' : 'clock'}"></i>
                </label>
              `).join('')}
            </div>
          </td>
          <td>
            <input type="text" class="form-input" style="font-size:0.8rem"
                   id="note-${s.id}" value="${rec.note || ''}" placeholder="Note…">
          </td>
        </tr>`;
    }).join('');
    updateCounts();
  }

  // ── Update present/absent counters ──
  window.updateCounts = function () {
    let present = 0, absent = 0;
    document.querySelectorAll('.attendance-radio:checked').forEach(r => {
      if (r.value === 'present' || r.value === 'late') present++;
      else if (r.value === 'absent') absent++;
    });
    document.getElementById('t-count-present').textContent = `${present} Présents`;
    document.getElementById('t-count-absent').textContent  = `${absent} Absents`;
  };

  // ── Save attendance ──
  document.getElementById('trainer-save-btn').addEventListener('click', async () => {
    const date      = dateInput.value;
    const sessionId = formateur.formation_id || 'default';
    const records   = {};

    students.forEach(s => {
      const statusEl = document.querySelector(`input[name="att-${s.id}"]:checked`);
      records[s.id]  = {
        status: statusEl?.value || 'present',
        note:   document.getElementById(`note-${s.id}`)?.value || '',
      };
    });

    try {
      const r = await fetch('/api/attendance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date, session_id: sessionId, records }),
      });
      if (!r.ok) throw new Error();
      ui.toast('Présences enregistrées ✓', 'success');
    } catch (e) {
      ui.toast('Erreur lors de l\'enregistrement', 'error');
    }
  });

  document.getElementById('trainer-load-btn').addEventListener('click', loadAttendance);
  dateInput.addEventListener('change', loadAttendance);

  function showError() {
    document.getElementById('trainer-topbar').style.display = 'none';
    document.getElementById('trainer-error').classList.remove('hidden');
  }
})();
