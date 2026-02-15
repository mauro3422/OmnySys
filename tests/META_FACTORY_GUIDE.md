# Meta-Factory Guide

Guía completa del patrón Meta-Factory para crear tests estandarizados en OmnySystem.

## ¿Qué es el Meta-Factory?

El Meta-Factory es un generador de test suites que automatiza la creación de tests contractuales estandarizados. En lugar de escribir manualmente los mismos tests de "Structure Contract" y "Error Handling Contract" en 684 archivos, usamos funciones reutilizables que generan estos tests automáticamente.

### Principios

1. **DRY (Don't Repeat Yourself)**: Define contracts una vez, úsalos en todos lados
2. **SSOT (Single Source of Truth)**: Los contracts están definidos en un solo lugar
3. **No Monolítico**: Cada concern está separado en módulos pequeños y enfocados
4. **Composición sobre Herencia**: Combina contracts según necesites

## Arquitectura Modular

```
tests/factories/test-suite-generator/
├── contracts.js          # Contracts individuales (SSOT)
├── core.js               # Generador de suites y lógica de composición
├── index.js              # API pública unificada
└── test/
    └── meta-factory.validation.test.js  # Tests del propio Meta-Factory
```

### Por qué No Monolítico

- **contracts.js**: Solo define contracts, sin dependencias de generación
- **core.js**: Solo genera suites, usa contracts como dependencias
- **index.js**: Solo expone API, no contiene lógica de negocio
- Cada archivo < 350 líneas (regla de oro de mantenibilidad)

## Uso Básico

### Import

```javascript
// Método recomendado (alias)
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';

// O import específico
import { createTestSuite, Contracts } from '#test-factories/test-suite-generator';
```

### Caso 1: Función de Análisis (Más Común)

```javascript
import { createAnalysisTestSuite } from '#test-factories/test-suite-generator';
import { SystemMapBuilder } from '#test-factories/graph-test.factory.js';
import { analyzeHotspots } from '#layer-a/analyses/tier1/hotspots.js';

createAnalysisTestSuite({
  module: 'analyses/tier1/hotspots',
  exports: { analyzeHotspots },
  analyzeFn: analyzeHotspots,
  expectedFields: { 
    hotspots: 'array', 
    total: 'number',
    maxComplexity: 'number'
  },
  createMockInput: () => SystemMapBuilder.create()
    .withFile('src/complex.js')
    .withFunction('src/complex.js', 'complexFunc', { complexity: 20 })
    .build(),
  specificTests: [
    {
      name: 'detects functions with complexity > 10',
      fn: async () => {
        const systemMap = {
          files: {
            'src/test.js': {
              functions: [
                { name: 'simple', complexity: 5 },
                { name: 'complex', complexity: 25 }
              ]
            }
          }
        };
        const result = await analyzeHotspots(systemMap);
        expect(result.total).toBe(1);
        expect(result.hotspots[0].name).toBe('complex');
      }
    }
  ]
});
```

**¿Qué genera esto?**
- ✅ Structure Contract (verifica que exporta `analyzeHotspots`)
- ✅ Error Handling Contract (verifica que `analyzeHotspots(null)` no lanza error)
- ✅ Return Structure Contract (verifica que retorna objeto con `hotspots`, `total`, `maxComplexity`)
- ✅ Test específico: "detects functions with complexity > 10"

### Caso 2: Detector

```javascript
import { createDetectorTestSuite } from '#test-factories/test-suite-generator';
import { SystemMapBuilder } from '#test-factories/graph-test.factory.js';
import { DeadCodeDetector } from '#layer-a/analyses/tier3/detectors/DeadCodeDetector.js';

createDetectorTestSuite({
  module: 'analyses/tier3/detectors/DeadCodeDetector',
  detectorClass: DeadCodeDetector,
  createMockInput: () => SystemMapBuilder.create()
    .withFile('src/unused.js')
    .withFunction('src/unused.js', 'neverCalled', { isExported: false, calledBy: [] })
    .build(),
  specificTests: [
    {
      name: 'finds dead code in simple case',
      fn: async () => {
        const detector = new DeadCodeDetector();
        const findings = await detector.detect(mockSystemMap);
        expect(findings.length).toBeGreaterThan(0);
        expect(findings[0].type).toBe('DEAD_CODE');
      }
    }
  ]
});
```

### Caso 3: Utilidad Simple

```javascript
import { createUtilityTestSuite } from '#test-factories/test-suite-generator';
import { normalizePath } from '#layer-a/utils/path-utils.js';

createUtilityTestSuite({
  module: 'utils/path-utils',
  exports: { normalizePath },
  fn: normalizePath,
  expectedSafeResult: null,
  specificTests: [
    {
      name: 'normalizes Windows paths',
      fn: () => {
        expect(normalizePath('src\\file.js')).toBe('src/file.js');
      }
    },
    {
      name: 'handles already normalized paths',
      fn: () => {
        expect(normalizePath('src/file.js')).toBe('src/file.js');
      }
    }
  ]
});
```

### Caso 4: Configuración Custom

```javascript
import { createTestSuite } from '#test-factories/test-suite-generator';
import { myComplexModule } from '#layer-a/complex-module.js';

createTestSuite({
  module: 'complex-module',
  exports: { myComplexModule },
  contracts: ['structure', 'error-handling', 'runtime', 'async'],
  contractOptions: {
    testFn: myComplexModule,
    async: true,
    expectedSafeResult: { success: false, data: null }
  },
  specificTests: [
    {
      name: 'processes complex scenario',
      fn: async () => {
        // Tu test específico aquí
      }
    }
  ]
});
```

## API Completa

### Quick-Start Functions

#### `createAnalysisTestSuite(config)`

Para funciones de análisis (Tier 1-3).

```typescript
config: {
  module: string;              // Path del módulo (e.g., 'analyses/tier2/coupling')
  exports: Object;             // Exports del módulo
  analyzeFn: Function;         // Función a testear
  expectedFields: Object;      // Campos esperados en retorno { field: 'type' }
  createMockInput?: Function;  // Factory para input válido
  specificTests?: Array;       // Tests específicos adicionales
}
```

#### `createDetectorTestSuite(config)`

Para clases detectoras (Tier 3).

```typescript
config: {
  module: string;              // Path del módulo
  detectorClass: Class;        // Clase del detector
  createMockInput?: Function;  // Factory para input válido
  specificTests?: Array;       // Tests específicos
}
```

#### `createUtilityTestSuite(config)`

Para funciones utilitarias simples.

```typescript
config: {
  module: string;              // Path del módulo
  exports: Object;             // Exports del módulo
  fn: Function;                // Función a testear
  expectedSafeResult?: any;    // Valor seguro cuando input es null
  specificTests?: Array;       // Tests específicos
}
```

#### `createTestSuite(config)`

Configuración completa custom.

```typescript
config: {
  module: string;              // Path del módulo
  name?: string;               // Nombre display (default: module)
  exports?: Object;            // Exports del módulo
  contracts: string[];         // ['structure', 'error-handling', 'runtime', 'return-structure', 'async']
  contractOptions?: Object;    // Opciones específicas por contract
  specificTests?: Array;       // Tests específicos
  options?: {                  // Opciones adicionales
    only?: boolean;            // describe.only
    skip?: boolean;            // describe.skip
  }
}
```

### Contract Options

#### `contractOptions` para cada tipo de contract

```javascript
{
  // Para 'structure'
  exportNames: ['function1', 'function2'],  // Nombres de exports esperados
  
  // Para 'error-handling'
  testFn: myFunction,           // Función a testear
  async: true,                  // Si es async
  expectedSafeResult: { total: 0 },  // Resultado seguro esperado
  
  // Para 'runtime'
  expectedRuntimeError: 'Error message',  // Error esperado (si aplica)
  
  // Para 'return-structure'
  testFn: myFunction,           // Función a testear
  expectedFields: {             // Campos esperados
    total: 'number',
    items: 'array',
    metadata: 'object'
  },
  createMockInput: () => ({})   // Factory para input válido
}
```

### Funciones de Contract Individuales

Si necesitas más control, usa los contracts individuales:

```javascript
import { 
  createStructureContract,
  createErrorHandlingContract,
  createRuntimeContract,
  createReturnStructureContract,
  createAsyncContract
} from '#test-factories/test-suite-generator';

// En tu test file
describe('My Module', () => {
  // Contract de estructura
  createStructureContract({
    moduleName: 'my-module',
    exports: { myFunction },
    exportNames: ['myFunction', 'helperFunction']
  });
  
  // Contract de manejo de errores
  createErrorHandlingContract({
    moduleName: 'my-module',
    testFn: myFunction,
    options: { async: true, expectedSafeResult: null }
  });
  
  // Tus tests específicos
  describe('Specific Behavior', () => {
    it('should do something specific', async () => {
      // ...
    });
  });
});
```

### Funciones Avanzadas

#### `createTestSuiteWithPreset(presetName, config)`

Usa un preset predefinido.

```javascript
import { createTestSuiteWithPreset, ContractPresets } from '#test-factories/test-suite-generator';

// Ver presets disponibles
console.log(Object.keys(ContractPresets)); // ['analysis', 'detector', 'utility']

// Usar preset
createTestSuiteWithPreset('analysis', {
  module: { path: 'my-analysis', exports: { analyze } },
  contractOptions: { analyzeFn: analyze, expectedFields: { total: 'number' } },
  specificTests: [mySpecificTest]
});
```

#### `createBatchTestSuites(config)`

Genera suites para múltiples módulos a la vez.

```javascript
import { createBatchTestSuites } from '#test-factories/test-suite-generator';

createBatchTestSuites({
  groupName: 'Tier 2 Analyses',
  modules: ['analyses/tier2/coupling', 'analyses/tier2/circular-imports'],
  contracts: ['structure', 'error-handling'],
  contractOptions: { expectedSafeResult: { total: 0 } },
  getModuleExports: (path) => require(`#layer-a/${path}`),
  getSpecificTests: (path) => getTestsFor(path)
});
```

#### `createFocusedTestSuite(config)` / `createSkippedTestSuite(config)`

Para debugging.

```javascript
import { createFocusedTestSuite } from '#test-factories/test-suite-generator';

