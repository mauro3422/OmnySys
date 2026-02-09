/**
 * @fileoverview Race Condition Detector - Entry Point
 * 
 * Detecta condiciones de carrera en flujos de datos asíncronos:
 * - Read-Write races (RW)
 * - Write-Write races (WW)
 * - Async initialization errors
 * - Event handler races
 * 
 * @module race-detector/index
 * @version 4.0.0
 * @phase 4
 */

import { SharedStateTracker } from './shared-state-tracker.js';
import { RacePatternMatcher } from './race-pattern-matcher.js';
import { RiskScorer } from './risk-scorer.js';

/**
 * Detector principal de race conditions
 */
export class RaceConditionDetector {
  constructor(projectData) {
    this.project = projectData;
    this.sharedState = new Map(); // stateKey -> accessPoints[]
    this.races = [];
    this.warnings = [];
    
    // Componentes
    this.stateTracker = new SharedStateTracker();
    this.patternMatcher = new RacePatternMatcher();
    this.riskScorer = new RiskScorer();
  }

  /**
   * Ejecuta detección completa de races
   * 
   * @returns {Object} - { races, warnings, summary }
   */
  detect() {
    console.log('[RaceDetector] Starting race condition detection...');
    
    // Paso 1: Identificar todo el estado compartido
    this.identifySharedState();
    console.log(`[RaceDetector] Found ${this.sharedState.size} shared state items`);
    
    // Paso 2: Encontrar accesos concurrentes
    this.findConcurrentAccesses();
    console.log(`[RaceDetector] Analyzing ${this.races.length} potential races`);
    
    // Paso 3: Detectar patrones específicos
    this.detectRacePatterns();
    
    // Paso 4: Verificar mitigaciones
    this.checkMitigations();
    
    // Paso 5: Calcular severidad
    this.calculateSeverities();
    
    // Paso 6: Generar summary
    const summary = this.generateSummary();
    
    console.log(`[RaceDetector] Detection complete: ${this.races.length} races found`);
    
    return {
      races: this.races,
      warnings: this.warnings,
      summary
    };
  }

  /**
   * Identifica todo el estado compartido en el proyecto
   */
  identifySharedState() {
    // 1. Rastrear variables globales
    this.trackGlobalVariables();
    
    // 2. Rastrear estado de módulos
    this.trackModuleState();
    
    // 3. Rastrear recursos externos
    this.trackExternalResources();
    
    // 4. Rastrear singletons
    this.trackSingletons();
    
    // 5. Rastrear closures
    this.trackClosureState();
  }

