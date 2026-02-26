/**
 * @fileoverview reporter.js - Reporting for validate-graph-system
 */

export function printValidationHeader() {
  console.log('\n🔍 VALIDACIÓN DEL SISTEMA DE GRAFOS MEJORADO');
  console.log('═'.repeat(70));
}

export function printPurposeStats(withPurpose, total) {
  console.log(`\n📊 1. VERIFICACIÓN DE PURPOSE EN ÁTOMOS`);
  console.log('─'.repeat(50));
  console.log(`   ✅ Con purpose: ${withPurpose.length} (${(withPurpose.length/total*100).toFixed(1)}%)`);
}

export function printDistribution(byPurpose) {
  console.log('\n📊 2. DISTRIBUCIÓN DE PURPOSES');
  console.log('─'.repeat(50));
  
  const icons = {
    'API_EXPORT': '📤',
    'TEST_HELPER': '🧪',
    'CLASS_METHOD': '📦',
    'DEAD_CODE': '💀',
    'SCRIPT_MAIN': '🚀',
    'TIMER_ASYNC': '⏱️',
    'EVENT_HANDLER': '⚡'
  };

  Object.entries(byPurpose)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([purpose, items]) => {
      console.log(`   ${icons[purpose] || '❓'} ${purpose}: ${items.length}`);
    });
}

export function printConnectionStats(links) {
  console.log('\n📊 3. ANÁLISIS DE CONEXIONES');
  console.log('─'.repeat(50));
  console.log(`   Total links: ${links.length}`);
  
  const high = links.filter(l => l.weight >= 0.8).slice(0, 5);
  console.log(`\n   Links con alto peso (≥0.8):`);
  high.forEach(l => {
    console.log(`      • ${l.from} → ${l.to} (${l.weight.toFixed(2)})`);
  });
}
