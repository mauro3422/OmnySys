# 🎯 Plan Maestro de Corrección - OmnySys v0.6.0

**Fecha**: 2026-02-09  
**Auditor**: Claude (Code Review)  
**Objetivo**: Arreglar todos los problemas críticos y activar Race Conditions  

---

## 📊 Estado Inicial

| Métrica | Valor | Prioridad |
|---------|-------|-----------|
| Archivos fuente | ~416 | - |
| Tests | ~32 (~8% cobertura) | 🔴 Crítico |
| Problemas críticos | 4 | 🔴 Crítico |
| Problemas altos | 4 | 🟠 Alto |
| TODOs sin implementar | 8 métodos | 🔴 Crítico |
| Archivos monolíticos (>500 líneas) | 3 | 🟠 Alto |

---

## 🎯 FASE 1: Arreglos Críticos de Arquitectura

### 1.1 Consolidar Código Duplicado ✅ YA RESUELTO

**Estado**: Los archivos ya son re-exports. No hay duplicación real.

```javascript
// src/layer-a-static/extractors/function-analyzer.js
export * from '../../shared/analysis/function-analyzer.js';

// src/layer-b-semantic/function-analyzer.js  
export * from '../shared/analysis/function-analyzer.js';
```

**Verificación**: Los hashes SHA256 son diferentes porque las rutas de import son diferentes.

### 1.2 Mix CJS/ESM ✅ YA RESUELTO

**Estado**: No se encontró código real usando `require()`. Los matches son:
- Comentarios/documentación
- Análisis de código CJS (detectores)

### 1.3 Migrar console.log a Logger Centralizado

**Archivos afectados**: 80+ archivos  
**Estrategia**: Migración gradual, priorizando archivos críticos

**Patrón**:
```javascript
// ❌ Antes
console.log('[Module] Message');

// ✅ Después
import { logger } from '#utils/logger.js';
logger.info('Message', { module: 'module-name' });
```

**Prioridad de migración**:
1. `src/core/*` - Orquestador y servidores
2. `src/layer-a-static/pipeline/*` - Pipeline de análisis
3. `src/layer-c-memory/mcp/*` - Servidor MCP
4. Resto gradual

---

## 🧬 FASE 2: Activar Race Conditions (IMPLEMENTAR TODOs)

### Contexto Arquitectónico

Según la documentación de **DATA_FLOW_FRACTAL**, los race conditions se detectan en:

```
┌─────────────────────────────────────────┐
│ Layer A: Extracción de metadata atómica │
│   - isAsync, stateAccess (reads/writes) │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Layer B: Detección de patrones          │
│   - Trackers identifican shared state   │
│   - Strategies detectan races           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ Layer C: Resultados expuestos vía MCP   │
└─────────────────────────────────────────┘
```

### 2.1 Implementar `sameBusinessFlow()`

**Ubicación**: `src/layer-a-static/race-detector/strategies/race-detection-strategy.js`

**Propósito**: Determinar si dos accesos a shared state están en el mismo flujo de negocio (secuencial) o pueden ejecutarse concurrentemente.

**Implementación**:
```javascript
sameBusinessFlow(access1, access2, project) {
  // Estrategia 1: Mismo archivo, misma función caller
  if (access1.file === access2.file && 
      access1.caller === access2.caller) {
    return true;
  }
  
  // Estrategia 2: Caller llama secuencialmente a ambos
  const caller1 = this.findCaller(access1, project);
  const caller2 = this.findCaller(access2, project);
  
  if (caller1 && caller1.id === caller2?.id) {
    // Verificar orden secuencial en el código
    return this.areSequentialInCode(caller1, access1, access2);
  }
  
  // Estrategia 3: Diferentes entry points = flujos diferentes
  const entry1 = this.findEntryPoints(access1.atom, project);
  const entry2 = this.findEntryPoints(access2.atom, project);
  
  return entry1.some(ep => entry2.includes(ep));
}
```

### 2.2 Implementar `hasLockProtection()`

**Ubicación**: `src/layer-a-static/race-detector/index.js`

**Estado actual**: Ya existe pero básico. Necesita mejoras.

**Mejoras**:
- Detectar patrones de locks específicos por framework
- Detectar locks implícitos (database transactions)
- Detectar locks distribuidos (Redis, etc.)

**Patrones adicionales**:
```javascript
const lockPatterns = [
  // Mutexes
  /\b(mutex|lock|semaphore)\./i,
  /\bLock\s*\(/i,
  /\bacquire\s*\(/i,
  
  // JavaScript/TypeScript específicos
  /navigator\.locks\.request/i,
  /Atomics\./i,
  
  // Frameworks
  /async\s*\.mutate\(/i,  // TanStack Query
  /useMutation\(/i,        // React Query
  
  // Database locks
  /SELECT.*FOR\s+UPDATE/i,
  /LOCK\s+TABLES/i,
  
  // Distributed locks
  /redis.*lock/i,
  /redlock/i
];
```

