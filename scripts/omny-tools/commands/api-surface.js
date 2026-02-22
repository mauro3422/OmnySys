/**
 * @fileoverview API Surface Command - Muestra la superficie de API pública
 */

import { loadAtoms } from '../utils/data-loader.js';

export async function tool_get_api_surface() {
  console.log('\n📤 API SURFACE ANALYSIS');
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  
  const apiAtoms = Array.from(atoms.values()).filter(a => 
    a.purpose === 'API_EXPORT' || a.isExported
  );
  
  console.log(`\nTotal exports públicos: ${apiAtoms.length}`);
  
  // Agrupar por archivo
  const byFile = {};
  for (const atom of apiAtoms) {
    const file = atom.filePath || 'unknown';
    if (!byFile[file]) byFile[file] = [];
    byFile[file].push(atom);
  }
  
  console.log(`\n📁 API POR ARCHIVO:`);
  for (const [file, atoms] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
    console.log(`\n   ${file} (${atoms.length} exports):`);
    for (const atom of atoms.slice(0, 5)) {
      const async = atom.isAsync ? 'async ' : '';
      console.log(`      • ${async}${atom.name}`);
    }
    if (atoms.length > 5) {
      console.log(`      ... y ${atoms.length - 5} más`);
    }
  }
  
  return apiAtoms;
}
