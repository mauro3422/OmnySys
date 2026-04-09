/**
 * @fileoverview index.js
 * Orchestration for audit-data-flow
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { readIndex, getFilesFromStorage } from './loader.js';
import { auditDataFlow } from './analyzer.js';
import { printFlowSummary } from './reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..', '..');

async function runAudit() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const filePath = args[0].replace(/\\/g, '/');
    await auditDataFlow(ROOT_PATH, filePath);
    return;
  }
  
  const index = await readIndex(ROOT_PATH);
  let filePaths = [];
  
  if (index?.fileIndex && Object.keys(index.fileIndex).length > 0) {
    filePaths = Object.keys(index.fileIndex);
  } else {
    filePaths = await getFilesFromStorage(ROOT_PATH);
  }
  
  const codeFiles = filePaths.filter(f => 
    ['.js', '.ts', '.mjs'].includes(path.extname(f)) &&
    !f.includes('.test.') && !f.includes('/tests/')
  ).slice(0, 5); // Limit to 5 for speed during audit
  
  const results = [];
  for (const file of codeFiles) {
    const result = await auditDataFlow(ROOT_PATH, file);
    results.push(result);
  }
  
  printFlowSummary(results);
}

runAudit().catch(console.error);
