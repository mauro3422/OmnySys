# OmnySys — Plan de Estabilización

**Creado**: 2026-02-18  
**Auditoría realizada por**: Cline (AI Assistant)  
**Estado**: 🔧 En progreso

---

## Resumen Ejecutivo de la Auditoría

### Lo que está bien ✅
| Aspecto | Detalle |
|---------|---------|
| Sintaxis | 956 archivos JS, 100% válidos |
| Tests | **283/283 archivos pasan — 4,044 tests en verde** |
| Arquitectura | 5 capas bien separadas: A, B, Graph, C, Core |
| Modularidad | 500+ módulos, < 350 líneas cada uno |
| Layer Graph | Bien estructurada, API pública limpia (54 exports) |
| Cache en Core | Correctamente ubicada en `src/core/cache/` |

### Lo que está roto ⚠️
| Problema | Cantidad | Impacto |
|----------|---------|---------|
| Imports rotos en runtime | 26 archivos faltantes | MCP server puede fallar |
| Smoke test deshabilitado | 1 test | Sin E2E del MCP server |
| Tests no detectan imports rotos | Todos usan mocks | Falsa sensación de estabilidad |
| Documentación desincronizada | README decía v0.9.4, pkg v0.9.5 | Confusión de contribuidores |

---

## Los 26 Imports Rotos — Detalle Completo

*Fuente: `logs/broken-imports-report.json` — ejecutar `node scripts/detect-broken-imports.js`*

### Categoría A: Path Incorrecto (archivo existe, path equivocado)

Estos son los más fáciles de resolver — actualizar el import:

| Archivo que falla | Import incorrecto | Corrección |
|-------------------|-------------------|------------|
| `src/core/cache/integration.js` | `src/core/layer-c-memory/shadow-registry/audit-logger.js` | `src/layer-c-memory/shadow-registry/audit-logger.js` |
| `src/layer-a-static/analyses/tier1/function-cycle-classifier/cycles/classifier.js` | `src/layer-a-static/utils/logger.js` | `src/utils/logger.js` |
| `src/layer-a-static/pipeline/enhance/builders/system-map-builder.js` | `src/layer-a-static/shared/architecture-utils.js` | `src/shared/architecture-utils.js` |
| `src/layer-a-static/extractors/metadata/side-effects.js` | `src/layer-a-static/extractors/extractors/metadata/database-operations.js` | Verificar path real |

### Categoría B: Import sin extensión/index (fácil de resolver)

| Archivo que falla | Import problemático | Corrección |
|-------------------|---------------------|------------|
| `src/layer-graph/builders/export-index.js` | `./file` (x2) | `./file/index.js` o verificar estructura |
| `src/layer-a-static/parser/extractors/exports.js` | `../file` | Verificar path |
| `src/layer-a-static/extractors/typescript/parsers/imports.js` | `./parsers/...` | Verificar path |

### Categoría C: Archivos Planificados Nunca Creados (crear stubs)

Estos archivos son importados pero nunca existieron — fueron planificados y olvidados:

| Archivo faltante | Referenciado por | Acción |
|-----------------|-----------------|--------|
| `src/layer-a-static/analyses/tier3/event-pattern-detector.js` | `file-analyzer.js`, `connection-extractor.js` | Crear stub |
| `src/layer-a-static/analyses/tier3/broken-connections-detector.js` | `risk-analyzer.js` | Crear stub |
| `src/layer-a-static/extractors/metadata/security-patterns.js` | `molecular-extractor.js` | Crear stub |
| `src/layer-b-semantic/prompt-engine/prompt-templates/your-analysis-type.js` | `prompt-engine/index.js` | Crear stub o eliminar import |
| `src/layer-b-semantic/prompt-engine/prompt-templates/constants` | `circular-dependency.js` | Verificar si existe como /index.js |
| `src/layer-b-semantic/prompt-engine/prompt-templates/config` | `circular-dependency.js` | Verificar si existe como /index.js |

### Categoría D: Race Detector Analyzers (implementar o crear stubs)

Módulos del race detector que fueron planificados pero no implementados:

| Archivo faltante | Referenciado por | Acción |
|-----------------|-----------------|--------|
| `src/layer-a-static/race-detector/strategies/race-detection-strategy/patterns/analyzers/shared-state-analyzer.js` | `core.js` | Crear implementación básica |
| `src/layer-a-static/race-detector/strategies/race-detection-strategy/patterns/analyzers/timing-analyzer.js` | `core.js` | Crear implementación básica |
| `src/layer-a-static/race-detector/strategies/race-detection-strategy/patterns/analyzers/lock-analyzer.js` | `core.js` | Crear implementación básica |

