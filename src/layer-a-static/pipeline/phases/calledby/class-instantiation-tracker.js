/**
 * @fileoverview class-instantiation-tracker.js
 *
 * Resolves calledBy links for class methods and class atoms via instantiation.
 *
 * Problem it solves:
 *   The cross-file linker resolves direct function calls, but class instantiations
 *   like `new MyClass()` were not marking the exported class atom as used.
 */

/**
 * Builds an index of class methods.
 * Returns: className -> Map(methodName -> atom)
 */
function buildClassMethodIndex(allAtoms) {
  const classIndex = new Map();

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
 * Builds an index of class atoms by class name.
 * Returns: className -> class atom
 */
function buildClassAtomIndex(allAtoms) {
  const classAtoms = new Map();

  for (const atom of allAtoms) {
    if (atom.type !== 'class' && atom.atom_type !== 'class') continue;
    if (!atom.name) continue;

    classAtoms.set(atom.name, atom);
  }

  return classAtoms;
}

/**
 * Extracts class instantiations from calls/externalCalls.
 */
function extractNewExpressions(atom) {
  const news = new Map();

  for (const call of atom.calls || []) {
    if (call.name && call.name.startsWith('new ')) {
      const className = call.name.slice(4).trim();
      if (className) news.set(className, className);
    }

    if (call.isNew && call.name) {
      news.set(call.name, call.name);
    }

    if (call.className) {
      news.set(call.className, call.className);
    }
  }

  for (const call of atom.externalCalls || []) {
    if (call.isNew && call.name) {
      news.set(call.name, call.name);
    }
  }

  return news;
}

/**
 * Parses instance method calls such as `instance.method`.
 */
function extractInstanceMethodCalls(atom) {
  const instanceCalls = [];
  const allCalls = [...(atom.calls || []), ...(atom.externalCalls || [])];

  for (const call of allCalls) {
    if (!call.name) continue;

    const dot = call.name.indexOf('.');
    if (dot <= 0 || dot >= call.name.length - 1) continue;

    const instance = call.name.slice(0, dot);
    const method = call.name.slice(dot + 1);

    if (instance !== 'this' && instance !== 'super') {
      instanceCalls.push({ instance, method, callRef: call });
    }
  }

  return instanceCalls;
}

/**
 * Adds a caller to a target atom if missing.
 * Returns true when a new edge was created.
 */
function addCalledBy(targetAtom, callerAtomId) {
  if (!targetAtom || !callerAtomId || targetAtom.id === callerAtomId) return false;

  if (!targetAtom.calledBy) targetAtom.calledBy = [];
  if (targetAtom.calledBy.includes(callerAtomId)) return false;

  targetAtom.calledBy.push(callerAtomId);
  return true;
}

/**
 * Resolves calledBy for classes and class methods via instantiation.
 *
 * @param {Array} allAtoms
 * @returns {{ resolved: number, classesTracked: number }}
 */
export function resolveClassInstantiationCalledBy(allAtoms) {
  const classIndex = buildClassMethodIndex(allAtoms);
  const classAtoms = buildClassAtomIndex(allAtoms);

  if (classIndex.size === 0 && classAtoms.size === 0) {
    return { resolved: 0, classesTracked: 0 };
  }

  const fileInstantiations = new Map();
  let resolved = 0;

  for (const atom of allAtoms) {
    const news = extractNewExpressions(atom);
    if (news.size === 0) continue;

    if (!fileInstantiations.has(atom.filePath)) {
      fileInstantiations.set(atom.filePath, new Set());
    }

    for (const className of news.values()) {
      fileInstantiations.get(atom.filePath).add(className);

      const classAtom = classAtoms.get(className);
      if (addCalledBy(classAtom, atom.id)) {
        resolved++;
      }
    }
  }

  for (const callerAtom of allAtoms) {
    const instanceCalls = extractInstanceMethodCalls(callerAtom);
    if (instanceCalls.length === 0) continue;

    const localClasses = fileInstantiations.get(callerAtom.filePath) || new Set();

    for (const { method } of instanceCalls) {
      for (const className of localClasses) {
        const methodMap = classIndex.get(className);
        if (!methodMap) continue;

        const targetAtom = methodMap.get(method);
        if (addCalledBy(targetAtom, callerAtom.id)) {
          resolved++;
        }
      }
    }
  }

  return { resolved, classesTracked: Math.max(classIndex.size, classAtoms.size) };
}