// Esto genera describe.only, útil para debuggear
createFocusedTestSuite({
  module: 'my-module',
  exports: { myFn },
  contracts: ['structure', 'error-handling'],
  contractOptions: { testFn: myFn }
});
```

#### `validateTestSuiteConfig(config)`

Valida configuración sin ejecutar.

```javascript
import { validateTestSuiteConfig } from '#test-factories/test-suite-generator';

const result = validateTestSuiteConfig({
  module: 'my-module',
  contracts: ['structure', 'error-handling']
});

if (!result.valid) {
  console.error('Config errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Config warnings:', result.warnings);
}
```

## Contracts Disponibles

### 1. Structure Contract

Verifica que el módulo exporta lo que debe.

**Genera:**
- Test: "MUST export required API from [module]"
- Tests individuales por cada exportName

### 2. Error Handling Contract

Verifica manejo de null/undefined.

**Genera:**
- Test: "MUST handle null input gracefully"
- Test: "MUST handle undefined input gracefully"
- Test: "MUST return safe defaults on null input" (si se provee expectedSafeResult)

### 3. Runtime Contract

Verifica que el módulo carga sin errores.

**Genera:**
- Test: "MUST load without runtime errors: [modulePath]"

### 4. Return Structure Contract

Verifica estructura del objeto retornado.

**Genera:**
- Test: "MUST return an object"
- Tests por cada campo esperado: "MUST return object with '[field]' property ([type])"

### 5. Async Contract

Verifica comportamiento de funciones async.

**Genera:**
- Test: "MUST return a Promise"
- Test: "MUST resolve (not hang indefinitely)" (con timeout de 5s)

## Presets

### Analysis Preset

Combina: `structure` + `errorHandling` + `returnStructure`

Configuración:
```javascript
ContractPresets.analysis({
  moduleName: string,
  analyzeFn: Function,
  expectedFields: Object,
  createMockInput: Function
})
```

### Detector Preset

Combina: `structure` + `errorHandling` + `returnStructure`

Configuración:
```javascript
ContractPresets.detector({
  moduleName: string,
  detectorClass: Class,
  createMockInput: Function
})
```

### Utility Preset

Combina: `structure` + `errorHandling`

Configuración:
```javascript
ContractPresets.utility({
  moduleName: string,
  fn: Function,
  expectedSafeResult: any
})
```

## Mejores Prácticas

### 1. Usa Quick-Start Functions

✅ **Bien:**
```javascript
createAnalysisTestSuite({ module, exports, analyzeFn, expectedFields });
```

❌ **Evitar (a menos que necesites control total):**
```javascript
createTestSuite({
  module,
  exports,
  contracts: ['structure', 'error-handling', 'return-structure'],
  contractOptions: { /* ... */ }
});
```

### 2. Separa Tests Específicos

Los tests específicos deben probar comportamiento, no estructura.

✅ **Bien:**
```javascript
specificTests: [
  {
    name: 'detects bidirectional coupling',
    fn: async () => {
      // Test de comportamiento específico
    }
  }
]
```

❌ **Evitar:**
```javascript
specificTests: [
  {
    name: 'should export analyzeCoupling',  // Esto ya lo hace Structure Contract
    fn: () => { /* ... */ }
  }
]
```

### 3. Usa Factories para Mock Input

✅ **Bien:**
```javascript
createMockInput: () => SystemMapBuilder.create()
  .withFile('src/a.js')
  .withFunction('src/a.js', 'main', { isExported: true })
  .build()
