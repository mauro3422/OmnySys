/**
 * MinimapUI.js
 * 
 * Dibuja una vista de pájaro.
 * 
 * TRAP: Este archivo NO importa MouseTransformer, pero asume la misma
 * lógica de proyección de "centro de pantalla" para dibujar el recuadro
 * de lo que el usuario está viendo actualmente.
 */

import { camera } from './CameraState.js';

const MINIMAP_SIZE = 200;
const WORLD_SIZE = 5000;

export function renderMinimap(ctx) {
    // Escala del minimapa respecto al mundo
    const mapScale = MINIMAP_SIZE / WORLD_SIZE;

    // Dibujar fondo
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // CALCULO CRÍTICO DUPLICADO (The Trap):
    // El minimapa necesita saber cuánto se ve en pantalla para dibujar el rectangulo.
    // Asume que el viewport es de 1920x1080.
    const viewScale = camera.getScale();
    const viewWidthInWorld = 1920 / viewScale;
    const viewHeightInWorld = 1080 / viewScale;

    const rectX = (camera.x + WORLD_SIZE / 2 - viewWidthInWorld / 2) * mapScale;
    const rectY = (camera.y + WORLD_SIZE / 2 - viewHeightInWorld / 2) * mapScale;
    const rectW = viewWidthInWorld * mapScale;
    const rectH = viewHeightInWorld * mapScale;

    ctx.strokeStyle = "yellow";
    ctx.strokeRect(rectX, rectY, rectW, rectH);
}

// Escuchar cambios de cámara
window.addEventListener('camera_changed', () => {
    // Redibujar minimapa
    // renderMinimap(myCtx);
});
