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
        const grandparent = nodePath.parent?.parent;

        // Verificar si es window.X o global.X
        if (
          (node.object.name === 'window' || node.object.name === 'global' || node.object.name === 'globalThis') &&
          node.property.name
        ) {
          const objectName = node.object.name;
          const propName = node.property.name;
          const fullRef = `${objectName}.${propName}`;

          // SKIP: Si es parte de una llamada a método (window.x.method() es method call, no property access)
          // Detectar si el parent es MemberExpression que forma parte de CallExpression
          if (parent.type === 'MemberExpression' && grandparent?.type === 'CallExpression' && grandparent.callee === parent) {
            return; // Ignore method calls like window.eventBus.on()
          }

          // Determinar si es READ o WRITE
          let accessType = 'read';
          let confidence = 1.0;

          // Función helper: verifica si el nodo actual es parte de la mano izquierda de una asignación
          function isPartOfAssignmentLeft(nodePath) {
            let current = nodePath;
            while (current) {
              const currentNode = current.node;
              const parentNode = current.parent;

              // Si encontramos AssignmentExpression y estamos en el lado izquierdo
              if (parentNode?.type === 'AssignmentExpression' && parentNode.left === currentNode) {
                return true;
              }

              // Si el parent es MemberExpression, seguir subiendo (puede ser parte de propiedad anidada)
              if (parentNode?.type === 'MemberExpression') {
                current = current.parentPath;
              } else {
                break;
              }
            }
            return false;
          }

          // Verificar si es asignación (directa o anidada)
          if (isPartOfAssignmentLeft(nodePath)) {
            accessType = 'write';
          }

          // Si es argumento de una llamada a función (read)
          if (parent.type === 'CallExpression' && parent.arguments.includes(node)) {
            accessType = 'read';
          }

          // Si es el objeto de una llamada a método directa (read)
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

  // Generar conexiones para propiedades que tienen acceso en diferentes archivos
  for (const [propName, accesses] of propertyIndex.entries()) {
    // Skip event-related properties - those should be handled by event-pattern-detector
    if (propName.toLowerCase().includes('bus') || propName.toLowerCase().includes('emitter') || propName.toLowerCase().includes('event')) {
      continue;
    }

    const allAccessors = [...new Set(accesses.map(a => a.file))];
    if (allAccessors.length < 2) continue; // No hay conexión si solo un archivo accede

    // Extraer writers y readers
    const uniqueWriters = [...new Set(accesses.filter(a => a.type === 'write').map(a => a.file))];
    const allFileAccessors = [...new Set(accesses.map(a => a.file))];

    // SOLO Patrón: accessor → writer (todas las dependencias apuntan a los writers)
    // Esto captura todas las dependencias semánticas hacia los que escriben/crean el estado
    for (const sourceFile of allFileAccessors) {
      for (const writerFile of uniqueWriters) {
        if (sourceFile !== writerFile) {
          // No crear si ya existe una conexión inversa
          const forwardConnId = `shared_state_${propName}_${writerFile}_to_${sourceFile}`;
          const backwardConnId = `shared_state_${propName}_${sourceFile}_to_${writerFile}`;

          if (!connections.some(c => c.id === forwardConnId) && !connections.some(c => c.id === backwardConnId)) {
            // Determinar razón basada en tipo de acceso
            const sourceAccess = accesses.find(a => a.file === sourceFile);
            const writerAccess = accesses.find(a => a.file === writerFile && a.type === 'write');
            let reason = '';

            if (sourceAccess?.type === 'read') {
              reason = `${sourceFile} reads ${propName} modified by ${writerFile}.`;
            } else if (sourceAccess?.type === 'write') {
              reason = `Both files access ${propName}. ${sourceFile} writes, ${writerFile} writes.`;
            }

            if (reason) {
              connections.push({
                id: backwardConnId,
                type: 'shared_state',
                sourceFile: sourceFile,
                targetFile: writerFile,
                globalProperty: propName,
                reason,
                confidence: sourceAccess?.type === 'read' ? 0.95 : 1.0,
                severity: calculateSeverity(sourceFile, writerFile, accesses, propName),
                evidence: {
                  sourceAccess: sourceAccess?.access,
                  writerAccess: writerAccess?.access
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
