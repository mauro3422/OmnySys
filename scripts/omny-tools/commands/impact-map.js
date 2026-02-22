/**
 * @fileoverview Impact Map Command - Muestra impacto de modificar un archivo
 */

import { loadAtoms, loadSystemMap } from '../utils/data-loader.js';

export async function tool_get_impact_map(filePath) {
  console.log(`\n📊 IMPACT MAP: ${filePath}`);
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  const systemMap = await loadSystemMap();
  
  // Normalizar path
  filePath = filePath.replace(/\\/g, '/');
  
  // Buscar en system-map
  const fileData = systemMap.files?.[filePath];
  
  if (fileData) {
    const imports = fileData.imports || [];
    console.log(`\n📥 IMPORTS (dependencias): ${imports.length}`);
    
    const internalImports = imports.filter(i => {
      const src = i.source || i.module || '';
      return src.startsWith('./') || src.startsWith('../') || src.startsWith('#');
    });
    const externalImports = imports.filter(i => {
      const src = i.source || i.module || '';
      return !src.startsWith('./') && !src.startsWith('../') && !src.startsWith('#');
    });
    
    console.log(`   Internos: ${internalImports.length}`);
    console.log(`   Externos: ${externalImports.length}`);
    
    if (internalImports.length > 0) {
      console.log(`\n   📁 Imports internos:`);
      for (const imp of internalImports.slice(0, 15)) {
        const src = imp.source || imp.module;
        const names = imp.names?.join(', ') || '*';
        console.log(`      • ${src} → ${names}`);
      }
      if (internalImports.length > 15) {
        console.log(`      ... y ${internalImports.length - 15} más`);
      }
    }
    
    // Exports
    const exports = fileData.exports || [];
    console.log(`\n📤 EXPORTS: ${exports.length}`);
    for (const exp of exports.slice(0, 10)) {
      console.log(`      • ${exp.name}`);
    }
    
    // UsedBy
    const usedBy = fileData.usedBy || fileData.dependsOn || [];
    console.log(`\n⚠️  USED BY (archivos que importan este): ${usedBy.length}`);
    for (const user of usedBy.slice(0, 10)) {
      console.log(`      • ${user}`);
    }
  }
  
  // Átomos en el archivo
  const fileAtoms = Array.from(atoms.values()).filter(a => 
    a.filePath === filePath || a.filePath?.includes(filePath)
  );
  
  console.log(`\n🎯 ATOMS EN ARCHIVO: ${fileAtoms.length}`);
  
  // Calcular impacto
  let totalCallers = 0;
  const callers = new Set();
  
  for (const atom of fileAtoms) {
    if (atom.calledBy) {
      totalCallers += atom.calledBy.length;
      for (const caller of atom.calledBy) {
        callers.add(caller);
      }
    }
  }
  
  console.log(`\n📈 IMPACTO:`);
  console.log(`   Funciones: ${fileAtoms.length}`);
  console.log(`   Total llamadas recibidas: ${totalCallers}`);
  console.log(`   Callers únicos: ${callers.size}`);
  console.log(`   ⚠️  RIESGO: ${callers.size > 10 ? 'ALTO' : callers.size > 5 ? 'MEDIO' : 'BAJO'}`);
  
  return {
    file: filePath,
    atoms: fileAtoms.length,
    totalCallers,
    uniqueCallers: callers.size
  };
}
