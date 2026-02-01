import path from 'path';

/**
 * GraphBuilder - Construye el grafo de dependencias
 *
 * Responsabilidad:
 * - Tomar archivos parseados con imports resueltos
 * - Construir grafo bidireccional
 * - Detectar ciclos (opcional)
 * - Calcular transitive dependencies
 */

/**
 * Construye el grafo de dependencias del sistema
 *
 * @param {object} parsedFiles - Mapa { filePath: FileInfo }
 * @param {object} resolvedImports - Mapa { filePath: { sourceImport: resolution } }
 * @returns {object} - SystemMap con FileNodes y Dependencies
 */
export function buildGraph(parsedFiles, resolvedImports) {
  const systemMap = {
    files: {},
    dependencies: [],
    functions: {},           // NUEVO: Funciones por archivo
    function_links: [],      // NUEVO: Enlaces entre funciones
    metadata: {
      totalFiles: 0,
      totalDependencies: 0,
      totalFunctions: 0,     // NUEVO
      totalFunctionLinks: 0, // NUEVO
      cyclesDetected: []
    }
  };

  // Normalizar paths para búsquedas rápidas
  const filesByPath = {};
  const allFilePaths = new Set();

  // Crear entrada para cada archivo
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const normalized = normalizePath(filePath);
    filesByPath[normalized] = fileInfo;
    allFilePaths.add(normalized);

    // Crear nodo de archivo
    systemMap.files[normalized] = {
      path: normalized,
      displayPath: getDisplayPath(normalized),
      exports: fileInfo.exports || [],
      imports: fileInfo.imports || [],
      definitions: fileInfo.definitions || [],
      usedBy: [], // Se llena después
      calls: fileInfo.calls || [],
      dependsOn: [] // Se llena después
    };
  }

  // Procesar imports y crear dependencies
  const dependencySet = new Set(); // Para evitar duplicados

  for (const [filePath, imports] of Object.entries(resolvedImports)) {
    const normalizedFrom = normalizePath(filePath);

    if (!systemMap.files[normalizedFrom]) {
      continue; // Archivo no en el grafo
    }

    for (const importInfo of imports) {
      if (!importInfo.resolved) {
        continue; // Import no resuelto (externo, error, etc.)
      }

      const normalizedTo = normalizePath(importInfo.resolved);

      // Verificar si el archivo destino está en el grafo
      if (!systemMap.files[normalizedTo]) {
        continue; // Archivo no está en el proyecto
      }

      // Crear dependency
      const depKey = `${normalizedFrom} -> ${normalizedTo}`;
      if (!dependencySet.has(depKey)) {
        dependencySet.add(depKey);

        const dependency = {
          from: normalizedFrom,
          to: normalizedTo,
          type: importInfo.type || 'import',
          symbols: importInfo.symbols || [],
          reason: importInfo.reason
        };

        systemMap.dependencies.push(dependency);

        // Actualizar bidirectional references
        systemMap.files[normalizedFrom].dependsOn.push(normalizedTo);
        systemMap.files[normalizedTo].usedBy.push(normalizedFrom);
      }
    }
  }

  // Eliminar duplicados en usedBy y dependsOn
  for (const fileNode of Object.values(systemMap.files)) {
    fileNode.usedBy = [...new Set(fileNode.usedBy)];
    fileNode.dependsOn = [...new Set(fileNode.dependsOn)];
  }

  // Detectar ciclos
  const cycles = detectCycles(systemMap);
  systemMap.metadata.cyclesDetected = cycles;

  // Calcular transitive dependencies
  for (const filePath of allFilePaths) {
    const fileNode = systemMap.files[filePath];
    const transitive = calculateTransitiveDependencies(
      filePath,
      systemMap,
      new Set()
    );
    fileNode.transitiveDepends = Array.from(transitive);
  }

  // Calcular transitive dependents
  for (const filePath of allFilePaths) {
    const fileNode = systemMap.files[filePath];
    const transitive = calculateTransitiveDependents(
      filePath,
      systemMap,
      new Set()
    );
    fileNode.transitiveDependents = Array.from(transitive);
  }

  // NUEVO: Procesar funciones y crear function_links
  for (const [filePath, fileInfo] of Object.entries(parsedFiles)) {
    const normalized = normalizePath(filePath);

    if (fileInfo.functions && Array.isArray(fileInfo.functions)) {
      systemMap.functions[normalized] = fileInfo.functions;

      // Crear enlaces entre funciones
      for (const func of fileInfo.functions) {
        for (const call of func.calls) {
          // Resolver qué archivo contiene la función llamada
          const targetFunc = findFunctionInResolution(
            call.name,
            fileInfo,
            resolvedImports,
            parsedFiles,
            normalized
          );

          if (targetFunc) {
            systemMap.function_links.push({
              from: func.id,
              to: targetFunc.id,
              type: 'call',
              line: call.line,
              file_from: normalized,
              file_to: targetFunc.file
            });
          }
        }
      }
    }
  }

  // Calcular métricas
  systemMap.metadata.totalFiles = allFilePaths.size;
  systemMap.metadata.totalDependencies = systemMap.dependencies.length;
  systemMap.metadata.totalFunctions = countTotalFunctions(systemMap.functions);
  systemMap.metadata.totalFunctionLinks = systemMap.function_links.length;

  return systemMap;
}

