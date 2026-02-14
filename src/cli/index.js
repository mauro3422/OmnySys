#!/usr/bin/env node

/**
 * @fileoverview OmnySys CLI - Main Entry Point
 * 
 * Un único comando para controlar todo:
 * - omnysys up       : Inicia LLM + MCP + Dashboard
 * - omnysys down     : Detiene todo
 * - omnysys status   : Muestra estado
 * - omnysys setup    : Configura OpenCode automáticamente
 * - omnysys tools    : Lista herramientas disponibles
 * - omnysys call     : Ejecuta una herramienta
 * 
 * Refactored following SOLID principles
 * 
 * @module cli
 */

import { findCommand } from './commands/index.js';
import { log, showHelp } from './utils/logger.js';

/**
 * Main CLI entry point
 */
async function main() {
  const command = process.argv[2] || 'help';
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  const cmd = findCommand(command);
  
  if (!cmd) {
    log(`Comando desconocido: ${command}`, 'error');
    showHelp();
    process.exit(1);
  }
  
  try {
    await cmd.execute(arg1, arg2);
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

main().catch(console.error);

export { findCommand };
export * from './commands/index.js';
export * from './utils/logger.js';
export * from './utils/port-checker.js';
export * from './utils/opencode-config.js';