### Categoría E: Error Guardian (estructura incompleta)

| Archivo faltante | Referenciado por | Acción |
|-----------------|-----------------|--------|
| `src/core/error-guardian/handlers/recovery-handler/actions/isolation.js` | `severity-handlers.js` | Crear implementación básica |

### Archivos faltantes adicionales (6 más en el reporte)
Ver `logs/broken-imports-report.json` para el listado completo.

---

## Plan de Trabajo por Fases

### Fase 1: Fix Imports — Categoría A (Paths incorrectos) 🔴
**Tiempo**: 30 min  
**Riesgo**: Bajo  
**Acción**: Actualizar los imports a los paths correctos

```bash
# Para verificar dónde está realmente el archivo:
node -e "import('./src/layer-c-memory/shadow-registry/audit-logger.js').then(console.log)"
```

**Checklist**:
- [ ] Fix: `src/core/cache/integration.js` — audit-logger path
- [ ] Fix: `classifier.js` — logger path
- [ ] Fix: `system-map-builder.js` — architecture-utils path
- [ ] Fix: `side-effects.js` — database-operations path
- [ ] Fix: `export-index.js` — ./file imports

### Fase 2: Fix Imports — Categoría B (Sin extensión)
**Tiempo**: 15 min  
**Acción**: Agregar `/index.js` o extensión correcta

**Checklist**:
- [ ] Fix: `exports.js` en parser
- [ ] Fix: `imports.js` en typescript parsers

### Fase 3: Crear Stubs — Categorías C/D/E
**Tiempo**: 1-2 horas  
**Acción**: Crear implementaciones mínimas funcionales

Un stub básico tiene esta forma:
```javascript
/**
 * @fileoverview [nombre].js
 * Stub — implementación mínima pendiente de completar
 * TODO: Implementar lógica real
 */

export function detectEvents(code, ast) {
  return [];
}

export default { detectEvents };
```

**Checklist**:
- [ ] Crear: `event-pattern-detector.js`
- [ ] Crear: `broken-connections-detector.js`  
- [ ] Crear: `security-patterns.js`
- [ ] Resolver: `your-analysis-type.js` (stub o eliminar import)
- [ ] Resolver: `constants` y `config` en prompt-templates
- [ ] Crear: `shared-state-analyzer.js`
- [ ] Crear: `timing-analyzer.js`
- [ ] Crear: `lock-analyzer.js`
- [ ] Crear: `isolation.js` en error-guardian

### Fase 4: Test de Imports (nuevo test)
**Tiempo**: 2-3 horas  
**Archivo**: `tests/integration/import-health.test.js`

```javascript
/**
 * Import Health Test
 * Verifica que todos los módulos principales se pueden importar
 * SIN mocks — esto detecta imports rotos en runtime
 */
import { describe, test, expect } from 'vitest';

describe('Layer A — imports saludables', () => {
  test('analyzer.js carga correctamente', async () => {
    const mod = await import('#layer-a/analyzer.js');
    expect(mod).toBeDefined();
  });
  // ... un test por módulo principal
});

describe('Layer Graph — imports saludables', () => {
  test('index.js carga correctamente', async () => {
    const mod = await import('#layer-graph/index.js');
    expect(mod.buildSystemMap).toBeDefined();
    expect(mod.getImpactMap).toBeDefined();
    expect(mod.detectCycles).toBeDefined();
  });
});

describe('Core — imports saludables', () => {
  test('cache/index.js carga correctamente', async () => {
    const mod = await import('#core/cache/index.js');
    expect(mod).toBeDefined();
  });
});

describe('Layer C — imports saludables', () => {
  test('storage/index.js carga correctamente', async () => {
    const mod = await import('#layer-c/storage/index.js');
    expect(mod).toBeDefined();
  });
});
```

**Checklist**:
- [ ] Crear test de health para Layer A (10-15 imports principales)
- [ ] Crear test de health para Layer Graph (5 imports)
- [ ] Crear test de health para Layer C (5 imports)
- [ ] Crear test de health para Core (5 imports)
- [ ] Agregar al CI/CD

### Fase 5: Rehabilitar Smoke Test de Layer C
**Tiempo**: 1-2 días  
**Archivo**: `tests/integration/smoke.test.js.disabled`

