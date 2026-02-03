/**
 * MouseTransformer.js
 * 
 * Proyecta coordenadas del ratón (pantalla) al mundo.
 */

import { camera } from './CameraState.js';

export function screenToWorld(screenX, screenY, viewportWidth, viewportHeight) {
    const scale = camera.getScale();

    // Cálculo crítico: Asume origen en el centro
    const worldX = (screenX - viewportWidth / 2) / scale + camera.x;
    const worldY = (screenY - viewportHeight / 2) / scale + camera.y;

    return { x: worldX, y: worldY };
}

/**
 * TRAP: Si alguien cambia el origen en CameraState o añade un padding al viewport,
 * esta función debe actualizarse en sincronía exacta.
 */
export function handleMouseDown(e, canvas) {
    const coords = screenToWorld(e.clientX, e.clientY, canvas.width, canvas.height);
    console.log(`Mouse click at world: ${coords.x}, ${coords.y}`);
}