### 2.3 Implementar `isAtomicOperation()`

**Ubicación**: `src/layer-a-static/race-detector/index.js`

**Propósito**: Detectar si una operación es atómica (no puede ser interrumpida).

**Implementación**:
```javascript
isAtomicOperation(access) {
  const atom = this.findAtomById(access.atom);
  if (!atom?.code) return false;
  
  // Atomics de JavaScript
  const atomicPatterns = [
    /Atomics\.(add|sub|and|or|xor|exchange|compareExchange|load|store)\(/i,
  ];
  
  // Single instruction (simplificación)
  const lines = atom.code.split('\n');
  const isSingleLine = lines.length <= 1;
  
  // Database atomic operations
  const dbAtomic = [
    /\.findOneAndUpdate\(/i,
    /\.findOneAndReplace\(/i,
    /\.findOneAndDelete\(/i,
    /UPSERT/i
  ];
  
  return atomicPatterns.some(p => p.test(atom.code)) ||
         dbAtomic.some(p => p.test(atom.code)) ||
         (isSingleLine && !access.isAsync);
}
```

### 2.4 Implementar `isInTransaction()`

**Ubicación**: `src/layer-a-static/race-detector/index.js`

**Propósito**: Detectar si un acceso está dentro de una transacción de base de datos.

**Patrones**:
```javascript
isInTransaction(access) {
  const atom = this.findAtomById(access.atom);
  if (!atom?.code) return false;
  
  const transactionPatterns = [
    // SQL
    /BEGIN\s+TRANSACTION/i,
    /START\s+TRANSACTION/i,
    /COMMIT/i,
    /ROLLBACK/i,
    
    // Prisma
    /prisma\.\$transaction/i,
    /prisma\.[\w]+\.transaction/i,
    
    // Sequelize
    /sequelize\.transaction/i,
    /\.transaction\s*\(/i,
    
    // MongoDB
    /session\.startTransaction/i,
    /session\.withTransaction/i,
    
    // TypeORM
    /getManager\(\)\.transaction/i,
    
    // Mongoose
    /\.session\s*\(/i
  ];
  
  return transactionPatterns.some(p => p.test(atom.code));
}
```

### 2.5 Implementar `sameTransaction()`

**Ubicación**: `src/layer-a-static/race-detector/index.js`

**Propósito**: Verificar si dos accesos comparten la misma transacción.

**Implementación**:
```javascript
sameTransaction(access1, access2) {
  // Si ambos están en transacciones diferentes o ninguno, no es race
  const t1 = this.findTransactionContext(access1);
  const t2 = this.findTransactionContext(access2);
  
  if (!t1 || !t2) return false;
  
  // Misma transacción = serializados por el DB engine
  return t1.id === t2.id;
}

findTransactionContext(access) {
  // Buscar el contexto de transacción que contiene este acceso
  // Buscar hacia arriba en el call stack
  // Retornar transaction ID o null
}
```

### 2.6 Implementar `hasAsyncQueue()`

**Ubicación**: `src/layer-a-static/race-detector/index.js`

**Estado actual**: Ya existe. Necesita mejoras.

**Mejoras**:
```javascript
hasAsyncQueue(access) {
  const atom = this.findAtomById(access.atom);
  if (!atom?.code) return false;
  
  const queuePatterns = [
    // Bibliotecas de colas
    /async\s*\.queue/i,
    /p-queue/i,
    /bull|bullmq/i,
    /bee-queue/i,
    /kue/i,
    / Agenda /i,
    /node-cron/i,
    
    // Rate limiting implícito
    /p-limit/i,
    /p-throttle/i,
    /bottleneck/i,
    
    // Framework patterns
    /queue\.add\s*\(/i,
    /queue\.process/i,
    /concurrent\s*:\s*\d+/i,
    
    // Worker pools
    /worker_threads/i,
    /Worker\s*\(/i,
    /workerpool/i
  ];
  
  return queuePatterns.some(p => p.test(atom.code));
}
```

### 2.7 Implementar `findCapturedVariables()`

**Ubicación**: `src/layer-a-static/race-detector/trackers/closure-tracker.js`

**Propósito**: Analizar closures para detectar variables capturadas que pueden causar races.

**Implementación**:
```javascript
findCapturedVariables(atom) {
  if (!atom.code) return [];
  
  const captured = [];
  
  // Parsear AST del átomo
  const ast = this.parseAtom(atom);
  
  // Encontrar todas las funciones anidadas (closures)
  const closures = this.findClosures(ast);
  
  for (const closure of closures) {
    // Variables referenciadas pero no definidas en el closure
    const referenced = this.findReferences(closure);
    const defined = this.findDeclarations(closure);
    
    // Capturadas = referenciadas - definidas localmente
    const captured = referenced.filter(r => !defined.includes(r));
    
    // Verificar si son shared state
    for (const variable of captured) {
      if (this.isSharedState(variable)) {
        captured.push({
          name: variable,
          closure: closure.name,
          atom: atom.id,
          type: 'closure-captured'
        });
      }
    }
  }
  
  return captured;
}
```

