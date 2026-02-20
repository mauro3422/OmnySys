/**
 * @fileoverview analyze-llm-needs.js
 * 
 * Script de diagnóstico que analiza cuántos archivos del proyecto
 * necesitarían análisis LLM basado en la lógica actual.
 * 
 * Uso: node scripts/analyze-llm-needs.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// Importar analysis-decider
const { needsLLMAnalysis, computeMetadataCompleteness } = await import(
  '../src/layer-b-semantic/llm-analyzer/analysis-decider.js'
);

/**
 * Simula el análisis de metadata completeness para un archivo
 */
function analyzeFile(filePath, fileContent) {
  // Simplificar: extraer info básica del archivo
  const imports = (fileContent.match(/import.*from\s+['"]([^'"]+)['"]/g) || [])
    .map(m => ({ source: m.match(/['"]([^'"]+)['"]/)?.[1] || '' }));
  
  const exports = (content => {
    const named = content.match(/export\s+(?:const|function|class|let|var)\s+(\w+)/g) || [];
    const def = content.match(/export\s+default\s+\w+/g) || [];
    return [...named, ...def].map(e => ({ name: e }));
  })(fileContent);

  const ext = path.extname(filePath);
  const isType = ext === '.d.ts' || filePath.includes('/types/');
  const isConfig = filePath.includes('config') || filePath.includes('constant');
  const isTest = filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/tests/');

  return {
    filePath,
    imports,
    exports,
    usedBy: [], // No tenemos esta info sin el análisis completo
    semanticConnections: [],
    atoms: [],
    totalAtoms: 0,
    isType,
    isConfig,
    isTest
  };
}

/**
 * Escanea archivos del proyecto
 */
async function scanProjectFiles() {
  const srcPath = path.join(ROOT_PATH, 'src');
  const files = [];
  
  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && /\.(js|ts|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(srcPath);
  return files;
}

/**
 * Main
 */
async function main() {
  console.log('\n🔍 OmnySys LLM Needs Analyzer\n');
  console.log('━'.repeat(60));
  
  const files = await scanProjectFiles();
  console.log(`📁 Total archivos encontrados: ${files.length}\n`);
  
  // Categorías
  const stats = {
    typeFiles: [],
    configFiles: [],
    testFiles: [],
    needLLM: [],
    bypassLLM: [],
    errors: []
  };
  
  for (const fullPath of files) {
    const filePath = path.relative(ROOT_PATH, fullPath).replace(/\\/g, '/');
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const analysis = analyzeFile(filePath, content);
      
      // Clasificar por tipo
      if (analysis.isType) {
        stats.typeFiles.push(filePath);
        continue;
      }
      if (analysis.isConfig) {
        stats.configFiles.push(filePath);
        continue;
      }
      if (analysis.isTest) {
        stats.testFiles.push(filePath);
        continue;
      }
      
      // Calcular metadata completeness
      const { score, gaps } = computeMetadataCompleteness(analysis);
      
      // Decidir si necesita LLM
      const needsLLM = needsLLMAnalysis({}, analysis);
      
      if (needsLLM) {
        stats.needLLM.push({ filePath, score, gaps });
      } else {
        stats.bypassLLM.push({ filePath, score });
      }
    } catch (error) {
      stats.errors.push({ filePath, error: error.message });
    }
  }
  
  // Reporte
  console.log('📊 RESULTADOS:\n');
  console.log(`   📝 Type files (auto-bypass):  ${stats.typeFiles.length}`);
  console.log(`   ⚙️  Config files (auto-bypass): ${stats.configFiles.length}`);
  console.log(`   🧪 Test files (auto-bypass):   ${stats.testFiles.length}`);
  console.log();
  console.log(`   ❓ Necesitan LLM:             ${stats.needLLM.length}`);
  console.log(`   ✅ Bypass LLM:                 ${stats.bypassLLM.length}`);
  console.log(`   ⚠️  Errores:                   ${stats.errors.length}`);
  console.log();
  
  // Calcular ratio
  const totalAnalyzable = stats.needLLM.length + stats.bypassLLM.length;
  const bypassRate = totalAnalyzable > 0 
    ? ((stats.bypassLLM.length / totalAnalyzable) * 100).toFixed(1)
    : 0;
  
  console.log('━'.repeat(60));
  console.log(`\n📈 ANÁLISIS:`);
  console.log(`   Bypass rate: ${bypassRate}%`);
  console.log(`   Ratio LLM:   ${stats.needLLM.length}/${files.length} archivos`);
  console.log();
  
  // Mostrar archivos que necesitan LLM
  if (stats.needLLM.length > 0) {
    console.log('🔴 Archivos que NECESITAN LLM:');
    stats.needLLM.slice(0, 20).forEach(f => {
      console.log(`   - ${f.filePath} (score: ${f.score.toFixed(2)}, gaps: ${f.gaps.join(', ') || 'none'})`);
    });
    if (stats.needLLM.length > 20) {
      console.log(`   ... y ${stats.needLLM.length - 20} más`);
    }
    console.log();
  }
  
  // Mostrar errores
  if (stats.errors.length > 0) {
    console.log('⚠️  Errores:');
    stats.errors.forEach(e => {
      console.log(`   - ${e.filePath}: ${e.error}`);
    });
  }
  
  console.log('\n━'.repeat(60));
  console.log('\n💡 RECOMENDACIÓN:\n');
  
  if (stats.needLLM.length === 0) {
    console.log('   🎉 ¡Perfecto! El análisis estático cubre todos los archivos.');
    console.log('   MAX_LLM_PER_RUN puede eliminarse o setearse en 0.');
  } else if (bypassRate > 90) {
    console.log('   ✅ Excelente. El 90%+ de archivos se resuelven sin LLM.');
    console.log('   El límite MAX_LLM_PER_RUN es innecesario.');
    console.log('   Procesar en background los archivos pendientes.');
  } else {
    console.log('   ⚠️  Revisar la lógica de needsLLMAnalysis.');
    console.log('   Posibles mejoras en computeMetadataCompleteness.');
  }
  
  console.log('\n');
}

main().catch(console.error);