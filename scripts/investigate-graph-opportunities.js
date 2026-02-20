/**
 * @fileoverview investigate-graph-opportunities.js
 * 
 * Analiza los metadatos disponibles y propone mejoras al sistema de grafos
 * basándose en purpose, archetype, temporal patterns, y otras metadata.
 * 
 * Usage: node scripts/investigate-graph-opportunities.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// DATA LOADING
// ============================================================================

async function readAllAtoms() {
  const atomsDir = path.join(ROOT_PATH, '.omnysysdata', 'atoms');
  const atoms = [];
  
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
            if (data.id) {
              atoms.push(data);
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(atomsDir);
  return atoms;
}

async function readSystemMap() {
  try {
    const content = await fs.readFile(path.join(ROOT_PATH, '.omnysysdata', 'system-map.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ============================================================================
// ANALYSIS
// ============================================================================

function analyzeOpportunities(atoms, systemMap) {
  console.log('\n🔬 INVESTIGACIÓN: Oportunidades de Mejora del Grafo');
  console.log('═'.repeat(70));
  
  // 1. Análisis por Purpose
  console.log('\n📊 1. ANÁLISIS POR PURPOSE');
  console.log('─'.repeat(50));
  
  const byPurpose = {};
  for (const atom of atoms) {
    const p = atom.purpose || 'UNKNOWN';
    if (!byPurpose[p]) byPurpose[p] = [];
    byPurpose[p].push(atom);
  }
  
  for (const [purpose, items] of Object.entries(byPurpose).sort((a, b) => b[1].length - a[1].length)) {
    const exported = items.filter(a => a.isExported).length;
    const withCallers = items.filter(a => a.calledBy?.length > 0).length;
    const asyncAtoms = items.filter(a => a.isAsync).length;
    
    console.log(`\n   ${purpose} (${items.length} atoms)`);
    console.log(`      Exportados: ${exported} (${(exported/items.length*100).toFixed(1)}%)`);
    console.log(`      Con callers: ${withCallers} (${(withCallers/items.length*100).toFixed(1)}%)`);
    console.log(`      Async: ${asyncAtoms} (${(asyncAtoms/items.length*100).toFixed(1)}%)`);
  }
  
  // 2. Análisis de patrones temporales
  console.log('\n📊 2. PATRONES TEMPORALES (Eventos, Timers, Lifecycle)');
  console.log('─'.repeat(50));
  
  const eventHandlers = atoms.filter(a => a.temporal?.patterns?.events?.length > 0);
  const timerUsers = atoms.filter(a => a.temporal?.patterns?.timers?.length > 0);
  const lifecycleHooks = atoms.filter(a => a.lifecycleHooks?.length > 0);
  const asyncFlows = atoms.filter(a => a.temporal?.patterns?.asyncPatterns);
  
  console.log(`   📡 Event handlers: ${eventHandlers.length}`);
  console.log(`   ⏱️ Timer users: ${timerUsers.length}`);
  console.log(`   🔄 Lifecycle hooks: ${lifecycleHooks.length}`);
  console.log(`   ⚡ Async patterns: ${asyncFlows.length}`);
  
  // Event pattern analysis
  if (eventHandlers.length > 0) {
    console.log('\n   📡 Tipos de eventos detectados:');
    const eventTypes = {};
    for (const atom of eventHandlers) {
      for (const event of atom.temporal.patterns.events) {
        const type = event.type || event.name || 'unknown';
        if (!eventTypes[type]) eventTypes[type] = 0;
        eventTypes[type]++;
      }
    }
    for (const [type, count] of Object.entries(eventTypes).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`      • ${type}: ${count}`);
    }
  }
  
  // 3. Análisis de flujos de datos
  console.log('\n📊 3. FLUJOS DE DATOS');
  console.log('─'.repeat(50));
  
  const withDataFlow = atoms.filter(a => a.hasDataFlow);
  const withInputs = atoms.filter(a => a.dataFlow?.inputs?.length > 0);
  const withOutputs = atoms.filter(a => a.dataFlow?.outputs?.length > 0);
  const withTransformations = atoms.filter(a => a.dataFlow?.transformations?.length > 0);
  
  console.log(`   📥 Con inputs: ${withInputs.length}`);
  console.log(`   📤 Con outputs: ${withOutputs.length}`);
  console.log(`   🔄 Con transformaciones: ${withTransformations.length}`);
  
  // Transformation types
  if (withTransformations.length > 0) {
    const transformOps = {};
    for (const atom of withTransformations) {
      for (const t of atom.dataFlow.transformations) {
        const op = t.operation || 'unknown';
        if (!transformOps[op]) transformOps[op] = 0;
        transformOps[op]++;
      }
    }
    console.log('\n   🔄 Operaciones de transformación más comunes:');
    for (const [op, count] of Object.entries(transformOps).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`      • ${op}: ${count}`);
    }
  }
  
  // 4. Análisis de conexiones
  console.log('\n📊 4. ANÁLISIS DE CONEXIONES');
  console.log('─'.repeat(50));
  
  const withCalledBy = atoms.filter(a => a.calledBy?.length > 0);
  const withCalls = atoms.filter(a => a.calls?.length > 0);
  const isolated = atoms.filter(a => !a.calledBy?.length && !a.calls?.length);
  
  console.log(`   🔗 Con callers (calledBy): ${withCalledBy.length}`);
  console.log(`   🔗 Con calls: ${withCalls.length}`);
  console.log(`   🏝️ Aislados (sin conexiones): ${isolated.length}`);
  
  // Hub analysis - atoms con más callers
  const hubs = atoms
    .filter(a => a.calledBy?.length > 0)
    .map(a => ({ name: a.name, filePath: a.filePath, callers: a.calledBy.length, purpose: a.purpose }))
    .sort((a, b) => b.callers - a.callers)
    .slice(0, 10);
  
  console.log('\n   🌟 HUBS (más callers):');
  for (const hub of hubs) {
    console.log(`      • ${hub.name} (${hub.callers} callers) - ${hub.purpose}`);
  }
  
  // 5. Análisis de arquétipos
  console.log('\n📊 5. ANÁLISIS DE ARQUETIPOS');
  console.log('─'.repeat(50));
  
  const byArchetype = {};
  for (const atom of atoms) {
    const arch = atom.archetype?.type || 'unknown';
    if (!byArchetype[arch]) byArchetype[arch] = [];
    byArchetype[arch].push(atom);
  }
  
  for (const [arch, items] of Object.entries(byArchetype).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${arch}: ${items.length}`);
  }
  
  // 6. Oportunidades de clustering
  console.log('\n📊 6. OPORTUNIDADES DE CLUSTERING');
  console.log('─'.repeat(50));
  
  // Por archivo
  const byFile = {};
  for (const atom of atoms) {
    const file = atom.filePath;
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(atom);
  }
  
  const filesWithManyAtoms = Object.entries(byFile)
    .filter(([_, atoms]) => atoms.length > 10)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  console.log('\n   📁 Archivos con más átomos (candidatos a subgrafo):');
  for (const [file, fileAtoms] of filesWithManyAtoms) {
    const purposes = [...new Set(fileAtoms.map(a => a.purpose))];
    console.log(`      • ${file}: ${fileAtoms.length} atoms`);
    console.log(`        Purposes: ${purposes.join(', ')}`);
  }
  
  // Por purpose + archetype combination
  const byPurposeArchetype = {};
  for (const atom of atoms) {
    const key = `${atom.purpose}:${atom.archetype?.type || 'unknown'}`;
    if (!byPurposeArchetype[key]) byPurposeArchetype[key] = [];
    byPurposeArchetype[key].push(atom);
  }
  
  console.log('\n   🔗 Combinaciones Purpose + Archetype más comunes:');
  for (const [key, items] of Object.entries(byPurposeArchetype).sort((a, b) => b[1].length - a[1].length).slice(0, 5)) {
    console.log(`      • ${key}: ${items.length}`);
  }
  
  // 7. Recomendaciones
  console.log('\n' + '═'.repeat(70));
  console.log('💡 RECOMENDACIONES PARA EL GRAFO');
  console.log('═'.repeat(70));
  
  console.log(`
  1. 🎯 GRAFO POR PURPOSE
     - Crear subgrafos por cada purpose (API_EXPORT, TEST_HELPER, etc.)
     - Conectar API_EXPORT → CLASS_METHOD (usando calls)
     - TEST_HELPER no necesita estar en grafo principal
     
  2. 🔄 GRAFO DE EVENTOS
     - Crear nodos de tipo EVENT
     - Conectar EVENT_HANDLER → EVENT → otros handlers
     - Detectar event chains (emitter → handler → next)
     
  3. 📊 GRAFO DE DATA FLOW
     - Crear edges con tipo de transformación
     - Conectar inputs → transformaciones → outputs
     - Identificar data pipelines
     
  4. 🏗️ CLUSTERING AUTOMÁTICO
     - Agrupar átomos del mismo archivo en clusters
     - Identificar módulos cohesivos
     - Detectar boundary violations
     
  5. 📈 WEIGHTED EDGES
     - Peso por frecuencia de llamada
     - Peso por importancia (archetype severity)
     - Peso por complejidad de transformación
     
  6. 🎭 SUBGRAFOS ESPECIALES
     - Grafo de tests (TEST_HELPER)
     - Grafo de scripts (SCRIPT_MAIN)
     - Grafo de API pública (API_EXPORT)
`);
  
  console.log('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n📁 Cargando datos...');
  const atoms = await readAllAtoms();
  const systemMap = await readSystemMap();
  
  console.log(`   Átomos: ${atoms.length}`);
  console.log(`   System Map: ${systemMap ? '✓' : '✗'}`);
  
  analyzeOpportunities(atoms, systemMap);
}

main().catch(console.error);