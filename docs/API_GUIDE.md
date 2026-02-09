# 📚 Guía de APIs - OmnySys v0.7.0

Guía completa de las APIs públicas disponibles para extender el sistema.

---

## 🏗️ Arquitectura

```
Layer A (Static) → Layer B (Semantic) → Layer C (Service)
       ↓                    ↓                    ↓
  Extractors          Strategies            Tools
  Phases              Trackers              Pipeline Steps
```

---

## 🔴 Race Detector API

### BaseTracker

Clase base para crear trackers de estado compartido.

```javascript
import { BaseTracker } from './trackers/base-tracker.js';

export class RedisTracker extends BaseTracker {
  trackMolecule(molecule, module) {
    for (const atom of molecule.atoms || []) {
      // Detectar operaciones Redis
      if (atom.calls?.some(c => c.name?.includes('redis'))) {
        this.registerAccess(
          'redis',
          'redis:connection',
          atom,
          module,
          { type: 'call', line: atom.line },
          molecule.filePath
        );
      }
    }
  }
}
```

### RaceDetectionStrategy

Clase base para crear estrategias de detección de races.

```javascript
import { RaceDetectionStrategy } from './strategies/race-detection-strategy.js';

export class TransactionRaceStrategy extends RaceDetectionStrategy {
  getRaceType() {
    return 'TS';
  }
  
  detect(sharedState, project) {
    const races = [];
    // Tu lógica de detección aquí
    return races;
  }
}
```

---

## 🟠 Molecular Extractor API

### ExtractionPhase

Clase base para crear fases de extracción.

```javascript
import { ExtractionPhase } from './phases/base-phase.js';

export class SecurityAnalysisPhase extends ExtractionPhase {
  constructor() {
    super('security-analysis');
  }
  
  canExecute(context) {
    return context.atoms && context.atoms.length > 0;
  }
  
  async execute(context) {
    // Analizar seguridad de átomos
    for (const atom of context.atoms) {
      atom.security = analyzeSecurity(atom);
    }
    return context;
  }
}
```

---

## 🟡 Server Initialization API

### InitializationStep

Clase base para crear steps de inicialización.

```javascript
import { InitializationStep } from './steps/base-step.js';

export class WebSocketStep extends InitializationStep {
  constructor() {
    super('websocket-init');
  }
  
  async execute(server) {
    server.webSocket = new WebSocketServer();
    await server.webSocket.start();
    return true;
  }
  
  async rollback(server, error) {
    await server.webSocket?.stop();
  }
}
```

---

## 🔧 Utility APIs

### AST Utils

Funciones utilitarias para manipulación de código.

```javascript
import { 
  extractFunctionCode,
  getLineNumber,
  extractJSDocComment,
  findFunctionDeclarations 
} from '../shared/utils/ast-utils.js';

// Extraer código de función
const functionCode = extractFunctionCode(sourceCode, {
  line: 10,
  endLine: 25
});

// Obtener número de línea
const line = getLineNumber(code, match.index);

// Encontrar todas las funciones
const functions = findFunctionDeclarations(code);
```

### Metadata Extractors

Todos los extractors de metadata siguen la misma firma:

```javascript
/**
 * @param {string} code - Código fuente
 * @returns {Object} - Metadatos extraídos
 */
export function extractSideEffects(code) {
  return {
    hasNetworkCalls: /fetch\s*\(/.test(code),
    networkCalls: [...],
    // ...
  };
}
```

---

## 📖 Mejores Prácticas

### 1. Pure Functions

Los extractors deben ser funciones puras:
- Mismo input = mismo output
- Sin side effects
- Sin dependencias externas

### 2. Error Handling

Los phases/steps deben manejar errores gracefulmente:

```javascript
async execute(context) {
  try {
    // Tu lógica
  } catch (error) {
    logger.warn(`Phase failed: ${error.message}`);
    // No fallar el pipeline completo
    return context;
  }
}
```

### 3. Documentación

Usa JSDoc para todas las funciones públicas:

```javascript
/**
 * Descripción clara de lo que hace
 * @param {string} param1 - Descripción del parámetro
 * @returns {Object} - Descripción del retorno
 * @example
 * ejemploDeUso();
 */
```

---

## 🔗 Referencias

- [Extension Guide in Trackers](../src/layer-a-static/race-detector/trackers/base-tracker.js)
- [Extension Guide in Strategies](../src/layer-a-static/race-detector/strategies/race-detection-strategy.js)
- [Extension Guide in Extractors](../src/layer-a-static/pipeline/molecular-extractor.js)
- [Extension Guide in Server](../src/layer-c-memory/mcp/core/server-class.js)

---

**Versión**: 0.7.0  
**Última actualización**: 2026-02-09
