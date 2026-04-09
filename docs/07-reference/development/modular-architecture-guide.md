# Guía de Arquitectura Modular v0.9.4

**Versión**: v0.9.4  
**Fecha**: 2026-02-14  
**Estado**: ✅ Activo

---

## 🎯 Resumen

OmnySys v0.9.4 completa la transformación a una **arquitectura modular de 204 módulos**, organizados en 16 sistemas especializados. Cada módulo sigue los principios SOLID y es testeable de forma aislada.

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| **Total de Módulos** | 204 |
| **Sistemas Principales** | 16 |
| **Patrones de Diseño** | 6 (Strategy, Command, Registry, Analyzer, Detector, Provider) |
| **Líneas Promedio por Módulo** | ~100 |
| **Backward Compatibility** | 100% |
| **Breaking Changes** | 0 |

---

## 🏗️ Sistemas Modulares

### 1. Transform Registry
**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/core/transform-registry/`

**Módulos** (9):
- `categories/arithmetic.js` - Operaciones aritméticas
- `categories/logical.js` - Operaciones lógicas
- `categories/structural.js` - Estructuras de datos
- `categories/functional.js` - Transformaciones funcionales
- `categories/control.js` - Flujo de control
- `categories/side-effects.js` - Side effects
- `detectors.js` - Funciones de detección
- `registry.js` - Registro y búsqueda
- `index.js` - API pública

**Uso**:
```javascript
// Importar todo
import { ArithmeticTransforms, detectSideEffectTransform } 
  from './transform-registry/index.js';

// Importar específico
import { detectSideEffectTransform } 
  from './transform-registry/detectors.js';
```

---

### 2. Output Extractor
**Ubicación**: `src/layer-a-static/extractors/data-flow/visitors/output-extractor/`

**Módulos** (10):
- `extractors/return-extractor.js` - Extrae returns
- `extractors/throw-extractor.js` - Extrae throws
- `extractors/side-effect-extractor.js` - Detecta side effects
- `extractors/source-extractor.js` - Extrae fuentes
- `extractors/shape-inferer.js` - Infiere tipos
- `helpers/ast-helpers.js` - Utilidades AST
- `classifiers/side-effect-classifier.js` - Clasifica side effects
- `processors/statement-processor.js` - Procesa statements
- `OutputExtractor.js` - Clase principal
- `index.js` - API pública

**Uso**:
```javascript
import { OutputExtractor, extractReturn, extractSideEffect } 
  from './output-extractor/index.js';

// Usar clase principal
const extractor = new OutputExtractor(code, transformations);
const outputs = extractor.extract(ast);

// Usar funciones individuales
const returnInfo = extractReturn(returnStatement);
```

---

### 3. Type Contracts
**Ubicación**: `src/layer-a-static/extractors/metadata/type-contracts/`

**Módulos** (10):
- `types/index.js` - Definiciones de tipos
- `types/type-analyzer.js` - Análisis de tipos
- `strategies/base-strategy.js` - Estrategia base
- `strategies/jsdoc-strategy.js` - Extracción JSDoc
- `strategies/typescript-strategy.js` - Extracción TypeScript
- `strategies/inference-strategy.js` - Inferencia de tipos
- `validators/compatibility-validator.js` - Validación de compatibilidad
- `extractors/contract-extractor.js` - Extracción de contratos
- `contracts/connection-extractor.js` - Conexiones por tipo
- `index.js` - API pública

**Uso**:
```javascript
import { extractTypeContracts, validateTypeCompatibility } 
  from './type-contracts/index.js';

const contracts = extractTypeContracts(code, jsdoc, ast);
const compatible = validateTypeCompatibility('string', 'number');
```

---

### 4. Validation Engine
**Ubicación**: `src/validation/validation-engine/`

**Módulos** (19):
- `strategies/base-strategy.js` - Estrategia base
- `strategies/syntax-validator.js` - Validación sintáctica
- `strategies/semantic-validator.js` - Validación semántica
- `strategies/schema-validator.js` - Validación de schema
- `strategies/execution-strategies.js` - Estrategias de ejecución
- `strategies/validator-helpers.js` - Helpers
- `runners/base-runner.js` - Runner base
- `runners/sequential-runner.js` - Ejecución secuencial
- `runners/parallel-runner.js` - Ejecución paralela
- `reports/report-builder.js` - Constructor de reportes
- `reports/report-formatter.js` - Formateador de reportes
- `ValidationEngine.js` - Clase principal
- `context.js` - Contexto de validación
- `file-loader.js` - Cargador de archivos
- `index.js` - API pública

**Uso**:
```javascript
import { ValidationEngine } from './validation-engine/index.js';

const engine = new ValidationEngine();
engine.register(new SyntaxValidator());
const result = await engine.validate(files);
```

---

### 5. LLM Service
**Ubicación**: `src/services/llm-service/`

**Módulos** (11):
- `providers/base-provider.js` - Provider base
- `providers/local-provider.js` - Provider local
- `providers/openai-provider.js` - OpenAI
- `providers/anthropic-provider.js` - Anthropic
- `handlers/request-handler.js` - Manejo de requests
- `handlers/response-handler.js` - Manejo de responses
- `cache/response-cache.js` - Caché de respuestas
- `LLMService.js` - Clase principal
- `index.js` - API pública

**Uso**:
```javascript
import { LLMService } from './llm-service/index.js';

