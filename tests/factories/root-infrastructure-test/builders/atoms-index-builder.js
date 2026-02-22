/**
 * @fileoverview Atoms Index Builder - Constructor de índice de átomos
 */

export class AtomsIndexBuilder {
  constructor() {
    this.atomsByFile = {};
  }

  static create() {
    return new AtomsIndexBuilder();
  }

  withAtom(filePath, atom) {
    if (!this.atomsByFile[filePath]) {
      this.atomsByFile[filePath] = { atoms: [] };
    }
    this.atomsByFile[filePath].atoms.push({
      name: atom.name || 'unknown',
      isAsync: atom.isAsync || false,
      hasSideEffects: atom.hasSideEffects || false,
      hasNetworkCalls: atom.hasNetworkCalls || false,
      hasStorageAccess: atom.hasStorageAccess || false,
      hasLifecycleHooks: atom.hasLifecycleHooks || false,
      hasDomManipulation: atom.hasDomManipulation || false,
      archetypes: atom.archetypes || [],
      temporal: atom.temporal || {},
      calls: atom.calls || [],
      ...atom
    });
    return this;
  }

  withEventDrivenAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      archetypes: ['handler'],
      temporal: {
        patterns: {
          eventEmitter: options.isEmitter || false,
          eventListener: options.isListener || false
        }
      },
      ...options
    });
  }

  withLifecycleAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      hasLifecycleHooks: true,
      temporal: {
        patterns: {
          lifecycleHooks: options.hooks || ['mount'],
          initialization: options.hasInit || false
        }
      },
      ...options
    });
  }

  withNetworkAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      hasNetworkCalls: true,
      archetypes: ['service'],
      ...options
    });
  }

  withStoreAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      archetypes: ['store'],
      hasSideEffects: true,
      ...options
    });
  }

  build() {
    return this.atomsByFile;
  }
}
