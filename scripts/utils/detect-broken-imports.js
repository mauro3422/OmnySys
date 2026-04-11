#!/usr/bin/env node
/**
 * @fileoverview Detecta todos los imports rotos en el proyecto
 * 
 * VERSIÓN 2 — Mejorada para eliminar falsos positivos:
 * - Elimina comentarios de bloque (/* ... *\/) antes de analizar
 * - Elimina comentarios de línea (// ...) antes de analizar
 * - Elimina template literals y strings de ejemplo
 * - Ignora directorios: tests/, test/, test-cases/, archive/
 * 
 * Uso: node scripts/utils/detect-broken-imports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

// Directorios a ignorar (no son código de producción)
const IGNORE_DIRS = new Set([
  'node_modules',
  'tests',
  'test',
  'test-cases',
  'test-molecular-project',
  'archive',
  'coverage',
  'logs',
  'shadows',
  'docs',
  '.omnysysdata'
]);

const brokenImports = [];

function shouldIgnoreDir(dirName) {
  return dirName.startsWith('.') || IGNORE_DIRS.has(dirName);
}

function findJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !shouldIgnoreDir(item)) {
      findJsFiles(fullPath, files);
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Elimina contenido que no es código real para evitar falsos positivos:
 * 1. Bloques de comentarios (/* ... *\/)
 * 2. Comentarios de línea (// ...)
 * 3. Template literals (` ... `) — reemplazados con backticks vacíos
 * 4. Strings de una línea que puedan contener ejemplos de código
 * 
 * @param {string} content - Contenido original del archivo
 * @returns {string} - Contenido sin comentarios ni strings
 */
function stripNonCodeContent(content) {
  let result = content;

  // 1. Eliminar bloques de comentarios /* ... */ (incluyendo JSDoc /** ... */)
  // Usamos una versión no-greedy para no comer demasiado
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    // Preservar los saltos de línea para mantener números de línea correctos
    return match.replace(/[^\n]/g, ' ');
  });

  // 2. Eliminar comentarios de línea // ...
  result = result.replace(/\/\/[^\n]*/g, '');

  // 3. Eliminar template literals ` ... ` (pueden contener código de ejemplo)
  // Esta regex es simplificada — maneja el caso más común
  result = result.replace(/`[^`]*`/gs, '``');

  // 4. Eliminar strings de una línea que contengan patrones de ejemplo
  // Solo eliminamos strings que contienen "import ... from" o "export ... from"
  // para no romper strings legítimos que el código usa como valores
  result = result.replace(/'[^'\n]*from\s+['"][^'"]*['"][^'\n]*'/g, "''");
  result = result.replace(/"[^"\n]*from\s+['"][^'"]*['"][^"\n]*"/g, '""');

  return result;
}

function extractImports(content) {
  const cleanContent = stripNonCodeContent(content);
  const imports = [];

  // Match: from './path' or from "./path" or import './path'
  const fromRegex = /from\s+['"]([^'"]+)['"]/g;
  const importRegex = /^import\s+['"]([^'"]+)['"]/gm;

  let match;
  while ((match = fromRegex.exec(cleanContent)) !== null) {
    imports.push(match[1]);
  }
  while ((match = importRegex.exec(cleanContent)) !== null) {
    imports.push(match[1]);
  }

  return imports.filter(imp =>
    !imp.startsWith('#') &&      // No son aliases de package.json
    !imp.startsWith('node:') &&  // No son módulos de Node
    !imp.startsWith('http') &&   // No son URLs
    imp.startsWith('.')          // Solo imports relativos
  );
}

function fileExists(filePath) {
  return fs.existsSync(filePath) ||
         fs.existsSync(filePath + '.js') ||
         fs.existsSync(filePath + '/index.js');
}

console.log('🔍 Analizando imports en src/ (v2 — sin falsos positivos)...\n');

const srcDir = path.join(rootDir, 'src');
const files = findJsFiles(srcDir);
console.log(`📁 ${files.length} archivos JavaScript encontrados (solo src/, excluyendo tests/)`);

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
      const resolved = path.resolve(path.dirname(file), imp);
      if (!fileExists(resolved)) {
        brokenImports.push({
          from: path.relative(rootDir, file),
          import: imp,
          missing: path.relative(rootDir, resolved)
        });
      }
    }
  } catch (e) {
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

const totalMissing = Object.keys(byMissing).length;
const totalBroken = brokenImports.length;

console.log('\n' + '='.repeat(60));
if (totalMissing === 0) {
  console.log('✅ ¡SIN IMPORTS ROTOS! Todos los módulos están correctamente enlazados.');
} else {
  console.log(`🔴 IMPORTS ROTOS ENCONTRADOS: ${totalMissing} archivos faltantes`);
  console.log(`   Referenciados desde: ${totalBroken} importaciones`);
}
console.log('='.repeat(60));

// Show all broken imports
const sorted = Object.entries(byMissing).sort((a, b) => b[1].length - a[1].length);
let count = 0;
for (const [missing, refs] of sorted) {
  count++;
  console.log(`\n${count}. 📁 ${missing}`);
  console.log(`   Referenciado por ${refs.length} archivo(s):`);
  refs.slice(0, 5).forEach(ref => console.log(`      - ${ref}`));
  if (refs.length > 5) console.log(`      ... y ${refs.length - 5} más`);
}

// Save report
const reportPath = path.join(rootDir, 'logs', 'broken-imports-report.json');
if (!fs.existsSync(path.dirname(reportPath))) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
}
fs.writeFileSync(reportPath, JSON.stringify({
  generated: new Date().toISOString(),
  version: 2,
  scope: 'src/ only (tests/ and archive/ excluded)',
  summary: {
    totalFilesAnalyzed: files.length,
    totalBrokenImports: totalBroken,
    uniqueMissingFiles: totalMissing
  },
  brokenImports: byMissing
}, null, 2));

console.log(`\n📄 Reporte guardado en: logs/broken-imports-report.json`);

if (totalMissing > 0) {
  process.exit(1); // Exit with error code for CI
} else {
  process.exit(0); // All good
}