El smoke test debe:
1. Iniciar el MCP server en modo test
2. Esperar que se inicialice
3. Llamar a `get_server_status()`
4. Verificar respuesta correcta
5. Apagar el servidor

**Checklist**:
- [ ] Revisar por qué falló el smoke test original
- [ ] Arreglar Layer C code issues que causaban el fallo
- [ ] Re-habilitar `smoke.test.js.disabled` → `smoke.test.js`
- [ ] Verificar que pasa en CI

---

## Decisiones de Arquitectura Pendientes

### 1. Core → Layer C dependency (¿es correcta?)
`src/core/index.js` re-exporta storage desde `#layer-c/storage/index.js`.
Esto significa **Core depende de Layer C**, lo cual puede ser un smell arquitectural.

**Opciones**:
- A) Mantener como está (pragmático, funciona)
- B) Mover storage a Core directamente (más limpio, más trabajo)
- C) Hacer que Layer C exporte storage como servicio (SOLID)

**Recomendación**: Opción A por ahora, documentar como deuda técnica.

### 2. Layer Graph queries (async imports)
`layer-graph/index.js` tiene las queries comentadas con dynamic imports:
```javascript
export const asyncQueries = {
  getDependencyGraph: async () => (await import('./query/dependency-query.js')).getDependencyGraph,
  // ...
};
```

Esto rompe el pattern de importación limpia. Las queries deberían ser sync o usar un patrón más limpio.

**Recomendación**: Mantener por ahora, investigar si causa problemas reales en runtime.

---

## Limpieza de Raíz — Archivos a Archivar

Los siguientes archivos fueron movidos a `archive/` como parte de la limpieza:

### Movidos a archive/ ✅
- `AUDIT_MCP_INITIALIZATION.md` — auditoría puntual, obsoleta
- `AUDIT_RESULTS.md` — resultados de auditoría pasada
- `GETTING_STARTED.md` — reemplazado por README.md
- `INSTALL.md` — reemplazado por README.md  
- `MCP_SETUP.md` — incorporado en README.md
- `OMNISCIENCIA.md` — filosofía, moverse a docs/
- `PLAN_UNIFICACION_FUNCTIONS.md` — plan completado
- `QUEDO_POR_HACER.md` — obsoleto (información en ROADMAP.md)
- `REFACTORING_SUMMARY_v0.9.4.md` — histórico, en changelog/
- `SECURITY-AUTO-FIX.md` — específico, en docs o archive
- `mcp-http-server.js` — verificar si está en uso activo
- `restart-server.mjs` — verificar si está en uso activo
- `run-tests.js` — reemplazado por `npm test`
- `start-mcp-server.cmd` — revisar si se usa
- `start-server.js` / `start-server.mjs` — revisar si se usan
- `test-results.txt` — output temporal
- `migration_night_20260216_021643.log` — log temporal
- `migration-log.json` — log histórico
- `nul` — archivo error de Windows (eliminar)
- `relative/` — directorio vacío/error (eliminar)
- `audit-context.js` — script de auditoría puntual

### Conservados en raíz ✅
- `README.md` — documentación principal
- `ARCHITECTURE.md` — mapa de arquitectura ← NUEVO
- `ROADMAP.md` — estado y próximos pasos
- `CHANGELOG.md` — historial de versiones
- `PLAN_ESTABILIZACION.md` — este archivo ← NUEVO
- `LAYER_A_STATUS.md` — estado detallado Layer A
- `LICENSE` — licencia MIT
- `package.json` + `package-lock.json` — config npm
- `omny.js` — CLI entry point
- `omnysystem.js` — server entry
- `main.js` — main entry
- `install.js` — instalador
- `vitest.config.js` — config de tests
- `.gitignore`, `.parserignore` — configuración git/parser
- `claude_desktop_config.json` — config Claude Desktop
- `opencode.json` — config OpenCode
- `mcp-servers.json` + `mcp-servers.schema.json` — config MCP
- `.vitest-*.json` — config vitest (ocultos)

---

## Métricas de la Auditoría

```
Fecha auditoría:     2026-02-18
Archivos JS:         956 (sintaxis válida)
Archivos analizados: 1,180 (incluyendo test/)
Imports rotos:       26 archivos faltantes (30 referencias)
Tests pasando:       4,044 / 4,044 (283 archivos)
Tests skipped:       35
Tiempo test suite:   ~21 segundos
Cobertura estimada:  ~35-40%
```

---

## Comandos Útiles para la Estabilización