```

❌ **Evitar:**
```javascript
createMockInput: () => ({
  files: { 'src/a.js': { functions: [{ name: 'main' }] } }
})
```

### 4. Documenta Tests Específicos

```javascript
specificTests: [
  {
    name: 'detects X when Y happens',
    fn: async () => {
      // Given: sistema en estado Z
      // When: ocurre Y
      // Then: debería detectar X
    }
  }
]
```

### 5. Mantén Modularidad

Si necesitas extender el Meta-Factory, crea nuevos archivos en lugar de modificar los existentes:

```
tests/factories/test-suite-generator/
├── contracts.js              # Existente - NO MODIFICAR
├── core.js                   # Existente - NO MODIFICAR
├── index.js                  # Existente - NO MODIFICAR
├── custom-contracts.js       # Nuevo - Contracts específicos de dominio
└── helpers.js                # Nuevo - Helpers reutilizables
```

## Migración desde Tests Manuales

### Antes (Manual)

```javascript
describe('Tier 2 - Coupling Analysis', () => {
  describe('Structure Contract', () => {
    it('MUST return an object with coupling metrics', () => {
      const result = analyzeCoupling(mockSystemMap);
      expect(result).toBeTypeOf('object');
      expect(result).toHaveProperty('couplings');
      expect(result).toHaveProperty('total');
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle empty risk scores', () => {
      expect(() => analyzeCoupling(null)).not.toThrow();
    });
  });

  it('detects bidirectional coupling', async () => {
    // Test específico
  });
});
```

### Después (Meta-Factory)

```javascript
createAnalysisTestSuite({
  module: 'analyses/tier2/coupling',
  exports: { analyzeCoupling },
  analyzeFn: analyzeCoupling,
  expectedFields: { couplings: 'array', total: 'number' },
  createMockInput: () => createMockSystemMap(),
  specificTests: [
    {
      name: 'detects bidirectional coupling',
      fn: async () => { /* Test específico */ }
    }
  ]
});
```

**Resultado:** ~20 líneas → ~12 líneas, más consistente y mantenible.

## Troubleshooting

### "Contract function requires X parameter"

Verifica que estás pasando los parámetros requeridos en `contractOptions`:

```javascript
// ❌ Falta analyzeFn
createTestSuite({
  contracts: ['error-handling'],  // Error: necesita testFn o analyzeFn
  contractOptions: {}
});

