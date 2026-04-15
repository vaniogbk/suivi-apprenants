document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            console.log("Theme button found");
            // Add a direct listener to verify clicks
            btn.addEventListener('click', (e) => {
                const current = document.documentElement.getAttribute('data-theme');
                console.log("Theme toggle clicked. Current:", current);
                alert(`🖱️ Click reçu !\nThème actuel : ${current}\nVa changer vers : ${current === 'light' ? 'dark' : 'light'}`);
            });
        } else {
            alert("⚠️ ERREUR : Le bouton 'theme-toggle' est introuvable !");
        }
    }, 1000); // Wait 1s to be sure app.js has initialized
});
