/**
 * @fileoverview index.js - Orchestration for audit-data-integrity
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { readAllStorageFiles, analyzeSourceFile } from './scanner.js';
import { analyzeFileIntegrityData, classifyEntriesByContext } from './analyzer.js';
import { 
  printAuditHeader, 
  printAuditSummary, 
  printAuditIssues, 
  printAuditClassification 
} from './reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..', '..');

async function runAudit() {
  printAuditHeader();
  
  console.log('\n📁 Leyendo archivos de storage...');
  const storageFiles = await readAllStorageFiles(ROOT_PATH);
  console.log(`   ${storageFiles.size} archivos encontrados`);
  
  console.log('\n⏳ Analizando integridad...');
  const results = [];
  const issuesByType = {};
  
  for (const [filePath, fileData] of storageFiles) {
    const result = analyzeFileIntegrityData(filePath, fileData);
    results.push(result);
    
    for (const issue of result.issues) {
      if (!issuesByType[issue]) issuesByType[issue] = [];
      issuesByType[issue].push(filePath);
    }
  }
  
  printAuditSummary(results);
  printAuditIssues(issuesByType);
  
  const noDefinitions = results.filter(r => r.definitions === 0);
  if (noDefinitions.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 ANÁLISIS DE ARCHIVOS SIN DEFINITIONS:');
    const classification = classifyEntriesByContext(noDefinitions);
    printAuditClassification(classification);
  }
  
  console.log('\n✅ Auditoría completada\n');
}

runAudit().catch(console.error);
