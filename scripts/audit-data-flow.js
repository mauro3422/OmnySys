/**
 * @fileoverview audit-data-flow.js
 * 
 * Script de auditoría que verifica el flujo completo de datos usando las APIs REALES.
 * 
 * Verifica:
 * 1. Extracción de átomos (molecular-extractor → atoms/)
 * 2. Relaciones usedBy/calledBy (graph-builder)
 * 3. Metadatos por archivo
 * 4. Decisión LLM con datos reales
 * 
 * Uso: node scripts/audit-data-flow.js [archivo-específico]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// Importar APIs REALES del sistema
const { getFileAnalysis, getFileAnalysisWithAtoms, getFileDependents } = await import(
  '../src/layer-c-memory/query/apis/file-api.js'
);

const { needsLLMAnalysis, computeMetadataCompleteness } = await import(
  '../src/layer-b-semantic/llm-analyzer/analysis-decider.js'
);

const { getAtom } = await import(
  '../src/layer-c-memory/storage/atoms/atom.js'
);

/**
 * Lee el índice de archivos del sistema
 */
async function readIndex() {
  const indexPath = path.join(ROOT_PATH, '.omnysysdata', 'index.json');
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Lee archivos directamente del storage si el fileIndex está vacío
 */
async function getFilesFromStorage() {
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const files = [];
  
  try {
    const entries = await fs.readdir(filesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        // El nombre del archivo es el hash, necesitamos leerlo para obtener el path
        const filePath = path.join(filesDir, entry.name);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          if (data.filePath) {
            files.push(data.filePath);
          }
        } catch {
          // Skip archivos inválidos
        }
      }
    }
  } catch {
    // Directorio no existe
  }
  
  return files;
}

/**
 * Lee átomos directamente del storage
 */
