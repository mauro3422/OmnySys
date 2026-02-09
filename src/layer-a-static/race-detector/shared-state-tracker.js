/**
 * @fileoverview Shared State Tracker
 * 
 * Rastrea y analiza el estado compartido entre funciones
 * 
 * @module race-detector/shared-state-tracker
 */

export class SharedStateTracker {
  constructor() {
    this.state = new Map();
    this.accessLog = [];
  }

  /**
   * Registra un acceso al estado
   */
  trackAccess(key, access) {
    if (!this.state.has(key)) {
      this.state.set(key, {
        key,
        accesses: [],
        readers: new Set(),
        writers: new Set(),
        firstAccess: null,
        lastAccess: null
      });
    }

    const state = this.state.get(key);
    state.accesses.push({
      ...access,
      timestamp: Date.now()
    });

    // Actualizar sets de lectores/escritores
    if (access.type === 'read' || access.type === 'STATE_READ') {
      state.readers.add(access.atom);
    } else if (access.type === 'write' || access.type === 'STATE_WRITE') {
      state.writers.add(access.atom);
    }

    // Actualizar timestamps
    if (!state.firstAccess) {
      state.firstAccess = access;
    }
    state.lastAccess = access;

    // Log de acceso
    this.accessLog.push({
      key,
      ...access,
      timestamp: Date.now()
    });
  }

  /**
   * Obtiene información de un estado
   */
  getState(key) {
    return this.state.get(key);
  }

  /**
   * Obtiene todos los estados
   */
  getAllStates() {
    return Array.from(this.state.values());
  }

  /**
   * Obtiene estados con múltiples escritores
   */
  getContendedStates() {
    return this.getAllStates().filter(state => 
      state.writers.size > 1 ||
      (state.readers.size > 0 && state.writers.size > 0)
    );
  }

  /**
   * Obtiene estados peligrosos (alta contención)
   */
  getHighRiskStates() {
    return this.getAllStates().filter(state => {
      const writeCount = state.accesses.filter(a => 
        a.type === 'write' || a.type === 'STATE_WRITE'
      ).length;
      
      const asyncWrites = state.accesses.filter(a =>
        (a.type === 'write' || a.type === 'STATE_WRITE') && a.isAsync
      ).length;
      
      // Riesgo alto si hay múltiples escrituras async
      return asyncWrites >= 2 || (writeCount >= 3 && state.writers.size > 1);
    });
  }

  /**
   * Obtiene el historial de accesos para un estado
   */
  getAccessHistory(key) {
    const state = this.state.get(key);
    return state ? state.accesses : [];
  }

  /**
   * Analiza patrones de acceso
   */
  analyzeAccessPatterns(key) {
    const state = this.state.get(key);
    if (!state || state.accesses.length < 2) {
      return null;
    }

    const patterns = {
      readHeavy: false,
      writeHeavy: false,
      alternatingRW: false,
      burstAccess: false
    };

    const accesses = state.accesses;
    const reads = accesses.filter(a => a.type === 'read' || a.type === 'STATE_READ');
    const writes = accesses.filter(a => a.type === 'write' || a.type === 'STATE_WRITE');

    // Patrón read-heavy
    patterns.readHeavy = reads.length > writes.length * 2;

    // Patrón write-heavy
    patterns.writeHeavy = writes.length > reads.length;

    // Patrón alternado R-W
    let alternations = 0;
    for (let i = 1; i < accesses.length; i++) {
      const prev = accesses[i - 1];
      const curr = accesses[i];
      
      const prevIsRead = prev.type === 'read' || prev.type === 'STATE_READ';
      const currIsRead = curr.type === 'read' || curr.type === 'STATE_READ';
      
      if (prevIsRead !== currIsRead) {
        alternations++;
      }
    }
    patterns.alternatingRW = alternations > accesses.length * 0.3;

    // Patrón burst (muchos accesos en poco tiempo)
    if (accesses.length >= 5) {
      const timeSpan = accesses[accesses.length - 1].timestamp - accesses[0].timestamp;
      patterns.burstAccess = timeSpan < 1000 && accesses.length >= 5;
    }

    return patterns;
  }

  /**
   * Limpia el tracker
   */
  clear() {
    this.state.clear();
    this.accessLog = [];
  }

  /**
   * Exporta datos para análisis
   */
  export() {
    return {
      states: this.getAllStates().map(s => ({
        key: s.key,
        accessCount: s.accesses.length,
        uniqueReaders: s.readers.size,
        uniqueWriters: s.writers.size,
        pattern: this.analyzeAccessPatterns(s.key)
      })),
      totalAccesses: this.accessLog.length,
      contendedStates: this.getContendedStates().length,
      highRiskStates: this.getHighRiskStates().length
    };
  }
}

export default SharedStateTracker;
