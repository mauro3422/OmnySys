import { CacheEntry } from './entry.js';

/**
 * Invalida archivos que dependen del archivo dado (en cascada)
 */
export async function invalidateDependents(filePath) {
  const dependents = this.index.entries[filePath]?.usedBy || [];

  for (const dependent of dependents) {
    const entry = this.index.entries[dependent];
    if (entry) {
      entry.staticAnalyzed = false;
      entry.llmAnalyzed = false;
      entry.version++;

      // Recursivamente invalidar sus dependientes
      await this.invalidateDependents(dependent);
    }
  }
}

/**
 * Actualiza el grafo de dependencias
 */
export function updateDependencyGraph(filePath, dependencies) {
  // Actualizar dependencias del archivo
  this.index.dependencyGraph[filePath] = dependencies;

  // Actualizar usedBy de los archivos dependidos
  for (const dep of dependencies) {
    if (!this.index.entries[dep]) {
      this.index.entries[dep] = new CacheEntry(dep, '');
    }

    if (!Array.isArray(this.index.entries[dep].usedBy)) {
      this.index.entries[dep].usedBy = [];
    }

    if (!this.index.entries[dep].usedBy.includes(filePath)) {
      this.index.entries[dep].usedBy.push(filePath);
    }
  }
}
