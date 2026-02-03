/**
 * DiagramCanvas.js
 * 
 * Un canvas que dibuja contenido dependiente de la interfaz.
 */

export function centerElement(elementWidth, canvasWidth) {
    // LEER DE CSS (Conexión oculta)
    const sidebarStyle = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width');
    const sidebarWidth = parseInt(sidebarStyle) || 250; // Fallback peligroso

    const availableSpace = canvasWidth - sidebarWidth;
    const centerX = sidebarWidth + (availableSpace / 2) - (elementWidth / 2);

    console.log(`Centrando elemento en: ${centerX}`);
    return centerX;
}

/**
 * TRAP: Si la variable --sidebar-width cambia de nombre o se elimina en ThemeManager,
 * este archivo usará el fallback de 250 de forma permanente, ignorando el estado real
 * de la UI (ej: si el menú está colapsado).
 */
