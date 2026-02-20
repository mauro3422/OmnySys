/**
 * @fileoverview demo-new-graph-features.js
 * 
 * Demuestra las nuevas capacidades del sistema de grafos:
 * 1. Event Graph
 * 2. Clustering por archivo y propósito
 * 3. Boundary violations
 * 
 * Usage: node scripts/demo-new-graph-features.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildEventGraph, findEventChains, getEventGraphStats } from '../src/layer-graph/builders/event-graph.js';
import { buildFileClusters, buildPurposeClusters, detectBoundaryViolations, getClusterStats } from '../src/layer-graph/builders/cluster-builder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..');

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAtoms() {
  const atomsDir = path.join(ROOT_PATH, '.omnysysdata', 'atoms');
  const atoms = new Map();
  
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
            if (data.id) atoms.set(data.id, data);
          } catch {}
        }
      }
    } catch {}
  }
  
  await scanDir(atomsDir);
  return atoms;
}

// ============================================================================
// DEMO
// ============================================================================

async function main() {
  console.log('\n🚀 DEMO: Nuevas Capacidades del Sistema de Grafos');
  console.log('═'.repeat(70));
  
  console.log('\n📁 Cargando átomos...');
  const atoms = await loadAtoms();
  console.log(`   ✅ ${atoms.size} átomos cargados`);
  
  // ========================================
  // 1. EVENT GRAPH
  // ========================================
  console.log('\n📊 1. EVENT GRAPH');
  console.log('═'.repeat(70));
  
  const eventGraph = buildEventGraph(atoms);
  const eventStats = getEventGraphStats(eventGraph);
  
  console.log(`\n   📡 Total eventos: ${eventStats.totalEvents}`);
  console.log(`   📤 Emitters: ${eventStats.totalEmitters}`);
  console.log(`   📥 Handlers: ${eventStats.totalHandlers}`);
  
  console.log(`\n   📋 Tipos de eventos:`);
  for (const [type, count] of Object.entries(eventStats.eventTypes)) {
    console.log(`      • ${type}: ${count}`);
  }
  
  // Mostrar eventos más usados
  const topEvents = eventGraph.nodes
    .sort((a, b) => (b.handlers?.length || 0) - (a.handlers?.length || 0))
    .slice(0, 5);
  
  console.log(`\n   🌟 Top eventos por handlers:`);
  for (const event of topEvents) {
    console.log(`      • ${event.name}: ${event.handlers?.length || 0} handlers`);
  }
  
  // Event chains
  const eventChains = findEventChains(eventGraph, atoms);
  console.log(`\n   🔗 Cadenas de eventos detectadas: ${eventChains.length}`);
  for (const chain of eventChains.slice(0, 3)) {
    console.log(`      • ${chain.events.join(' → ')}`);
  }
  
  // ========================================
  // 2. FILE CLUSTERS
  // ========================================
  console.log('\n📊 2. FILE CLUSTERS (Módulos Cohesivos)');
  console.log('═'.repeat(70));
  
  const fileClusters = buildFileClusters(atoms);
  const fileClusterStats = getClusterStats(fileClusters);
  
  console.log(`\n   📦 Total clusters: ${fileClusterStats.totalClusters}`);
  console.log(`   📊 Promedio átomos/cluster: ${fileClusterStats.avgClusterSize.toFixed(1)}`);
  console.log(`   🎯 Cohesión promedio: ${(fileClusterStats.avgCohesion * 100).toFixed(1)}%`);
  
  console.log(`\n   🌟 Top clusters por tamaño:`);
  for (const cluster of fileClusters.slice(0, 5)) {
    console.log(`      • ${cluster.file}`);
    console.log(`        Átomos: ${cluster.atoms.length} | Cohesión: ${(cluster.cohesion * 100).toFixed(1)}%`);
    console.log(`        Purpose: ${cluster.purposes.join(', ')}`);
  }
  
  // ========================================
  // 3. PURPOSE CLUSTERS
  // ========================================
  console.log('\n📊 3. PURPOSE CLUSTERS');
  console.log('═'.repeat(70));
  
  const purposeClusters = buildPurposeClusters(atoms);
  const purposeClusterStats = getClusterStats(purposeClusters);
  
  console.log(`\n   📦 Total clusters: ${purposeClusterStats.totalClusters}`);
  
  console.log(`\n   📋 Por propósito:`);
  for (const [purpose, data] of Object.entries(purposeClusterStats.byPurpose)) {
    console.log(`      • ${purpose}: ${data.count} clusters, ${data.atoms} átomos`);
  }
  
  console.log(`\n   🌟 Top clusters:`);
  for (const cluster of purposeClusters.slice(0, 5)) {
    console.log(`      • ${cluster.name}`);
    console.log(`        Átomos: ${cluster.atoms.length} | Archivos: ${cluster.metadata?.fileCount}`);
  }
  
  // ========================================
  // 4. BOUNDARY VIOLATIONS
  // ========================================
  console.log('\n📊 4. BOUNDARY VIOLATIONS');
  console.log('═'.repeat(70));
  
  const violations = detectBoundaryViolations(fileClusters.slice(0, 50), atoms);
  
  console.log(`\n   ⚠️  Total violaciones: ${violations.length}`);
  
  // Agrupar por severidad
  const bySeverity = {
    low: violations.filter(v => v.severity === 'low'),
    medium: violations.filter(v => v.severity === 'medium'),
    high: violations.filter(v => v.severity === 'high')
  };
  
  console.log(`\n   📋 Por severidad:`);
  console.log(`      • Low: ${bySeverity.low.length}`);
  console.log(`      • Medium: ${bySeverity.medium.length}`);
  console.log(`      • High: ${bySeverity.high.length}`);
  
  console.log(`\n   🔍 Sample de violaciones:`);
  for (const v of violations.slice(0, 5)) {
    console.log(`      • ${v.from.atom} → ${v.to.atom}`);
    console.log(`        ${v.from.file} → ${v.to.file}`);
  }
  
  // ========================================
  // RESUMEN
  // ========================================
  console.log('\n' + '═'.repeat(70));
  console.log('✅ DEMO COMPLETADA');
  console.log('═'.repeat(70));
  
  console.log(`
   📊 Resumen de nuevas capacidades:
   
   1. EVENT GRAPH
      - ${eventStats.totalEvents} eventos detectados
      - ${eventStats.totalHandlers} handlers
      - ${eventChains.length} cadenas de eventos
      
   2. FILE CLUSTERS  
      - ${fileClusterStats.totalClusters} módulos cohesivos
      - ${(fileClusterStats.avgCohesion * 100).toFixed(1)}% cohesión promedio
      
   3. PURPOSE CLUSTERS
      - ${purposeClusterStats.totalClusters} clusters por propósito
      
   4. BOUNDARY VIOLATIONS
      - ${violations.length} llamadas cross-cluster detectadas
`);
}

main().catch(console.error);