---

## 🏗️ FASE 3: Refactorizar Archivos Monolíticos

### 3.1 Refactorizar `system-analyzer.js` (697 líneas)

**Estrategia**: Ya fue parcialmente refactorizado. Verificar estado actual.

**Estructura actual**:
```
src/layer-a-static/module-system/
├── system-analyzer.js          # Orquestador
├── detectors/
│   ├── api-route-detector.js
│   ├── cli-detector.js
│   ├── event-detector.js
│   ├── job-detector.js
│   └── export-detector.js
├── analyzers/
│   ├── business-flow-analyzer.js
│   ├── connection-analyzer.js
│   └── pattern-analyzer.js
└── builders/
    └── system-graph-builder.js
```

**Acción**: Verificar si queda lógica por extraer.

### 3.2 Refactorizar `tools.js` (520 líneas)

**Estrategia**: Ya fue refactorizado en:
```
src/core/unified-server/tools/
├── index.js              # Re-exports
├── impact-tools.js
├── connection-tools.js
├── risk-tools.js
├── search-tools.js
├── status-tools.js
├── atomic-tools.js
└── server-tools.js
```

**Acción**: Verificar que `tools.js` principal solo re-exporte.

### 3.3 Refactorizar `race-detector/index.js` (578 líneas)

**Estrategia**: Ya fue refactorizado con:
- Trackers separados
- Strategies separadas
- RiskScorer separado

**Acción**: Verificar que no quede lógica por extraer.

---

## 🧪 FASE 4: Agregar Tests Críticos

### 4.1 Tests para `derivation-engine.js`

**Cobertura necesaria**:
- Reglas de derivación individuales
- Caché de derivaciones
- Invalidación de caché
- Composición molecular completa

**Archivo**: `src/shared/__tests__/derivation-engine.test.js`

### 4.2 Tests para `molecular-extractor.js`

**Cobertura necesaria**:
- Extracción de átomos
- Detección de arquetipos atómicos
- Cadenas moleculares
- Pipeline completo

**Archivo**: `src/layer-a-static/pipeline/__tests__/molecular-extractor.test.js`

### 4.3 Tests para Race Detection Strategies

**Cobertura necesaria**:
- Cada strategy individual
- Detección de races reales
- Falsos positivos
- Mitigaciones

**Archivos**:
- `src/layer-a-static/race-detector/strategies/__tests__/read-write-race.test.js`
- `src/layer-a-static/race-detector/strategies/__tests__/write-write-race.test.js`
- `src/layer-a-static/race-detector/strategies/__tests__/init-error.test.js`

### 4.4 Tests para Nuevos Detectores

**Nuevos detectores a testear**:
- `sameBusinessFlow()`
- `isInTransaction()`
- `hasAsyncQueue()` mejorado
- `findCapturedVariables()`

---

## 📚 FASE 5: Actualizar Documentación

### 5.1 Documentos Desactualizados

Verificar y actualizar:
- [ ] `docs/architecture/ARCHITECTURE_MOLECULAR_PLAN.md`
- [ ] `docs/DATA_FLOW/*.md` (solo Fase 1 implementada parcialmente)
- [ ] `docs/guides/METADATA_INSIGHTS_GUIDE.md`

### 5.2 Nueva Documentación

Crear:
- [ ] `docs/RACE_CONDITION_DETECTION.md` - Guía completa
- [ ] `docs/TESTING_GUIDE.md` - Cómo testear OmnySys

---

## 📅 Timeline Sugerido

| Fase | Duración | Entregables |
|------|----------|-------------|
| FASE 1 | 2 días | Logger migrado, problemas críticos arreglados |
| FASE 2 | 4 días | 8 TODOs implementados, race detector 100% funcional |
| FASE 3 | 2 días | Archivos monolíticos refactorizados |
| FASE 4 | 3 días | Cobertura de tests aumentada a 30%+ |
| FASE 5 | 1 día | Documentación actualizada |

**Total**: ~12 días de trabajo

---

## ✅ Criterios de Éxito

- [ ] Zero TODOs sin implementar
- [ ] Race detector funciona al 100%
- [ ] Tests cobertura > 30%
- [ ] No hay archivos > 400 líneas sin justificación
- [ ] Documentación sincronizada con código
- [ ] Logger usado en todos los archivos críticos

---

**Notas para el implementador**:

1. Seguir principio **SSOT**: Single Source of Truth
2. Mantener **arquitectura fractal** A→B→C en todo nuevo código
3. Usar **confidence-based bypass** donde aplique
4. Documentar TODOs que NO se van a implementar (con razón)
5. Priorizar funcionalidad sobre perfección (v0.6.1, no v1.0)
