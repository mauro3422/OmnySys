/**
 * Unified Cache Manager
 * 
 * Sistema de caché unificado que coordina:
 * - Análisis estático (Layer A)
 * - Insights del LLM (Layer B)
 * - Dependencias entre archivos
 * 
 * Características:
 * 1. Versionado coordinado: Estático y LLM están versionados juntos
 * 2. Detección de cambios semánticos: Distingue cambios cosméticos vs significativos
 * 3. Invalidación en cascada: Si A depende de B y B cambia, A se re-analiza
 * 4. Consistencia garantizada: Nunca hay análisis estático nuevo con insights LLM viejos
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = '.OmnySystemData/unified-cache';
const INDEX_FILE = 'cache-index.json';

/**
 * Tipos de cambios detectados
 */
export const ChangeType = {
  NONE: 'none',           // Sin cambios
  COSMETIC: 'cosmetic',   // Solo formato/comentarios (no requiere re-análisis LLM)
  STATIC: 'static',       // Cambios en imports/exports/estructura (re-análisis estático)
  SEMANTIC: 'semantic',   // Cambios en lógica/localStorage/events (re-análisis completo)
  CRITICAL: 'critical'    // Cambios breaking (invalida dependientes)
};

/**
 * Calcula hash del contenido
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Detecta el tipo de cambio entre dos versiones del código
 * @param {string} oldCode - Código anterior
 * @param {string} newCode - Código nuevo
 * @param {object} oldAnalysis - Análisis anterior (si existe)
 * @returns {ChangeType}
 */
export function detectChangeType(oldCode, newCode, oldAnalysis = null) {
  // Si no hay análisis previo, es un archivo nuevo
  if (!oldAnalysis) {
    return ChangeType.SEMANTIC;
  }
  
  // Normalizar código (quitar espacios, comentarios)
  const normalize = (code) => code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Comentarios multilinea
    .replace(/\/\/.*$/gm, '')        // Comentarios single line
    .replace(/\s+/g, ' ')             // Múltiples espacios
    .trim();
  
  const oldNormalized = normalize(oldCode);
  const newNormalized = normalize(newCode);
  
  // Si es idéntico normalizado, es cosmético
  if (oldNormalized === newNormalized) {
    return ChangeType.COSMETIC;
  }
  
  // Detectar cambios en imports/exports
  const oldImports = extractImports(oldCode);
  const newImports = extractImports(newCode);
  const oldExports = extractExports(oldCode);
  const newExports = extractExports(newCode);
  
  const importsChanged = JSON.stringify(oldImports) !== JSON.stringify(newImports);
  const exportsChanged = JSON.stringify(oldExports) !== JSON.stringify(newExports);
  
  // Detectar cambios en localStorage/events/globales
  const oldSemantic = extractSemanticPatterns(oldCode);
  const newSemantic = extractSemanticPatterns(newCode);
  const semanticChanged = JSON.stringify(oldSemantic) !== JSON.stringify(newSemantic);
  
  if (importsChanged || exportsChanged) {
    return ChangeType.CRITICAL; // Cambia la API del archivo
  }
  
  if (semanticChanged) {
    return ChangeType.SEMANTIC; // Cambia las conexiones
  }
  
  return ChangeType.STATIC; // Cambió lógica interna pero no conexiones
}

/**
 * Extrae imports del código (simplificado)
 */
function extractImports(code) {
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  return imports.sort();
}

/**
 * Extrae exports del código (simplificado)
 */
