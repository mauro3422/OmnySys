/**
 * @fileoverview Cycles Command - Muestra ciclos de dependencias
 */

import { loadSystemMap } from '../utils/data-loader.js';

export async function tool_get_cycles() {
  console.log('\n🔄 DEPENDENCY CYCLES');
  console.log('═'.repeat(70));
  
  const systemMap = await loadSystemMap();
  const cycles = systemMap.metadata?.cyclesDetected || [];
  
  console.log(`\nTotal ciclos detectados: ${cycles.length}`);
  
  if (cycles.length === 0) {
    console.log('   ✅ No se encontraron ciclos de dependencias');
    return [];
  }
  
  console.log(`\n🔄 CICLOS ENCONTRADOS:`);
  for (const cycle of cycles.slice(0, 20)) {
    if (typeof cycle === 'string') {
      console.log(`   • ${cycle}`);
    } else if (Array.isArray(cycle)) {
      console.log(`   • ${cycle.join(' → ')} → ${cycle[0]}`);
    } else {
      console.log(`   • ${JSON.stringify(cycle)}`);
    }
  }
  
  if (cycles.length > 20) {
    console.log(`   ... y ${cycles.length - 20} más`);
  }
  
  return cycles;
}
