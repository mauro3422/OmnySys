/**
 * Shared State Detector - Detecta acceso a estado global (window.*, global.*)
 *
 * Responsabilidad:
 * - Encontrar todas las referencias a window.* y global.*
 * - Clasificar como READ o WRITE
 * - Guardar línea, función y contexto
 * - Retornar conexiones semánticas entre archivos que acceden al mismo estado
 *
 * @module shared-state-detector
 */

import traverse from '@babel/traverse';
import { parse } from '@babel/parser';

/**
 * Detecta acceso a estado global en un archivo
 *
 * @param {string} code - Código fuente del archivo
 * @param {string} filePath - Ruta del archivo para debugging
 * @returns {object} - { globalAccess: [], readProperties: [], writeProperties: [] }
 */
export function detectSharedState(code, filePath = '') {
  const globalAccess = [];
  const readProperties = new Set();
  const writeProperties = new Set();
  const propertyAccessMap = new Map(); // Mapeo de propiedad -> { reads: [], writes: [] }

  try {
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const plugins = [
      'jsx',
      'objectRestSpread',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      ['pipelineOperator', { proposal: 'minimal' }],
      'nullishCoalescingOperator',
      'optionalChaining',
      'partialApplication'
    ];

    if (isTypeScript) {
      plugins.push(['typescript', { isTSX: filePath.endsWith('.tsx') }]);
    }

    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });

    let currentFunction = 'module-level';

    traverse.default(ast, {
      FunctionDeclaration(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-function';
      },
      ArrowFunctionExpression(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-arrow';
      },
      FunctionExpression(nodePath) {
        currentFunction = nodePath.node.id?.name || 'anonymous-expression';
      },

      // Detectar window.* y global.*
      MemberExpression(nodePath) {
        const node = nodePath.node;
        const parent = nodePath.parent;

        // Verificar si es window.X o global.X
        if (
          (node.object.name === 'window' || node.object.name === 'global' || node.object.name === 'globalThis') &&
          node.property.name
        ) {
          const objectName = node.object.name;
          const propName = node.property.name;
          const fullRef = `${objectName}.${propName}`;

          // Determinar si es READ o WRITE
          let accessType = 'read';
          let confidence = 1.0;

          // Si es parte de una asignación (lado derecho = write)
          if (parent.type === 'AssignmentExpression' && parent.left === node) {
            accessType = 'write';
          }

          // Si es argumento de una llamada a función (podría ser ambos)
          if (parent.type === 'CallExpression' && parent.arguments.includes(node)) {
            accessType = 'read'; // Por defecto leer
          }

          // Si es el objeto de una llamada a método (read)
          if (parent.type === 'CallExpression' && parent.callee === node) {
            accessType = 'read';
          }

          const location = {
            filePath,
            line: node.loc?.start?.line || 0,
            column: node.loc?.start?.column || 0,
            functionContext: currentFunction,
            type: accessType,
            objectName,
            propName,
            fullReference: fullRef,
            confidence
          };

          globalAccess.push(location);

          // Mapear propiedad
          if (!propertyAccessMap.has(propName)) {
            propertyAccessMap.set(propName, { reads: [], writes: [] });
          }

          if (accessType === 'read') {
            readProperties.add(propName);
            propertyAccessMap.get(propName).reads.push(location);
          } else {
            writeProperties.add(propName);
            propertyAccessMap.get(propName).writes.push(location);
          }
        }
      }
    });
  } catch (error) {
    console.warn(`⚠️  Error parsing ${filePath}:`, error.message);
  }

  // Convertir Sets a Arrays
  return {
    globalAccess,
    readProperties: Array.from(readProperties),
    writeProperties: Array.from(writeProperties),
    propertyAccessMap: Object.fromEntries(propertyAccessMap)
  };
}

/**
 * Genera conexiones semánticas de estado compartido
 *
 * @param {object} fileAnalysisMap - Mapa de filePath -> { globalAccess, ... }
 * @returns {array} - Array de conexiones semánticas
 */
export function generateSharedStateConnections(fileAnalysisMap) {
  const connections = [];
  const propertyIndex = new Map(); // Mapa de propiedad -> [{ file, type, accesses }]

  // Indexar todas las propiedades globales
  for (const [filePath, analysis] of Object.entries(fileAnalysisMap)) {
    if (!analysis.globalAccess || analysis.globalAccess.length === 0) continue;

    for (const access of analysis.globalAccess) {
      const { propName, type } = access;

      if (!propertyIndex.has(propName)) {
        propertyIndex.set(propName, []);
      }

      propertyIndex.get(propName).push({
        file: filePath,
        type,
        access
      });
    }
  }

  // Generar conexiones para propiedades que tienen writers y readers en diferentes archivos
  for (const [propName, accesses] of propertyIndex.entries()) {
    // Separar readers y writers
    const uniqueWriters = new Set(accesses.filter(a => a.type === 'write').map(a => a.file));
    const uniqueReaders = new Set(accesses.filter(a => a.type === 'read').map(a => a.file));

    // Solo crear conexiones si hay writers (caso principal: writer → reader)
    if (uniqueWriters.size > 0) {
      for (const writerFile of uniqueWriters) {
        for (const readerFile of uniqueReaders) {
          if (writerFile !== readerFile) {
            // Evitar duplicados
            const connId = `shared_state_${propName}_${writerFile}_to_${readerFile}`;
            if (!connections.some(c => c.id === connId)) {
              connections.push({
                id: connId,
                type: 'shared_state',
                sourceFile: writerFile,
                targetFile: readerFile,
                globalProperty: propName,
                reason: `Both files access ${propName}. ${writerFile} writes, ${readerFile} reads.`,
                confidence: 1.0, // 100% seguro (determinístico)
                severity: calculateSeverity(writerFile, readerFile, accesses, propName),
                evidence: {
                  writerAccess: accesses.find(a => a.file === writerFile && a.type === 'write')?.access,
                  readerAccess: accesses.find(a => a.file === readerFile && a.type === 'read')?.access
                }
              });
            }
          }
        }
      }
    }
  }

  return connections;
}

/**
 * Calcula severidad basada en patrón de acceso
 *
 * @param {string} writerFile - Archivo que escribe
 * @param {string} readerFile - Archivo que lee
 * @param {array} accesses - Todos los accesos a esta propiedad
 * @param {string} propName - Nombre de la propiedad
 * @returns {string} - 'low' | 'medium' | 'high' | 'critical'
 */
function calculateSeverity(writerFile, readerFile, accesses, propName) {
  // Si hay múltiples writers y readers -> CRITICAL (race condition)
  const uniqueWriters = new Set(accesses.filter(a => a.type === 'write').map(a => a.file)).size;
  const uniqueReaders = new Set(accesses.filter(a => a.type === 'read').map(a => a.file)).size;

  if (uniqueWriters > 1 && uniqueReaders > 1) {
    return 'critical';
  }

  if (uniqueWriters > 1 || uniqueReaders > 1) {
    return 'high';
  }

  // Propiedades comunes son medium risk
  const commonStateNames = ['state', 'config', 'cache', 'store'];
  if (commonStateNames.some(name => propName.toLowerCase().includes(name))) {
    return 'high';
  }

  return 'medium';
}

export default {
  detectSharedState,
  generateSharedStateConnections
};
