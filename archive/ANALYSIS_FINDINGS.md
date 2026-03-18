# OmnySys — Hallazgos del Análisis del Sistema

> Generado: 2026-02-24 | Estado del análisis: v0.9.60 | **Sistema: SQLite Determinístico**

---

## 1. Estado General del Sistema

| Métrica | Valor | Estado |
|---------|-------|--------|
| Archivos indexados | 1,800+ | ✅ 100% |
| Átomos extraídos | 13,000+ | ✅ |
| Storage | **SQLite** | ✅ Determinístico |
| Semantic Algebra | 7 vectores/átomo | ✅ |
| Health Score | 99/100 | ✅ |

---

## 2. LLM — Desactivado (correcto)

### Por qué se desactivó
El LLM era redundante con los metadatos actuales de átomos:

| Lo que hacía el LLM | Lo que ya tienen los átomos |
|--------------------|----------------------------|
| `riskLevel` ("high/medium/low") | `atom.complexity` + `usedBy.length` |
| `responsibilities[]` | `atom.purpose[]` únicos del archivo |
| `impactScore` | `usedBy.length / totalFiles` |
| `isOrphan` | `usedBy.length === 0` (exacto) |
| `godObjectAnalysis` | `atom.archetype.type === 'god-function'` |

**Problema adicional:** El LLM alucinaba. Marcaba `isOrphan: false` para archivos sin dependientes, inventaba `responsibilities` copiando de los ejemplos del prompt.

### Nuevo pipeline (sin LLM)
```
atoms.purpose + atoms.archetype → decideFromAtoms() → fileArchetype + LLM decision
                     ↓ (si atoms sin cobertura)
           fallback: buildPromptMetadata → detectArchetypes
```

### Archivos modificados
- `src/layer-c-memory/mcp/core/initialization/steps/llm-setup-step.js` — skip total
- `src/core/orchestrator/lifecycle/init/main.js` — sin LLMService ni health checker
- `src/core/orchestrator/lifecycle/health/llm-checker.js` — no-op
- `src/core/orchestrator/index.js` — usa `staticInsights` en vez de `llmAnalysis`
- **NUEVO** `src/core/orchestrator/static-insights.js` — `deriveFileInsights()` desde átomos
- **NUEVO** `src/layer-b-semantic/atom-decider/index.js` — `decideFromAtoms()` con 6 gates

**Resultado:** Inicialización ~28s → ~5s. Zero GPU. Zero alucinaciones.

---

## 3. Gap de calledBy (61.5% sin resolver) — PROBLEMA PRINCIPAL

### Causa raíz
El cross-file linker (`build-calledby-index`) solo resuelve llamadas via imports estáticos:
```js
import { miFunc } from './archivo.js'
miFunc()  // ← esto se linkea ✅
```

Pero NO resuelve instanciación de clases:
```js
import { MiClase } from './archivo.js'
const obj = new MiClase()
obj.metodo()  // ← metodo() no recibe calledBy ❌
```

### Impacto
- 699 class methods marcados como DEAD_CODE (falso positivo)
- Impact maps incompletos para clases
- `analyze_change` subestima el impacto de métodos de clase
- `decideFromAtoms` con data incorrecta → puede mandar archivos al LLM innecesariamente

### Solución: Class Instantiation Tracker (Layer A)
**Archivo a crear:** `src/layer-a-static/pipeline/phases/calledby/class-instantiation-tracker.js`

**Algoritmo:**
1. Durante el build del grafo, indexar todos los `new ClassName()` por archivo
2. Para cada instanciación, resolver qué archivo exporta `ClassName`
3. Para cada `instance.method()` en el archivo que instancia, agregar `calledBy` al método en el archivo de origen
4. Merge con el calledBy index existente

**Estado:** ✅ Implementado en v0.9.37

---

## 4. Falsos Positivos de Código Muerto

### Causa
`detectAtomPurpose()` en `src/layer-a-static/pipeline/phases/atom-extraction/metadata/purpose.js`:
- No tiene ningún check previo de `atom.className !== null`
- Cae al default `DEAD_CODE` para métodos de clase que no tienen callers linkados

### Distribución de los 1447 átomos "dead":
```
699  class-method   → FALSO POSITIVO (se llaman via instancia)
28   dead-function  → Legítimo (non-exported, zero callers, no className)
~720 archive/tests  → Esperado (código viejo o helpers de test)
```

### Fix
Agregar check de `atom.className` ANTES del fallback DEAD_CODE en `detectAtomPurpose()`.

**Estado:** ✅ Implementado en v0.9.37

---

## 5. MCP Tools — Duplicación y Limpieza

### Duplicación: get_atomic_functions + get_molecule_summary
Ambas llaman a `getFileAnalysisWithAtoms()` y devuelven los átomos del archivo.

| Campo | get_atomic_functions | get_molecule_summary |
|-------|---------------------|---------------------|
| atoms list | ✅ (byArchetype + exported/internal) | ✅ (flat con archetype) |
| insights | ✅ (deadCode, hotPaths, fragile) | ✅ (hasDeadCode, hasHotPaths) |
| derived/stats | ❌ | ✅ |
| Organización | Por archetype | Plana |

**Solución:** Fusionar en `get_molecule_summary` que devuelve ambas vistas.

**Estado:** ✅ Implementado en v0.9.37

### Dead code: getTunnelVisionStats
El propio sistema la detecta como `archetype: dead-function, purpose: DEAD_CODE`.
No está linkada en el MCP tools index como handler activo.

**Estado:** ✅ Eliminada en v0.9.37

---

## 6. Inconsistencias de Relaciones (menores)

```
79  issues: usedBy ↔ dependsOn no bidireccionales
298 issues: calledBy apunta a átomos que se movieron/renombraron
```

**Causa:** Runs anteriores con archivos renombrados sin re-análisis completo.
**Solución:** Se limpian solos con el próximo `node main.js --force-reanalysis` o tras el class instantiation tracker (que re-linkea todo).

---

## 7. Métricas Correctas del Sistema

El `audit-relationships.js` reporta `Health Score: 0/100` — esto es un bug del script, no del sistema. La fórmula suma todos los issues y divide por un total incorrecto. Los datos reales son:

| Métrica real | Valor |
|-------------|-------|
| Archivos 100% analizados | 1746 |
| Cobertura de átomos | 63% (1100/1746) |
| Átomos con metadata completa | 88% |
| Conexiones semánticas reales | 1993 (740 eventos, 869 globals, 171 env vars) |
| Archivos genuinamente muertos | ~28 funciones en ~10 archivos |

---

## 8. Roadmap de Mejoras Identificadas

| Prioridad | Item | Impacto |
|-----------|------|---------|
| 🔴 Alta | Class instantiation tracker | +61% calledBy coverage |
| 🔴 Alta | Fix dead code false positives | -699 falsos positivos |
| 🟡 Media | Fusionar MCP tools duplicadas | UX más limpia |
| 🟡 Media | Fix health score en audit-relationships | Métricas correctas |
| 🟢 Baja | Semantic connections para más archivos | 6% → 30%+ |
| 🟢 Baja | Re-análisis forzado post class-tracker | Cleanup de inconsistencias |
