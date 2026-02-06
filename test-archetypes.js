#!/usr/bin/env node

/**
 * Test simple de detección de arquetipos
 * Solo verifica que los metadatos se pasen correctamente al LLM
 */

import { getFileAnalysis } from './src/layer-a-static/query/index.js';
import { detectArchetypes } from './src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js';
import fs from 'fs/promises';
import path from 'path';

const projectPath = process.argv[2] || 'test-cases/scenario-2-semantic';
const absolutePath = path.resolve(projectPath);
const omnySysDataPath = path.join(absolutePath, '.OmnySysData');

async function testArchetypeDetection() {
  console.log('\n🧪 Test de Detección de Arquetipos\n');
  console.log(`📁 Proyecto: ${absolutePath}\n`);
  
  try {
    // Leer índice
    const indexPath = path.join(omnySysDataPath, 'index.json');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);
    
    console.log(`📊 Archivos en índice: ${Object.keys(index.fileIndex || {}).length}\n`);
    
    let detectedCount = 0;
    
    // Revisar cada archivo
    for (const [filePath, fileInfo] of Object.entries(index.fileIndex || {})) {
      const fileAnalysis = await getFileAnalysis(absolutePath, filePath);
      if (!fileAnalysis) continue;
      
      // Calcular métricas semánticas
      const semanticAccess = fileAnalysis.semanticAnalysis?.sharedState?.globalAccess || [];
      const semanticWrites = semanticAccess.filter(item => item.type === 'write');
      const semanticReads = semanticAccess.filter(item => item.type === 'read');
      const eventEmitters = fileAnalysis.semanticAnalysis?.eventPatterns?.eventEmitters || [];
      const eventListeners = fileAnalysis.semanticAnalysis?.eventPatterns?.eventListeners || [];
      const semanticConnections = fileAnalysis.semanticConnections || [];
      
      const metadata = {
        filePath: filePath,
        exportCount: fileInfo.exports || 0,
        dependentCount: fileInfo.dependents || 0,
        semanticDependentCount: semanticConnections.length,
        definesGlobalState: semanticWrites.length > 0,
        usesGlobalState: semanticReads.length > 0,
        hasGlobalAccess: semanticWrites.length > 0 || semanticReads.length > 0,
        hasLocalStorage: fileAnalysis.semanticConnections?.some(c => c.type === 'localStorage'),
        hasEventEmitters: eventEmitters.length > 0,
        hasEventListeners: eventListeners.length > 0,
        hasDynamicImports: fileAnalysis.semanticAnalysis?.sideEffects?.hasDynamicImport,
        globalStateWrites: semanticWrites.map(w => w.propName || w.property || w.fullReference).filter(Boolean),
        globalStateReads: semanticReads.map(r => r.propName || r.property || r.fullReference).filter(Boolean),
        eventNames: [...new Set([
          ...eventEmitters.map(e => e.event || e.name || e.eventName || String(e)),
          ...eventListeners.map(l => l.event || l.name || l.eventName || String(l))
        ])].slice(0, 10),
      };
      
      const archetypes = detectArchetypes(metadata);
      
      if (archetypes.length > 0) {
        detectedCount++;
        console.log(`✅ ${filePath}:`);
        console.log(`   Arquetipos: ${archetypes.map(a => a.type).join(', ')}`);
        console.log(`   Exports: ${metadata.exportCount}, Dependents: ${metadata.dependentCount}, Semantic: ${metadata.semanticDependentCount}`);
        console.log(`   Global Writes: ${metadata.globalStateWrites.join(', ') || 'none'}`);
        console.log(`   Global Reads: ${metadata.globalStateReads.join(', ') || 'none'}`);
        console.log(`   Event Names: ${metadata.eventNames.join(', ') || 'none'}\n`);
      } else {
        console.log(`⚪ ${filePath}: No arquetipos detectados (default)\n`);
      }
    }
    
    console.log(`\n📊 Resumen: ${detectedCount} archivos con arquetipos detectados\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testArchetypeDetection();
