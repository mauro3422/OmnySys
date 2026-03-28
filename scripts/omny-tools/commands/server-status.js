/**
 * @fileoverview Server Status Command - Muestra estado del sistema desde .omnysysdata/
 */

import { loadAtoms, loadSystemMap } from '../utils/data-loader.js';

export async function tool_get_server_status() {
  console.log('\n📊 SERVER STATUS (desde .omnysysdata/)');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const systemMap = await loadSystemMap();

  if (atoms.size === 0) {
    console.log('\n⚠️  No se encontraron átomos en SQLite ni snapshots legacy.');
    console.log('   Ejecuta un análisis o una sincronización para poblar .omnysysdata/.');
    return {
      atoms: 0,
      files: Object.keys(systemMap.files || {}).length,
      purposes: {},
      deadCode: 0,
      apiExports: 0
    };
  }
  
  // Contar propósitos
  const purposes = {};
  for (const atom of atoms.values()) {
    const p = atom.purpose || 'UNKNOWN';
    purposes[p] = (purposes[p] || 0) + 1;
  }
  
  console.log('\n📦 DATOS DISPONIBLES:');
  console.log(`   Átomos (funciones): ${atoms.size}`);
  console.log(`   Archivos en system-map: ${Object.keys(systemMap.files || {}).length}`);
  
  console.log('\n📊 DISTRIBUCIÓN POR PURPOSE:');
  for (const [purpose, count] of Object.entries(purposes).sort((a, b) => b[1] - a[1])) {
    const pct = atoms.size > 0 ? ((count / atoms.size) * 100).toFixed(1) : '0.0';
    console.log(`   ${purpose.padEnd(15)} ${count.toString().padStart(5)} (${pct}%)`);
  }
  
  // Dead code real
  const deadAtoms = Array.from(atoms.values()).filter(a => 
    a.purpose === 'DEAD_CODE' && (!a.calledBy || a.calledBy.length === 0)
  );
  const deadPct = atoms.size > 0 ? ((deadAtoms.length / atoms.size) * 100).toFixed(2) : '0.00';
  console.log(`\n💀 DEAD CODE REAL: ${deadAtoms.length} (${deadPct}%)`);
  
  // API Surface
  const apiAtoms = Array.from(atoms.values()).filter(a => a.purpose === 'API_EXPORT');
  console.log(`📤 API EXPORTS: ${apiAtoms.length}`);
  
  // Archivos analizados
  const srcFiles = Object.keys(systemMap.files || {}).filter(f => f.startsWith('src/'));
  console.log(`📁 Archivos src/ analizados: ${srcFiles.length}`);
  
  return {
    atoms: atoms.size,
    files: Object.keys(systemMap.files || {}).length,
    purposes,
    deadCode: deadAtoms.length,
    apiExports: apiAtoms.length
  };
}
