/* ============================================
   UI Utilities - Suivi des Apprenants
   ============================================ */

const ui = {
    // Toast Notifications
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = '';
        switch (type) {
            case 'success': icon = '<i class="ph ph-check-circle" style="font-size: 1.5rem; color: var(--success-500);"></i>'; break;
            case 'error': icon = '<i class="ph ph-warning-circle" style="font-size: 1.5rem; color: var(--danger-500);"></i>'; break;
            case 'warning': icon = '<i class="ph ph-warning" style="font-size: 1.5rem; color: var(--warning-500);"></i>'; break;
            default: icon = '<i class="ph ph-info" style="font-size: 1.5rem; color: var(--info-500);"></i>';
        }

        toast.innerHTML = `${icon}<span>${message}</span>`;
        container.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Modals
    openModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.add('open');
        }
    },

    closeModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (overlay) {
            overlay.classList.remove('open');
        }
    },

    // Confirm Dialog
    confirm(message) {
        return new Promise((resolve) => {
            const confirmed = window.confirm(message); // Simple native confirm for now, can be upgraded to custom modal
            resolve(confirmed);
        });
    },

    // Theme Management
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            this.updateThemeIcon(next);
        });
    },

    updateThemeIcon(theme) {
        const btn = document.getElementById('theme-toggle');
        const icon = btn.querySelector('i');
        const text = btn.querySelector('span');

        if (theme === 'dark') {
            icon.className = 'ph ph-sun nav-icon';
            text.textContent = 'Mode Clair';
        } else {
            icon.className = 'ph ph-moon nav-icon';
            text.textContent = 'Mode Sombre';
        }
    },

    // Helper: Create initials avatar
    createAvatar(name) {
        const initials = name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
        return initials;
    },

    // Helper: Format Date
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    }
};
