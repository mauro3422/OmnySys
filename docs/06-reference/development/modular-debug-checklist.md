# Checklist de Debug - Sistemas Modularizados

**Fecha**: 2026-02-13  
**Versión**: v0.9.3  
**Propósito**: Verificar que cada módulo refactorizado cumple su función correctamente

---

## 📋 Instrucciones

1. Marcar cada item con ✅ (funciona), ❌ (falla), o ⚠️ (con observaciones)
2. Si falla, documentar el error y el comportamiento esperado
3. Priorizar por severidad: CRITICAL > HIGH > MEDIUM > LOW

---

## 1️⃣ Race Condition Detector

### 1.1 Fases del Pipeline
- [ ] **Collect Phase**: Carga shared state de todos los trackers
- [ ] **Detect Phase**: Detecta races con estrategias
- [ ] **Enrich Phase**: Enriquece con patterns
- [ ] **Mitigation Phase**: Detecta mitigaciones
- [ ] **Severity Phase**: Calcula severidades
- [ ] **Summary Phase**: Genera resumen

### 1.2 Trackers
- [ ] **GlobalVariableTracker**: Detecta variables globales
- [ ] **ModuleStateTracker**: Detecta estado de módulo
- [ ] **ExternalResourceTracker**: Detecta recursos externos
- [ ] **SingletonTracker**: Detecta singletons
- [ ] **ClosureTracker**: Detecta closures

### 1.3 Strategies
- [ ] **ReadWriteRaceStrategy**: Detecta read-write races
- [ ] **WriteWriteRaceStrategy**: Detecta write-write races
- [ ] **InitErrorStrategy**: Detecta init errors

### 1.4 Mitigation Checkers
- [ ] **Lock Checker**: Detecta locks (mutex, semaphores)
- [ ] **Atomic Checker**: Detecta operaciones atómicas
- [ ] **Transaction Checker**: Detecta transacciones DB
- [ ] **Queue Checker**: Detecta async queues
- [ ] **Immutable Checker**: Detecta datos inmutables
- [ ] **Flow Checker**: Detecta flujos secuenciales

### 1.5 Tests de Integración
```javascript
// Test básico
const pipeline = new RaceDetectionPipeline(projectData);
const results = pipeline.detect();
console.assert(results.races !== undefined);
console.assert(results.summary !== undefined);
```

**Estado**: ⬜ PENDIENTE

---

## 2️⃣ Prompt Engine

### 2.1 Core Components
- [ ] **PromptEngine**: Orquesta generación
- [ ] **Prompt Generator**: Genera system/user prompts
- [ ] **Schema Resolver**: Resuelve schemas JSON

### 2.2 Configuración
- [ ] **Anti-Hallucination Rules**: Reglas por tipo de análisis
- [ ] **Placeholder Registry**: Registro de placeholders

### 2.3 Validadores
- [ ] **Prompt Validator**: Valida estructura de prompts
- [ ] **Template Validator**: Valida templates

### 2.4 Utilidades
- [ ] **Placeholder Replacer**: Reemplaza placeholders
- [ ] **Metadata Formatter**: Formatea metadata

### 2.5 Tests de Integración
```javascript
// Test básico
const engine = new PromptEngine();
const prompt = await engine.generatePrompt(metadata, code);
console.assert(prompt.systemPrompt !== undefined);
console.assert(prompt.userPrompt !== undefined);
console.assert(prompt.jsonSchema !== undefined);
```

**Estado**: ⬜ PENDIENTE

---

## 3️⃣ Consistency Validator

### 3.1 Data Loader
- [ ] **Load Atoms**: Carga átomos desde .omnysysdata/atoms/
- [ ] **Load Files**: Carga archivos desde .omnysysdata/files/
- [ ] **Load Connections**: Carga conexiones desde .omnysysdata/connections/

### 3.2 Validadores
- [ ] **Atoms-Files Validator**: Valida consistencia atoms-files
- [ ] **Files-Connections Validator**: Valida consistencia files-connections
- [ ] **Path Validator**: Valida formatos de path
- [ ] **Duplication Detector**: Detecta duplicación

### 3.3 Issue Manager
- [ ] **Add Issue**: Agrega issues correctamente
- [ ] **Categorize**: Categoriza por severidad
- [ ] **Stats**: Calcula estadísticas

### 3.4 Tests de Integración
```javascript
// Test básico
const validator = new ConsistencyValidator(projectPath);
const result = await validator.validate();
console.assert(result.status !== undefined);
console.assert(result.issues !== undefined);
console.assert(result.stats !== undefined);
```

**Estado**: ⬜ PENDIENTE

---

## 4️⃣ Transformation Extractor

### 4.1 Core
- [ ] **Operation Classifier**: Clasifica operaciones correctamente
- [ ] **Source Extractor**: Extrae fuentes de nodos AST

### 4.2 Processors
- [ ] **Statement Processor**: Procesa statements
- [ ] **Variable Processor**: Procesa declaraciones de variables
- [ ] **Expression Processor**: Procesa expresiones

### 4.3 Handlers
- [ ] **Destructuring Handler**: Maneja destructuring
- [ ] **Mutation Handler**: Maneja métodos mutantes

### 4.4 Utilidades
- [ ] **AST Helpers**: Helpers para nodos AST

