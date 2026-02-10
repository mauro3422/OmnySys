#!/usr/bin/env node
/**
 * Script de Auditoría de Extracción
 * Uso: node scripts/audit-extraction.js [file-path]
 * 
 * Sin servidor MCP - Extrae y audita veracidad de datos
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFileFromDisk } from '../src/layer-a-static/parser/index.js';
import { extractAllMetadata } from '../src/layer-a-static/extractors/metadata/index.js';
import { MolecularExtractionPipeline } from '../src/layer-a-static/pipeline/molecular-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Colores
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', RST = '\x1b[0m';

async function extractFile(filePath) {
  const fullPath = path.resolve(PROJECT_ROOT, filePath);
  const code = await fs.readFile(fullPath, 'utf-8');
  const parsed = await parseFileFromDisk(fullPath);
  
  if (!parsed?.functions?.length) {
    console.log(`${Y}⚠️  No functions found in ${filePath}${RST}`);
    return null;
  }
  
  const metadata = extractAllMetadata(filePath, code);
  const pipeline = new MolecularExtractionPipeline();
  const molecular = await pipeline.processFile(filePath, code, parsed, metadata);
  
  return { filePath, molecular, code };
}

function printResults(result) {
  if (!result) return;
  
  console.log(`\n${C}▶ ${result.filePath}${RST}`);
  console.log(`  Functions: ${result.molecular.atoms?.length || 0}`);
  
  for (const atom of result.molecular.atoms || []) {
    const hasDNA = atom.dna?.id ? `${G}✓${RST}` : `${R}✗${RST}`;
    const hasDF = atom.dataFlow ? `${G}✓${RST}` : `${R}✗${RST}`;
    const hasTemp = atom.temporal?.patterns ? `${G}✓${RST}` : `${R}✗${RST}`;
    const hasTypes = atom.typeContracts ? `${G}✓${RST}` : `${R}✗${RST}`;
    const hasError = atom.errorFlow ? `${G}✓${RST}` : `${R}✗${RST}`;
    const hasPerf = atom.performance ? `${G}✓${RST}` : `${R}✗${RST}`;
    
    console.log(`    ${atom.name}`);
    console.log(`      DNA:${hasDNA} DataFlow:${hasDF} Temporal:${hasTemp} Types:${hasTypes} Error:${hasError} Perf:${hasPerf}`);
    
    if (atom.dna) {
      console.log(`      DNA: ${atom.dna.id?.substring(0, 16)}... complexity:${atom.dna.complexityScore}`);
    }
  }
}

async function main() {
  console.log(`${C}╔════════════════════════════════════════════════════════════╗${RST}`);
  console.log(`${C}║         AUDITORÍA DE EXTRACCIÓN - OmnySys                 ║${RST}`);
  console.log(`${C}╚════════════════════════════════════════════════════════════╝${RST}`);
  
  const targetFile = process.argv[2];
  
  if (targetFile) {
    // Auditar archivo específico
    const result = await extractFile(targetFile);
    printResults(result);
  } else {
    // Auditar archivos de ejemplo
    const files = [
      'src/layer-a-static/pipeline/molecular-extractor.js',
      'src/layer-c-memory/shadow-registry/index.js',
      'src/layer-a-static/extractors/metadata/dna-extractor.js',
    ];
    
    console.log(`\n${Y}Auditing ${files.length} files...${RST}`);
    
    for (const file of files) {
      const result = await extractFile(file);
      printResults(result);
    }
    
    console.log(`\n${G}✅ Audit complete${RST}`);
    console.log(`\nUsage: node scripts/audit-extraction.js <file-path>`);
  }
}

main().catch(err => {
  console.error(`${R}Error:${RST}`, err.message);
  process.exit(1);
});
