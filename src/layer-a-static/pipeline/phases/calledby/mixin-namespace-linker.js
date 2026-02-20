/**
 * @fileoverview mixin-namespace-linker.js
 *
 * Resuelve calledBy para dos patrones que los otros linkers no cubren:
 *
 * PATRÓN 1 — Namespace import call:
 *   import * as utils from './utils.js'
 *   utils.doSomething()       ← doSomething en utils.js recibe calledBy ✅
 *
 * PATRÓN 2 — Object.assign mixin (prototype delegation):
 *   import * as handlers from './handlers.js'
 *   Object.assign(Foo.prototype, handlers)
 *   this.handleX()            ← handleX en handlers.js recibe calledBy ✅
 *
 * ALGORITMO:
 *   Fase 1 — Namespace map: parsear `import * as alias from './path'` en cada archivo.
 *            Resultado: filePath → Map(alias → resolvedFilePath)
 *
 *   Fase 2 — Mixin detection: en cada archivo, buscar `Object.assign(target, alias)`
 *            donde `alias` es un namespace import conocido.
 *            Resultado: filePath → Set(mixedInFilePaths)
 *
 *   Fase 3 — Link Patrón 1: para calls `alias.method`, resolver alias → filePath,
 *            buscar atom `method` en ese archivo → agregar calledBy.
 *
 *   Fase 4 — Link Patrón 2: para calls `this.method`, buscar en los mixin files
 *            del archivo actual si alguno exporta `method` → agregar calledBy.
 *
 * @module layer-a-static/pipeline/phases/calledby/mixin-namespace-linker
 */

import path from 'path';
import { saveAtom } from '#layer-c/storage/atoms/atom.js';

// ─────────────────────────────────────────────────────────────────────────────
// FASE 1: Construir mapa de namespace imports por archivo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parsea los imports de cada parsedFile y construye:
 * fileNamespaceMap: absoluteFilePath → Map(alias → resolvedAbsFilePath)
 *
 * Solo considera `import * as alias` (namespace imports).
 *
 * @param {Object} parsedFiles  — { [absPath]: parsedFile }
 * @param {string} rootPath     — raíz del proyecto (para resolver relativos)
 * @returns {Map<string, Map<string, string>>}
 */
function buildNamespaceMap(parsedFiles, rootPath) {
  const fileNamespaceMap = new Map(); // absPath → Map(alias → resolvedAbsPath)

  for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
    const nsMap = new Map();
    const imports = parsedFile.imports || [];

    for (const imp of imports) {
      // Detectar namespace import: import * as alias from './source'
      const isNamespace = imp.type === 'namespace' ||
        (imp.specifiers || []).some(s => s.type === 'namespace' || s.imported === '*') ||
        imp.namespace === true ||
        (imp.specifiers?.length === 1 && imp.specifiers[0]?.local && !imp.specifiers[0]?.imported);

      // También detectar por la presencia de un alias sin specifiers nombrados
      const hasNamespaceAlias = imp.alias || (imp.specifiers?.length === 1 && imp.specifiers[0]?.type === 'namespace');

      if (!isNamespace && !hasNamespaceAlias) continue;

      const alias = imp.alias ||
        imp.specifiers?.[0]?.local ||
        imp.specifiers?.[0]?.name;
      if (!alias) continue;

      const source = imp.source;
      if (!source || source.startsWith('node:') || !source.startsWith('.')) continue;

      // Resolver el path relativo al archivo actual
      const dir = path.dirname(absPath);
      let resolved = path.resolve(dir, source);
      // Agregar .js si no tiene extensión
      if (!path.extname(resolved)) resolved += '.js';

      nsMap.set(alias, resolved);
    }

    if (nsMap.size > 0) {
      fileNamespaceMap.set(absPath, nsMap);
    }
  }

  return fileNamespaceMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 2: Detectar Object.assign mixins
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Para cada archivo que tenga namespace imports, detecta si hace
 * `Object.assign(target, alias)` con alguno de esos aliases.
 *
 * Retorna: absFilePath → Set(resolvedAbsFilePaths que están mezclados en this)
 *
 * @param {Object} parsedFiles
 * @param {Map} fileNamespaceMap — resultado de buildNamespaceMap
 * @returns {Map<string, Set<string>>}
 */
