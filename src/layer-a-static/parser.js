import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Parser - Parsea archivos individuales y extrae información
 *
 * Responsabilidad:
 * - Generar AST con @babel/parser
 * - Extraer imports (qué y de dónde)
 * - Extraer exports (qué exporta)
 * - Extraer definiciones (funciones, clases)
 * - Extraer llamadas a funciones
 */

/**
 * Parsea un archivo y extrae información
 *
 * @param {string} filePath - Ruta absoluta del archivo
 * @param {string} code - Contenido del archivo
 * @returns {object} - FileInfo con imports, exports, definitions
 */
export function parseFile(filePath, code) {
  const fileInfo = {
    filePath,
    fileName: path.basename(filePath),
    ext: path.extname(filePath),
    imports: [],
    exports: [],
    definitions: [],
    calls: [],
    functions: [],  // Array de funciones con calls
    identifierRefs: [],  // Referencias a identificadores (constantes, variables)
    // TIER 3: Deep static analysis
    typeDefinitions: [],     // TypeScript interfaces, types
    enumDefinitions: [],     // Enums (TS y JS)
    constantExports: [],     // export const
    objectExports: [],       // export const obj = { ... } (mutable state)
    typeUsages: []           // Usos de types/interfaces en anotaciones
  };

  try {
    // Determinar opciones de parser basadas en extensión
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isJSX = filePath.endsWith('.jsx') || filePath.endsWith('.tsx');

    // Configurar plugins de babel
    const plugins = [
      'jsx',
      ['flow', { all: true }],
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
      plugins.push(['typescript', { isTSX: isJSX }]);
    }

    // Parsear el archivo
    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });

    // Traversar el AST
    traverse.default(ast, {
      // Extraer imports
      ImportDeclaration(nodePath) {
        const node = nodePath.node;
        const source = node.source.value;
        const specifiers = node.specifiers.map(spec => {
          if (spec.type === 'ImportDefaultSpecifier') {
            return { type: 'default', local: spec.local.name };
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            return { type: 'namespace', local: spec.local.name };
          } else {
            return {
              type: 'named',
              imported: spec.imported.name,
              local: spec.local.name
            };
          }
        });

        fileInfo.imports.push({
          source,
          specifiers,
          type: 'esm'
        });
      },

      // Extraer requires (CommonJS)
      CallExpression(nodePath) {
        const node = nodePath.node;
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'StringLiteral' || arg.type === 'Literal') {
            fileInfo.imports.push({
              source: arg.value,
              type: 'commonjs'
            });
          }
        }

        // Registrar llamadas a funciones
        if (node.callee.type === 'Identifier') {
          fileInfo.calls.push({
            name: node.callee.name,
            type: 'function'
          });
        } else if (node.callee.type === 'MemberExpression') {
          // tier1.findHotspots() → capturar como "tier1" y "tier1.findHotspots"
          if (node.callee.object.type === 'Identifier') {
            const objectName = node.callee.object.name;
            const propertyName = node.callee.property.name || node.callee.property.value;

            // Capturar el namespace (tier1)
            fileInfo.calls.push({
              name: objectName,
              type: 'namespace_access'
            });

            // Capturar el acceso completo (tier1.findHotspots)
            if (propertyName) {
              fileInfo.calls.push({
                name: `${objectName}.${propertyName}`,
                type: 'member_call'
              });
            }
          }
        }
      },

      // Extraer exports
      ExportNamedDeclaration(nodePath) {
        const node = nodePath.node;

        if (node.specifiers && node.specifiers.length > 0) {
          // export { x, y } o export { x } from './file' (re-export)
          const isReexport = !!node.source;

          node.specifiers.forEach(spec => {
            fileInfo.exports.push({
              type: isReexport ? 'reexport' : 'named',
              name: spec.exported.name,
              local: spec.local ? spec.local.name : spec.exported.name,
              source: isReexport ? node.source.value : undefined
            });
          });
        } else if (node.declaration) {
          // export function/class/const/let/var
          const decl = node.declaration;
          if (decl.id) {
            fileInfo.exports.push({
              type: 'declaration',
              kind: decl.type,
              name: decl.id.name
            });
          } else if (decl.declarations) {
            // export const x = ..., y = ...
            decl.declarations.forEach(d => {
              if (d.id.type === 'Identifier') {
                fileInfo.exports.push({
                  type: 'declaration',
                  kind: decl.type,
                  name: d.id.name
                });
              }
            });
          }
        }
      },

      // Extraer default export
      ExportDefaultDeclaration(nodePath) {
        const node = nodePath.node;
        fileInfo.exports.push({
          type: 'default',
          kind: node.declaration.type
        });
      },

      // Extraer definiciones de funciones
      FunctionDeclaration(nodePath) {
        const node = nodePath.node;
        if (node.id) {
          fileInfo.definitions.push({
            type: 'function',
            name: node.id.name,
            params: node.params.length
          });

          // NUEVO: Extraer función con calls
          const functionCalls = findCallsInFunction(nodePath);
          const isExported = isExportedFunction(node, fileInfo);

          fileInfo.functions.push({
            id: `${getFileId(filePath)}:${node.id.name}`,
            name: node.id.name,
            line: node.loc?.start.line || 0,
            endLine: node.loc?.end.line || 0,
            params: node.params.map(p => p.name || ''),
            isExported: isExported,
            calls: functionCalls
          });
        }
      },

      // Extraer definiciones de clases
      ClassDeclaration(nodePath) {
        const node = nodePath.node;
        if (node.id) {
          fileInfo.definitions.push({
            type: 'class',
            name: node.id.name
          });
        }
      },

      // TIER 3: Extraer TypeScript interfaces
      TSInterfaceDeclaration(nodePath) {
        const node = nodePath.node;
        if (node.id) {
          const isExported = isNodeExported(nodePath);
          fileInfo.typeDefinitions.push({
            type: 'interface',
            name: node.id.name,
            line: node.loc?.start.line || 0,
            isExported: isExported,
            properties: node.body.body.length
          });
        }
      },

      // TIER 3: Extraer TypeScript type aliases
      TSTypeAliasDeclaration(nodePath) {
        const node = nodePath.node;
        if (node.id) {
          const isExported = isNodeExported(nodePath);
          fileInfo.typeDefinitions.push({
            type: 'type',
            name: node.id.name,
            line: node.loc?.start.line || 0,
            isExported: isExported
          });
        }
      },

      // TIER 3: Extraer TypeScript enums
      TSEnumDeclaration(nodePath) {
        const node = nodePath.node;
        if (node.id) {
          const isExported = isNodeExported(nodePath);
          const members = node.members.map(m => m.id.name || m.id.value);
          fileInfo.enumDefinitions.push({
            type: 'enum',
            name: node.id.name,
            line: node.loc?.start.line || 0,
            isExported: isExported,
            members: members
          });
        }
      },

      // TIER 3: Detectar constantes y objetos exportados
      VariableDeclaration(nodePath) {
        const node = nodePath.node;

        // Solo nos interesan las constantes
        if (node.kind !== 'const') return;

        // Ver si está exportada
        const isExported = isNodeExported(nodePath);
        if (!isExported) return;

        node.declarations.forEach(declarator => {
          if (declarator.id.type === 'Identifier') {
            const name = declarator.id.name;
            const init = declarator.init;

            // Detectar si es un objeto (potencial estado mutable)
            if (init && init.type === 'ObjectExpression') {
              fileInfo.objectExports.push({
                name: name,
                line: declarator.loc?.start.line || 0,
                isMutable: true,
                properties: init.properties.length,
                warning: 'Exported mutable object - potential shared state'
              });
            }
            // Otras constantes exportadas
            else {
              fileInfo.constantExports.push({
                name: name,
                line: declarator.loc?.start.line || 0,
                valueType: init ? init.type : 'unknown'
              });
            }
          }
        });
      },

      // TIER 3: Detectar usos de types en anotaciones
      TSTypeReference(nodePath) {
        const node = nodePath.node;
        if (node.typeName && node.typeName.type === 'Identifier') {
          const typeName = node.typeName.name;
          // Solo agregar si no está duplicado
          if (!fileInfo.typeUsages.some(u => u.name === typeName && u.line === node.loc?.start.line)) {
            fileInfo.typeUsages.push({
              name: typeName,
              line: node.loc?.start.line || 0
            });
          }
        }
      },

      // Capturar referencias a identificadores (constantes, variables importadas)
      Identifier(nodePath) {
        const node = nodePath.node;
        const parent = nodePath.parent;

        // Ignorar declaraciones y definiciones
        if (
          parent.type === 'FunctionDeclaration' ||
          parent.type === 'VariableDeclarator' && parent.id === node ||
          parent.type === 'ImportSpecifier' ||
          parent.type === 'ImportDefaultSpecifier' ||
          parent.type === 'ImportNamespaceSpecifier' ||
          parent.type === 'ClassDeclaration' ||
          parent.type === 'Property' && parent.key === node && !parent.computed ||
          parent.type === 'MemberExpression' && parent.property === node && !parent.computed
        ) {
          return;
        }

        // Capturar solo referencias válidas (usadas en expresiones)
        if (nodePath.isReferencedIdentifier()) {
          const name = node.name;
          // Evitar duplicados y nombres comunes de JS
          if (
            name !== 'undefined' &&
            name !== 'null' &&
            name !== 'console' &&
            !fileInfo.identifierRefs.includes(name)
          ) {
            fileInfo.identifierRefs.push(name);
          }
        }
      }
    });

  } catch (error) {
    // Si hay error al parsear, no fallar - solo registrarlo
    fileInfo.parseError = error.message;
    console.warn(`⚠️  Parse error in ${filePath}: ${error.message}`);
  }

  return fileInfo;
}

