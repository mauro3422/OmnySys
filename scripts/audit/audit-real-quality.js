/**
 * @fileoverview audit-real-quality.js
 * 
 * Audita la calidad REAL de los datos extraídos.
 * REFACTORIZADO: Grado A de mantenibilidad mediante modularización.
 * 
 * Uso: node scripts/audit-real-quality.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readAllFiles } from './utils/file-reader.js';
import { createInitialStats, processFileData, calculateHealthScore } from './utils/audit-stats-collector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

/**
 * Imprime el reporte de auditoría en consola
 */
function printAuditReport(stats, healthScore, issues) {
  const pct = (n) => ((n / stats.total) * 100).toFixed(1);

  console.log('\n🔍 OmnySys REAL Data Quality Audit');
  console.log('═'.repeat(70));
  console.log(`\n📁 Total archivos en storage: ${stats.total}`);

  console.log('\n' + '═'.repeat(70));
  console.log('📊 COBERTURA DE DATOS:');
  console.log('═'.repeat(70));

  const fields = [
    ['Definitions', 'withDefinitions'],
    ['Exports', 'withExports'],
    ['Imports', 'withImports'],
    ['UsedBy', 'withUsedBy'],
    ['SemanticConn', 'withSemanticConnections'],
    ['RiskScore', 'withRiskScore'],
    ['CalledBy', 'withCalledBy']
  ];

  for (const [label, key] of fields) {
    console.log(`   Con ${label.padEnd(12)}: ${stats[key].toString().padEnd(5)} (${pct(stats[key])}%)`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('🏥 HEALTH SCORE:');
  console.log('═'.repeat(70));
  console.log(`\n   ⭐ HEALTH SCORE: ${healthScore.toFixed(1)}/100`);

  if (healthScore >= 70) console.log('   ✅ EXCELENTE: Datos de alta calidad');
  else if (healthScore >= 50) console.log('   ⚠️  REGULAR: Calidad media');
  else console.log('   ❌ BAJO: Problemas de extracción');
}

/**
 * Main
 */
async function main() {
  const fileMap = await readAllFiles(ROOT_PATH);
  const stats = createInitialStats();
  const fileIssues = { noDefSrc: [], isolated: [] };

  for (const [filePath, data] of fileMap.entries()) {
    const issues = processFileData(data, filePath, stats);

    if (issues.noDefinitions && filePath.startsWith('src/') && !filePath.includes('.test.')) {
      fileIssues.noDefSrc.push(filePath);
    }
    if (issues.isolated) {
      fileIssues.isolated.push(filePath);
    }
  }

  const healthScore = calculateHealthScore(stats);
  printAuditReport(stats, healthScore, fileIssues);

  return stats;
}

main().catch(error => console.error('Audit failed:', error));
