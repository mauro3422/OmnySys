/**
 * CameraState.js
 * 
 * Gestiona el zoom y la posición de la cámara.
 */

export const camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    // Factor de escala logarítmico para suavidad
    getScale: () => Math.pow(1.1, camera.zoom)
};

export function updateCamera(dx, dy, dZoom) {
    camera.x += dx;
    camera.y += dy;
    camera.zoom += dZoom;

    // Disparar evento global para el sistema de renderizado (Side Effect)
    window.dispatchEvent(new CustomEvent('camera_changed', { detail: camera }));
}
