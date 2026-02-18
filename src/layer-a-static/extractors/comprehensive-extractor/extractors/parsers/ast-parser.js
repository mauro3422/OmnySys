/**
 * @fileoverview ast-parser.js
 *
 * Parser AST para extracción de clases, métodos y exports.
 * Usa regex para detección rápida; para análisis profundo se recomienda @babel/parser.
 * Stub funcional con implementaciones básicas.
 *
 * @module comprehensive-extractor/extractors/parsers/ast-parser
 * @phase Layer A (Static Extraction)
 * @status STUB - regex-based, covers common cases
 */

/**
 * Encuentra definiciones de clases en el código.
 * @param {string} code - Código fuente
 * @returns {Array<{ name: string, start: number, end: number, superClass: string|null }>}
 */
export function findClasses(code) {
  if (!code || typeof code !== 'string') return [];

  const classes = [];
  // Matches: class Name, class Name extends Base, export class Name, export default class Name
  const classPattern = /(?:^|[;\n}])\s*(?:export\s+(?:default\s+)?)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/gm;

  let match;
  while ((match = classPattern.exec(code)) !== null) {
    const start = match.index + match[0].indexOf('class');
    classes.push({
      name: match[1],
      superClass: match[2] || null,
      start,
      end: findMatchingBrace(code, match.index + match[0].length - 1)
    });
  }

  return classes;
}

/**
 * Encuentra definiciones de métodos en el cuerpo de una clase.
 * @param {string} classBody - Código del cuerpo de la clase
 * @returns {Array<{ name: string, isStatic: boolean, isAsync: boolean, start: number }>}
 */
export function findMethods(classBody) {
  if (!classBody || typeof classBody !== 'string') return [];

  const methods = [];
  // Matches method definitions: [static] [async] methodName(...) {
  const methodPattern = /(?:^|\n)\s*(static\s+)?(async\s+)?(?:get\s+|set\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+\s*)?\{/gm;

  let match;
  while ((match = methodPattern.exec(classBody)) !== null) {
    const name = match[3];
    // Skip keywords that look like methods
    if (['if', 'for', 'while', 'switch', 'try', 'catch', 'finally'].includes(name)) continue;

    methods.push({
      name,
      isStatic: !!match[1],
      isAsync: !!match[2],
      isPrivate: name.startsWith('#') || name.startsWith('_'),
      parameters: match[4] ? match[4].split(',').map(p => p.trim()).filter(Boolean) : [],
      start: match.index
    });
  }

  return methods;
}

/**
 * Encuentra exports en el código.
 * @param {string} code - Código fuente
 * @returns {Array<{ name: string, type: string, isDefault: boolean, source: string|null }>}
 */
export function findExports(code) {
  if (!code || typeof code !== 'string') return [];

  const exports = [];

  // export default ...
  const defaultPattern = /export\s+default\s+(?:class\s+(\w+)|function\s+(\w+)|(\w+))/g;
  let match;
  while ((match = defaultPattern.exec(code)) !== null) {
    exports.push({
      name: match[1] || match[2] || match[3] || 'default',
      type: 'default',
      isDefault: true,
      source: null
    });
  }

  // Named exports: export { x, y } and re-exports with source
  const namedPattern = /export\s*\{([^}]+)\}(?:\s+from\s+['"`]([^'"`]+)['"`])?/g;
  while ((match = namedPattern.exec(code)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim());
    const source = match[2] || null;
    for (const name of names) {
      if (name) {
        exports.push({
          name,
          type: source ? 'reexport' : 'named',
          isDefault: false,
          source
        });
      }
    }
  }

  // export function/class/const/let/var name
  const declarationPattern = /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g;
  while ((match = declarationPattern.exec(code)) !== null) {
    exports.push({
      name: match[1],
      type: 'declaration',
      isDefault: false,
      source: null
    });
  }

  // Star re-exports: export * with source module
  const starPattern = /export\s+\*\s+from\s+['"`]([^'"`]+)['"`]/g;
  while ((match = starPattern.exec(code)) !== null) {
    exports.push({
      name: '*',
      type: 'star-reexport',
      isDefault: false,
      source: match[1]
    });
  }

  return exports;
}

/**
 * Utilidad: encuentra la posición del brace de cierre correspondiente.
 * @param {string} code - Código fuente
 * @param {number} openBracePos - Posición del brace abierto
 * @returns {number} Posición del brace de cierre, o -1
 */
function findMatchingBrace(code, openBracePos) {
  let depth = 1;
  let i = openBracePos + 1;

  while (i < code.length && depth > 0) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') depth--;
    i++;
  }

  return depth === 0 ? i - 1 : -1;
}
