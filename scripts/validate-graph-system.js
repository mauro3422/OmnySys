/**
 * @fileoverview validate-graph-system.js
 * 
 * Valida el sistema de grafos mejorado mostrando datos concretos.
 * 
 * Usage: node scripts/validate-graph-system.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readAllAtoms, readSystemMap } from './utils/script-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// DATA LOADING
// ============================================================================

// ============================================================================
// VALIDATION
// ============================================================================

async function validateSystem() {
  console.log('\n🔍 VALIDACIÓN DEL SISTEMA DE GRAFOS MEJORADO');
  console.log('═'.repeat(70));
  
  // 1. Cargar datos
  console.log('\n📁 Cargando datos...');
const atoms = await readAllAtoms(ROOT_PATH);
  const systemMap = await readSystemMap(ROOT_PATH);
  
  console.log(`   ✅ Átomos cargados: ${atoms.size}`);
  console.log(`   ✅ System Map: ${systemMap ? 'Disponible' : 'No disponible'}`);
  
  // 2. Verificar que los átomos tienen purpose
  console.log('\n📊 1. VERIFICACIÓN DE PURPOSE EN ÁTOMOS');
  console.log('─'.repeat(50));
  
  const withPurpose = [];
  const withoutPurpose = [];
  
  for (const [id, atom] of atoms) {
    if (atom.purpose) {
      withPurpose.push(atom);
    } else {
      withoutPurpose.push(atom);
    }
  }
  
  console.log(`   ✅ Con purpose: ${withPurpose.length} (${(withPurpose.length/atoms.size*100).toFixed(1)}%)`);
  console.log(`   ❌ Sin purpose: ${withoutPurpose.length}`);
  
  // Mostrar sample de átomos con purpose
  console.log('\n   Sample de átomos con purpose:');
  const samples = withPurpose.slice(0, 5);
  for (const atom of samples) {
    console.log(`      • ${atom.name} → ${atom.purpose} (confidence: ${atom.purposeConfidence})`);
    console.log(`        File: ${atom.filePath}`);
  }
  
  // 3. Verificar distribución de purposes
  console.log('\n📊 2. DISTRIBUCIÓN DE PURPOSES');
  console.log('─'.repeat(50));
  
  const byPurpose = {};
  for (const atom of withPurpose) {
    const p = atom.purpose;
    if (!byPurpose[p]) byPurpose[p] = [];
    byPurpose[p].push(atom);
  }
  
  for (const [purpose, items] of Object.entries(byPurpose).sort((a, b) => b[1].length - a[1].length)) {
    const icon = {
      'API_EXPORT': '📤',
      'TEST_HELPER': '🧪',
      'CLASS_METHOD': '📦',
      'DEAD_CODE': '💀',
      'SCRIPT_MAIN': '🚀',
      'TIMER_ASYNC': '⏱️',
      'EVENT_HANDLER': '⚡'
    }[purpose] || '❓';
    console.log(`   ${icon} ${purpose}: ${items.length}`);
  }
  
  // 4. Verificar connections con peso
  console.log('\n📊 3. ANÁLISIS DE CONEXIONES');
  console.log('─'.repeat(50));
  
  // Simular weighted edges
  const links = [];
  for (const atom of withPurpose) {
    const calls = atom.calls || [];
    for (const call of calls) {
      const callName = call.name;
      if (!callName) continue;
      
      // Buscar el átomo llamado
      const targetAtom = Array.from(atoms.values()).find(a => a.name === callName);
      
      // Calcular peso
      let weight = 0.5;
      if (targetAtom?.purpose === 'API_EXPORT') weight += 0.2;
      if (targetAtom?.calledBy?.length > 5) weight += 0.15;
      if (targetAtom?.isAsync) weight += 0.1;
      if (targetAtom?.purpose === 'TEST_HELPER') weight -= 0.2;
      weight = Math.max(0.1, Math.min(1.0, weight));
      
      links.push({
        from: atom.name,
        to: callName,
        fromPurpose: atom.purpose,
        toPurpose: targetAtom?.purpose || 'UNKNOWN',
        weight,
        callType: targetAtom?.isAsync ? 'async' : 'sync'
      });
    }
  }
  
  console.log(`   Total links: ${links.length}`);
  
  // Mostrar links con mayor peso
  const highWeightLinks = links.filter(l => l.weight >= 0.8).slice(0, 5);
  console.log(`\n   Links con alto peso (≥0.8):`);
  for (const link of highWeightLinks) {
    console.log(`      • ${link.from} → ${link.to}`);
    console.log(`        Weight: ${link.weight.toFixed(2)} | ${link.fromPurpose} → ${link.toPurpose}`);
  }
  
  // 5. Construir subgrafo de API
  console.log('\n📊 4. SUBGRAFO DE API_EXPORT');
  console.log('─'.repeat(50));
  
  const apiAtoms = withPurpose.filter(a => a.purpose === 'API_EXPORT');
  const apiLinks = links.filter(l => 
    l.fromPurpose === 'API_EXPORT' || l.toPurpose === 'API_EXPORT'
  );
  
  console.log(`   Nodos API: ${apiAtoms.length}`);
  console.log(`   Links API: ${apiLinks.length}`);
  
  // Top API atoms por callers
  const apiByCallers = apiAtoms
    .filter(a => a.calledBy?.length > 0)
    .sort((a, b) => (b.calledBy?.length || 0) - (a.calledBy?.length || 0))
    .slice(0, 5);
  
  console.log(`\n   Top API atoms por callers:`);
  for (const atom of apiByCallers) {
    console.log(`      • ${atom.name}: ${atom.calledBy?.length} callers`);
    console.log(`        File: ${atom.filePath}`);
  }
  
  // 6. Dead code analysis
  console.log('\n📊 5. ANÁLISIS DE DEAD CODE');
  console.log('─'.repeat(50));
  
  const deadAtoms = withPurpose.filter(a => a.purpose === 'DEAD_CODE');
  const deadWithCallers = deadAtoms.filter(a => a.calledBy?.length > 0);
  
  console.log(`   Total DEAD_CODE: ${deadAtoms.length}`);
  console.log(`   Con callers (falso dead): ${deadWithCallers.length}`);
  console.log(`   Sin callers (real dead): ${deadAtoms.length - deadWithCallers.length}`);
  
  // 7. Validar system-map
  if (systemMap) {
    console.log('\n📊 6. SYSTEM MAP');
    console.log('─'.repeat(50));
    
    console.log(`   Archivos: ${systemMap.metadata?.totalFiles || 'N/A'}`);
    console.log(`   Dependencias: ${systemMap.metadata?.totalDependencies || 'N/A'}`);
    console.log(`   Funciones: ${systemMap.metadata?.totalFunctions || 'N/A'}`);
    console.log(`   Links: ${systemMap.metadata?.totalFunctionLinks || 'N/A'}`);
  }
  
  // 8. Resumen de validación
  console.log('\n' + '═'.repeat(70));
  console.log('✅ VALIDACIÓN COMPLETADA');
  console.log('═'.repeat(70));
  
  const validationResults = {
    atomsTotal: atoms.size,
    atomsWithPurpose: withPurpose.length,
    purposeCoverage: (withPurpose.length / atoms.size * 100).toFixed(1),
    apiAtoms: apiAtoms.length,
    deadCode: deadAtoms.length,
    linksTotal: links.length,
    highWeightLinks: links.filter(l => l.weight >= 0.8).length
  };
  
  console.log(`
   📊 Resumen:
      - Átomos totales: ${validationResults.atomsTotal}
      - Con purpose: ${validationResults.atomsWithPurpose} (${validationResults.purposeCoverage}%)
      - API atoms: ${validationResults.apiAtoms}
      - Dead code: ${validationResults.deadCode}
      - Links totales: ${validationResults.linksTotal}
      - Links alto peso: ${validationResults.highWeightLinks}
`);
  
  return validationResults;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  await validateSystem();
}

main().catch(console.error);