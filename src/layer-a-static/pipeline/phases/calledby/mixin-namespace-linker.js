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

import { buildNamespaceMap } from './namespace-detector.js';
import { detectMixins } from './mixin-detector.js';
import { buildFileAtomIndex, addCalledBy } from './calledby-linker-utils.js';



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

  // Retornar átomos modificados para bulk save (sin guardar individualmente)
  const updatedAtoms = allAtoms.filter(a => a.calledBy?.length > 0 && a.filePath && a.name);

  if (verbose) {
    const { createLogger } = await import('#utils/logger.js');
    const logger = createLogger('OmnySys:indexer');
    logger.info(`  ✓ ${namespaceLinks} namespace import links + ${mixinLinks} mixin (this.*) links`);
  }

  return { namespaceLinks, mixinLinks, updatedAtoms };
}
