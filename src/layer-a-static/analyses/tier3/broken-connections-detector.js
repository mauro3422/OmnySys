/**
 * Broken Connections Detector
 * Detecta conexiones que apuntan a archivos/URLs inexistentes
 * 
 * Incluye:
 * - Web Workers que apuntan a archivos que no existen
 * - fetch/XHR a URLs que pueden estar rotas
 * - WebSocket a URLs inexistentes
 * - Importaciones dinámicas que no se resuelven
 */

/**
 * Detecta workers que apuntan a archivos inexistentes
 * @param {Object} systemMap - SystemMap completo
 * @param {Object} advancedAnalysis - Resultados del advanced-extractor
 * @returns {Object} - Reporte de workers rotos
 */
export function detectBrokenWorkers(systemMap, advancedAnalysis) {
  const brokenWorkers = [];
  const fileResults = advancedAnalysis?.fileResults || {};
  const allProjectFiles = Object.keys(systemMap.files || {});
  
  // Normalizar nombres de archivo para comparación
  const projectFileNames = allProjectFiles.map(f => ({
    fullPath: f,
    fileName: f.replace(/^.*[\\\/]/, ''),
    withoutExt: f.replace(/^.*[\\\/]/, '').replace(/\.[^.]+$/, '')
  }));
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const workerCreations = analysis.webWorkers?.outgoing?.filter(
      w => w.type === 'worker_creation'
    ) || [];
    
    for (const creation of workerCreations) {
      const workerPath = creation.workerPath;
      const workerFileName = workerPath.replace(/^.*[\\\/]/, '');
      const workerWithoutExt = workerFileName.replace(/\.[^.]+$/, '');
      
      // Buscar si existe el archivo
      const exists = projectFileNames.some(projFile => 
        projFile.fileName === workerFileName ||
        projFile.fileName === workerWithoutExt ||
        projFile.withoutExt === workerWithoutExt ||
        projFile.fullPath.includes(workerPath.replace('./', '').replace('../', ''))
      );
      
      if (!exists) {
        brokenWorkers.push({
          sourceFile: filePath,
          workerPath: workerPath,
          line: creation.line,
          type: 'WORKER_NOT_FOUND',
          severity: 'HIGH',
          reason: `Worker '${workerPath}' not found in project`,
          suggestion: `Check if the worker file exists or if the path is correct`
        });
      }
    }
  }
  
  return {
    total: brokenWorkers.length,
    byFile: groupByFile(brokenWorkers),
    all: brokenWorkers
  };
}

/**
 * Detecta imports dinámicos que pueden estar rotos
 * @param {Object} systemMap - SystemMap completo
 * @returns {Object} - Reporte de imports dinámicos sospechosos
 */
export function detectBrokenDynamicImports(systemMap) {
  const brokenDynamics = [];
  
  for (const [filePath, fileNode] of Object.entries(systemMap.files || {})) {
    // Buscar imports dinámicos: import() o require() con variables
    const dynamicImports = fileNode.imports?.filter(imp => 
      imp.type === 'dynamic' || imp.source?.includes('${') || imp.source?.includes('+')
    ) || [];
    
    for (const imp of dynamicImports) {
      // Si es un string literal, verificar si existe
      if (!imp.source?.includes('${') && !imp.source?.includes('+')) {
        const resolved = systemMap.resolutions?.[filePath]?.[imp.source];
        
        if (resolved?.type === 'unresolved') {
          brokenDynamics.push({
            sourceFile: filePath,
            importPath: imp.source,
            line: imp.line,
            type: 'DYNAMIC_IMPORT_UNRESOLVED',
            severity: 'MEDIUM',
            reason: `Dynamic import '${imp.source}' may not resolve at runtime`,
            suggestion: 'Ensure the path is correct or handle import failure'
          });
        }
      }
    }
  }
  
  return {
    total: brokenDynamics.length,
    byFile: groupByFile(brokenDynamics),
    all: brokenDynamics
  };
}

/**
 * Detecta funciones duplicadas o muy similares entre archivos
 * @param {Object} systemMap - SystemMap completo
 * @returns {Object} - Reporte de posibles duplicados
 */
export function detectDuplicateFunctions(systemMap) {
  const duplicates = [];
  const functionIndex = new Map(); // name -> [{file, function}]
  
  // Indexar todas las funciones por nombre
  for (const [filePath, functions] of Object.entries(systemMap.functions || {})) {
    for (const func of functions) {
      if (!functionIndex.has(func.name)) {
        functionIndex.set(func.name, []);
      }
      functionIndex.get(func.name).push({
        file: filePath,
        function: func
      });
    }
  }
  
  // Buscar nombres que aparecen en múltiples archivos
  for (const [funcName, occurrences] of functionIndex.entries()) {
    if (occurrences.length > 1) {
      // Filtrar nombres comunes que no son duplicados reales
      if (isCommonFunctionName(funcName)) continue;
      
      const files = occurrences.map(o => o.file);
      
      duplicates.push({
        functionName: funcName,
        files: files,
        count: occurrences.length,
        type: 'DUPLICATE_FUNCTION_NAME',
        severity: 'LOW',
        reason: `Function '${funcName}' defined in ${occurrences.length} files`,
        suggestion: 'Consider extracting to a shared module or renaming for clarity'
      });
    }
  }
  
  return {
    total: duplicates.length,
    all: duplicates
  };
}

/**
 * Detecta funciones que nunca se llaman (dead code a nivel función)
 * @param {Object} systemMap - SystemMap completo
 * @returns {Object} - Reporte de funciones muertas
 */
