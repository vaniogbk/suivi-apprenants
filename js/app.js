/* ============================================
   APP Entry Point - Suivi des Apprenants
   ============================================ */

/* Imports removed for local compatibility */

class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('App Initializing...');

        // 1. Init UI & Theme
        ui.initTheme();

        // 2. Init Data
        dataManager.init();

        // 3. Init Modules
        studentManager.init();
        attendanceManager.init();
        statisticsManager.init();

        // 4. Setup Navigation
        this.setupNavigation();

        // 5. Setup Settings
        this.setupSettings();

        // Expose app to window for inline onclick handlers (temporary/convenience)
        window.ui = ui;
        window.app = this;
        window.dataManager = dataManager;
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                // Handle button click (find closest button if icon clicked)
                const btn = e.target.closest('.nav-item');
                const viewName = btn.dataset.view;
                this.navigateTo(viewName);
            });
        });
    }

    navigateTo(viewName) {
        // Update Menu
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update View
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        const view = document.getElementById(`view-${viewName}`);
        if (view) {
            view.classList.remove('hidden');
            this.handleViewEnter(viewName);
        }

        // On mobile, maybe close sidebar if we had one jumping out
    }

    handleViewEnter(viewName) {
        switch (viewName) {
            case 'dashboard':
                statisticsManager.renderDashboardStats();
                attendanceManager.updateSummary(); // Refresh today's summary
                break;
            case 'students':
                studentManager.renderStudents(); // Refresh list
                break;
            case 'attendance':
                attendanceManager.loadAttendance(); // Reload logic
                break;
            case 'statistics':
                statisticsManager.renderStatsTable();
                statisticsManager.renderDashboardStats(); // Refresh charts
                break;
        }
    }

    setupSettings() {
        // Backup
        document.getElementById('export-backup-btn')?.addEventListener('click', () => {
            const data = dataManager.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `suivi_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            ui.toast('Sauvegarde téléchargée', 'success');
        });

        // Restore
        document.getElementById('import-backup-btn')?.addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const success = dataManager.importData(e.target.result);
                if (success) {
                    ui.toast('Données restaurées avec succès', 'success');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    ui.toast('Erreur lors de la restauration', 'error');
                }
            };
            reader.readAsText(file);
        });

        // Demo Data
        document.getElementById('demo-data-btn')?.addEventListener('click', () => {
            ui.confirm('Cela écrasera toutes vos données actuelles. Continuer ?').then(yes => {
                if (yes) {
                    dataManager.generateDemoData();
                    ui.toast('Données de démonstration générées', 'success');
                    setTimeout(() => location.reload(), 1500);
                }
            });
        });

        // Reset
        document.getElementById('reset-app-btn')?.addEventListener('click', () => {
            ui.confirm('ATTENTION: Toutes les données seront effacées définitivement. Continuer ?').then(yes => {
                if (yes) {
                    ui.confirm('Vraiment certain ? Cette action est irréversible.').then(doublesure => {
                        if (doublesure) {
                            dataManager.resetData();
                            ui.toast('Application réinitialisée', 'success');
                            setTimeout(() => location.reload(), 1500);
                        }
                    });
                }
            });
        });


    }
}

// Start app
new App();
