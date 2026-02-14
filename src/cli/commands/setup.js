/**
 * @fileoverview Setup Command
 * 
 * Configure OpenCode and verify installation
 * 
 * @module cli/commands/setup
 */

import { setupOpenCode, getOpenCodeConfigPath } from '../utils/opencode-config.js';
import { PORTS } from '../utils/port-checker.js';
import { log } from '../utils/logger.js';

export const aliases = ['setup'];

export async function execute() {
  log('Configurando OmnySys...', 'loading');
  const configured = await setupOpenCode();
  
  if (configured) {
    log('\n✅ Configuración completa', 'success');
    log('   OpenCode: Configurado');
    log(`   LLM Port: ${PORTS.llm}`);
    log(`   MCP Port: ${PORTS.mcp}`);
    log(`   Config: ${getOpenCodeConfigPath()}`);
  } else {
    log('No se pudo configurar OpenCode automáticamente', 'warning');
  }
}
