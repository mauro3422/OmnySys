/**
 * @fileoverview Race Pattern Matcher
 * 
 * Detecta patrones específicos de race conditions conocidos
 * 
 * @module race-detector/race-pattern-matcher
 */

export class RacePatternMatcher {
  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  /**
   * Inicializa patrones conocidos
   */
  initializePatterns() {
    // Singleton initialization pattern
    this.patterns.set('singleton', {
      name: 'Singleton Initialization',
      detect: (race) => this.isSingletonPattern(race)
    });

    // Counter increment pattern
    this.patterns.set('counter', {
      name: 'Counter Increment',
      detect: (race) => this.isCounterPattern(race)
    });

    // Array modification pattern
    this.patterns.set('array', {
      name: 'Array Modification',
      detect: (race) => this.isArrayPattern(race)
    });

    // Cache population pattern
    this.patterns.set('cache', {
      name: 'Cache Population',
      detect: (race) => this.isCachePattern(race)
    });

    // Lazy initialization pattern
    this.patterns.set('lazy_init', {
      name: 'Lazy Initialization',
      detect: (race) => this.isLazyInitPattern(race)
    });

    // Event subscription pattern
    this.patterns.set('event_sub', {
      name: 'Event Subscription',
      detect: (race) => this.isEventPattern(race)
    });

    // Database update pattern
    this.patterns.set('db_update', {
      name: 'Database Update',
      detect: (race) => this.isDbUpdatePattern(race)
    });

    // File write pattern
    this.patterns.set('file_write', {
      name: 'File Write',
      detect: (race) => this.isFileWritePattern(race)
    });
  }

  /**
   * Detecta todos los patrones en un race
   */
  detectPatterns(race) {
    const detected = [];

    for (const [key, pattern] of this.patterns) {
      if (pattern.detect(race)) {
        detected.push({
          key,
          name: pattern.name,
          race: race.id
        });
      }
    }

    return detected;
  }

  /**
   * Singleton Pattern: if (!instance) { instance = create(); }
   */
  isSingletonPattern(race) {
    // Verificar si es un race de inicialización
    if (race.type !== 'IE' && race.type !== 'WW') return false;

    const accesses = race.accesses;
    
    // Buscar patrones de chequeo null + asignación
    for (const access of accesses) {
      const code = this.getCodeContext(access);
      if (!code) continue;

      const singletonIndicators = [
        /if\s*\(\s*!\w+\s*\)\s*\{[^}]*=\s*(?:await\s+)?create/i,
        /if\s*\(\s*\w+\s*===?\s*(?:null|undefined)\s*\)\s*\{[^}]*=/i,
        /if\s*\(\s*typeof\s+\w+\s*===?\s*['"]undefined['"]\s*\)\s*\{[^}]*=/i,
        /\w+\s*\|\|\s*\(\s*\w+\s*=\s*(?:await\s+)?/i
      ];

      if (singletonIndicators.some(pattern => pattern.test(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Counter Pattern: count++, total += value
   */
  isCounterPattern(race) {
    if (race.type !== 'WW') return false;

    for (const access of race.accesses) {
      const code = this.getCodeContext(access);
      if (!code) continue;

      const counterIndicators = [
        /\w+\+\+/,
        /\+\+\w+/,
        /\w+\s*\+=\s*\d+/,
        /\w+\s*=\s*\w+\s*[-+]\s*\d+/,
        /counter|count|total|sum|index/i
      ];

      if (counterIndicators.some(pattern => pattern.test(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Array Pattern: push, pop, splice
   */
  isArrayPattern(race) {
    if (race.type !== 'WW' && race.type !== 'RW') return false;

    for (const access of race.accesses) {
      const code = this.getCodeContext(access);
      if (!code) continue;

      const arrayIndicators = [
        /\.push\s*\(/,
        /\.pop\s*\(/,
        /\.shift\s*\(/,
        /\.unshift\s*\(/,
        /\.splice\s*\(/,
        /\.sort\s*\(/,
        /\.reverse\s*\(/,
        /\[\s*\w+\s*\]\s*=\s*/
      ];

      if (arrayIndicators.some(pattern => pattern.test(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Cache Pattern: cache[key] = value
   */
  isCachePattern(race) {
    const cacheIndicators = ['cache', 'Cache', 'memo', 'Memo', 'store', 'Store'];
    
    // Verificar nombre del estado
    if (cacheIndicators.some(ind => race.stateKey.includes(ind))) {
      return true;
    }

    for (const access of race.accesses) {
      const code = this.getCodeContext(access);
      if (!code) continue;

      const cachePatterns = [
        /cache\[['"]/i,
        /memo\[['"]/i,
        /store\[['"]/i,
        /getOrSet/i,
        /getFromCache/i
      ];

      if (cachePatterns.some(pattern => pattern.test(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Lazy Initialization Pattern
   */
  isLazyInitPattern(race) {
    if (race.type !== 'IE') return false;

    for (const access of race.accesses) {
      if (access.type === 'initialization' || access.isLazy) {
        return true;
      }
    }

    return false;
  }

  /**
   * Event Pattern: on('event', handler)
   */
  isEventPattern(race) {
    if (race.type !== 'EH' && race.type !== 'OTHER') return false;

    for (const access of race.accesses) {
      const code = this.getCodeContext(access);
      if (!code) continue;

      const eventIndicators = [
        /\.on\s*\(\s*['"]/,
        /\.once\s*\(\s*['"]/,
        /\.emit\s*\(/,
        /addEventListener/,
        /EventEmitter/,
        /dispatchEvent/
      ];

      if (eventIndicators.some(pattern => pattern.test(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Database Update Pattern
   */
  isDbUpdatePattern(race) {
    const dbIndicators = ['database', 'db.', 'query', 'update', 'insert', 'delete'];
    
    if (dbIndicators.some(ind => race.stateKey.includes(ind))) {
      return true;
    }

    for (const access of race.accesses) {
      const code = this.getCodeContext(access);
      if (!code) continue;

      const dbPatterns = [
        /db\.\w+\s*\(/,
        /database\.\w+\s*\(/,
        /\.update\s*\(/,
        /\.insert\s*\(/,
        /\.delete\s*\(/,
        /UPDATE\s+\w+/i,
        /INSERT\s+INTO/i
      ];

      if (dbPatterns.some(pattern => pattern.test(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * File Write Pattern
   */
  isFileWritePattern(race) {
    if (race.stateKey.startsWith('file:')) return true;

    for (const access of race.accesses) {
      const code = this.getCodeContext(access);
      if (!code) continue;

      const filePatterns = [
        /fs\.write/,
        /fs\.append/,
        /writeFile/,
        /appendFile/,
        /createWriteStream/
      ];

      if (filePatterns.some(pattern => pattern.test(code))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Obtiene contexto de código para un acceso
   */
  getCodeContext(access) {
    // En una implementación real, buscaría el código del átomo
    // Por ahora, retornamos null y confiamos en metadatos
    return access.code || null;
  }

  /**
   * Obtiene todos los patrones
   */
  getPatterns() {
    return Array.from(this.patterns.entries()).map(([key, pattern]) => ({
      key,
      name: pattern.name
    }));
  }

  /**
   * Agrega un patrón personalizado
   */
  addPattern(key, name, detectFn) {
    this.patterns.set(key, { name, detect: detectFn });
  }
}

export default RacePatternMatcher;
