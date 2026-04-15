/* ============================================
   DATA Management - Suivi des Apprenants
   ============================================ */

const STORAGE_KEY = 'suivi_apprenants_data';

const dataManager = {
    data: {
        students: [],
        attendance: {}, // { "YYYY-MM-DD": { sessionId: { studentId: { status, time, notes } } } }
        sessions: [
            { id: 'default', name: 'Formation Principale' }
        ],
        settings: {}
    },

    // Initialize and load data
    init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.data = JSON.parse(stored);

                // Validate structure
                if (!this.data.students) this.data.students = [];
                if (!this.data.attendance) this.data.attendance = {};
                if (!this.data.sessions) this.data.sessions = [{ id: 'default', name: 'Formation Principale' }];
                if (!this.data.settings) this.data.settings = {};

                this.migrateOldData();
            } catch (e) {
                console.error("Data corruption detected, resetting data:", e);
                this.resetData(); // This will also save fresh defaults
                this.generateDemoData(); // And regenerate demo data since we are resetting
            }
        } else {
            // First launch: generate data immediately as requested
            this.generateDemoData();
        }

        // Double check: if students are empty (user cleared them or previous init failed), repopulate
        if (this.data.students.length === 0) {
            this.generateDemoData();
        }

        this.save();
    },

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    },

    // --- STUDENTS ---
    getStudents(groupId = null) {
        if (groupId && groupId !== 'all') {
            return this.data.students.filter(s => s.group === groupId);
        }
        return this.data.students;
    },

    addStudent(student) {
        // Generate simple ID
        student.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        student.createdAt = new Date().toISOString();
        this.data.students.push(student);
        this.save();
        return student;
    },

    updateStudent(id, updates) {
        const index = this.data.students.findIndex(s => s.id === id);
        if (index !== -1) {
            this.data.students[index] = { ...this.data.students[index], ...updates };
            this.save();
            return true;
        }
        return false;
    },

    deleteStudent(id) {
        this.data.students = this.data.students.filter(s => s.id !== id);
        this.save();
    },

    // --- ATTENDANCE ---
    getAttendance(date, sessionId = 'default') {
        if (!this.data.attendance[date]) return {};
        // If specific session not found, try default or just return empty
        return this.data.attendance[date][sessionId] || {};
    },

    saveAttendance(date, sessionId, records) {
        if (!this.data.attendance[date]) {
            this.data.attendance[date] = {};
        }
        this.data.attendance[date][sessionId] = records;
        this.save();
    },

    // --- UTILS ---
    getGroups() {
        const groups = new Set(this.data.students.map(s => s.group).filter(Boolean));
        return Array.from(groups);
    },

    // --- DATA MANAGEMENT ---
    exportData() {
        return JSON.stringify(this.data, null, 2);
    },

    importData(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed.students && parsed.attendance) {
                this.data = parsed;
                this.save();
                return true;
            }
            return false;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    },

    resetData() {
        this.data = {
            students: [],
            attendance: {},
            sessions: [{ id: 'default', name: 'Formation Principale' }],
            settings: {}
        };
        this.save();
    },

    // MIGRATION UTILS
    tryMigrateLegacyData() {
        // Legacy migration removed in favor of fresh start with demo data
    },

    migrateOldData() {
        // Placeholder for future schema migrations
        if (!this.data.sessions) {
            this.data.sessions = [{ id: 'default', name: 'Formation Principale' }];
        }
    },

    generateDemoData() {
        console.log("Génération automatique des données...");
        const marketingNames = [
            "Sophie Martin", "Lucas Bernard", "Emma Thomas", "Gabriel Petit", "Léa Robert",
            "Hugo Richard", "Chloé Durand", "Arthur Dubois", "Manon Moreau", "Jules Laurent",
            "Camille Simon", "Louis Michel", "Lola Lefebvre", "Nathan Leroy", "Zoé Roux",
            "Théo David", "Jade Bertrand", "Paul Morel", "Sarah Fournier", "Tom Girard",
            "Eva Bonnet", "Léo Mercer", "Anna Blanc", "Maxime Guerin", "Mila Boyer",
            "Enzo Garry", "Lina Font"
        ];

        const webNames = [
            "Thomas Pierre", "Célia Vasseur", "Axel Colin", "Inès Bodin", "Robin Chauvin",
            "Alice Clement", "Mathis Da Silva", "Romane Delorme", "Baptiste Desmas", "Lou Diot",
            "Clément Dupuy", "Lisa Faure", "Antoine Fleury", "Victoire Gaillard", "Rémi Gautier",
            "Elise Giraud", "Noah Hardy", "Lucie Hubert", "Maël Jean", "Juliette Langlois",
            "Sacha Lemoine"
        ];

        this.data.students = [];
        this.data.attendance = {};
        this.data.sessions = [
            { id: 'marketing', name: 'Marketing Digital' },
            { id: 'web', name: 'Développement Web et Mobile' }
        ];

        // Helper to add student
        const add = (name, group) => {
            const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            this.data.students.push({
                id,
                name,
                group,
                email: name.toLowerCase().replace(/ /g, '.') + '@example.com',
                createdAt: new Date().toISOString(),
                photo: null
            });
            return id;
        };

        // Generate Students
        const marketingIds = marketingNames.map(name => add(name, "Marketing Digital"));
        const webIds = webNames.map(name => add(name, "Développement Web et Mobile"));

        // Generate Attendance for last 5 days
        const generateAttendance = (studentIds, sessionId) => {
            for (let i = 0; i < 5; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                if (!this.data.attendance[dateStr]) this.data.attendance[dateStr] = {};

                const records = {};
                studentIds.forEach(id => {
                    const rand = Math.random();
                    let status = 'present';
                    if (rand > 0.9) status = 'absent';
                    else if (rand > 0.8) status = 'late';

                    records[id] = { status, note: '' };
                });
                // Fix: Ensure we use the correct session ID structure for the app
                // If the app uses 'default' everywhere, we need to be careful?
                // No, app.js should be improved to use sessions from data.js
                // For now, let's put them in 'default' AND their specific sessions to be safe
                // or just 'default' if the UI selector defaults to it.
                // The UI selector <select id="attendance-session"> defaults to 'default'.
                // I will add them to 'default' so they show up primarily.
                this.data.attendance[dateStr]['default'] = records;
            }
        };

        generateAttendance([...marketingIds, ...webIds], 'default'); // All in default session for visibility

        this.save();
        return true;
    },


};