export function detectDeadFunctions(systemMap) {
  const deadFunctions = [];
  
  for (const [filePath, functions] of Object.entries(systemMap.functions || {})) {
    // Saltar archivos que son entry points o tienen side effects globales
    const fileNode = systemMap.files[filePath];
    const isEntryPoint = !fileNode?.usedBy || fileNode.usedBy.length === 0;
    
    for (const func of functions) {
      // Si la función no es exportada y no es llamada desde el mismo archivo
      const isExported = func.isExported || false;
      const isCalled = func.calls?.length > 0 || func.usedBy?.length > 0;
      
      // Funciones que parecen ser handlers de eventos o callbacks
      const isEventHandler = func.name?.startsWith('on') || 
                            func.name?.startsWith('handle');
      
      // Funciones que parecen ser inicializadoras
      const isInitFunction = func.name?.toLowerCase().includes('init') ||
                            func.name?.toLowerCase().includes('setup') ||
                            func.name?.toLowerCase().includes('configure');
      
      if (!isExported && !isCalled && !isEventHandler && !isInitFunction) {
        deadFunctions.push({
          functionName: func.name,
          file: filePath,
          line: func.line,
          type: 'DEAD_FUNCTION',
          severity: 'LOW',
          reason: `Function '${func.name}' is never called`,
          suggestion: 'Remove if not needed, or check if it should be exported'
        });
      }
    }
  }
  
  return {
    total: deadFunctions.length,
    byFile: groupByFile(deadFunctions),
    all: deadFunctions
  };
}

/**
 * Detecta URLs de API que pueden estar mal configuradas
 * @param {Object} advancedAnalysis - Resultados del advanced-extractor
 * @returns {Object} - Reporte de URLs sospechosas
 */
export function detectSuspiciousUrls(advancedAnalysis) {
  const suspiciousUrls = [];
  const fileResults = advancedAnalysis?.fileResults || {};
  
  // Patrones sospechosos en URLs
  const suspiciousPatterns = [
    { pattern: /localhost/, reason: 'Hardcoded localhost URL' },
    { pattern: /127\.0\.0\.1/, reason: 'Hardcoded IP address' },
    { pattern: /example\.com/, reason: 'Example domain in production code' },
    { pattern: /\.dev\./, reason: 'Development environment URL' },
    { pattern: /\/\/.*:\d+\//, reason: 'Hardcoded port number' }
  ];
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const networkUrls = analysis.networkCalls?.urls || [];
    const wsUrls = analysis.webSocket?.urls || [];
    const allUrls = [...networkUrls, ...wsUrls];
    
    for (const urlInfo of allUrls) {
      for (const { pattern, reason } of suspiciousPatterns) {
        if (pattern.test(urlInfo.url)) {
          suspiciousUrls.push({
            sourceFile: filePath,
            url: urlInfo.url,
            line: urlInfo.line,
            type: 'SUSPICIOUS_URL',
            severity: 'MEDIUM',
            reason: reason,
            suggestion: 'Consider using environment variables for URLs'
          });
          break; // Solo reportar una vez por URL
        }
      }
    }
  }
  
  return {
    total: suspiciousUrls.length,
    byFile: groupByFile(suspiciousUrls),
    all: suspiciousUrls
  };
}

/**
 * Análisis completo de conexiones rotas
 * @param {Object} systemMap - SystemMap completo
 * @param {Object} advancedAnalysis - Resultados del advanced-extractor
 * @returns {Object} - Reporte completo
 */
export function analyzeBrokenConnections(systemMap, advancedAnalysis) {
  const brokenWorkers = detectBrokenWorkers(systemMap, advancedAnalysis);
  const brokenDynamics = detectBrokenDynamicImports(systemMap);
  const duplicates = detectDuplicateFunctions(systemMap);
  const deadFunctions = detectDeadFunctions(systemMap);
  const suspiciousUrls = detectSuspiciousUrls(advancedAnalysis);
  
  const allIssues = [
    ...brokenWorkers.all,
    ...brokenDynamics.all,
    ...duplicates.all,
    ...deadFunctions.all,
    ...suspiciousUrls.all
  ];
  
  const criticalCount = allIssues.filter(i => i.severity === 'HIGH').length;
  const warningCount = allIssues.filter(i => i.severity === 'MEDIUM').length;
  const infoCount = allIssues.filter(i => i.severity === 'LOW').length;
  
  return {
    summary: {
      total: allIssues.length,
      critical: criticalCount,
      warning: warningCount,
      info: infoCount
    },
    brokenWorkers,
    brokenDynamicImports: brokenDynamics,
    duplicateFunctions: duplicates,
    deadFunctions,
    suspiciousUrls,
    all: allIssues
  };
}

// ==================== UTILIDADES ====================

function groupByFile(issues) {
  const byFile = {};
  for (const issue of issues) {
    const file = issue.sourceFile || issue.file;
    if (!byFile[file]) {
      byFile[file] = [];
    }
    byFile[file].push(issue);
  }
  return byFile;
}

function isCommonFunctionName(name) {
  const commonNames = [
    'main', 'init', 'setup', 'start', 'run', 'execute',
    'handleClick', 'handleChange', 'handleSubmit',
    'onClick', 'onChange', 'onSubmit', 'onLoad',
    'render', 'update', 'refresh', 'reload',
    'get', 'set', 'create', 'delete', 'remove', 'add',
    'toString', 'valueOf', 'constructor',
    'map', 'filter', 'reduce', 'forEach', 'find'
  ];
  
  return commonNames.includes(name) ||
         name.startsWith('_') || // privados
         name.startsWith('handle') || // event handlers
         name.startsWith('on'); // callbacks
}
