/**
 * @fileoverview reporter.js
 * Reporting for full scan
 */
export function printFullSystemReport(stats) {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 REPORTE DE AUDITORÍA COMPLETA');
  console.log('═'.repeat(70));
  
  console.log(`\n   Total archivos:        ${stats.total}`);
  console.log(`   Con átomos:            ${stats.withAtoms} (${((stats.withAtoms/stats.total)*100).toFixed(1)}%)`);
  console.log(`   Score metadata prom:   ${stats.avgMetadataScore.toFixed(2)}/1.0`);
  console.log(`   By-pass LLM:           ${((stats.bypassLLM/stats.total)*100).toFixed(1)}%`);

  if (stats.lowScoreFiles.length > 0) {
    console.log('\n⚠️  ARCHIVOS CON SCORE BAJO (<40):');
    stats.lowScoreFiles.slice(0, 5).forEach(f => {
      console.log(`   - ${f.filePath} (${f.score}/100)`);
    });
  }
}
