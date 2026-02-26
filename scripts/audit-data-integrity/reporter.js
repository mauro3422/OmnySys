/**
 * @fileoverview reporter.js - UI/Console output
 */

export function printAuditHeader() {
  console.log('\n🔍 OmnySys Data Integrity Audit');
  console.log('═'.repeat(70));
}

export function printAuditSummary(results) {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 REPORTE DE INTEGRIDAD');
  console.log('═'.repeat(70));
  
  const high = results.filter(r => r.completeness >= 70).length;
  const medium = results.filter(r => r.completeness >= 40 && r.completeness < 70).length;
  const low = results.filter(r => r.completeness < 40).length;
  
  console.log('\n📈 DISTRIBUCIÓN DE COMPLETITUD:');
  console.log(`   Alto (≥70%):     ${high} (${((high/results.length)*100).toFixed(1)}%)`);
  console.log(`   Medio (40-69%):  ${medium} (${((medium/results.length)*100).toFixed(1)}%)`);
  console.log(`   Bajo (<40%):     ${low} (${((low/results.length)*100).toFixed(1)}%)`);
}

export function printAuditIssues(issuesByType) {
  if (Object.keys(issuesByType).length === 0) return;
  
  console.log('\n' + '═'.repeat(70));
  console.log('❌ ISSUES ENCONTRADOS:');
  console.log('═'.repeat(70));
  
  for (const [issue, files] of Object.entries(issuesByType).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n   ${issue}: ${files.length} archivos`);
    files.slice(0, 5).forEach(f => console.log(`      - ${f}`));
    if (files.length > 5) console.log(`      ... y ${files.length - 5} más`);
  }
}

export function printAuditClassification(byType) {
  console.log('\n   📁 Clasificación:');
  Object.entries(byType).forEach(([type, files]) => {
    console.log(`      ${type}: ${files.length}`);
  });
}