function detectMixins(parsedFiles, fileNamespaceMap) {
  const mixinMap = new Map(); // absFilePath → Set(mixedInAbsPaths)

  for (const [absPath, parsedFile] of Object.entries(parsedFiles)) {
    const nsMap = fileNamespaceMap.get(absPath);
    if (!nsMap || nsMap.size === 0) continue;

    const source = parsedFile.source || '';
    const mixed = new Set();

    // Buscar Object.assign( en el source
    // Patrones: Object.assign(X, alias) / Object.assign(X.prototype, alias)
    const assignRegex = /Object\.assign\s*\([^,)]+,\s*(\w+)\s*(?:,|\))/g;
    let m;
    while ((m = assignRegex.exec(source)) !== null) {
      const alias = m[1].trim();
      const resolvedPath = nsMap.get(alias);
      if (resolvedPath) {
        mixed.add(resolvedPath);
      }
    }

    // También buscar spread en class: { ...alias } en extends o similar
    // No es común pero por completitud
    for (const [alias, resolvedPath] of nsMap) {
      // Detectar ...alias en object spreads que sean asignados a prototypes
      if (source.includes(`...${alias}`) && source.includes('prototype')) {
        mixed.add(resolvedPath);
      }
    }

    if (mixed.size > 0) {
      mixinMap.set(absPath, mixed);
    }
  }

  return mixinMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construye índice: resolvedAbsPath → Map(fnName → atom)
 * para búsqueda rápida en FASE 3 y FASE 4.
 */
function buildFileAtomIndex(allAtoms, rootPath) {
  const index = new Map(); // absFilePath → Map(name → atom)

  for (const atom of allAtoms) {
    if (!atom.filePath || !atom.name) continue;
    const absPath = path.resolve(rootPath, atom.filePath);

    if (!index.has(absPath)) index.set(absPath, new Map());
    index.get(absPath).set(atom.name, atom);
  }

  return index;
}

/**
 * Agrega calledBy al targetAtom si no está ya presente.
 * Retorna true si se agregó.
 */
function addCalledBy(targetAtom, callerAtomId) {
  if (!targetAtom.calledBy) targetAtom.calledBy = [];
  if (targetAtom.calledBy.includes(callerAtomId)) return false;
  targetAtom.calledBy.push(callerAtomId);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 3 + 4: Linking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve los dos patrones de calledBy para namespace imports y mixins.
 *
 * @param {Object[]} allAtoms        — todos los átomos del proyecto
 * @param {Object}   parsedFiles     — { [absPath]: parsedFile }
 * @param {string}   absoluteRootPath
 * @param {boolean}  verbose
 * @returns {Promise<{ namespaceLinks: number, mixinLinks: number }>}
 */
export async function linkMixinNamespaceCalledBy(allAtoms, parsedFiles, absoluteRootPath, verbose) {
  const fileNamespaceMap = buildNamespaceMap(parsedFiles, absoluteRootPath);
  const mixinMap = detectMixins(parsedFiles, fileNamespaceMap);
  const fileAtomIndex = buildFileAtomIndex(allAtoms, absoluteRootPath);

  let namespaceLinks = 0;
  let mixinLinks = 0;

  for (const callerAtom of allAtoms) {
    if (!callerAtom.filePath) continue;

    const callerAbsPath = path.resolve(absoluteRootPath, callerAtom.filePath);
    const nsMap = fileNamespaceMap.get(callerAbsPath);
    const mixedFiles = mixinMap.get(callerAbsPath);

    const allCalls = [
      ...(callerAtom.calls || []),
      ...(callerAtom.internalCalls || []),
      ...(callerAtom.externalCalls || [])
    ];

    for (const call of allCalls) {
      if (!call.name) continue;

      const dot = call.name.indexOf('.');
      if (dot <= 0) continue;

      const prefix = call.name.slice(0, dot);
      const method = call.name.slice(dot + 1);

      // FASE 3 — Namespace call: alias.method()
      if (nsMap) {
        const targetFilePath = nsMap.get(prefix);
        if (targetFilePath) {
          const fileAtoms = fileAtomIndex.get(targetFilePath);
          const targetAtom = fileAtoms?.get(method);
          if (targetAtom && targetAtom.id !== callerAtom.id) {
            if (addCalledBy(targetAtom, callerAtom.id)) namespaceLinks++;
          }
        }
      }

      // FASE 4 — Mixin: this.method()
      if (prefix === 'this' && mixedFiles) {
        for (const mixedAbsPath of mixedFiles) {
          const fileAtoms = fileAtomIndex.get(mixedAbsPath);
          const targetAtom = fileAtoms?.get(method);
          if (targetAtom && targetAtom.id !== callerAtom.id) {
            if (addCalledBy(targetAtom, callerAtom.id)) mixinLinks++;
          }
        }
      }
    }
  }

  // Persistir átomos actualizados
  const updated = allAtoms.filter(a => a.calledBy?.length > 0 && a.filePath && a.name);
  await Promise.allSettled(
    updated.map(a => saveAtom(absoluteRootPath, a.filePath, a.name, a))
  );

  if (verbose) {
    const { createLogger } = await import('#utils/logger.js');
    const logger = createLogger('OmnySys:indexer');
    logger.info(`  ✓ ${namespaceLinks} namespace import links + ${mixinLinks} mixin (this.*) links`);
  }

  return { namespaceLinks, mixinLinks };
}
