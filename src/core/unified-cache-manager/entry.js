import { ChangeType } from './constants.js';

/**
 * Entrada de caché para un archivo
 */
export class CacheEntry {
  constructor(filePath, contentHash, changeType = ChangeType.SEMANTIC) {
    this.filePath = filePath;
    this.contentHash = contentHash;
    this.changeType = changeType;
    this.version = 1; // Versión del análisis
    this.timestamp = Date.now();

    // Estados de análisis
    this.staticAnalyzed = false;
    this.staticHash = null; // Hash del resultado estático
    this.llmAnalyzed = false;
    this.llmHash = null; // Hash del resultado LLM

    // Dependencias
    this.dependsOn = []; // Archivos que este archivo importa
    this.usedBy = []; // Archivos que importan este archivo

    // Metadata
    this.analysisDuration = 0;
    this.llmDuration = 0;
  }
}
