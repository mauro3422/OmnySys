/**
 * GlobalShortcuts.js
 * 
 * Gestiona atajos de teclado en todo el sistema.
 */

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveProject();
    }

    if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('close_modals'));
    }
});

function saveProject() {
    console.log("Proyecto guardado!");
}
