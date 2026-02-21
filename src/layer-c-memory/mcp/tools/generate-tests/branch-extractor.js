/**
 * @fileoverview Branch Extractor for Test Generation
 *
 * Lee el código fuente de una función y extrae cada branch (if/switch/return)
 * con su condición de entrada, su return expression, y los inputs necesarios
 * para alcanzar ese branch.
 *
 * Esto permite generar UN test por branch con valores reales en lugar de
 * assertions genéricas como toBeDefined().
 *
 * @module mcp/tools/generate-tests/branch-extractor
 */

/**
 * Extrae todos los branches de una función con su condición y return
 * @param {string[]} sourceLines - Líneas del código fuente de la función
 * @param {Object} atom         - Atom metadata (dataFlow, imports, inputs)
 * @returns {Branch[]}
 */
export function extractBranches(sourceLines, atom) {
  if (!sourceLines || sourceLines.length === 0) return [];

  const outputs    = atom?.dataFlow?.outputs || [];
  const atomInputs = atom?.dataFlow?.inputs  || [];
  const atomImports = atom?.imports          || [];

  const branches = [];
  const seen = new Set();

  for (const output of outputs) {
    if (output.type !== 'return') continue;

    // line es 1-indexed absoluto; atom.line también es 1-indexed
    const relIdx = (output.line || 0) - (atom?.line || 1);
    if (relIdx < 0 || relIdx >= sourceLines.length) continue;

    const returnLine = sourceLines[relIdx];
    const returnExpr = extractReturnExpr(returnLine);
    if (!returnExpr || seen.has(returnExpr)) continue;
    seen.add(returnExpr);

    // Buscar la condición if/else que guarda este return
    const condition = findGuardCondition(sourceLines, relIdx);

    // Derivar hints de inputs desde la condición
    const inputHints = parseConditionToInputHints(condition, atomInputs);

    // Resolver qué constantes/módulos necesita el test
    const neededImports = resolveNeededImports(returnExpr, condition, atomImports, atom?.filePath);

    // Construir assertion a partir del return expression
    const assertion = buildAssertionFromExpr(returnExpr, neededImports);

    // Construir nombre descriptivo del test
    const testName = buildTestName(condition, returnExpr, atom?.name);

    branches.push({
      condition,
      returnExpr,
      inputHints,
      neededImports,
      assertion,
      testName,
      line: output.line
    });
  }

  return branches;
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Extrae la expresión de retorno de una línea de código
 */
function extractReturnExpr(line) {
  const m = line.match(/\breturn\s+(.+?)\s*;?\s*$/);
  return m ? m[1].trim() : null;
}

/**
 * Busca hacia atrás desde relIdx la condición if/else que guarda ese return.
 * Rastrea profundidad de llaves para saltar bloques hermanos ya cerrados.
 * Returns null si el return no tiene guard (es el default fallback).
 *
 * Algoritmo (recorrido hacia arriba):
 *   depth=0 → estamos al mismo nivel que el return (podemos encontrar su guard)
 *   depth>0 → estamos dentro de un bloque hermano que ya cerró (saltarlo)
 *   Al ver '}': depth++ (empezamos a saltar un bloque cerrado)
 *   Al ver '{': depth-- (terminamos de saltar ese bloque)
 *     Si depth queda en 0, la línea con '{' abre un bloque HERMANO → no es nuestro guard,
 *     seguir buscando.
 */
function findGuardCondition(sourceLines, returnRelIdx) {
  // Caso especial: case X: return Y en la misma línea
  const selfLine = (sourceLines[returnRelIdx] || '').trim();
  const sameCaseMatch = selfLine.match(/^case\s+(.+?)\s*:/);
  if (sameCaseMatch) return `=== ${sameCaseMatch[1].trim()}`;
  if (/^default\s*:/.test(selfLine)) return null;

  let depth = 0;

  for (let i = returnRelIdx - 1; i >= 0; i--) {
    const line = sourceLines[i].trim();

    const closes = (line.match(/\}/g) || []).length;
    const opens  = (line.match(/\{/g)  || []).length;

    // Antes de procesar guards, actualizar depth según llaves de cierre (})
    depth += closes;

    if (depth > 0) {
      // Dentro de un bloque hermano; consumir la apertura ({) para saltar
      depth -= opens;
      // Si depth llegó a 0, acabamos de saltar un bloque hermano completo — continuar
      continue;
    }

    // depth === 0: estamos al mismo nivel; ahora restamos opens
    depth -= opens;

    // if (condition) { — SOLO si opens=1 (abre un nuevo bloque en ESTE nivel)
    const ifMatch = line.match(/^(?:} else )?if\s*\((.+)\)\s*\{?\s*$/);
    if (ifMatch) return ifMatch[1].trim();

    // else { → el return pertenece al else (sin condición)
    if (/^(?:}\s*)?else\s*\{?\s*$/.test(line)) return null;

    // case X:
    const caseMatch = line.match(/^case\s+(.+?)\s*:/);
    if (caseMatch) return `=== ${caseMatch[1].trim()}`;

    // default:
    if (/^default\s*:/.test(line)) return null;

    // Llave de apertura de función → hemos subido hasta la función, salir
    if (/^\{$/.test(line)) break;
  }
  return null; // return sin guard = default fallback
}

/**
 * Convierte una condición if en hints de inputs.
 * Ejemplos:
 *   "changeType === ChangeType.DELETED" → { changeType: 'ChangeType.DELETED' }
 *   "options.priority !== undefined"    → { options: { priority: 99 } }
 *   "options.dependentCount > 20"       → { options: { dependentCount: 25 } }
 *   "options.exportChanges?.length > 0" → { options: { exportChanges: ['change'] } }
 */
function parseConditionToInputHints(condition, atomInputs) {
  if (!condition) return {};

  const hints = {};
  const inputNames = atomInputs.map(i => i.name);

  // Switch case shorthand: "=== Value" (sin param explícito — el param es el subject del switch)
  // Usar el primer input del átomo como param implícito
  const switchMatch = condition.match(/^===\s*(.+)$/);
  if (switchMatch && inputNames.length > 0) {
    hints[inputNames[0]] = switchMatch[1].trim();
    return hints;
  }

  // === comparisons: param === Value
  const eqMatch = condition.match(/^(\w+(?:\.\w+)*)\s*===?\s*(.+)$/);
  if (eqMatch) {
    const [, lhs, rhs] = eqMatch;
    const paramName = resolveParamName(lhs, inputNames);
    if (paramName) {
      if (lhs.includes('.')) {
        setNestedHint(hints, lhs, rhs);
      } else {
        hints[paramName] = rhs.trim();
      }
    }
    return hints;
  }

  // !== undefined: param.field !== undefined
  const neqUndefined = condition.match(/^([\w.?]+)\s*!==?\s*undefined$/);
  if (neqUndefined) {
    const path = neqUndefined[1].replace(/\?/g, '');
    const paramName = resolveParamName(path, inputNames);
    if (paramName) {
      if (path.includes('.')) {
        const field = path.split('.').slice(1).join('.');
        hints[paramName] = hints[paramName] || {};
        setDeepValue(hints[paramName], field, 99);
      } else {
        hints[paramName] = 99;
      }
    }
    return hints;
  }

  // .length > 0 (must be checked BEFORE generic > threshold to avoid matching x.length > 0 as gtMatch)
  const lengthMatch = condition.match(/^([\w.?]+)\.length\s*>\s*0$/);
  if (lengthMatch) {
    const path = lengthMatch[1].replace(/\?/g, '');
    const paramName = resolveParamName(path, inputNames);
    if (paramName) {
      if (path.includes('.')) {
        const field = path.split('.').slice(1).join('.');
        hints[paramName] = hints[paramName] || {};
        setDeepValue(hints[paramName], field, ['item']);
      } else {
        hints[paramName] = ['item'];
      }
    }
    return hints;
  }

  // > threshold: param.field > N
  const gtMatch = condition.match(/^([\w.?]+)\s*>\s*(\d+)$/);
  if (gtMatch) {
    const [, path, numStr] = gtMatch;
    const cleanPath = path.replace(/\?/g, '');
    const paramName = resolveParamName(cleanPath, inputNames);
    const threshold = parseInt(numStr, 10);
    const value = threshold + (threshold >= 10 ? 5 : 1); // > 20 → 25, > 5 → 6
    if (paramName) {
      if (cleanPath.includes('.')) {
        const field = cleanPath.split('.').slice(1).join('.');
        hints[paramName] = hints[paramName] || {};
        setDeepValue(hints[paramName], field, value);
      } else {
        hints[paramName] = value;
      }
    }
    return hints;
  }

  return hints;
}

/**
 * Encuentra el nombre del parámetro raíz para una ruta como "options.priority"
 */
function resolveParamName(path, inputNames) {
  const root = path.split('.')[0].replace(/\?/g, '');
  return inputNames.includes(root) ? root : null;
}

/**
 * Setea un valor anidado simple ("priority" → obj.priority = val)
 */
function setDeepValue(obj, fieldPath, value) {
  const parts = fieldPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function setNestedHint(hints, lhs, rhs) {
  const parts = lhs.split('.');
  const paramName = parts[0];
  hints[paramName] = hints[paramName] || {};
  setDeepValue(hints[paramName], parts.slice(1).join('.'), rhs.trim());
}

/**
 * Detecta qué imports necesita el test basándose en el return expression y la condición
 * Busca tokens como "Priority.CRITICAL", "ChangeType.DELETED" en los imports del átomo
 */
export function resolveNeededImports(returnExpr, condition, atomImports, filePath) {
  const needed = [];
  const combined = `${returnExpr || ''} ${condition || ''}`;

  // Detectar tokens Member: Word.Word
  const memberTokens = [...combined.matchAll(/\b([A-Z][a-zA-Z]+)\.([A-Z_]+)\b/g)];
  const objects = [...new Set(memberTokens.map(m => m[1]))];

  for (const objName of objects) {
    // Buscar en los imports del átomo
    const imp = atomImports.find(i =>
      i.specifiers?.includes(objName) ||
      (i.source && i.source.includes(objName.toLowerCase()))
    );

    if (imp) {
      needed.push({ name: objName, from: imp.source });
    } else if (filePath) {
      // Fallback: construir path absoluto (src/…) para que resolveImportAlias lo mapee a un alias #
      const dir = filePath.replace(/\\/g, '/').replace(/[^/]+$/, '');
      needed.push({ name: objName, from: `${dir}constants.js` });
    }
  }

  return needed;
}

/**
 * Construye una assertion específica a partir del return expression
 */
export function buildAssertionFromExpr(returnExpr, neededImports = []) {
  if (!returnExpr) return 'expect(result).toBeDefined()';

  // Literales simples
  if (returnExpr === 'true')  return 'expect(result).toBe(true)';
  if (returnExpr === 'false') return 'expect(result).toBe(false)';
  if (returnExpr === 'null')  return 'expect(result).toBeNull()';
  if (/^\d+$/.test(returnExpr)) return `expect(result).toBe(${returnExpr})`;
  if (/^["']/.test(returnExpr)) return `expect(result).toBe(${returnExpr})`;

  // Constante importada: Priority.CRITICAL, ChangeType.DELETED
  if (/^[A-Z][a-zA-Z]+\.[A-Z_]+$/.test(returnExpr)) {
    return `expect(result).toBe(${returnExpr})`;
  }

  // Parámetro pasado: options.priority → el resultado es lo que pasamos
  if (/^[\w.?]+$/.test(returnExpr) && returnExpr.includes('.')) {
    return 'expect(result).toBeDefined()';
  }

  // Array vacío
  if (returnExpr === '[]') return 'expect(Array.isArray(result)).toBe(true)';

  // Objeto con campos conocidos
  if (returnExpr.startsWith('{')) {
    const fields = [];
    const pairRegex = /(\w+)\s*:\s*(true|false|null|\d+|"[^"]{1,20}"|'[^']{1,20}')/g;
    let m;
    while ((m = pairRegex.exec(returnExpr)) !== null) {
      fields.push(`${m[1]}: ${m[2]}`);
    }
    if (fields.length > 0) {
      return `expect(result).toEqual(expect.objectContaining({ ${fields.join(', ')} }))`;
    }
    return 'expect(result).toEqual(expect.objectContaining({}))';
  }

  return 'expect(result).toBeDefined()';
}

/**
 * Genera el nombre descriptivo del test para un branch
 */
function buildTestName(condition, returnExpr, fnName) {
  if (!condition) {
    return `should return ${sanitizeName(returnExpr)} as default`;
  }

  // Switch case shorthand: "=== Value"
  const switchMatch = condition.match(/^===\s*(.+)$/);
  if (switchMatch) {
    return `should return ${sanitizeName(returnExpr)} when input is ${sanitizeName(switchMatch[1])}`;
  }

  // === comparisons: param === Value
  const eqMatch = condition.match(/^(\w+)\s*===?\s*(.+)$/);
  if (eqMatch) {
    return `should return ${sanitizeName(returnExpr)} when ${eqMatch[1]} is ${sanitizeName(eqMatch[2])}`;
  }

  // !== undefined
  if (condition.includes('!== undefined') || condition.includes('!= undefined')) {
    const param = condition.split(/\s*!=/)[0].replace(/\?/g, '').trim();
    return `should return ${sanitizeName(returnExpr)} when ${param} is provided`;
  }

  // > threshold
  const gtMatch = condition.match(/^([\w.?]+)\s*>\s*(\d+)$/);
  if (gtMatch) {
    return `should return ${sanitizeName(returnExpr)} when ${sanitizeName(gtMatch[1])} exceeds ${gtMatch[2]}`;
  }

  // .length > 0
  const lenMatch = condition.match(/^([\w.?]+)\.length\s*>\s*0$/);
  if (lenMatch) {
    return `should return ${sanitizeName(returnExpr)} when ${sanitizeName(lenMatch[1])} is non-empty`;
  }

  return `should return ${sanitizeName(returnExpr)} when ${condition.slice(0, 40)}`;
}

function sanitizeName(expr) {
  if (!expr) return 'value';
  return expr.replace(/['"]/g, '').replace(/\s+/g, ' ').slice(0, 40);
}

export default { extractBranches, resolveNeededImports, buildAssertionFromExpr };
