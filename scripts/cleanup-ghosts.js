#!/usr/bin/env node
/**
 * @fileoverview Cleanup Ghosts - Limpia archivos fantasmas y crea sus sombras
 * 
 * FASE 0: Convierte los 6 archivos huérfanos en las primeras sombras del sistema.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ValidationEngine } from '../src/validation/core/validation-engine.js';
import { ShadowRegistry } from '../src/layer-c-memory/shadow-registry/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const OMNYSYSDATA_PATH = path.join(PROJECT_ROOT, '.omnysysdata');

async function findGhosts() {
  const indexContent = await fs.readFile(path.join(OMNYSYSDATA_PATH, 'index.json'), 'utf-8');
  const index = JSON.parse(indexContent);
  const files = Object.keys(index.fileIndex);
  
  const ghosts = [];
  for (const file of files) {
    try {
      await fs.access(path.join(PROJECT_ROOT, file));
    } catch {
      ghosts.push(file);
    }
  }
  return ghosts;
}

async function main() {
  console.log('🧹 FASE 0: Cleanup Ghosts - Creating shadows for orphan files\n');
  
  // 1. Detectar fantasmas
  console.log('1️⃣ Detectando archivos fantasmas...');
  const ghosts = await findGhosts();
  console.log(`   Encontrados: ${ghosts.length} fantasmas\n`);
  
  if (ghosts.length === 0) {
    console.log('✅ No hay fantasmas. Sistema limpio.');
    return;
  }
  
  // 2. Inicializar Shadow Registry
  console.log('2️⃣ Inicializando Shadow Registry...');
  const registry = new ShadowRegistry(OMNYSYSDATA_PATH);
  await registry.initialize();
  console.log('   ✅ Shadow Registry listo\n');
  
  // 3. Procesar cada fantasma
  console.log('3️⃣ Procesando fantasmas...\n');
  let created = 0;
  let failed = 0;
  
  for (const ghost of ghosts) {
    const filePath = ghost.path || ghost.name || ghost;
    console.log(`   🗑️  ${filePath}`);
    
    try {
      // Obtener metadata existente (si hay)
      const metadata = await loadExistingMetadata(filePath);
      
      if (metadata && metadata.functions) {
        // Crear sombras para cada función
        for (const func of metadata.functions) {
          await createShadowForFunction(registry, func, filePath);
          created++;
        }
      } else {
        // Crear sombra genérica para el archivo
        await createShadowForFile(registry, filePath, metadata);
        created++;
      }
      
      // Limpiar archivos huérfanos
      await cleanupOrphanFiles(filePath);
      
      console.log(`      ✅ Shadow creada y archivos limpiados`);
    } catch (error) {
      console.log(`      ❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  // 4. Reporte final
  console.log('\n📊 Resumen:');
  console.log(`   Sombras creadas: ${created}`);
  console.log(`   Fallidos: ${failed}`);
  console.log(`   Total fantasmas procesados: ${ghosts.length}`);
  
  // 5. Verificar integridad
  console.log('\n5️⃣ Verificando integridad...');
  const remainingGhosts = await findGhosts();
  
  if (remainingGhosts.length === 0) {
    console.log('✅ Sistema íntegro. No quedan fantasmas.');
  } else {
    console.log(`⚠️  Quedan ${remainingGhosts.length} fantasmas (requieren atención manual)`);
  }
  
  console.log('\n🎉 FASE 0 completada');
}

async function loadExistingMetadata(filePath) {
  try {
    const safePath = filePath.replace(/[\/]/g, '_');
    const metadataPath = path.join(OMNYSYSDATA_PATH, 'files', `${safePath}.json`);
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function createShadowForFunction(registry, func, filePath) {
  // Construir átomo mínimo
  const atom = {
    id: `${filePath}::${func.name}`,
    name: func.name,
    filePath: filePath,
    lineNumber: func.line || 0,
    isExported: func.isExported || false,
    dataFlow: func.dataFlow || { inputs: [], outputs: [], transformations: [] },
    createdAt: new Date().toISOString()
  };
  
  await registry.createShadow(atom, {
    reason: 'cleanup_orphan_file',
    risk: 0.5 // Riesgo medio por ser desconocido
  });
}

async function createShadowForFile(registry, filePath, metadata) {
  // Átomo genérico para archivos sin funciones identificadas
  const atom = {
    id: filePath,
    name: path.basename(filePath, '.js'),
    filePath: filePath,
    lineNumber: 0,
    isExported: false,
    dataFlow: { inputs: [], outputs: [], transformations: [] },
    createdAt: new Date().toISOString()
  };
  
  await registry.createShadow(atom, {
    reason: 'cleanup_orphan_file',
    risk: 0.3
  });
}

async function cleanupOrphanFiles(filePath) {
  const safePath = filePath.replace(/[\/]/g, '_');
  
  // Limpiar metadata
  try {
    const metadataPath = path.join(OMNYSYSDATA_PATH, 'files', `${safePath}.json`);
    await fs.unlink(metadataPath);
  } catch {}
  
  // Limpiar átomos
  try {
    const atomsDir = path.join(OMNYSYSDATA_PATH, 'atoms', safePath);
    await fs.rm(atomsDir, { recursive: true, force: true });
  } catch {}
  
  // Limpiar del índice principal
  try {
    const indexPath = path.join(OMNYSYSDATA_PATH, 'index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(content);
    
    if (index.fileIndex[filePath]) {
      delete index.fileIndex[filePath];
      index.metadata.lastUpdated = new Date().toISOString();
      index.metadata.totalFiles = Object.keys(index.fileIndex).length;
      
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
      console.log(`      🗑️  Removido del índice principal`);
    }
  } catch (error) {
    console.log(`      ⚠️  No se pudo limpiar del índice: ${error.message}`);
  }
}

main().catch(console.error);
