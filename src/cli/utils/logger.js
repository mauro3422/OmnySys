/**
 * @fileoverview CLI Logger
 *
 * @module cli/utils/logger
 */

const ICONS = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  loading: '⏳'
};

/**
 * Log a message
 * @param {string} msg - Message
 * @param {string} type - Message type
 */
export { log } from '../../shared/logger-system.js';
/**
 * Display help text
 */
export function showHelp() {
  console.log(`
🧠 OmnySys CLI - Sistema Unificado

Uso: omnysys <comando>

Comandos:
  up, start     Inicia el daemon MCP y configura todos los clientes soportados
  down, stop    Detiene todos los servicios
  status        Muestra estado de los servicios
  tools         Lista herramientas disponibles
  trust         Baseline de confianza y drifts de DB
  call <tool>   Ejecuta una herramienta
  setup         Configura todos los clientes MCP soportados y verifica instalaciÃ³n
  help          Muestra esta ayuda

Ejemplos:
  omnysys up                              # Inicia todo
  omnysys status                          # Ver estado
  omnysys trust                           # Auditar confianza de la DB
  omnysys call get_impact_map '{"filePath":"src/core.js"}'
  omnysys tools                           # Ver herramientas
`);
}
