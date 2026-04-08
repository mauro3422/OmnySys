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
import { log as cliLog, showHelp } from './utils/logger.js';
import { createCliOrchestrator } from '../shared/cli/base-orchestrator.js';

/**
 * Main CLI entry point
 */
export const main = createCliOrchestrator({
  name: 'cli',
  logger: console,
  run: async ({ logger }) => {
    const command = process.argv[2] || 'help';
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    
    const cmd = findCommand(command);
    
    if (!cmd) {
      cliLog(`Comando desconocido: ${command}`, 'error');
      showHelp();
      throw new Error(`Comando desconocido: ${command}`);
    }
    
    await cmd.execute(arg1, arg2);
  }
});

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { findCommand };
export * from './commands/index.js';
export * from './utils/logger.js';
export * from './utils/port-checker.js';
export * from './utils/opencode-config.js';
