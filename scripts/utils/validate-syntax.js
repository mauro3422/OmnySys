#!/usr/bin/env node
/**
 * validate-syntax.js
 * 
 * Valida la sintaxis de archivos JavaScript antes de commits
 * Previene errores como el que acabamos de tener (} extra)
 */

import { execSync } from 'child_process';
import fg from 'fast-glob';
import { createLogger } from '../../src/utils/logger.js';

const logger = createLogger('OmnySys:validate');

async function validateSyntax() {
  logger.info('🔍 Validating JavaScript syntax...\n');
  
  // Solo validar Layer A (src/layer-a-static/) y tests
  // Core y otras capas se validarán cuando estén listas
  const files = await fg.glob([
    'src/layer-a-static/**/*.js',
    'tests/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/*.test.js',
    '!tests/**/*.disabled.js'
  ], { cwd: process.cwd() });
  
  let errors = [];
  let checked = 0;
  
  for (const file of files) {
    try {
      // Verificar sintaxis con node -c
      execSync(`node --check "${file}"`, { 
        stdio: 'pipe',
        timeout: 5000 
      });
      checked++;
    } catch (error) {
      errors.push({
        file,
        error: error.stderr?.toString() || error.message
      });
    }
  }
  
  logger.info(`✅ Checked ${checked} files`);
  
  if (errors.length > 0) {
    logger.error(`\n❌ Found ${errors.length} syntax errors:\n`);
    errors.forEach(({ file, error }) => {
      logger.error(`  📄 ${file}`);
      logger.error(`     ${error.split('\n')[0]}\n`);
    });
    process.exit(1);
  }
  
  logger.info('\n✨ All files passed syntax validation!');
}

validateSyntax().catch(err => {
  logger.error('Validation failed:', err);
  process.exit(1);
});