function extractExports(code) {
  const exports = [];
  const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*(\w+)/g;
  let match;
  while ((match = exportRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }
  return exports.sort();
}

/**
 * Extrae patrones semánticos clave
 */
function extractSemanticPatterns(code) {
  return {
    localStorage: {
      reads: [...code.matchAll(/localStorage\.getItem\(['"]([^'"]+)['"]\)/g)].map(m => m[1]),
      writes: [...code.matchAll(/localStorage\.setItem\(['"]([^'"]+)['"]\)/g)].map(m => m[1])
    },
    events: {
      listeners: [...code.matchAll(/addEventListener\(['"]([^'"]+)['"]/g)].map(m => m[1]),
      emitters: [...code.matchAll(/dispatchEvent\(['"]([^'"]+)['"]/g)].map(m => m[1])
    },
    globals: [...code.matchAll(/window\.(\w+)/g)].map(m => m[1])
  };
}

/**
 * Entrada de caché para un archivo
 */
class CacheEntry {
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

/**
 * Unified Cache Manager
 */
export class UnifiedCacheManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.cacheDir = path.join(projectPath, CACHE_DIR);
    this.indexPath = path.join(this.cacheDir, INDEX_FILE);
    
    // Índice en memoria (persistente)
    this.index = {
      version: '1.0.0',
      timestamp: Date.now(),
      entries: {}, // filePath -> CacheEntry
      dependencyGraph: {}, // filePath -> [filePaths]
      metadata: {
        totalFiles: 0,
        totalDependencies: 0
      }
    };
    
    // Caché RAM (reemplaza QueryCache)
    this.ramCache = new Map();
    this.defaultTtlMinutes = 5;
    this.maxRamEntries = 1000;
    
    this.loaded = false;
  }
  
  /**
   * Inicializa el caché
   * AHORA: Carga directamente desde Layer A (.OmnySystemData/)
   */
  async initialize() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Intentar cargar desde Layer A primero
      const loadedFromLayerA = await this.loadFromLayerA();
      
      if (!loadedFromLayerA) {
        // Fallback a caché propio si Layer A no tiene datos
        await this.loadIndex();
      }
      
      this.loaded = true;
      const count = Object.keys(this.index.entries).length;
      console.log(`📦 UnifiedCache: ${count} archivos indexados (from Layer A)`);
    } catch (error) {
      console.warn('⚠️  Failed to initialize unified cache:', error.message);
    }
  }
  
  /**
   * Carga datos desde Layer A (.OmnySystemData/)
   * Lee desde la carpeta files/ y el index.json
   * @returns {boolean} true si cargó correctamente
   */
  async loadFromLayerA() {
    try {
      const layerAPath = path.join(this.projectPath, '.OmnySystemData');
      const filesDir = path.join(layerAPath, 'files');
      
      // Verificar si existe la carpeta files
      try {
        await fs.access(filesDir);
      } catch {
        return false;
      }
      
      // Leer todos los archivos .json en la carpeta files (recursivo para subcarpetas como src/modules/)
      const fileEntries = await fs.readdir(filesDir, { recursive: true });
      const jsonFiles = fileEntries.filter(f => f.endsWith('.json') && !f.includes('connections') && !f.includes('risks'));
      
      if (jsonFiles.length === 0) {
        return false;
      }
      
      // Cargar cada archivo de análisis
      for (const jsonFile of jsonFiles) {
        try {
          const filePath = path.join(filesDir, jsonFile);
          const content = await fs.readFile(filePath, 'utf-8');
          const fileData = JSON.parse(content);
          
          // El filePath está en fileData.filePath
          const originalPath = fileData.filePath || jsonFile.replace('.json', '');
          
          this.index.entries[originalPath] = {
            hash: fileData.metadata?.hash || '',
            lastAnalyzed: fileData.metadata?.lastAnalyzed || Date.now(),
            staticVersion: fileData.metadata?.analysisVersion || '1.0.0',
            llmVersion: fileData.llmInsights ? '1.0.0' : null,
            changeType: ChangeType.NONE,
            dependencies: fileData.dependencies || [],
            metadata: fileData.metadata,
            llmInsights: fileData.llmInsights
          };
        } catch (err) {
          console.warn(`   ⚠️  Failed to load ${jsonFile}: ${err.message}`);
        }
      }
      
      this.index.metadata.totalFiles = jsonFiles.length;
      await this.saveIndex();
      
      console.log(`   📥 Loaded ${jsonFiles.length} files from Layer A`);
      return true;
    } catch (error) {
      console.log(`   ℹ️  Layer A data not available: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Carga el índice desde disco
   */
  async loadIndex() {
    try {
      const content = await fs.readFile(this.indexPath, 'utf-8');
      const loaded = JSON.parse(content);
      
      if (loaded.version === this.index.version) {
        this.index = loaded;
      }
    } catch {
      // No existe o está corrupto, empezar fresco
    }
  }
  
  /**
   * Guarda el índice en disco
   */
  async saveIndex() {
    try {
      this.index.timestamp = Date.now();
      await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2));
    } catch (error) {
      console.warn('⚠️  Failed to save cache index:', error.message);
    }
  }
  
  /**
   * Registra un archivo y detecta qué tipo de re-análisis necesita
   * @param {string} filePath - Ruta del archivo
   * @param {string} content - Contenido actual
   * @returns {object} - { changeType, needsStatic, needsLLM, dependencies }
   */
  async registerFile(filePath, content) {
    const contentHash = hashContent(content);
    const existingEntry = this.index.entries[filePath];
    
    // Si no hay entrada previa, es nuevo
    if (!existingEntry) {
      const entry = new CacheEntry(filePath, contentHash, ChangeType.SEMANTIC);
      this.index.entries[filePath] = entry;
      
      return {
        changeType: ChangeType.SEMANTIC,
        needsStatic: true,
        needsLLM: true,
        isNew: true,
        entry
      };
    }
    
    // Si el hash es igual, no hay cambios
    if (existingEntry.contentHash === contentHash) {
      return {
        changeType: ChangeType.NONE,
        needsStatic: false,
        needsLLM: false,
        isNew: false,
        entry: existingEntry
      };
    }
    
    // Detectar tipo de cambio
    const oldCode = await this.getPreviousCode(filePath);
    const changeType = detectChangeType(oldCode, content, existingEntry);
    
    // Actualizar entrada
    existingEntry.contentHash = contentHash;
    existingEntry.changeType = changeType;
    existingEntry.version++;
    existingEntry.timestamp = Date.now();
    
    // Determinar qué se necesita re-analizar
    const result = {
      changeType,
      needsStatic: true, // Siempre re-analizar estático si cambió el código
      needsLLM: this.shouldReanalyzeLLM(existingEntry, changeType),
      isNew: false,
      entry: existingEntry
    };
    
    // Si es CRITICAL, invalidar dependientes
    if (changeType === ChangeType.CRITICAL) {
      await this.invalidateDependents(filePath);
    }
    
    return result;
  }
  
  /**
   * Determina si se necesita re-análisis LLM
   */
  shouldReanalyzeLLM(entry, changeType) {
    // Si nunca se analizó con LLM, sí se necesita
    if (!entry.llmAnalyzed) {
      return true;
    }
    
    // Según el tipo de cambio
    switch (changeType) {
      case ChangeType.COSMETIC:
        return false; // Solo formato, no requiere LLM
      case ChangeType.STATIC:
        return false; // Solo estructura, insights LLM siguen válidos
      case ChangeType.SEMANTIC:
      case ChangeType.CRITICAL:
        return true; // Cambios en lógica/conexiones, requiere LLM
      default:
        return true;
    }
  }
  
  /**
   * Invalida archivos que dependen del archivo dado (en cascada)
   */
  async invalidateDependents(filePath) {
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
   * Guarda resultado de análisis estático
   */
  async saveStaticAnalysis(filePath, analysis) {
    const entry = this.index.entries[filePath];
    if (!entry) return;
    
    // Guardar análisis en disco
    const analysisPath = path.join(this.cacheDir, 'static', `${filePath.replace(/[\/\\]/g, '_')}.v${entry.version}.json`);
    await fs.mkdir(path.dirname(analysisPath), { recursive: true });
    await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
    
    // Actualizar entrada
    entry.staticAnalyzed = true;
    entry.staticHash = hashContent(JSON.stringify(analysis));
    entry.dependsOn = analysis.imports?.map(i => i.resolved).filter(Boolean) || [];
    
    // Actualizar grafo de dependencias
    this.updateDependencyGraph(filePath, entry.dependsOn);
    
    await this.saveIndex();
  }
  
  /**
   * Guarda resultado de análisis LLM
   */
  async saveLLMInsights(filePath, insights) {
    const entry = this.index.entries[filePath];
    if (!entry) return;
    
    // Guardar insights en disco
    const insightsPath = path.join(this.cacheDir, 'llm', `${filePath.replace(/[\/\\]/g, '_')}.v${entry.version}.insights.json`);
    await fs.mkdir(path.dirname(insightsPath), { recursive: true });
    await fs.writeFile(insightsPath, JSON.stringify(insights, null, 2));
    
    // Actualizar entrada
    entry.llmAnalyzed = true;
    entry.llmHash = hashContent(JSON.stringify(insights));
    
    await this.saveIndex();
  }
  
  // ============================================================
  // MÉTODOS COMPATIBLES CON LLMCACHE (adaptadores)
  // ============================================================
  
  /**
   * Obtiene resultado LLM cacheado (compatible con LLMCache antiguo)
   * @param {string} filePath - Ruta del archivo
   * @param {string} code - Código fuente (para verificación de hash)
   * @param {string} promptTemplate - Template del prompt
   * @returns {Promise<object|null>} - Resultado cacheado o null
   */
  async get(filePath, code, promptTemplate) {
    const entry = this.index.entries[filePath];
    
    // Si no hay entrada o no se analizó con LLM
    if (!entry || !entry.llmAnalyzed) {
      return null;
    }
    
    try {
      const insightsPath = path.join(
        this.cacheDir, 
        'llm', 
        `${filePath.replace(/[\/\\]/g, '_')}.v${entry.version}.insights.json`
      );
      
      const content = await fs.readFile(insightsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  /**
   * Guarda resultado LLM (compatible con LLMCache antiguo)
   * @param {string} filePath - Ruta del archivo
   * @param {string} code - Código fuente
   * @param {string} promptTemplate - Template del prompt
   * @param {object} result - Resultado del análisis
   * @returns {Promise<boolean>}
   */
  async set(filePath, code, promptTemplate, result) {
    // Asegurar que existe la entrada
    if (!this.index.entries[filePath]) {
      await this.registerFile(filePath, code);
    }
    
    await this.saveLLMInsights(filePath, result);
    return true;
  }
  
  /**
   * Actualiza el grafo de dependencias
   */
  updateDependencyGraph(filePath, dependencies) {
    // Actualizar dependencias del archivo
    this.index.dependencyGraph[filePath] = dependencies;
    
    // Actualizar usedBy de los archivos dependidos
    for (const dep of dependencies) {
      if (!this.index.entries[dep]) {
        this.index.entries[dep] = new CacheEntry(dep, '');
      }
      if (!this.index.entries[dep].usedBy.includes(filePath)) {
        this.index.entries[dep].usedBy.push(filePath);
      }
    }
  }
  
  /**
   * Obtiene el código anterior de un archivo (si existe)
   */
  async getPreviousCode(filePath) {
    // En una implementación real, esto podría venir de git o de un backup
    // Por ahora, retornamos vacío para forzar re-análisis
    return '';
  }
  
  /**
   * Obtiene estadísticas del caché
   */
  getStats() {
    const entries = Object.values(this.index.entries);
    
    return {
      totalFiles: entries.length,
      staticAnalyzed: entries.filter(e => e.staticAnalyzed).length,
      llmAnalyzed: entries.filter(e => e.llmAnalyzed).length,
      byChangeType: {
        none: entries.filter(e => e.changeType === ChangeType.NONE).length,
        cosmetic: entries.filter(e => e.changeType === ChangeType.COSMETIC).length,
        static: entries.filter(e => e.changeType === ChangeType.STATIC).length,
        semantic: entries.filter(e => e.changeType === ChangeType.SEMANTIC).length,
        critical: entries.filter(e => e.changeType === ChangeType.CRITICAL).length
      }
    };
  }
  
  /**
   * Limpia entradas de archivos que ya no existen
   */
  async cleanupDeletedFiles(existingFiles) {
    const existingSet = new Set(existingFiles);
    let deletedCount = 0;
    
    for (const filePath of Object.keys(this.index.entries)) {
      if (!existingSet.has(filePath)) {
        delete this.index.entries[filePath];
        delete this.index.dependencyGraph[filePath];
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️  UnifiedCache: Removed ${deletedCount} deleted files`);
      await this.saveIndex();
    }
    
    return deletedCount;
  }
  
  // ============================================================
  // MÉTODOS DE CACHÉ RAM (reemplazan QueryCache)
  // ============================================================
  
  /**
   * Obtiene un valor del caché RAM
   * @param {string} key - Clave del caché
   * @returns {any} - Valor cacheado o null
   */
  get(key) {
    const item = this.ramCache?.get(key);
    
    if (!item) return null;
    
    // Verificar TTL
    if (Date.now() > item.expiry) {
      this.ramCache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  /**
   * Guarda un valor en el caché RAM
   * @param {string} key - Clave del caché
   * @param {any} data - Datos a guardar
   * @param {number} ttlMinutes - TTL en minutos (default: 5)
   */
  set(key, data, ttlMinutes = 5) {
    if (!this.ramCache) {
      this.ramCache = new Map();
    }
    
    // Si existe, actualizar mueve al final (LRU)
    if (this.ramCache.has(key)) {
      this.ramCache.delete(key);
    }
    
    // LRU eviction si alcanzamos el límite
    const maxEntries = 1000;
    if (this.ramCache.size >= maxEntries) {
      const oldestKey = this.ramCache.keys().next().value;
      this.ramCache.delete(oldestKey);
    }
    
    this.ramCache.set(key, {
      data,
      expiry: Date.now() + (ttlMinutes * 60 * 1000),
      createdAt: Date.now()
    });
  }
  
  /**
   * Invalida una entrada del caché RAM
   * @param {string} key - Clave a invalidar
   * @returns {boolean} - true si se eliminó
   */
  invalidate(key) {
    if (!this.ramCache) return false;
    
    if (typeof key === 'string' && key.includes('*') || key.includes('?')) {
      // Patrón con wildcard
      const pattern = key.replace(/\*/g, '.*').replace(/\?/g, '.');
      const regex = new RegExp(pattern);
      let count = 0;
      
      for (const k of this.ramCache.keys()) {
        if (regex.test(k)) {
          this.ramCache.delete(k);
          count++;
        }
      }
      return count > 0;
    }
    
    return this.ramCache.delete(key);
  }
  
  /**
   * Limpia todo el caché RAM
   */
  clear() {
    if (this.ramCache) {
      this.ramCache.clear();
    }
  }
  
  /**
   * Obtiene estadísticas del caché RAM
   */
  getRamStats() {
    if (!this.ramCache) {
      return { size: 0, memoryUsage: '0 KB' };
    }
    
    let bytes = 0;
    for (const item of this.ramCache.values()) {
      bytes += JSON.stringify(item.data).length;
    }
    
    return {
      size: this.ramCache.size,
      maxEntries: 1000,
      memoryUsage: `${Math.round(bytes / 1024)} KB`
    };
  }
  
  /**
   * Obtiene estadísticas completas (persistente + RAM)
   */
  getAllStats() {
    return {
      persistent: this.getStats(),
      ram: this.getRamStats()
    };
  }
}

export default UnifiedCacheManager;