  /**
   * Rastrea variables globales
   */
  trackGlobalVariables() {
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        // Buscar en átomos (funciones)
        const atoms = molecule.atoms || [];
        
        for (const atom of atoms) {
          // Buscar accesos globales en dataFlow
          const sideEffects = atom.dataFlow?.sideEffects || [];
          
          for (const effect of sideEffects) {
            if (this.isGlobalAccess(effect)) {
              this.addStateAccess('global', effect.variable || effect.target, atom, module, effect, molecule.filePath);
            }
          }
          
          // Buscar en código directo (análisis textual simple)
          if (atom.code) {
            const globalWrites = this.findGlobalWrites(atom.code);
            for (const write of globalWrites) {
              this.addStateAccess('global', write.variable, atom, module, {
                type: 'write',
                line: write.line
              }, molecule.filePath);
            }
          }
        }
      }
    }
  }

  /**
   * Rastrea estado de módulos (variables exportadas)
   */
  trackModuleState() {
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        const atoms = molecule.atoms || [];
        
        for (const atom of atoms) {
          // Buscar modificaciones a estado de módulo
          const sideEffects = atom.dataFlow?.sideEffects || [];
          
          for (const effect of sideEffects) {
            if (effect.type === 'module_state_write' || 
                (effect.target && effect.target.includes('module.'))) {
              this.addStateAccess('module', effect.target, atom, module, effect, molecule.filePath);
            }
          }
        }
      }
    }
  }

  /**
   * Rastrea recursos externos (DB, archivos, cache)
   */
  trackExternalResources() {
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        const atoms = molecule.atoms || [];
        
        for (const atom of atoms) {
          // Buscar llamadas externas que modifican recursos
          const calls = atom.calls || [];
          
          for (const call of calls) {
            if (call.type === 'external') {
              const resourceKey = this.identifyExternalResource(call);
              if (resourceKey) {
                this.addStateAccess('external', resourceKey, atom, module, {
                  type: 'call',
                  operation: call.name,
                  line: call.line
                }, molecule.filePath);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Rastrea singletons y lazy initialization
   */
  trackSingletons() {
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        const atoms = molecule.atoms || [];
        
        for (const atom of atoms) {
          // Detectar patrones de singleton
          if (this.isSingletonPattern(atom)) {
            const singletonVar = this.extractSingletonVariable(atom);
            if (singletonVar) {
              this.addStateAccess('singleton', singletonVar, atom, module, {
                type: 'initialization',
                isAsync: atom.isAsync
              }, molecule.filePath);
            }
          }
        }
      }
    }
  }

  /**
   * Rastrea estado en closures
   */
  trackClosureState() {
    // Por ahora, básico - buscar variables capturadas
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        const atoms = molecule.atoms || [];
        
        for (const atom of atoms) {
          // Detectar closures que modifican variables externas
          const capturedVars = this.findCapturedVariables(atom);
           for (const variable of capturedVars) {
             this.addStateAccess('closure', variable, atom, module, {
               type: 'captured_write'
             }, molecule.filePath);
           }
        }
      }
    }
  }

  /**
   * Agrega un acceso al estado compartido
   */
  addStateAccess(stateType, stateKey, atom, module, accessInfo, filePath) {
    const fullKey = `${stateType}:${stateKey}`;
    
    if (!this.sharedState.has(fullKey)) {
      this.sharedState.set(fullKey, []);
    }
    
    this.sharedState.get(fullKey).push({
      atom: atom.id,
      atomName: atom.name,
      file: filePath || module?.modulePath || 'unknown',
      module: module?.moduleName || 'unknown',
      type: accessInfo.type || 'unknown',
      isAsync: atom.isAsync || false,
      isExported: atom.isExported || false,
      line: accessInfo.line || 0,
      operation: accessInfo.operation,
      timestamp: Date.now()
    });
  }

  /**
   * Encuentra accesos concurrentes
   */
  findConcurrentAccesses() {
    for (const [stateKey, accesses] of this.sharedState) {
      // Solo analizar si hay múltiples accesos
      if (accesses.length < 2) continue;
      
      // Buscar pares de accesos que pueden ocurrir concurrentemente
      for (let i = 0; i < accesses.length; i++) {
        for (let j = i + 1; j < accesses.length; j++) {
          const access1 = accesses[i];
          const access2 = accesses[j];
          
          // Verificar si pueden ejecutarse concurrentemente
          if (this.canRunConcurrently(access1, access2)) {
            this.recordPotentialRace(stateKey, access1, access2);
          }
        }
      }
    }
  }

  /**
   * Verifica si dos accesos pueden ejecutarse concurrentemente
   */
  canRunConcurrently(access1, access2) {
    // Si son del mismo átomo, no pueden ser concurrentes
    if (access1.atom === access2.atom) return false;
    
    // Si ambos son síncronos y del mismo entry point, son secuenciales
    if (!access1.isAsync && !access2.isAsync) {
      // Verificar si están en el mismo business flow
      if (this.sameBusinessFlow(access1, access2)) {
        return false;
      }
    }
    
    // Si al menos uno es async, potencialmente concurrente
    if (access1.isAsync || access2.isAsync) {
      return true;
    }
    
    // Si son de diferentes entry points, pueden ser concurrentes
    if (!this.sameEntryPoint(access1, access2)) {
      return true;
    }
    
    return false;
  }

  /**
   * Registra un race potencial
   */
  recordPotentialRace(stateKey, access1, access2) {
    const raceType = this.determineRaceType(access1, access2);
    
    this.races.push({
      id: `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: raceType,
      stateKey,
      stateType: stateKey.split(':')[0],
      accesses: [access1, access2],
      severity: 'pending', // Se calculará después
      hasMitigation: false,
      mitigationType: null,
      description: this.generateRaceDescription(stateKey, access1, access2, raceType)
    });
  }

  /**
   * Determina el tipo de race condition
   */
  determineRaceType(access1, access2) {
    const types = [access1.type, access2.type];
    
    // Write-Write
    if (types.every(t => t === 'write' || t === 'STATE_WRITE')) {
      return 'WW';
    }
    
    // Read-Write
    if (types.includes('write') || types.includes('STATE_WRITE')) {
      if (types.includes('read') || types.includes('STATE_READ') || types.includes('ACCESS')) {
        return 'RW';
      }
    }
    
    // Initialization Error
    if (types.includes('initialization')) {
      return 'IE';
    }
    
    // Event handler
    if (types.includes('event') || types.includes('EVENT')) {
      return 'EH';
    }
    
    return 'OTHER';
  }

  /**
   * Detecta patrones específicos de races
   */
  detectRacePatterns() {
    for (const race of this.races) {
      // Detectar todos los patrones para este race
      const detectedPatterns = this.patternMatcher.detectPatterns(race);
      
      if (detectedPatterns.length > 0) {
        // Usar el primer patrón detectado
        race.pattern = detectedPatterns[0].key;
        race.patternName = detectedPatterns[0].name;
        race.allPatterns = detectedPatterns.map(p => p.key);
      }
    }
  }

  /**
   * Verifica mitigaciones existentes
   */
  checkMitigations() {
    for (const race of this.races) {
      const [access1, access2] = race.accesses;
      
      // Verificar locks
      if (this.hasLockProtection(access1) || this.hasLockProtection(access2)) {
        race.hasMitigation = true;
        race.mitigationType = 'lock';
        continue;
      }
      
      // Verificar atomic operations
      if (this.isAtomicOperation(access1) && this.isAtomicOperation(access2)) {
        race.hasMitigation = true;
        race.mitigationType = 'atomic';
        continue;
      }
      
      // Verificar transactions
      if (this.isInTransaction(access1) && this.isInTransaction(access2)) {
        if (this.sameTransaction(access1, access2)) {
          race.hasMitigation = true;
          race.mitigationType = 'transaction';
          continue;
        }
      }
      
      // Verificar async queue
      if (this.hasAsyncQueue(access1) || this.hasAsyncQueue(access2)) {
        race.hasMitigation = true;
        race.mitigationType = 'queue';
        continue;
      }
    }
    
    // Filtrar races mitigados (excepto críticos)
    this.races = this.races.filter(race => 
      !race.hasMitigation || race.severity === 'critical'
    );
  }

  /**
   * Calcula severidad de cada race
   */
  calculateSeverities() {
    for (const race of this.races) {
      race.severity = this.riskScorer.calculate(race, this.project);
    }
  }

  /**
   * Genera resumen de detección
   */
  generateSummary() {
    const byType = {};
    const bySeverity = {};
    
    for (const race of this.races) {
      byType[race.type] = (byType[race.type] || 0) + 1;
      bySeverity[race.severity] = (bySeverity[race.severity] || 0) + 1;
    }
    
    return {
      totalRaces: this.races.length,
      totalWarnings: this.warnings.length,
      byType,
      bySeverity,
      sharedStateItems: this.sharedState.size,
      analyzedAt: new Date().toISOString()
    };
  }

  // Métodos auxiliares
  
  isGlobalAccess(effect) {
    const globalIndicators = ['global.', 'window.', 'globalThis.', 'process.env'];
    return globalIndicators.some(ind => 
      (effect.variable && effect.variable.includes(ind)) ||
      (effect.target && effect.target.includes(ind))
    );
  }

  findGlobalWrites(code) {
    const writes = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Patrones simples de escritura global
      const patterns = [
        /global\.(\w+)\s*=/,
        /window\.(\w+)\s*=/,
        /globalThis\.(\w+)\s*=/
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          writes.push({ variable: match[1], line: i + 1 });
        }
      }
    }
    
    return writes;
  }

  identifyExternalResource(call) {
    // Identificar recursos externos por nombre de función
    const dbPatterns = ['db.', 'database.', 'query', 'insert', 'update', 'delete'];
    const cachePatterns = ['cache.', 'redis.', 'memcached'];
    const filePatterns = ['fs.', 'readFile', 'writeFile'];
    
    const name = call.name || '';
    
    if (dbPatterns.some(p => name.includes(p))) {
      return `database:${name}`;
    }
    if (cachePatterns.some(p => name.includes(p))) {
      return `cache:${name}`;
    }
    if (filePatterns.some(p => name.includes(p))) {
      return `file:${name}`;
    }
    
    return null;
  }

  isSingletonPattern(atom) {
    // Detectar patrones de singleton
    const patterns = [
      /if\s*\(\s*!\w+\s*\)\s*\{[^}]*=\s*await\s+/,
      /if\s*\(\s*\w+\s*===\s*null\s*\)\s*\{/,
      /if\s*\(\s*typeof\s+\w+\s*===?\s*['"]undefined['"]\s*\)\s*\{/
    ];
    
    return patterns.some(p => atom.code && p.test(atom.code));
  }

  extractSingletonVariable(atom) {
    const match = atom.code?.match(/if\s*\(\s*!?(\w+)\s*\)/);
    return match ? match[1] : null;
  }

  findCapturedVariables(atom) {
    // Simplificado - buscar variables usadas pero no declaradas
    const captured = [];
    return captured; // TODO: Implementar análisis más sofisticado
  }

  sameBusinessFlow(access1, access2) {
    // Verificar si están en el mismo flujo de negocio
    return false; // TODO: Implementar
  }

  sameEntryPoint(access1, access2) {
    // Verificar si comparten entry point
    return access1.isExported === access2.isExported && 
           access1.module === access2.module;
  }

  hasLockProtection(access) {
    // Verificar si el átomo usa locks
    return false; // TODO: Implementar
  }

  isAtomicOperation(access) {
    // Verificar si es operación atómica
    return false; // TODO: Implementar
  }

  isInTransaction(access) {
    // Verificar si está en transacción
    return false; // TODO: Implementar
  }

  sameTransaction(access1, access2) {
    // Verificar si es la misma transacción
    return false; // TODO: Implementar
  }

  hasAsyncQueue(access) {
    // Verificar si usa cola async
    return false; // TODO: Implementar
  }

  generateRaceDescription(stateKey, access1, access2, raceType) {
    const typeNames = {
      'WW': 'Write-Write',
      'RW': 'Read-Write',
      'IE': 'Initialization Error',
      'EH': 'Event Handler',
      'OTHER': 'Unknown'
    };
    
    return `${typeNames[raceType] || raceType} race detected on ${stateKey}: ` +
           `${access1.atomName} (${access1.type}) vs ` +
           `${access2.atomName} (${access2.type})`;
  }
}

/**
 * Función helper para ejecutar detección
 */
export function detectRaceConditions(projectData) {
  const detector = new RaceConditionDetector(projectData);
  return detector.detect();
}

export default RaceConditionDetector;
