/**
 * ThemeManager.js
 * 
 * Controla variables CSS globales.
 */

export function toggleMenu(isExpanded) {
    const width = isExpanded ? "250px" : "60px";

    // SIDE EFFECT: Modifica el estilo global
    document.documentElement.style.setProperty('--sidebar-width', width);

    console.log(`Menú cambiado a: ${width}`);
}
