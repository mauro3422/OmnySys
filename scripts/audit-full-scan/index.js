/**
 * @fileoverview index.js
 * Orchestration for audit-full-scan
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { loadStorageFilePaths } from './loader.js';
import { performFullSystemScan } from './analyzer.js';
import { printFullSystemReport } from './reporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.join(__dirname, '..', '..');

async function runFullScan() {
  console.log('\n🚀 Iniciando Escaneo Full...');
  const filePaths = await loadStorageFilePaths(ROOT_PATH);
  
  // Filtrar archivos relevantes
  const codeFiles = filePaths.filter(f => 
    ['.js', '.ts'].includes(path.extname(f)) &&
    !f.includes('.test.') && !f.includes('/tests/')
  );

  const stats = await performFullSystemScan(ROOT_PATH, codeFiles);
  printFullSystemReport(stats);
}

runFullScan().catch(console.error);