// ✅ Correcto
createTestSuite({
  contracts: ['error-handling'],
  contractOptions: { testFn: myFunction }
});
```

### "Module not found"

Asegúrate de que el path en `module` sea correcto (relativo a `src/layer-a-static`):

```javascript
// ✅ Correcto
module: 'analyses/tier2/coupling'

// ❌ Incorrecto
module: './analyses/tier2/coupling'
module: 'src/layer-a-static/analyses/tier2/coupling'
```

### Tests no aparecen

Si usas `createTestSuite` directamente, asegúrate de llamarla a nivel de módulo, no dentro de un `describe`:

```javascript
// ✅ Correcto - a nivel de módulo
createTestSuite({ ... });

// ❌ Incorrecto - dentro de describe
describe('My Tests', () => {
  createTestSuite({ ... });  // No generará tests
});
```

## Auto-Generator de Tests

Para acelerar aún más la creación de tests, usamos el **Auto-Generator**:

### Uso Básico

```bash
# Generar test automáticamente
node scripts/generate-meta-test.js src/layer-a-static/analyses/tier2/coupling.js

# Sobrescribir si ya existe
node scripts/generate-meta-test.js src/layer-a-static/analyses/tier2/coupling.js --force
```

### Qué Hace el Auto-Generator

1. **Analiza el código fuente** y detecta:
   - Exports (funciones, clases)
   - Si es sync o async
   - Campos de retorno
   - Tipo de módulo (analysis, detector, utility)

2. **Genera el archivo de test** con:
   - Imports correctos
   - Configuración de Meta-Factory
   - Tests específicos placeholder
   - Documentación JSDoc

### Ejemplo de Output

```bash
$ node scripts/generate-meta-test.js src/layer-a-static/analyses/tier2/reachability.js