```bash
# Detectar imports rotos
node scripts/detect-broken-imports.js

# Ver reporte completo
cat logs/broken-imports-report.json

# Validar sintaxis
npm run validate

# Correr todos los tests
npm test

# Correr solo Layer A
npm run test:layer-a:core

# Correr solo Layer Graph
npm run test:layer-graph

# Intentar iniciar el MCP server (ver si explota)
node src/layer-c-memory/mcp-server.js . 2>&1 | cat

# Ver logs del MCP server
tail -f logs/mcp-server.log
```

---

---

## Diagnóstico de Runtime MCP Server — Issues Pre-existentes

> **Importante**: Los issues documentados en esta sección son **pre-existentes** y **no fueron causados** por el trabajo de estabilización de 2026-02-18. Fueron identificados analizando los logs del MCP server en runtime. El servidor arranca y procesa archivos correctamente — estos issues aparecen en análisis de larga duración.

### Issue #1 — Memory Leak / OOM en análisis masivo 🔴 CRÍTICO

**Síntoma observado en logs**:
```
Loaded 2045 files from Layer A  ← aparece 213 veces (una por job)
```

**Causa raíz**: Layer A carga los 2045 archivos del proyecto en memoria para **cada job individualmente** en lugar de compartir una caché global entre jobs. Cuando se procesan 213 jobs en paralelo, se cargan 213 × 2045 = 435,585 copias de archivos en memoria → OOM inevitable.

**Impacto**: El proceso MCP muere por falta de memoria en análisis largos. En análisis cortos (< 50 archivos de entrada) no ocurre.

**Corrección sugerida**: 
```javascript
// src/layer-a-static/analyzer.js (o donde se inicializa Layer A)
// Implementar caché singleton compartida entre jobs:
const _globalCache = new Map(); // ← singleton a nivel de módulo
export async function loadFiles(paths) {
  const uncached = paths.filter(p => !_globalCache.has(p));
  if (uncached.length > 0) {
    const loaded = await loadFromDisk(uncached);
    for (const [path, content] of loaded) _globalCache.set(path, content);
  }
  return paths.map(p => _globalCache.get(p));
}
```

**Archivos a investigar**: `src/layer-a-static/analyzer.js`, `src/layer-a-static/pipeline/`, `src/core/cache/integration.js`

---

### Issue #2 — `traverse is not a function` en re-análisis 🟠 ALTO

**Síntoma observado en logs**:
```
TypeError: traverse is not a function
  at analyzeFile (src/layer-a-static/analyses/tier1/...)
```

**Causa raíz**: `@babel/traverse` exporta su función como `default` en ESM, pero se importa como named export:
```javascript
// ❌ Incorrecto (produce undefined en Node 22)
import { traverse } from '@babel/traverse';

// ✅ Correcto para ESM
import _traverse from '@babel/traverse';
const traverse = _traverse.default ?? _traverse;
```

**Impacto**: El path de re-análisis (análisis incremental al cambiar archivos) falla silenciosamente. El análisis inicial funciona correctamente.

**Archivos a buscar**:
```bash
grep -r "from '@babel/traverse'" src/ --include="*.js"
grep -r "require('@babel/traverse')" src/ --include="*.js"
```

**Corrección sugerida**: En cada archivo que importe `@babel/traverse`, reemplazar con el patrón de compatibilidad ESM:
```javascript
import _traverse from '@babel/traverse';
const traverse = _traverse.default ?? _traverse;
```

---

### Issue #3 — `molecularStructure.atoms is not iterable` 🟠 ALTO

**Síntoma observado en logs**:
```
TypeError: molecularStructure.atoms is not iterable
  at MolecularExtractor.extract (src/layer-a-static/extractors/...)
```

