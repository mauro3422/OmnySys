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
export function log(msg, type = 'info') {
  console.log(`${ICONS[type] || '•'} ${msg}`);
}

/**
 * Display help text
 */
export function showHelp() {
  console.log(`
🧠 OmnySys CLI - Sistema Unificado

Uso: omnysys <comando>

Comandos:
  up, start     Inicia LLM + MCP + configura OpenCode
  down, stop    Detiene todos los servicios
  status        Muestra estado de los servicios
  tools         Lista herramientas disponibles
  call <tool>   Ejecuta una herramienta
  setup         Configura OpenCode y verifica instalación
  help          Muestra esta ayuda

Ejemplos:
  omnysys up                              # Inicia todo
  omnysys status                          # Ver estado
  omnysys call get_impact_map '{"filePath":"src/core.js"}'
  omnysys tools                           # Ver herramientas
`);
}
