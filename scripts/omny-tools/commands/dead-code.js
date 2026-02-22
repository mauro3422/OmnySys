/**
 * @fileoverview Dead Code Command - Muestra código muerto real
 */

import { loadAtoms } from '../utils/data-loader.js';

export async function tool_get_dead_code() {
  console.log('\n💀 DEAD CODE ANALYSIS');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  
  const deadAtoms = Array.from(atoms.values()).filter(a => 
    (!a.calledBy || a.calledBy.length === 0) &&
    a.purpose !== 'API_EXPORT' &&
    !a.isExported
  );
  
  console.log(`\nTotal funciones sin usar: ${deadAtoms.length}`);
  
  if (deadAtoms.length === 0) {
    console.log('   ✅ No se encontró código muerto');
    return [];
  }
  
  // Agrupar por archivo
  const byFile = {};
  for (const atom of deadAtoms) {
    const file = atom.filePath || 'unknown';
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(atom);
  }
  
  console.log(`\n📁 POR ARCHIVO:`);
  for (const [file, atoms] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
    console.log(`\n   ${file} (${atoms.length} funciones):`);
    for (const atom of atoms.slice(0, 5)) {
      console.log(`      • ${atom.name} (línea ${atom.line})`);
    }
    if (atoms.length > 5) {
      console.log(`      ... y ${atoms.length - 5} más`);
    }
  }
  
  return deadAtoms;
}
