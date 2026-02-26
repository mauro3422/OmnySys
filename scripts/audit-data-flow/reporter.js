/**
 * @fileoverview reporter.js
 * Presentation for audit-data-flow
 */
export function printFlowSummary(results) {
  console.log('\n\n' + '═'.repeat(70));
  console.log('📋 RESUMEN DE AUDITORÍA');
  console.log('═'.repeat(70));
  
  const stats = {
    total: results.length,
    withAtoms: results.filter(r => r.layers.atoms?.count > 0).length,
    avgScore: results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1)
  };
  
  console.log(`   📊 Archivos auditados:    ${stats.total}`);
  console.log(`   ✅ Con átomos:           ${stats.withAtoms} (${((stats.withAtoms/stats.total)*100).toFixed(1)}%)`);
  console.log(`   📈 Score promedio:        ${stats.avgScore.toFixed(1)}/100`);
}
