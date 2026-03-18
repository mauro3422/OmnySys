/**
 * Script para ejecutar Layer A y regenerar los datos semánticos
 * 
 * NOTA: Ejecutar con --max-old-space-size=8192 para análisis completos
 * Ej: node --max-old-space-size=8192 run-layer-a.js
 */

import { indexProject } from './src/layer-a-static/indexer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import v8 from 'v8';
import { createCliOrchestrator } from './src/shared/cli/base-orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectPath = __dirname;

const main = createCliOrchestrator({
  name: 'run-layer-a',
  logger: console,
  run: async ({ logger }) => {
    const heapLimit = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;
    logger.info(`🚀 Iniciando Layer A Static Analysis...`);
    logger.info(`📊 Heap disponible: ${Math.round(heapLimit)} MB`);
    logger.info(`💡 Si hay "Aborted()", reiniciar con: node --max-old-space-size=8192 run-layer-a.js`);
    
    await indexProject(projectPath, {
      verbose: true,
      skipLLM: true // Solo análisis estático, sin LLM
    });
    
    logger.info('✅ Análisis completado exitosamente!');
    logger.info('📊 Los datos semánticos ahora están en .omnysysdata/omnysys.db');
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