**Causa raíz**: Cuando el análisis de un archivo falla (por ejemplo, por el Issue #2), `molecularStructure` retorna `null` o `undefined` en vez de un objeto con `atoms: []`. El código que consume el resultado no tiene null-check.

**Corrección sugerida**:
```javascript
// Antes del for...of sobre atoms:
const atoms = molecularStructure?.atoms ?? [];
for (const atom of atoms) { ... }
```

**Archivos a buscar**: `src/layer-a-static/extractors/` — buscar usos de `.atoms`.

---

### Issue #4 — Sin prompt schema para arquetipos `god-object` y `orphan-module` 🟡 MEDIO

**Síntoma observado en logs**:
```
Warning: No prompt template found for archetype 'god-object'
Warning: No prompt template found for archetype 'orphan-module'
```

**Causa raíz**: Layer B tiene prompt templates para algunos arquetipos pero le faltan los dos más comunes: `god-object` (clase/módulo con demasiadas responsabilidades) y `orphan-module` (módulo sin consumers).

**Archivos faltantes**:
- `src/layer-b-semantic/prompt-engine/prompt-templates/god-object.js`
- `src/layer-b-semantic/prompt-engine/prompt-templates/orphan-module.js`

**Corrección sugerida**: Crear templates basados en el patrón existente en `your-analysis-type.js` (stub creado en esta sesión).

---

### Issue #5 — `Cannot read properties of undefined (reading 'aborted')` 🟡 MEDIO

**Síntoma observado en logs**:
```
TypeError: Cannot read properties of undefined (reading 'aborted')
  at JobAnalyzer.js:132
```

**Causa raíz**: En `JobAnalyzer.js:132` se accede a `request.signal.aborted` pero `request.signal` puede ser `undefined` cuando el job fue creado sin AbortController (modo legacy o tests).

**Corrección sugerida**:
```javascript
// En JobAnalyzer.js:132
// Antes:
if (request.signal.aborted) { ... }

// Después:
if (request.signal?.aborted) { ... }
```

**Archivo**: `src/layer-c-memory/mcp-server/job-analyzer.js` o similar — buscar `JobAnalyzer`.

---

### Resumen de Issues Runtime

| # | Issue | Severidad | Ocurre en | Fix estimado |
|---|-------|-----------|-----------|--------------|
| 1 | Memory Leak / OOM | 🔴 Crítico | Análisis > 50 archivos | 4-8 horas |
| 2 | `traverse is not a function` | 🟠 Alto | Re-análisis incremental | 1-2 horas |
| 3 | `atoms is not iterable` | 🟠 Alto | Consecuencia del Issue #2 | 30 min |
| 4 | Sin prompt para god-object/orphan | 🟡 Medio | Siempre | 1 hora |
| 5 | `aborted` es undefined | 🟡 Medio | Jobs sin AbortSignal | 15 min |

**Nota**: Ninguno de estos issues bloquea el inicio del servidor. El MCP server arranca, procesa archivos y responde a herramientas correctamente. Los issues aparecen en casos de uso extendido o con proyectos grandes.

---

## Changelog de Este Plan

| Fecha | Acción | Resultado |
|-------|--------|-----------|
| 2026-02-18 | Auditoría completa del proyecto | 26 imports rotos encontrados, tests OK |
| 2026-02-18 | README.md actualizado | v0.9.16, arquitectura correcta |
| 2026-02-18 | ARCHITECTURE.md creado | Mapa completo de las 5 capas |
| 2026-02-18 | ROADMAP.md actualizado | Historial completo, estado real |
| 2026-02-18 | package.json → v0.9.16 | Versión sincronizada |
| 2026-02-18 | Limpieza de raíz | Obsoletos → archive/ |
| 2026-02-18 | Fix 3 imports con path incorrecto | cache/integration.js, classifier.js, system-map-builder.js |
| 2026-02-18 | 10 stubs creados | event-pattern-detector, broken-connections-detector, isolation, detector-base, ast-parser, MasterIndexer, shared-state-analyzer, timing-analyzer, lock-analyzer, your-analysis-type |
| 2026-02-18 | llm-service.js corregido | BaseProvider + analyzeWithLLM/isLLMAvailable/waitForLLM exportados |
| 2026-02-18 | tests/unit/services/index.test.js | 3 tests BUG → tests funcionales normales |
| 2026-02-18 | Diagnóstico runtime documentado | 5 issues pre-existentes identificados y documentados |
| 2026-02-18 | Fix Issue #5: `signal?.aborted` | JobAnalyzer.js — 2 lugares + signal extracción con `?.` |
| 2026-02-18 | Fix Issue #2: `@babel/traverse` ESM | atomic/index.js corregido, utils.js import innecesario eliminado |
| 2026-02-18 | Fix Issue #3: null-check `.atoms` | file-watcher/analyze.js — `moleculeAtoms = molecularStructure?.atoms ?? []` |
| 2026-02-18 | Issue #4 investigado | god-object y orphan-module YA existen: templates, JSON schemas y registro completos ✅ |
| Pendiente | Fix Memory Leak (Issue #1) | Implementar caché singleton entre jobs — 4-8 horas de trabajo |
| Pendiente | Tests de import health | - |
| Pendiente | Smoke test Layer C | - |
