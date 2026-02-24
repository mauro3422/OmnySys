/**
 * @fileoverview audit-atoms-correct.js
 * 
 * Auditor CORRECTO de atoms.
 * Los atoms están en .omnysysdata/atoms/ como archivos individuales.
 * 
 * Uso: node scripts/audit-atoms-correct.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readAllAtoms, readAllFiles } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

/**
 * Lee todos los atoms del storage
 */
function pct(n) {
  return stats.total > 0 ? ((n / stats.total) * 100).toFixed(1) : '0.0';
}

/**
 * Main
 */
async function main() {
  console.log('\n🔍 OmnySys CORRECT Atoms Audit');
  console.log('═'.repeat(70));
  
  // Leer atoms
  console.log('\n📁 Leyendo atoms de .omnysysdata/atoms/...');
  const atoms = await readAllAtoms(ROOT_PATH);
  console.log(`   ${atoms.size} atoms encontrados`);
  
  // Leer files
  console.log('📁 Leyendo files de .omnysysdata/files/...');
  const files = await readAllFiles(ROOT_PATH);
  console.log(`   ${files.size} files encontrados`);
  
  // Estadísticas de atoms
  const stats = {
    total: atoms.size,
    withCalledBy: 0,
    withCalls: 0,
    withDataFlow: 0,
    withTypeContracts: 0,
    withDNA: 0,
    withPerformance: 0,
    withArchetype: 0,
    
    // Tipos
    types: {},
    
    // calledBy vacío
    emptyCalledBy: 0,
    
    // Por archivo
    filesWithAtoms: new Set(),
    
    // Calidad de datos
    missingFields: 0,
    lowConfidence: 0
  };
  
  // Analizar cada atom
  for (const atom of atoms.values()) {
    const data = atom;
    
    // Contar tipos
    const type = data.type || data.functionType || 'unknown';
    stats.types[type] = (stats.types[type] || 0) + 1;
    
    // calledBy
    if (data.calledBy && data.calledBy.length > 0) {
      stats.withCalledBy++;
    } else {
      stats.emptyCalledBy++;
    }
    
    // calls
    const calls = data.calls || data.internalCalls || data.externalCalls || [];
    if (calls.length > 0) {
      stats.withCalls++;
    }
    
    // dataFlow
    if (data.dataFlow || data.hasDataFlow) {
      stats.withDataFlow++;
    }
    
    // typeContracts
    if (data.typeContracts && data.typeContracts.params) {
      stats.withTypeContracts++;
    }
    
    // DNA
    if (data.dna) {
      stats.withDNA++;
    }
    
    // Performance
    if (data.performance) {
      stats.withPerformance++;
    }
    
    // Archetype
    if (data.archetype) {
      stats.withArchetype++;
    }
    
    // Archivo fuente
    if (data.filePath) {
      stats.filesWithAtoms.add(data.filePath);
    }
    
    // Confidence
    if (data._meta?.confidence && data._meta.confidence < 0.5) {
      stats.lowConfidence++;
    }
  }
  
  // Reporte
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ESTADÍSTICAS DE ATOMS:');
  console.log('═'.repeat(70));
  
  const pct = (n) => ((n / stats.total) * 100).toFixed(1);
  
  console.log(`\n   Total atoms:          ${stats.total}`);
  console.log(`   Archivos con atoms:   ${stats.filesWithAtoms.size}`);
  console.log(`\n   Con calledBy:         ${stats.withCalledBy} (${pct(stats.withCalledBy)}%)`);
  console.log(`   Con calls:            ${stats.withCalls} (${pct(stats.withCalls)}%)`);
  console.log(`   Con dataFlow:         ${stats.withDataFlow} (${pct(stats.withDataFlow)}%)`);
  console.log(`   Con typeContracts:    ${stats.withTypeContracts} (${pct(stats.withTypeContracts)}%)`);
  console.log(`   Con DNA:              ${stats.withDNA} (${pct(stats.withDNA)}%)`);
  console.log(`   Con performance:      ${stats.withPerformance} (${pct(stats.withPerformance)}%)`);
  console.log(`   Con archetype:        ${stats.withArchetype} (${pct(stats.withArchetype)}%)`);
  
  console.log('\n' + '─'.repeat(70));
  console.log('📊 POR TIPO DE FUNCIÓN:');
  console.log('─'.repeat(70));
  
  const sortedTypes = Object.entries(stats.types).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    console.log(`   ${type}: ${count}`);
  }
  
  // Análisis de calledBy vacío
  console.log('\n' + '═'.repeat(70));
  console.log('⚠️  ANÁLISIS DE CALLEDBy:');
  console.log('═'.repeat(70));
  
  const calledByRate = (stats.withCalledBy / stats.total) * 100;
  console.log(`\n   Con calledBy poblado: ${stats.withCalledBy} (${calledByRate.toFixed(1)}%)`);
  console.log(`   Sin calledBy:         ${stats.emptyCalledBy} (${(100 - calledByRate).toFixed(1)}%)`);
  
  if (calledByRate < 30) {
    console.log('\n   ❌ PROBLEMA: Menos del 30% de atoms tiene calledBy.');
    console.log('      El cross-file linkage no está funcionando bien.');
  } else if (calledByRate < 60) {
    console.log('\n   ⚠️  REGULAR: Menos del 60% tiene calledBy.');
    console.log('      Algunos atoms son entry points (normal), otros no tienen linkage.');
  } else {
    console.log('\n   ✅ BIEN: Más del 60% tiene calledBy.');
  }
  
  // Relación files vs atoms
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RELACIÓN FILES ↔ ATOMS:');
  console.log('═'.repeat(70));
  
  console.log(`\n   Files en storage:        ${files.size}`);
  console.log(`   Files con atoms:         ${stats.filesWithAtoms.size}`);
  console.log(`   Files sin atoms:         ${files.size - stats.filesWithAtoms.size}`);
  
  const coverage = ((stats.filesWithAtoms.size / files.size) * 100).toFixed(1);
  console.log(`\n   Cobertura files→atoms:   ${coverage}%`);
  
  // Health Score
  console.log('\n' + '═'.repeat(70));
  console.log('🏥 HEALTH SCORE:');
  console.log('═'.repeat(70));
  
  const dataFlowScore = stats.withDataFlow / stats.total;
  const calledByScore = stats.withCalledBy / stats.total;
  const contractsScore = stats.withTypeContracts / stats.total;
  
  const healthScore = ((dataFlowScore * 0.4) + (calledByScore * 0.4) + (contractsScore * 0.2)) * 100;
  
  console.log(`\n   DataFlow coverage:   ${(dataFlowScore * 100).toFixed(1)}%`);
  console.log(`   CalledBy coverage:   ${(calledByScore * 100).toFixed(1)}%`);
  console.log(`   TypeContracts:       ${(contractsScore * 100).toFixed(1)}%`);
  console.log(`\n   ⭐ HEALTH SCORE: ${healthScore.toFixed(1)}/100`);
  
  if (healthScore >= 70) {
    console.log('   ✅ EXCELENTE: Atoms con metadata rica');
  } else if (healthScore >= 50) {
    console.log('   ⚠️  REGULAR: Algunos gaps en metadata');
  } else {
    console.log('   ❌ BAJO: Metadata insuficiente');
  }
  
  // Ejemplos de atoms sin calledBy
  if (stats.emptyCalledBy > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('📄 EJEMPLOS DE ATOMS SIN CALLEDBy:');
    console.log('═'.repeat(70));
    
    const noCalledBy = atoms.filter(a => !a.data.calledBy || a.data.calledBy.length === 0);
    console.log(`\n   Total: ${noCalledBy.length}`);
    console.log('\n   Primeros 10:');
    
    for (const atom of noCalledBy.slice(0, 10)) {
      const d = atom.data;
      console.log(`      - ${d.filePath}::${d.name} (${d.type || d.functionType})`);
      
      // Verificar si tiene exports (debería ser llamado por alguien)
      if (d.isExported) {
        console.log(`        ⚠️  Es exportado pero no tiene calledBy`);
      }
    }
  }
  
  console.log('\n');
  
  return stats;
}

main().catch(console.error);