/**
 * Lee un archivo y lo parsea
 *
 * @param {string} filePath - Ruta absoluta del archivo
 * @returns {Promise<object>} - FileInfo
 */
export async function parseFileFromDisk(filePath) {
  try {
    const code = await fs.readFile(filePath, 'utf-8');
    return parseFile(filePath, code);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return {
      filePath,
      fileName: path.basename(filePath),
      ext: path.extname(filePath),
      imports: [],
      exports: [],
      definitions: [],
      calls: [],
      readError: error.message
    };
  }
}

/**
 * Parsea múltiples archivos en paralelo
 *
 * @param {string[]} filePaths - Array de rutas absolutas
 * @returns {Promise<object[]>} - Array de FileInfo
 */
export async function parseFiles(filePaths) {
  const promises = filePaths.map(filePath => parseFileFromDisk(filePath));
  return Promise.all(promises);
}

/**
 * Encuentra todas las llamadas a funciones dentro de una función
 *
 * @param {Object} functionPath - Path de Babel para la función
 * @returns {Array} - Array de calls con { name, type, line }
 */
function findCallsInFunction(functionPath) {
  const calls = [];
  const seen = new Set();

  functionPath.traverse({
    CallExpression(innerPath) {
      const node = innerPath.node;
      if (node.callee.type === 'Identifier') {
        const callKey = `${node.callee.name}:${node.loc?.start.line || 0}`;
        if (!seen.has(callKey)) {
          seen.add(callKey);
          calls.push({
            name: node.callee.name,
            type: 'direct_call',
            line: node.loc?.start.line || 0
          });
        }
      }
    }
  });

  return calls;
}

