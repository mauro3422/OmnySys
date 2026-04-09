/**
 * @fileoverview analyze-calledby-gaps.js
 * 
 * Analiza los gaps de calledBy y el nuevo campo callerPattern.
 */

import { readAllAtoms } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🔍 Análisis de callerPattern\n');
  console.log('═'.repeat(70));
  
  const atomsArr = await readAllAtoms(ROOT_PATH);
  const atoms = Array.from(atomsArr.values());
  console.log(`Total atoms: ${atoms.length}`);
  
  const withCalledBy = atoms.filter(a => a.calledBy && a.calledBy.length > 0);
  const withoutCalledBy = atoms.filter(a => !a.calledBy || a.calledBy.length === 0);
  
  console.log(`Con calledBy: ${withCalledBy.length} (${((withCalledBy.length/atoms.length)*100).toFixed(1)}%)`);
  console.log(`Sin calledBy: ${withoutCalledBy.length} (${((withoutCalledBy.length/atoms.length)*100).toFixed(1)}%)`);
  
  // Analizar callerPattern
  const byPattern = {};
  const byPatternAndHasCallers = { with: {}, without: {} };
  
  for (const atom of atoms) {
    const pattern = atom.callerPattern?.id || 'not_detected';
    const hasCallers = atom.calledBy && atom.calledBy.length > 0;
    
    byPattern[pattern] = (byPattern[pattern] || 0) + 1;
    
    if (hasCallers) {
      byPatternAndHasCallers.with[pattern] = (byPatternAndHasCallers.with[pattern] || 0) + 1;
    } else {
      byPatternAndHasCallers.without[pattern] = (byPatternAndHasCallers.without[pattern] || 0) + 1;
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 POR CALLER PATTERN:');
  console.log('═'.repeat(70));
  
  const sortedPatterns = Object.entries(byPattern).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedPatterns) {
    const pct = ((count / atoms.length) * 100).toFixed(1);
    const withCallers = byPatternAndHasCallers.with[pattern] || 0;
    const withoutCallers = byPatternAndHasCallers.without[pattern] || 0;
    console.log(`   ${pattern}: ${count} (${pct}%) - callers: ${withCallers} / no-callers: ${withoutCallers}`);
  }
  
  // Análisis de gaps explicados vs no explicados
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ANÁLISIS DE GAPS:');
  console.log('═'.repeat(70));
  
  const explainedPatterns = ['class_instance', 'test_framework', 'entry_point', 'cli_command', 
                             'event_callback', 're_export', 'truly_dead', 'dynamic_import',
                             'script_constant', 'internal_constant', 'archived'];
  const explained = withoutCalledBy.filter(a => 
    a.callerPattern && explainedPatterns.includes(a.callerPattern.id)
  );
  const unexplained = withoutCalledBy.filter(a => 
    !a.callerPattern || !explainedPatterns.includes(a.callerPattern.id)
  );
  
  console.log(`\n   ✅ GAPS EXPLICADOS (esperados): ${explained.length}`);
  console.log(`      Estos atoms tienen una razón válida para no tener calledBy`);
  
  console.log(`\n   ❓ GAPS NO EXPLICADOS: ${unexplained.length}`);
  console.log(`      Estos atoms necesitan investigación`);
  
  // Mostrar distribución de explicados
  console.log('\n' + '═'.repeat(70));
  console.log('📊 GAPS EXPLICADOS POR PATRÓN:');
  console.log('═'.repeat(70));
  
  const explainedByPattern = {};
  for (const atom of explained) {
    const pattern = atom.callerPattern?.id || 'unknown';
    explainedByPattern[pattern] = (explainedByPattern[pattern] || 0) + 1;
  }
  
  const sortedExplained = Object.entries(explainedByPattern).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedExplained) {
    const pct = ((count / explained.length) * 100).toFixed(1);
    console.log(`   ${pattern}: ${count} (${pct}%)`);
  }
  
  // Potencial de mejora
  const realTotal = atoms.length - explained.length;
  const realCoverage = ((withCalledBy.length / realTotal) * 100).toFixed(1);
  
  console.log('\n' + '═'.repeat(70));
  console.log('📈 MÉTRICAS REALES:');
  console.log('═'.repeat(70));
  console.log(`\n   Coverage nominal:     ${((withCalledBy.length/atoms.length)*100).toFixed(1)}%`);
  console.log(`   Coverage "real":      ${realCoverage}% (excluyendo gaps explicados)`);
  console.log(`   Atoms "reales":       ${realTotal} (de ${atoms.length} totales)`);
  
  // Ejemplos de gaps no explicados
  if (unexplained.length > 0 && unexplained.length <= 50) {
    console.log('\n' + '═'.repeat(70));
    console.log('❓ GAPS NO EXPLICADOS (investigar):');
    console.log('═'.repeat(70));
    for (const atom of unexplained.slice(0, 20)) {
      console.log(`   ${atom.filePath}::${atom.name} (purpose: ${atom.purpose}, archetype: ${atom.archetype?.type})`);
    }
  }
  
  console.log('\n');
}

main().catch(console.error);
