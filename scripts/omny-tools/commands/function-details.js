/**
 * @fileoverview Function Details Command - Muestra detalles de una función
 */

import { loadAtoms } from '../utils/data-loader.js';

export async function tool_get_function_details(atomId) {
  console.log(`\n🔍 FUNCTION DETAILS: ${atomId}`);
  console.log('═'.repeat(70));
  
  const atoms = await loadAtoms();
  
  // Buscar por ID exacto o por nombre
  let atom = atoms.get(atomId);
  
  if (!atom) {
    // Buscar por nombre
    const matches = Array.from(atoms.values()).filter(a => 
      a.name === atomId || a.name?.includes(atomId)
    );
    
    if (matches.length === 0) {
      console.log(`   ❌ Función no encontrada: ${atomId}`);
      return null;
    }
    
    if (matches.length === 1) {
      atom = matches[0];
    } else {
      console.log(`   ⚠️  Múltiples coincidencias (${matches.length}):`);
      for (const m of matches.slice(0, 10)) {
        console.log(`      • ${m.id}`);
      }
      return null;
    }
  }
  
  console.log(`\n📋 INFORMACIÓN BÁSICA:`);
  console.log(`   Nombre: ${atom.name}`);
  console.log(`   Archivo: ${atom.filePath}:${atom.line}`);
  console.log(`   Tipo: ${atom.type || 'function'}`);
  console.log(`   Propósito: ${atom.purpose || 'UNKNOWN'}`);
  
  console.log(`\n📊 MÉTRICAS:`);
  console.log(`   Complejidad: ${atom.complexity}`);
  console.log(`   Líneas de código: ${atom.linesOfCode}`);
  console.log(`   Es exportada: ${atom.isExported ? 'Sí' : 'No'}`);
  console.log(`   Es async: ${atom.isAsync ? 'Sí' : 'No'}`);
  
  console.log(`\n🔗 DEPENDENCIAS:`);
  console.log(`   Llama a: ${atom.calls?.length || 0} funciones`);
  console.log(`   Llamada por: ${atom.calledBy?.length || 0} funciones`);
  
  if (atom.calledBy && atom.calledBy.length > 0) {
    console.log(`\n   📞 CALLERS:`);
    for (const caller of atom.calledBy.slice(0, 10)) {
      console.log(`      • ${caller}`);
    }
    if (atom.calledBy.length > 10) {
      console.log(`      ... y ${atom.calledBy.length - 10} más`);
    }
  }
  
  return atom;
}