### 4.5 Tests de Integración
```javascript
// Test básico
const extractor = new TransformationExtractor(code, inputs);
const transformations = extractor.extract(ast);
console.assert(Array.isArray(transformations));
console.assert(transformations[0].to !== undefined);
console.assert(transformations[0].from !== undefined);
```

**Estado**: ⬜ PENDIENTE

---

## 5️⃣ Derivation Engine

### 5.1 Rules
- [ ] **Archetype Rules**: Deriva arquetipos correctamente
- [ ] **Complexity Rules**: Deriva complejidad
- [ ] **Export Rules**: Deriva exports
- [ ] **Side Effect Rules**: Deriva side effects
- [ ] **Lifecycle Rules**: Deriva lifecycle

### 5.2 Cache
- [ ] **DerivationCache**: Cachea derivaciones
- [ ] **Invalidation**: Invalida por dependencias
- [ ] **Stats**: Calcula estadísticas

### 5.3 Composer
- [ ] **composeMolecularMetadata**: Compone metadata completa
- [ ] **createComposer**: Crea composer con cache

### 5.4 Validator
- [ ] **validateAtoms**: Valida átomos
- [ ] **validateRule**: Valida reglas individuales

### 5.5 Tests de Integración
```javascript
// Test básico
const metadata = composeMolecularMetadata(filePath, atoms);
console.assert(metadata.archetype !== undefined);
console.assert(metadata.totalComplexity !== undefined);
console.assert(metadata.exports !== undefined);
```

**Estado**: ⬜ PENDIENTE

---

## 🔍 Verificaciones Globales

### Compatibilidad
- [ ] **Backward Compatibility**: Todos los imports originales funcionan
- [ ] **Exports**: Todos los exports están disponibles
- [ ] **Default Exports**: Los default exports funcionan

### Performance
- [ ] **Load Time**: No hay degradación en tiempo de carga
- [ ] **Memory**: No hay fugas de memoria
- [ ] **Cache**: El cache funciona correctamente

### Errores
- [ ] **Error Handling**: Errores manejados apropiadamente
- [ ] **Logging**: Logs informativos en cada módulo
- [ ] **Stack Traces**: Stack traces claros

---

## 📊 Métricas de Calidad

### Cobertura de Tests
| Módulo | Tests | Cobertura | Estado |
|--------|-------|-----------|--------|
| Race Detector | 0 | 0% | ⬜ |
| Prompt Engine | 0 | 0% | ⬜ |
| Consistency Validator | 0 | 0% | ⬜ |
| Transformation Extractor | 0 | 0% | ⬜ |
| Derivation Engine | 0 | 0% | ⬜ |

### Bugs Detectados
| Severidad | Cantidad | Resueltos | Pendientes |
|-----------|----------|-----------|------------|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 0 | 0 | 0 |
| MEDIUM | 0 | 0 | 0 |
| LOW | 0 | 0 | 0 |

---

## 📝 Notas de Debug

### Race Detector
```
# Comando para probar
node -e "
import('./src/layer-a-static/race-detector/index.js').then(m => {
  console.log('✅ Race Detector cargado');
  const pipeline = new m.RaceDetectionPipeline({ modules: [] });
  console.log('✅ Pipeline creado');
  const result = pipeline.detect();
  console.log('✅ Detección ejecutada:', result);
}).catch(e => console.error('❌ Error:', e.message));
"
```

### Prompt Engine
```
# Comando para probar
node -e "
import('./src/layer-b-semantic/prompt-engine/index.js').then(m => {
  console.log('✅ Prompt Engine cargado');
  const engine = new m.PromptEngine();
  console.log('✅ Engine creado');
  console.log('Stats:', engine.getStats());
}).catch(e => console.error('❌ Error:', e.message));
"
```

### Consistency Validator
```
# Comando para probar
node -e "
import('./src/layer-c-memory/verification/validators/consistency-validator.js').then(m => {
  console.log('✅ Consistency Validator cargado');
  const validator = new m.ConsistencyValidator('.');
  console.log('✅ Validator creado');
  console.log('Stats:', validator.getStats());
}).catch(e => console.error('❌ Error:', e.message));
"
```

### Transformation Extractor
```
# Comando para probar
node -e "
import('./src/layer-a-static/extractors/data-flow/visitors/transformation-extractor.js').then(m => {
  console.log('✅ Transformation Extractor cargado');
  const extractor = new m.TransformationExtractor('const x = 1;', []);
  console.log('✅ Extractor creado');
  console.log('Transformations:', extractor.getTransformations());
}).catch(e => console.error('❌ Error:', e.message));
"
```

### Derivation Engine
```
# Comando para probar
node -e "
import('./src/shared/derivation-engine.js').then(m => {
  console.log('✅ Derivation Engine cargado');
  const cache = new m.DerivationCache();
  console.log('✅ Cache creado');
  const atoms = [{ id: 'test', name: 'test', complexity: 1 }];
  const result = m.composeMolecularMetadata('test', atoms, cache);
  console.log('✅ Metadata compuesta:', result);
}).catch(e => console.error('❌ Error:', e.message));
"
```

---

## ✅ Sign-off

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Developer | | | ⬜ |
| Reviewer | | | ⬜ |
| QA | | | ⬜ |

---

**Última actualización**: 2026-02-13  
**Versión del documento**: 1.0
