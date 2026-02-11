/**
 * @fileoverview verify.js
 * 
 * CLI para ejecutar verificación del sistema
 * Uso: node src/layer-c-memory/verification/cli/verify.js [project-path]
 * 
 * @module verification/cli
 */

import path from 'path';
import { VerificationOrchestrator } from '../orchestrator/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:verification:cli');

async function main() {
  // Obtener path del proyecto
  const projectPath = process.argv[2] || process.cwd();
  const absolutePath = path.resolve(projectPath);
  
  console.log('\n🔍 OmnySys Data Verification\n');
  console.log(`Project: ${absolutePath}\n`);
  
  try {
    // Crear orquestador
    const orchestrator = new VerificationOrchestrator(absolutePath, {
      checkIntegrity: true,
      checkConsistency: true,
      generateCertificate: true
    });
    
    // Ejecutar verificación
    const { report, certificate, passed } = await orchestrator.verify();
    
    // Mostrar resultados
    console.log('\n📊 Results:\n');
    console.log(`Status: ${report.status.toUpperCase()}`);
    console.log(`Duration: ${report.duration}ms`);
    console.log(`Issues found: ${report.stats.totalIssues}`);
    
    if (report.stats.totalIssues > 0) {
      console.log('\n🚨 Issues by Severity:');
      Object.entries(report.stats.bySeverity).forEach(([sev, count]) => {
        if (count > 0) {
          const emoji = sev === 'critical' ? '🔴' : 
                       sev === 'high' ? '🟠' :
                       sev === 'medium' ? '🟡' : '⚪';
          console.log(`  ${emoji} ${sev}: ${count}`);
        }
      });
      
      console.log('\n📋 Top Issues:');
      report.issues.slice(0, 10).forEach((issue, idx) => {
        const emoji = issue.severity === 'critical' ? '🔴' :
                     issue.severity === 'high' ? '🟠' :
                     issue.severity === 'medium' ? '🟡' : '⚪';
        console.log(`\n${idx + 1}. ${emoji} [${issue.system}] ${issue.message}`);
        if (issue.path) {
          console.log(`   Path: ${issue.path}`);
        }
        if (issue.suggestion) {
          console.log(`   💡 ${issue.suggestion}`);
        }
      });
    }
    
    // Mostrar resumen
    console.log(`\n📝 ${report.summary.message}`);
    
    if (report.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.summary.recommendations.forEach((rec, idx) => {
        const priorityEmoji = rec.priority === 'high' ? '🔴' :
                             rec.priority === 'medium' ? '🟡' : '⚪';
        console.log(`\n${idx + 1}. ${priorityEmoji} ${rec.action}`);
        console.log(`   ${rec.reason}`);
      });
    }
    
    // Mostrar certificado si se generó
    if (certificate) {
      console.log('\n📜 Certificate Generated:');
      console.log(`  ID: ${certificate.id}`);
      console.log(`  Valid until: ${certificate.validUntil}`);
      console.log(`  Hash: ${certificate.hash.substring(0, 16)}...`);
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    if (passed) {
      console.log('✅ VERIFICATION PASSED - System is healthy');
      process.exit(0);
    } else {
      console.log('❌ VERIFICATION FAILED - Issues need attention');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Verification failed:', error);
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