/**
 * Verifica si una función está exportada
 *
 * @param {Object} node - Nodo de Babel
 * @param {Object} fileInfo - Info del archivo
 * @returns {boolean}
 */
function isExportedFunction(node, fileInfo) {
  if (!node.id) return false;
  return fileInfo.exports.some(exp => exp.name === node.id.name);
}

/**
 * Genera un ID único para el archivo (FA, FB, FC, etc.)
 *
 * @param {string} filePath - Ruta del archivo
 * @returns {string}
 */
function getFileId(filePath) {
  // Obtener nombre del archivo sin extensión
  const fileName = path.basename(filePath, path.extname(filePath));
  // Convertir a mayúsculas y simplificar (fileA.js → FA)
  const simplified = fileName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 2);

  return simplified || 'F';
}

/**
 * Verifica si un nodo está exportado
 *
 * @param {Object} nodePath - Path de Babel
 * @returns {boolean}
 */
function isNodeExported(nodePath) {
  let parent = nodePath.parent;

  // Verificar si el parent inmediato es un export
  if (parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration') {
    return true;
  }

  // Verificar si algún ancestro es un export
  let currentPath = nodePath;
  while (currentPath.parentPath) {
    currentPath = currentPath.parentPath;
    if (currentPath.node.type === 'ExportNamedDeclaration' ||
        currentPath.node.type === 'ExportDefaultDeclaration') {
      return true;
    }
  }

  return false;
}
