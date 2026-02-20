/**
 * @fileoverview class-instantiation-tracker.js
 *
 * Resuelve calledBy para métodos de clase vía instanciación.
 *
 * PROBLEMA QUE RESUELVE:
 *   El cross-file linker del indexer solo resuelve llamadas directas:
 *     import { miFunc } from './x.js'
 *     miFunc()  ← resuelto ✅
 *
 *   Pero NO resuelve métodos llamados via instancia:
 *     import { MiClase } from './x.js'
 *     const obj = new MiClase()
 *     obj.metodo()  ← metodo() NO recibe calledBy ❌
 *
 * ALGORITMO:
 *   Fase 1 — Indexar constructores: para cada atom que sea un constructor
 *            o método, registrar `ClassName → [atom1, atom2, ...]`
 *
 *   Fase 2 — Detectar instanciaciones: escanear calls[] en todos los atoms
 *            buscando patrones `new ClassName()`. Mapear:
 *            `filePath → { varName → ClassName }`
 *
 *   Fase 3 — Resolver métodos: para cada call con formato `varName.method`,
 *            buscar `varName` en el mapa de instancias → obtener `ClassName`
 *            → resolver `ClassName.method` → agregar calledBy
 *
 * @module layer-a-static/pipeline/phases/calledby/class-instantiation-tracker
 */

/**
 * Construye el índice de clases y sus métodos desde los átomos.
 * Retorna un Map: className (string) → Map(methodName → atom)
 */
function buildClassMethodIndex(allAtoms) {
  const classIndex = new Map(); // className → Map(methodName → atom)

  for (const atom of allAtoms) {
    if (!atom.className) continue;

    if (!classIndex.has(atom.className)) {
      classIndex.set(atom.className, new Map());
    }
    classIndex.get(atom.className).set(atom.name, atom);
  }

  return classIndex;
}

/**
 * Detecta `new ClassName()` en los calls de un atom y extrae el nombre de clase.
 * Los call-extractors guardan new expressions en atom.calls como { name: 'new ClassName' }
 * o en atom.externalCalls como { name: 'ClassName', isNew: true }.
 * Soportamos ambos formatos.
 */
function extractNewExpressions(atom) {
  const news = new Map(); // varName (si conocemos) → className

  // Formato 1: { name: 'new ClassName' } en calls
  for (const call of atom.calls || []) {
    if (call.name && call.name.startsWith('new ')) {
      const className = call.name.slice(4).trim();
      if (className) news.set(className, className); // sin varName
    }
    // Formato 2: { name: 'ClassName', isNew: true }
    if (call.isNew && call.name) {
      news.set(call.name, call.name);
    }
    // Formato 3: { name: 'varName.constructor', className: 'ClassName' }
    if (call.className) {
      news.set(call.className, call.className);
    }
  }

  // Formato 4: externalCalls con isNew
  for (const call of atom.externalCalls || []) {
    if (call.isNew && call.name) {
      news.set(call.name, call.name);
    }
  }

  return news;
}

/**
 * Parsea calls que tienen la forma `instance.method` y extrae ambas partes.
 */
function extractInstanceMethodCalls(atom) {
  const instanceCalls = []; // { instance, method }

  const allCalls = [...(atom.calls || []), ...(atom.externalCalls || [])];
  for (const call of allCalls) {
    if (!call.name) continue;
    const dot = call.name.indexOf('.');
    if (dot > 0 && dot < call.name.length - 1) {
      const instance = call.name.slice(0, dot);
      const method = call.name.slice(dot + 1);
      // Filtrar 'this.method' (se maneja en call-graph.js intra-file)
      if (instance !== 'this' && instance !== 'super') {
        instanceCalls.push({ instance, method, callRef: call });
      }
    }
  }

  return instanceCalls;
}

/**
 * Fase principal: dado el conjunto de todos los átomos del proyecto,
 * resuelve calledBy para métodos de clase vía instanciación.
 *
 * @param {Array} allAtoms - Todos los átomos del proyecto (ya extraídos)
 * @returns {{ resolved: number, classesTracked: number }} — estadísticas
 */
export function resolveClassInstantiationCalledBy(allAtoms) {
  // Paso 1: índice className → { methodName → atom }
  const classIndex = buildClassMethodIndex(allAtoms);
  if (classIndex.size === 0) return { resolved: 0, classesTracked: 0 };

  // Paso 2: Para cada atom, detectar qué clases instancia y qué métodos llama
  // Construir mapa por archivo: filePath → Set(classNames instanciadas)
  const fileInstantiations = new Map(); // filePath → Set(className)

  for (const atom of allAtoms) {
    const news = extractNewExpressions(atom);
    if (news.size === 0) continue;

    if (!fileInstantiations.has(atom.filePath)) {
      fileInstantiations.set(atom.filePath, new Set());
    }
    for (const className of news.values()) {
      fileInstantiations.get(atom.filePath).add(className);
    }
  }

  // Paso 3: Para cada atom con instance.method() calls,
  // resolver contra las clases instanciadas en su archivo
  let resolved = 0;

  for (const callerAtom of allAtoms) {
    const instanceCalls = extractInstanceMethodCalls(callerAtom);
    if (instanceCalls.length === 0) continue;

    // Clases disponibles en el archivo de este atom
    const localClasses = fileInstantiations.get(callerAtom.filePath) || new Set();

    for (const { method } of instanceCalls) {
      // Buscar el método en ALGUNA de las clases instanciadas en este archivo
      for (const className of localClasses) {
        const methodMap = classIndex.get(className);
        if (!methodMap) continue;

        const targetAtom = methodMap.get(method);
        if (!targetAtom || targetAtom.id === callerAtom.id) continue;

        // Agregar calledBy
        if (!targetAtom.calledBy) targetAtom.calledBy = [];
        if (!targetAtom.calledBy.includes(callerAtom.id)) {
          targetAtom.calledBy.push(callerAtom.id);
          resolved++;
        }
      }
    }
  }

  return { resolved, classesTracked: classIndex.size };
}