/**
 * Normaliza un path (Windows -> Unix)
 *
 * @param {string} filePath
 * @returns {string}
 */
function normalizePath(filePath) {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Obtiene un path más legible
 *
 * @param {string} normalizedPath
 * @returns {string}
 */
function getDisplayPath(normalizedPath) {
  // Mostrar desde "src/" en adelante si existe
  const srcIndex = normalizedPath.indexOf('/src/');
  if (srcIndex !== -1) {
    return normalizedPath.substring(srcIndex + 1);
  }
  return normalizedPath.split('/').pop() || normalizedPath;
}

/**
 * Detecta ciclos en el grafo
 *
 * @param {object} systemMap
 * @returns {array} - Array de ciclos encontrados
 */
function detectCycles(systemMap) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(node, path) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const fileNode = systemMap.files[node];
    for (const dependent of fileNode.dependsOn) {
      if (!visited.has(dependent)) {
        if (hasCycle(dependent, [...path])) {
          return true;
        }
      } else if (recursionStack.has(dependent)) {
        // Ciclo encontrado
        const cycleStartIndex = path.indexOf(dependent);
        const cycle = path.slice(cycleStartIndex).concat([dependent]);
        cycles.push(cycle);
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const filePath of Object.keys(systemMap.files)) {
    if (!visited.has(filePath)) {
      hasCycle(filePath, []);
    }
  }

  return cycles;
}

/**
 * Calcula dependencias transitivas (archivos que este depende)
 *
 * @param {string} filePath
 * @param {object} systemMap
 * @param {Set} visited
 * @returns {Set} - Set de rutas
 */
function calculateTransitiveDependencies(filePath, systemMap, visited) {
  if (visited.has(filePath)) {
    return new Set();
  }

  visited.add(filePath);
  const result = new Set();

  const fileNode = systemMap.files[filePath];
  if (!fileNode) return result;

  for (const dependent of fileNode.dependsOn) {
    result.add(dependent);
    const transitive = calculateTransitiveDependencies(dependent, systemMap, visited);
    for (const dep of transitive) {
      result.add(dep);
    }
  }

  return result;
}

/**
 * Calcula dependientes transitivos (archivos que dependen de este)
 *
 * @param {string} filePath
 * @param {object} systemMap
 * @param {Set} visited
 * @returns {Set} - Set de rutas
 */
function calculateTransitiveDependents(filePath, systemMap, visited) {
  if (visited.has(filePath)) {
    return new Set();
  }

  visited.add(filePath);
  const result = new Set();

  const fileNode = systemMap.files[filePath];
  if (!fileNode) return result;

  for (const dependent of fileNode.usedBy) {
    result.add(dependent);
    const transitive = calculateTransitiveDependents(dependent, systemMap, visited);
    for (const dep of transitive) {
      result.add(dep);
    }
  }

  return result;
}

/**
 * Obtiene el impacto de editar un archivo
 *
 * @param {string} filePath
 * @param {object} systemMap
 * @returns {object} - Información de impacto
 */
export function getImpactMap(filePath, systemMap) {
  const fileNode = systemMap.files[filePath];

  if (!fileNode) {
    return {
      error: `File not found: ${filePath}`
    };
  }

  const directDependents = fileNode.usedBy || [];
  const indirectDependents = fileNode.transitiveDependents || [];
  const allAffected = [...new Set([...directDependents, ...indirectDependents])];

  const riskLevel = calculateRiskLevel(allAffected.length);

  return {
    filePath: fileNode.displayPath,
    directDependents,
    indirectDependents,
    allAffected,
    riskLevel,
    totalFilesAffected: allAffected.length,
    recommendation: generateRecommendation(allAffected.length, riskLevel)
  };
}

/**
 * Calcula el nivel de riesgo basado en la cantidad de archivos afectados
 *
 * @param {number} count
 * @returns {string} - 'low', 'medium', 'high'
 */
function calculateRiskLevel(count) {
  if (count === 0) return 'low';
  if (count <= 3) return 'low';
  if (count <= 10) return 'medium';
  return 'high';
}

/**
 * Genera recomendación basada en el riesgo
 *
 * @param {number} affectedCount
 * @param {string} riskLevel
 * @returns {string}
 */
function generateRecommendation(affectedCount, riskLevel) {
  if (affectedCount === 0) {
    return '✅ Safe to edit - no dependencies detected';
  }

  if (riskLevel === 'low') {
    return `📝 Review ${affectedCount} file(s) before editing`;
  }

  if (riskLevel === 'medium') {
    return `⚠️ MEDIUM RISK - Review ${affectedCount} affected file(s) carefully`;
  }

  return `🚨 HIGH RISK - Review all ${affectedCount} affected file(s) before making changes`;
}

/**
 * Busca una función en los imports resueltos
 *
 * @param {string} functionName - Nombre de la función a buscar
 * @param {object} fileInfo - Info del archivo actual
 * @param {object} resolvedImports - Imports resueltos
 * @param {object} parsedFiles - Archivos parseados
 * @param {string} currentFile - Archivo actual normalizado
 * @returns {object|null} - { id, file } de la función encontrada
 */
function findFunctionInResolution(
  functionName,
  fileInfo,
  resolvedImports,
  parsedFiles,
  currentFile
) {
  // 1. Buscar en imports del archivo actual
  const imports = resolvedImports[currentFile] || [];

  for (const importInfo of imports) {
    if (!importInfo.resolved) continue;

    const resolvedFile = normalizePath(importInfo.resolved);
    const targetFileInfo = parsedFiles[resolvedFile];

    if (targetFileInfo && targetFileInfo.functions) {
      const foundFunc = targetFileInfo.functions.find(f => f.name === functionName);
      if (foundFunc) {
        return {
          id: foundFunc.id,
          file: resolvedFile
        };
      }
    }
  }

  // 2. Buscar en funciones locales (misma archivo)
  if (fileInfo.functions) {
    const localFunc = fileInfo.functions.find(f => f.name === functionName);
    if (localFunc) {
      return {
        id: localFunc.id,
        file: currentFile
      };
    }
  }

  return null;
}

/**
 * Cuenta el total de funciones en todos los archivos
 *
 * @param {object} functions - Mapa de functions por archivo
 * @returns {number}
 */
function countTotalFunctions(functions) {
  let total = 0;
  for (const funcs of Object.values(functions)) {
    total += funcs.length;
  }
  return total;
}
