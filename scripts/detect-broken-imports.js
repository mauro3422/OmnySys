#!/usr/bin/env node
/**
 * @fileoverview Detecta todos los imports rotos en el proyecto
 * Uso: node scripts/detect-broken-imports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const brokenImports = [];
const checkedFiles = [];

function findJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
      findJsFiles(fullPath, files);
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractImports(content) {
  const imports = [];
  // Match: from './path' or from "./path" or import './path'
  const fromRegex = /from\s+['"]([^'"]+)['"]/g;
  const importRegex = /import\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = fromRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports.filter(imp => 
    !imp.startsWith('#') && 
    !imp.startsWith('node:') &&
    !imp.startsWith('http') &&
    imp.startsWith('.')
  );
}

function resolveImport(importPath, currentFile) {
  const resolved = path.resolve(path.dirname(currentFile), importPath);
  return resolved;
}

function fileExists(filePath) {
  return fs.existsSync(filePath) || 
         fs.existsSync(filePath + '.js') || 
         fs.existsSync(filePath + '/index.js');
}

console.log('🔍 Analizando imports en src/...\n');

const srcDir = path.join(rootDir, 'src');
const files = findJsFiles(srcDir);
console.log(`📁 ${files.length} archivos JavaScript encontrados`);

let processed = 0;
for (const file of files) {
  processed++;
  if (processed % 100 === 0) {
    process.stdout.write(`\r⏳ Procesados: ${processed}/${files.length}`);
  }
  
  try {
    const content = fs.readFileSync(file, 'utf8');
    const imports = extractImports(content);
    
    for (const imp of imports) {
      const resolved = resolveImport(imp, file);
      if (!fileExists(resolved)) {
        brokenImports.push({
          from: path.relative(rootDir, file),
          import: imp,
          missing: path.relative(rootDir, resolved)
        });
      }
    }
  } catch(e) {
    // Skip files that can't be read
  }
}

console.log(`\r✅ Análisis completo: ${processed} archivos procesados`);

// Group by missing file
const byMissing = {};
for (const item of brokenImports) {
  if (!byMissing[item.missing]) {
    byMissing[item.missing] = [];
  }
  byMissing[item.missing].push(item.from);
}

console.log('\n' + '='.repeat(60));
console.log(`🔴 IMPORTS ROTOS ENCONTRADOS: ${Object.keys(byMissing).length} archivos faltantes`);
console.log(`   Referenciados desde: ${brokenImports.length} importaciones`);
console.log('='.repeat(60));

// Show top 20
const sorted = Object.entries(byMissing).sort((a, b) => b[1].length - a[1].length);
let count = 0;
for (const [missing, refs] of sorted.slice(0, 20)) {
  count++;
  console.log(`\n${count}. 📁 ${missing}`);
  console.log(`   Referenciado por ${refs.length} archivo(s):`);
  refs.slice(0, 3).forEach(ref => console.log(`      - ${ref}`));
  if (refs.length > 3) console.log(`      ... y ${refs.length - 3} más`);
}

if (sorted.length > 20) {
  console.log(`\n... y ${sorted.length - 20} archivos más faltantes`);
}

// Save report
const reportPath = path.join(rootDir, 'logs', 'broken-imports-report.json');
if (!fs.existsSync(path.dirname(reportPath))) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
}
fs.writeFileSync(reportPath, JSON.stringify({
  summary: {
    totalFiles: files.length,
    totalBrokenImports: brokenImports.length,
    uniqueMissingFiles: Object.keys(byMissing).length
  },
  brokenImports: byMissing
}, null, 2));

console.log(`\n📄 Reporte guardado en: logs/broken-imports-report.json`);
