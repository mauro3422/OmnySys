/**
 * @fileoverview audit-full-scan.js
 * 
 * Escaneo completo del sistema para generar estadísticas de calidad de datos.
 * Usa las APIs REALES del sistema.
 * 
 * Uso: node scripts/audit-full-scan.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// Importar APIs REALES
const { getFileAnalysis, getFileAnalysisWithAtoms } = await import(
  '../src/layer-c-memory/query/apis/file-api.js'
);

const { needsLLMAnalysis, computeMetadataCompleteness } = await import(
  '../src/layer-b-semantic/llm-analyzer/analysis-decider.js'
);

/**
 * Lee archivos del storage (recursivamente)
 */
async function getAllFiles() {
  const filesDir = path.join(ROOT_PATH, '.omnysysdata', 'files');
  const files = [];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            const filePath = data.path || data.filePath;
            if (filePath) {
              files.push(filePath);
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(filesDir);
  return files;
}

/**
 * Escanea todos los archivos y genera estadísticas
 */
async function fullScan() {
  console.log('\n🔍 OmnySys Full Data Audit');
  console.log('═'.repeat(70));
  
  const filePaths = await getAllFiles();
  console.log(`\n📁 Archivos en storage: ${filePaths.length}`);
  
  if (filePaths.length === 0) {
    console.log('❌ No hay archivos. Ejecuta: node src/layer-a-static/indexer.js .');
    return;
  }
  
  // Estadísticas globales
  const stats = {
    total: filePaths.length,
    withAtoms: 0,
    withUsedBy: 0,
    withSemanticConnections: 0,
    withLLMInsights: 0,
    needsLLM: 0,
    bypassLLM: 0,
    avgMetadataScore: 0,
    avgAtomsPerFile: 0,
    avgCalledByPerAtom: 0,
    totalAtoms: 0,
    totalCalledBy: 0,
    totalCalls: 0,
    zeroAtoms: [],
    lowScore: [],
    highScore: []
  };
  
  console.log('\n⏳ Escaneando archivos...');
  
  for (const filePath of filePaths) {
    try {
      const fileAnalysis = await getFileAnalysis(ROOT_PATH, filePath);
      if (!fileAnalysis) continue;
      
      // Conteos básicos
      const atomCount = fileAnalysis.atomIds?.length || fileAnalysis.atoms?.length || 0;
      const usedByCount = fileAnalysis.usedBy?.length || 0;
      const connectionsCount = fileAnalysis.semanticConnections?.length || 0;
      
      stats.totalAtoms += atomCount;
      if (atomCount > 0) stats.withAtoms++;
      if (usedByCount > 0) stats.withUsedBy++;
      if (connectionsCount > 0) stats.withSemanticConnections++;
      if (fileAnalysis.llmInsights) stats.withLLMInsights++;
      
      // Metadata completeness
      const { score, gaps } = computeMetadataCompleteness(fileAnalysis);
      stats.avgMetadataScore += score;
      
      // Decisión LLM
      const needsLLM = needsLLMAnalysis(fileAnalysis.semanticAnalysis || {}, fileAnalysis);
      if (needsLLM) {
        stats.needsLLM++;
      } else {
        stats.bypassLLM++;
      }
      
      // Átomos detallados
      try {
        const atomsResult = await getFileAnalysisWithAtoms(ROOT_PATH, filePath);
        if (atomsResult?.atoms) {
          let fileCalledBy = 0;
          let fileCalls = 0;
          
          for (const atom of atomsResult.atoms) {
            if (atom.calledBy?.length > 0) {
              fileCalledBy += atom.calledBy.length;
              stats.totalCalledBy++;
            }
            if (atom.calls?.length > 0) {
              fileCalls += atom.calls.length;
              stats.totalCalls++;
            }
          }
          
          stats.avgCalledByPerAtom += fileCalledBy;
        }
      } catch {}
      
      // Clasificar por score
      const fileScore = calculateScore(atomCount, usedByCount, score, connectionsCount);
      if (fileScore < 40) {
        stats.zeroAtoms.push({ filePath, score: fileScore, atomCount, gaps });
      } else if (fileScore >= 80) {
        stats.highScore.push({ filePath, score: fileScore, atomCount });
      } else {
        stats.lowScore.push({ filePath, score: fileScore, atomCount });
      }
      
    } catch (error) {
      // Skip errores
    }
  }
  
  // Calcular promedios
  stats.avgMetadataScore = (stats.avgMetadataScore / stats.total).toFixed(2);
  stats.avgAtomsPerFile = (stats.totalAtoms / stats.total).toFixed(1);
  stats.avgCalledByPerAtom = (stats.totalCalledBy / stats.total).toFixed(2);
  
  // Reporte
  console.log('\n' + '═'.repeat(70));
  console.log('📊 REPORTE DE AUDITORÍA COMPLETA');
  console.log('═'.repeat(70));
  
  console.log('\n📁 COBERTURA:');
  console.log(`   Total archivos:        ${stats.total}`);
  console.log(`   Con átomos:            ${stats.withAtoms} (${((stats.withAtoms/stats.total)*100).toFixed(1)}%)`);
  console.log(`   Con usedBy:            ${stats.withUsedBy} (${((stats.withUsedBy/stats.total)*100).toFixed(1)}%)`);
  console.log(`   Con conexiones:        ${stats.withSemanticConnections} (${((stats.withSemanticConnections/stats.total)*100).toFixed(1)}%)`);
  console.log(`   Con LLM insights:      ${stats.withLLMInsights} (${((stats.withLLMInsights/stats.total)*100).toFixed(1)}%)`);
  
  console.log('\n📊 CALIDAD DE DATOS:');
  console.log(`   Total átomos:          ${stats.totalAtoms}`);
  console.log(`   Promedio átomos/file:  ${stats.avgAtomsPerFile}`);
  console.log(`   Átomos con calledBy:   ${stats.totalCalledBy}`);
  console.log(`   Átomos con calls:      ${stats.totalCalls}`);
  console.log(`   Score metadata prom:   ${stats.avgMetadataScore}/1.0`);
  
  console.log('\n🤖 DECISIÓN LLM:');
  console.log(`   Necesitan LLM:         ${stats.needsLLM} (${((stats.needsLLM/stats.total)*100).toFixed(1)}%)`);
  console.log(`   BYPASS (sin LLM):      ${stats.bypassLLM} (${((stats.bypassLLM/stats.total)*100).toFixed(1)}%)`);
  
  console.log('\n📈 DISTRIBUCIÓN DE SCORE:');
  console.log(`   Alto (≥80):            ${stats.highScore.length}`);
  console.log(`   Medio (40-79):         ${stats.lowScore.length}`);
  console.log(`   Bajo (<40):            ${stats.zeroAtoms.length}`);
  
  // Archivos problemáticos
  if (stats.zeroAtoms.length > 0) {
    console.log('\n⚠️  ARCHIVOS CON SCORE BAJO (<40):');
    stats.zeroAtoms.slice(0, 10).forEach(f => {
      console.log(`   - ${f.filePath} (${f.score}/100, atoms: ${f.atomCount})`);
    });
    if (stats.zeroAtoms.length > 10) {
      console.log(`   ... y ${stats.zeroAtoms.length - 10} más`);
    }
  }
  
  // Archivos ejemplares
  if (stats.highScore.length > 0) {
    console.log('\n✅ ARCHIVOS CON SCORE ALTO (≥80):');
    stats.highScore.slice(0, 5).forEach(f => {
      console.log(`   - ${f.filePath} (${f.score}/100, atoms: ${f.atomCount})`);
    });
  }
  
  // Recomendaciones
  console.log('\n' + '═'.repeat(70));
  console.log('💡 RECOMENDACIONES:');
  console.log('═'.repeat(70));
  
  const bypassRate = (stats.bypassLLM / stats.total) * 100;
  
  if (bypassRate >= 90) {
    console.log('\n   ✅ EXCELENTE: 90%+ archivos NO necesitan LLM.');
    console.log('      El análisis estático está funcionando muy bien.');
  } else if (bypassRate >= 70) {
    console.log('\n   ✅ BUENO: 70%+ archivos NO necesitan LLM.');
    console.log('      Revisar archivos con score bajo para mejorar extracción.');
  } else {
    console.log('\n   ⚠️  ATENCIÓN: Menos del 70% hace bypass de LLM.');
    console.log('      Posibles problemas en extracción de átomos o metadatos.');
  }
  
  if (stats.totalCalledBy === 0) {
    console.log('\n   ❌ PROBLEMA CRÍTICO: Ningún átomo tiene calledBy.');
    console.log('      El graph-builder no está poblando calledBy de átomos.');
  } else if (stats.totalCalledBy < stats.totalAtoms * 0.3) {
    console.log('\n   ⚠️  PROBLEMA: Menos del 30% de átomos tiene calledBy.');
    console.log('      Revisar la propagación de calledBy en graph-builder.');
  }
  
  console.log('\n');
  
  return stats;
}

/**
 * Calcula score simplificado
 */
function calculateScore(atoms, usedBy, metadataScore, connections) {
  let score = 0;
  if (atoms > 0) score += 30;
  if (usedBy > 0) score += 20;
  if (metadataScore >= 0.75) score += 30;
  else if (metadataScore >= 0.5) score += 15;
  if (connections > 0) score += 20;
  return score;
}

fullScan().catch(console.error);