const llm = LLMService.getInstance();
const response = await llm.complete(prompt);
```

---

### 6. Error Guardian
**Ubicación**: `src/core/error-guardian/`

**Módulos** (7):
- `strategies/retry-strategy.js` - Retry con backoff
- `strategies/fallback-strategy.js` - Fallback chains
- `strategies/circuit-breaker.js` - Circuit breaker
- `handlers/error-classifier.js` - Clasificación de errores
- `handlers/recovery-handler.js` - Recuperación
- `ErrorGuardian.js` - Clase principal
- `index.js` - API pública

**Uso**:
```javascript
import { ErrorGuardian, RetryStrategy } from './error-guardian/index.js';

const guardian = new ErrorGuardian([
  new RetryStrategy({ maxRetries: 3 })
]);

await guardian.execute(async () => {
  // Tu código aquí
});
```

---

### 7. Atomic Editor
**Ubicación**: `src/core/atomic-editor/`

**Módulos** (10):
- `operations/base-operation.js` - Operación base
- `operations/insert-operation.js` - Inserción
- `operations/delete-operation.js` - Eliminación
- `operations/modify-operation.js` - Modificación
- `validators/syntax-validator.js` - Validación sintáctica
- `validators/safety-validator.js` - Validación de seguridad
- `AtomicEditor.js` - Clase principal
- `index.js` - API pública

**Uso**:
```javascript
import { AtomicEditor, ModifyOperation } from './atomic-editor/index.js';

const editor = new AtomicEditor();
const op = new ModifyOperation(filePath, oldContent, newContent);
await editor.execute(op);
```

---

## 📦 Convenciones de Import

### 1. Import Legacy (Sigue Funcionando)
```javascript
// Imports antiguos siguen funcionando por compatibilidad
import { ValidationEngine } from './validation-engine.js';
import { OutputExtractor } from './output-extractor.js';
```

### 2. Import Moderno (Recomendado)
```javascript
// Importar desde el índice
import { ValidationEngine } from './validation-engine/index.js';

// Importar módulo específico
import { SyntaxValidator } from './validation-engine/strategies/syntax-validator.js';
```

### 3. Import Específico (Para tree-shaking)
```javascript
// Solo importar lo necesario
import { extractReturn } from './output-extractor/extractors/return-extractor.js';
```

---

## 🔧 Extensión de Módulos

### Agregar un Nuevo Validador

```javascript
// 1. Crear archivo en strategies/
// validation-engine/strategies/my-validator.js
import { BaseValidator } from './base-strategy.js';

export class MyValidator extends BaseValidator {
  constructor() {
    super('my-validator');
  }

  async validate(context) {
    // Tu lógica aquí
    return { valid: true, errors: [] };
  }
}

// 2. Registrar en el engine
import { ValidationEngine } from './index.js';
const engine = new ValidationEngine();
engine.register(new MyValidator());
```

### Agregar un Nuevo Detector

```javascript
// temporal-connections/detectors/my-detector.js
import { TemporalDetectorStrategy } from './base-detector.js';

export class MyDetector extends TemporalDetectorStrategy {
  canHandle(node) {
    return node.type === 'MyType';
  }

  detect(node) {
    return { type: 'my-pattern', confidence: 0.9 };
  }
}
```

---

## 🧪 Testing de Módulos

### Test Unitario Básico

```javascript
// tests/unit/extractors/return-extractor.test.js
import { describe, it, expect } from '@jest/globals';
import { extractReturn } from '../../../src/output-extractor/extractors/return-extractor.js';

describe('extractReturn', () => {
  it('should extract simple return', () => {
    const node = {
      type: 'ReturnStatement',
      argument: { type: 'Identifier', name: 'x' },
      loc: { start: { line: 10 } }
    };
    
    const result = extractReturn(node);
    
    expect(result.type).toBe('return');
    expect(result.value).toBe('x');
    expect(result.line).toBe(10);
  });
});
```

### Mocking de Dependencias

```javascript
// Mock de un módulo
jest.mock('../strategies/base-strategy.js', () => ({
  BaseValidator: class MockValidator {
    validate = jest.fn().mockResolvedValue({ valid: true });
  }
}));
```

---

## 🚀 Mejores Prácticas

### 1. Single Responsibility
Cada módulo debe hacer **una cosa bien**:
- ✅ `return-extractor.js` solo extrae returns
- ❌ `extractor.js` que hace de todo

### 2. Composición sobre Herencia
```javascript
// Preferir composición
class MyAnalyzer {
  constructor(extractors) {
    this.extractors = extractors;
  }
}

// En lugar de herencia profunda
class MyAnalyzer extends BaseAnalyzer {
  // ...
}
```

### 3. Inyección de Dependencias
```javascript
// Bien: Recibir dependencias
function createExtractor(parser, validator) {
  return {
    extract: (code) => {
      const ast = parser.parse(code);
      return validator.validate(ast);
    }
  };
}

// Evitar: Importar directamente
import { parser } from './parser.js'; // ❌ Acoplamiento
```

### 4. Documentación Inline
```javascript
/**
 * Extrae información de return statements.
 * 
 * @param {ReturnStatement} node - Nodo AST de return
 * @returns {ReturnInfo} Información extraída
 * @throws {Error} Si el nodo no es un ReturnStatement
 * 
 * @example
 * const info = extractReturn({
 *   type: 'ReturnStatement',
 *   argument: { name: 'x' }
 * });
 * // → { type: 'return', value: 'x' }
 */
export function extractReturn(node) {
  // ...
}
```

---

## 📚 Documentación Relacionada

- [technical-status.md](./technical-status.md) - Estado técnico actual
- [testing-guide.md](./testing-guide.md) - Guía de testing
- [principles.md](../../01-core/principles.md) - Principios de diseño
- [CHANGELOG.md](../../../../CHANGELOG.md) - Historial de cambios

---

**Última actualización**: 2026-02-14  
**Mantenedor**: OmnySys Team
