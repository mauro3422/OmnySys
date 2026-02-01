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
    calls: []
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
        }
      },

      // Extraer exports
      ExportNamedDeclaration(nodePath) {
        const node = nodePath.node;

        if (node.specifiers && node.specifiers.length > 0) {
          // export { x, y }
          node.specifiers.forEach(spec => {
            fileInfo.exports.push({
              type: 'named',
              name: spec.exported.name
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
