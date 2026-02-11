/**
 * @fileoverview call-graph-analyzer.js
 * 
 * Call Graph Analyzer - Find all call sites of a symbol
 * Usa el caché de Layer A para obtener información precisa
 * 
 * @module analysis/call-graph-analyzer
 */

import fs from 'fs/promises';
import path from 'path';
import { getFileAnalysis } from '#layer-a/query/index.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:call:graph');

/**
 * Encuentra todos los call sites de un símbolo usando el caché de Layer A
 * 
 * Estrategia:
 * 1. Leer el archivo objetivo del caché para ver sus exports
 * 2. Buscar en todos los archivos que tienen "usedBy" o imports al target
 * 3. Analizar el código fuente para encontrar líneas específicas de llamada
 */
export async function findCallSites(projectPath, targetFile, symbolName) {
  try {
    // PASO 1: Leer metadata del archivo objetivo desde el caché
    const targetAnalysis = await getFileAnalysis(projectPath, targetFile);
    
    if (!targetAnalysis) {
      return { 
        error: `File ${targetFile} not found in cache. Run analysis first.` 
      };
    }
    
    // Verificar que el símbolo existe (incluyendo reexports)
    const exportInfo = targetAnalysis.exports?.find(e => e.name === symbolName);
    const hasDefinition = targetAnalysis.definitions?.some(d => d.name === symbolName);
    
    if (!exportInfo && !hasDefinition) {
      return { 
        error: `Symbol '${symbolName}' not found in ${targetFile}`,
        availableExports: targetAnalysis.exports?.map(e => e.name) || []
      };
    }
    
    // Si es reexport, seguir la cadena al archivo fuente
    let effectiveFile = targetFile;
    let effectiveSymbol = symbolName;
    
    if (exportInfo?.type === 'reexport' && exportInfo.source) {
      // Es un reexport, la definición real está en otro archivo
      // Pero seguimos usando este archivo como punto de entrada para el grafo
      logger.info(`  Note: ${symbolName} is reexported from ${exportInfo.source}`);
    }
    
    const exportType = exportInfo?.type || 'function';
    
    // PASO 2: Obtener lista de archivos que usan este archivo
    // Esto viene del grafo de dependencias de Layer A
    const dependents = targetAnalysis.usedBy || [];
    const directImports = targetAnalysis.importedBy || [];
    
    // Combinar y eliminar duplicados
    const allDependentFiles = [...new Set([...dependents, ...directImports])];
    
    logger.info(`[Call Graph] ${symbolName} in ${targetFile}`);
    logger.info(`  Found ${allDependentFiles.length} dependent files`);
    
    // PASO 3: Analizar cada archivo dependiente para encontrar call sites específicos
    const callSites = [];
    
    for (const depFile of allDependentFiles) {
      try {
        // Leer el archivo dependiente
        const depPath = path.join(projectPath, depFile);
        const content = await fs.readFile(depPath, 'utf-8');
        const lines = content.split('\n');
        
        // Obtener metadata del archivo dependiente
        const depAnalysis = await getFileAnalysis(projectPath, depFile);
        
        // Buscar cómo se importa el símbolo
        const importInfo = depAnalysis?.imports?.find(imp => {
          const resolvedPath = imp.resolvedPath || imp.source;
          return resolvedPath && (resolvedPath.includes(targetFile) || targetFile.includes(resolvedPath));
        });
        
        // Determinar el nombre bajo el cual se conoce el símbolo
        let localName = symbolName;
        let namespaceName = null;
        
        if (importInfo) {
          // Verificar si hay alias
          const specifier = importInfo.specifiers?.find(s => 
            s.imported === symbolName || s.name === symbolName
          );
          if (specifier?.local && specifier.local !== symbolName) {
            localName = specifier.local;
          }
          
          // Verificar si es namespace import
          if (importInfo.specifiers?.some(s => s.type === 'namespace')) {
            namespaceName = importInfo.specifiers.find(s => s.type === 'namespace')?.local || 'namespace';
          }
        }
        
        // Buscar llamadas en cada línea
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match = null;
          let callType = 'function_call';
          
          // Patrón 1: Llamada directa localName(
          if (new RegExp(`\\b${localName}\\s*\\(`).test(line)) {
            match = { type: 'direct', name: localName };
          }
          // Patrón 2: Llamada con namespace namespace.localName(
          else if (namespaceName && new RegExp(`\\b${namespaceName}\\.${localName}\\s*\\(`).test(line)) {
            match = { type: 'namespace', name: `${namespaceName}.${localName}` };
            callType = 'namespace_call';
          }
          // Patrón 3: new localName(
          else if (new RegExp(`new\\s+${localName}\\s*\\(`).test(line)) {
            match = { type: 'new', name: `new ${localName}` };
            callType = 'instantiation';
          }
          // Patrón 4: objeto.localName( (method call)
          else if (new RegExp(`\\.${localName}\\s*\\(`).test(line)) {
            match = { type: 'method', name: `.${localName}` };
            callType = 'method_call';
          }
          // Patrón 5: localName.call( o localName.apply(
          else if (new RegExp(`\\b${localName}\\.(call|apply)\\s*\\(`).test(line)) {
            match = { type: 'call/apply', name: `${localName}.call/apply` };
            callType = 'call_apply';
          }
          
          if (match) {
            // Extraer contexto (3 líneas antes y después)
            const contextStart = Math.max(0, i - 2);
            const contextEnd = Math.min(lines.length, i + 3);
            const context = lines.slice(contextStart, contextEnd).join('\n');
            
            callSites.push({
              file: depFile,
              line: i + 1,
              column: line.indexOf(match.name) + 1,
              code: line.trim(),
              context: context,
              type: callType,
              importType: importInfo ? (importInfo.type || 'unknown') : 'unknown',
              alias: localName !== symbolName ? localName : null,
              namespace: namespaceName
            });
          }
        }
        
      } catch (error) {
        logger.warn(`  ⚠️  Could not analyze ${depFile}: ${error.message}`);
        continue;
      }
    }
    
    // Ordenar por archivo y línea
    callSites.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    });
    
    logger.info(`  ✓ Found ${callSites.length} call sites`);
    
    return {
      targetSymbol: symbolName,
      targetFile,
      exportType: exportType,
      totalCallSites: callSites.length,
      uniqueFiles: [...new Set(callSites.map(s => s.file))].length,
      callSites: callSites.slice(0, 50) // Limitar a 50 resultados
    };
    
  } catch (error) {
    logger.error(`Error in findCallSites: ${error.message}`);
    return { error: error.message };
  }
}
