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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectPath = __dirname;

async function main() {
  const heapLimit = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;
  console.log(`🚀 Iniciando Layer A Static Analysis...\n`);
  console.log(`📊 Heap disponible: ${Math.round(heapLimit)} MB`);
  console.log(`💡 Si hay "Aborted()", reiniciar con: node --max-old-space-size=8192 run-layer-a.js\n`);
  
  try {
    await indexProject(projectPath, {
      verbose: true,
      skipLLM: true // Solo análisis estático, sin LLM
    });
    
    console.log('\n✅ Análisis completado exitosamente!');
    console.log('📊 Los datos semánticos ahora están en .omnysysdata/omnysys.db');
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
    process.exit(1);
  }
}

main();