async function getAtomsFromStorage(filePath) {
  const atomsDir = path.join(ROOT_PATH, '.omnysysdata', 'atoms');
  const atoms = [];
  
  try {
    // Buscar archivo de átomos por hash del filePath
    const fileHash = require('crypto').createHash('md5').update(filePath).digest('hex');
    const atomFile = path.join(atomsDir, `${fileHash}.json`);
    
    const content = await fs.readFile(atomFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Audita un archivo específico con datos REALES
 */
async function auditFile(filePath) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📋 AUDITANDO: ${filePath}`);
  console.log('═'.repeat(70));
  
  const results = {
    filePath,
    layers: {},
    issues: [],
    score: 0
  };
  
  // ═══════════════════════════════════════════════════════════════════
  // LAYER A: Análisis estático
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n🔹 LAYER A: Análisis Estático');
  console.log('─'.repeat(50));
  
  try {
    const fileAnalysis = await getFileAnalysis(ROOT_PATH, filePath);
    
    if (!fileAnalysis) {
      console.log('   ❌ No se encontró análisis del archivo');
      results.issues.push('NO_FILE_ANALYSIS');
      return results;
    }
    
    results.layers.fileAnalysis = {
      exists: true,
      imports: fileAnalysis.imports?.length || 0,
      exports: fileAnalysis.exports?.length || 0,
      atoms: fileAnalysis.atomIds?.length || fileAnalysis.atoms?.length || 0,
      semanticConnections: fileAnalysis.semanticConnections?.length || 0,
      hasLLMInsights: !!fileAnalysis.llmInsights,
      contentHash: fileAnalysis.contentHash?.substring(0, 8) + '...'
    };
    
    console.log(`   ✅ Imports:          ${results.layers.fileAnalysis.imports}`);
    console.log(`   ✅ Exports:          ${results.layers.fileAnalysis.exports}`);
    console.log(`   ✅ Átomos:           ${results.layers.fileAnalysis.atoms}`);
    console.log(`   ✅ Conexiones:       ${results.layers.fileAnalysis.semanticConnections}`);
    console.log(`   ✅ LLM Insights:     ${results.layers.fileAnalysis.hasLLMInsights ? 'Sí' : 'No'}`);
    console.log(`   ✅ Hash:             ${results.layers.fileAnalysis.contentHash}`);
    
    // Verificar usedBy
    const usedBy = fileAnalysis.usedBy || [];
    results.layers.fileAnalysis.usedBy = usedBy.length;
    console.log(`   ✅ UsedBy:           ${usedBy.length}`);
    
    if (usedBy.length > 0) {
      console.log(`      └─ ${usedBy.slice(0, 3).map(u => u.source || u).join(', ')}${usedBy.length > 3 ? '...' : ''}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.issues.push('FILE_ANALYSIS_ERROR');
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // LAYER A: Átomos individuales (desde atoms/)
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n🔹 LAYER A: Átomos Detallados');
  console.log('─'.repeat(50));
  
  try {
    const atomsResult = await getFileAnalysisWithAtoms(ROOT_PATH, filePath);
    
    if (atomsResult?.atoms && atomsResult.atoms.length > 0) {
      results.layers.atoms = {
        count: atomsResult.atoms.length,
        withCalledBy: 0,
        withCalls: 0,
        withDataFlow: 0,
        exportedCount: 0
      };
      
      console.log(`   ✅ Total átomos:     ${atomsResult.atoms.length}`);
      
      for (const atom of atomsResult.atoms) {
        if (atom.calledBy && atom.calledBy.length > 0) {
          results.layers.atoms.withCalledBy++;
        }
        if (atom.calls && atom.calls.length > 0) {
          results.layers.atoms.withCalls++;
        }
        if (atom.dataFlow) {
          results.layers.atoms.withDataFlow++;
        }
        if (atom.isExported) {
          results.layers.atoms.exportedCount++;
        }
      }
      
      console.log(`   ✅ Con calledBy:     ${results.layers.atoms.withCalledBy}`);
      console.log(`   ✅ Con calls:        ${results.layers.atoms.withCalls}`);
      console.log(`   ✅ Con dataFlow:     ${results.layers.atoms.withDataFlow}`);
      console.log(`   ✅ Exportados:       ${results.layers.atoms.exportedCount}`);
      
      // Mostrar detalle de primeros átomos
      console.log('\n   📄 Primeros átomos:');
      atomsResult.atoms.slice(0, 3).forEach(atom => {
        const calledByStr = atom.calledBy?.length ? ` [calledBy: ${atom.calledBy.length}]` : '';
        const callsStr = atom.calls?.length ? ` [calls: ${atom.calls.length}]` : '';
        console.log(`      - ${atom.name}${calledByStr}${callsStr}`);
      });
      
    } else {
      console.log('   ⚠️  No hay átomos extraídos');
      results.issues.push('NO_ATOMS');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.issues.push('ATOMS_ERROR');
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // LAYER B: Metadata Completeness
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n🔹 LAYER B: Metadata Completeness');
  console.log('─'.repeat(50));
  
  try {
    const fileAnalysis = await getFileAnalysis(ROOT_PATH, filePath);
    if (fileAnalysis) {
      const { score, gaps } = computeMetadataCompleteness(fileAnalysis);
      
      results.layers.metadata = {
        score,
        gaps
      };
      
      console.log(`   ✅ Score:            ${score.toFixed(2)} / 1.0`);
      console.log(`   ${gaps.length > 0 ? '⚠️ ' : '✅'} Gaps:             ${gaps.length > 0 ? gaps.join(', ') : 'ninguno'}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // LAYER B: Decisión LLM
  // ═══════════════════════════════════════════════════════════════════
  
  console.log('\n🔹 LAYER B: Decisión LLM');
  console.log('─'.repeat(50));
  
  try {
    const fileAnalysis = await getFileAnalysis(ROOT_PATH, filePath);
    if (fileAnalysis) {
      const needsLLM = needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
      
      results.layers.llmDecision = {
        needsLLM,
        reason: ''
      };
      
      if (needsLLM) {
        console.log('   ❓ NECESITA LLM');
        results.layers.llmDecision.reason = results.layers.metadata?.gaps?.join(', ') || 'unknown gaps';
      } else {
        console.log('   ✅ BYPASS - Análisis estático suficiente');
        results.layers.llmDecision.reason = 'metadata sufficient';
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // SCORE FINAL
  // ═══════════════════════════════════════════════════════════════════
  
  results.score = calculateAuditScore(results);
  
  console.log('\n' + '═'.repeat(70));
  console.log(`📊 SCORE DE CALIDAD: ${results.score}/100`);
  console.log('═'.repeat(70));
  
  if (results.issues.length > 0) {
    console.log(`\n⚠️  Issues encontrados: ${results.issues.join(', ')}`);
  }
  
  return results;
}

/**
 * Calcula score de calidad del flujo de datos
 */
function calculateAuditScore(results) {
  let score = 0;
  
  // File analysis existe (+20)
  if (results.layers.fileAnalysis?.exists) score += 20;
  
  // Tiene átomos (+20)
  if (results.layers.atoms?.count > 0) score += 20;
  
  // Átomos con calledBy (+15)
  if (results.layers.atoms?.withCalledBy > 0) score += 15;
  
  // Átomos con calls (+10)
  if (results.layers.atoms?.withCalls > 0) score += 10;
  
  // Metadata score alto (+15)
  if (results.layers.metadata?.score >= 0.75) score += 15;
  else if (results.layers.metadata?.score >= 0.5) score += 7;
  
  // Conexiones semánticas (+10)
  if (results.layers.fileAnalysis?.semanticConnections > 0) score += 10;
  
  // usedBy (+10)
  if (results.layers.fileAnalysis?.usedBy > 0) score += 10;
  
  return score;
}

/**
 * Audita múltiples archivos y genera reporte
 */
async function auditMultipleFiles(filePaths, limit = 10) {
  console.log('\n🔍 OmnySys Data Flow Auditor');
  console.log('━'.repeat(70));
  console.log(`Auditoría de ${Math.min(filePaths.length, limit)} archivos usando APIs REALES\n`);
  
  const results = [];
  
  for (let i = 0; i < Math.min(filePaths.length, limit); i++) {
    const result = await auditFile(filePaths[i]);
    results.push(result);
  }
  
  // Resumen final
  console.log('\n\n' + '═'.repeat(70));
  console.log('📋 RESUMEN DE AUDITORÍA');
  console.log('═'.repeat(70));
  
  const stats = {
    total: results.length,
    withAtoms: results.filter(r => r.layers.atoms?.count > 0).length,
    withCalledBy: results.filter(r => r.layers.atoms?.withCalledBy > 0).length,
    needsLLM: results.filter(r => r.layers.llmDecision?.needsLLM).length,
    avgScore: 0
  };
  
  stats.avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  
  console.log(`\n   📊 Archivos auditados:    ${stats.total}`);
  console.log(`   ✅ Con átomos:           ${stats.withAtoms} (${((stats.withAtoms/stats.total)*100).toFixed(1)}%)`);
  console.log(`   ✅ Con calledBy:         ${stats.withCalledBy} (${((stats.withCalledBy/stats.total)*100).toFixed(1)}%)`);
  console.log(`   ❓ Necesitan LLM:        ${stats.needsLLM} (${((stats.needsLLM/stats.total)*100).toFixed(1)}%)`);
  console.log(`   📈 Score promedio:        ${stats.avgScore.toFixed(1)}/100`);
  
  // Archivos problemáticos
  const problematic = results.filter(r => r.score < 50);
  if (problematic.length > 0) {
    console.log(`\n⚠️  Archivos con score bajo (<50):`);
    problematic.slice(0, 5).forEach(r => {
      console.log(`   - ${r.filePath} (${r.score}/100) - Issues: ${r.issues.join(', ')}`);
    });
  }
  
  return results;
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Si se especifica un archivo, auditar solo ese
  if (args.length > 0) {
    const filePath = args[0].replace(/\\/g, '/');
    await auditFile(filePath);
    return;
  }
  
  // Intentar leer del índice primero
  const index = await readIndex();
  let filePaths = [];
  
  if (index?.fileIndex && Object.keys(index.fileIndex).length > 0) {
    filePaths = Object.keys(index.fileIndex);
    console.log(`📁 Encontrados ${filePaths.length} archivos en el índice`);
  } else {
    // Si el fileIndex está vacío, leer directamente del storage
    console.log('📁 fileIndex vacío, leyendo directamente de .omnysysdata/files/');
    filePaths = await getFilesFromStorage();
    console.log(`📁 Encontrados ${filePaths.length} archivos en storage`);
  }
  
  if (filePaths.length === 0) {
    console.log('❌ No se encontraron archivos analizados.');
    console.log('   Ejecuta primero: node src/layer-a-static/indexer.js .');
    return;
  }
  
  // Filtrar archivos de código (no tests, no configs)
  const codeFiles = filePaths.filter(f => {
    const ext = path.extname(f);
    return ['.js', '.ts', '.mjs'].includes(ext) &&
           !f.includes('.test.') &&
           !f.includes('.spec.') &&
           !f.includes('/tests/') &&
           !f.includes('config');
  });
  
  console.log(`📁 Archivos de código: ${codeFiles.length}`);
  
  // Auditar muestra aleatoria
  await auditMultipleFiles(codeFiles, 10);
}

main().catch(console.error);