🔍 Analyzing: src/layer-a-static/analyses/tier2/reachability.js

📊 Detected:
   Module Type: analysis
   Exports: analyzeReachability
   Async: false
   Return Fields: totalFiles, reachable, unreachable, ...

✅ Test generated: tests/unit/layer-a-analysis/analyses/tier2/reachability.test.js

📋 Next steps:
   1. Review the generated test
   2. Add specific tests for your use cases
   3. Run: npm test -- tests/unit/layer-a-analysis/analyses/tier2/reachability.test.js
```

### Beneficios

- **0 código boilerplate** - Todo se genera automáticamente
- **Consistencia garantizada** - Siempre sigue el patrón Meta-Factory
- **Detección inteligente** - Identifica exports y campos automáticamente
- **Ahorro de tiempo** - De ~15 min a ~30 segundos por archivo

### Workflow Recomendado

1. **Generar test automáticamente**:
   ```bash
   node scripts/generate-meta-test.js <ruta-al-modulo>
   ```

2. **Revisar y ajustar**:
   - Verificar que los campos esperados sean correctos
   - Agregar tests específicos de negocio

3. **Ejecutar y validar**:
   ```bash
   npm test -- <ruta-al-test-generado>
   ```

## Referencias

- [Factory Guide](./FACTORY_GUIDE.md) - Guía de factories de datos
- [Contract Patterns](./CONTRACT_PATTERNS.md) - Patrones de contract testing
- [Adding Tests](./ADDING_TESTS.md) - Guía general de tests
- [Auto-Generator](../scripts/generate-meta-test.js) - Script de generación automática
