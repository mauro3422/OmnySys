/**
 * @fileoverview Search Functions Command - Busca funciones por término
 */

import { loadAtoms } from '../utils/data-loader.js';

export async function tool_search_functions(term) {
  console.log(`\n🔍 SEARCH: "${term}"`);
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const termLower = term.toLowerCase();
  
  const matches = Array.from(atoms.values()).filter(a => 
    a.name?.toLowerCase().includes(termLower) ||
    a.filePath?.toLowerCase().includes(termLower) ||
    a.purpose?.toLowerCase().includes(termLower)
  );
  
  console.log(`\nResultados encontrados: ${matches.length}`);
  
  if (matches.length === 0) {
    console.log('   ❌ No se encontraron coincidencias');
    return [];
  }
  
  // Agrupar por archivo
  const byFile = {};
  for (const atom of matches) {
    const file = atom.filePath || 'unknown';
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(atom);
  }
  
  console.log(`\n📁 RESULTADOS:`);
  for (const [file, atoms] of Object.entries(byFile).slice(0, 15)) {
    console.log(`\n   ${file}:`);
    for (const atom of atoms.slice(0, 3)) {
      console.log(`      • ${atom.name} (línea ${atom.line})`);
    }
    if (atoms.length > 3) {
      console.log(`      ... y ${atoms.length - 3} más`);
    }
  }
  
  if (Object.keys(byFile).length > 15) {
    console.log(`\n   ... y ${Object.keys(byFile).length - 15} archivos más`);
  }
  
  return matches;
}
