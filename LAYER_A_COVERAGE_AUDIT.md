# Layer A Test Coverage Audit

**Fecha:** 2026-02-14  
**Auditor:** Kimi Code CLI

---

## 📊 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Archivos fuente Layer A** | 610 |
| **Archivos de test** | 26 |
| **Tests pasando** | 527 |
| **Cobertura real** | ~4% (26/610 archivos) |
| **Tests con Factory + Contracts** | 17/26 (65%) |
| **Tests SIN Factory** | 9/26 (35%) |

---

## ✅ Tests Existentes (26 archivos, 527 tests)

### Tier 1-2: 5 archivos (con Factory ✅)
| Archivo | Tests | Factory | Contracts |
|---------|-------|---------|-----------|
| hotspots.test.js | 13 | ✅ | ✅ |
| orphan-files.test.js | 19 | ✅ | ✅ |
| unused-exports.test.js | 17 | ✅ | ✅ |
| circular-imports.test.js | 18 | ✅ | ✅ |
| coupling.test.js | 12 | ✅ | ✅ |

### Tier 3: 21 archivos (mixto)

#### Con Factory + Contracts (12 archivos)
| Archivo | Tests | Factory | Contracts |
|---------|-------|---------|-----------|
| score-calculator.test.js | 18 | ✅ | ✅ |
| tier3-contract.test.js | 8 | N/A | ✅ |
| broken-connections-detector.test.js | 26 | ✅ | ✅ |
| dead-code-detector.test.js | 20 | ✅ | ✅ |
| duplicate-detector.test.js | 21 | ✅ | ✅ |
| import-detector.test.js | 19 | ✅ | ✅ |
| worker-detector.test.js | 17 | ✅ | ✅ |
| hotspot-score.test.js | 12 | ✅ | ✅ |
| semantic-score.test.js | 11 | ✅ | ✅ |
| side-effect-score.test.js | 11 | ✅ | ✅ |
| static-complexity.test.js | 14 | ✅ | ✅ |
| url-validator.test.js | 26 | ✅ | ✅ |

#### SIN Factory (9 archivos) ⚠️
| Archivo | Tests | Factory | Contracts |
|---------|-------|---------|-----------|
| report-generator.test.js | 15 | ❌ | ❌ |
| severity-calculator.test.js | 11 | ❌ | ❌ |
| event-detector.test.js | 56 | ❌ | ✅ |
| shared-state-detector.test.js | 32 | ❌ | ✅ |
| side-effects-detector.test.js | 56 | ❌ | ✅ |
| coupling-score.test.js | 10 | ❌ | ✅ |
| issue-utils.test.js | 11 | ❌ | ❌ |
| name-utils.test.js | 35 | ❌ | ❌ |
| RiskScorer.test.js | 19 | ✅ | ❌ |

---

## ❌ Archivos Fuente SIN Tests (584 archivos)

### Por Directorio
| Directorio | Archivos fuente | Tests | Cobertura |
|------------|-----------------|-------|-----------|
| analyses/tier1 | 17 | 3 | 18% |
| analyses/tier2 | 11 | 2 | 18% |
| analyses/tier3 | 41 | ~16 | 39% |
| **extractors** | **236** | **0** | **0%** ⚠️ |
| **race-detector** | **93** | **0** | **0%** ⚠️ |
| graph | 11 | 0 | 0% |
| module-system | 30 | 0 | 0% |
| parser | 8 | 0 | 0% |
| pattern-detection | 25 | 0 | 0% |
| pipeline | 91 | 0 | 0% |
| query | 25 | 0 | 0% |
| storage | 16 | 0 | 0% |

### Análisis de Gap Crítico

#### 🔴 CRÍTICO: Extractors (236 archivos)
- **atomic/**: 5 archivos (arrow, class-method, function, index, utils)
- **communication/**: 8 archivos (broadcast-channel, message-channel, network-calls, server-sent-events, websocket, web-workers, window-postmessage)
- **comprehensive-extractor/**: ~40 archivos
- **css-in-js-extractor/**: 6 archivos
- **data-flow/**: ~50 archivos
- **metadata/**: ~40 archivos
- **state-management/**: 15 archivos
- **static/**: 12 archivos
- **typescript/**: ~25 archivos

#### 🔴 CRÍTICO: Race Detector (93 archivos)
- closure-analysis/
- factors/
- matchers/
- mitigation/
- patterns/
- phases/
- scorers/
- strategies/
- trackers/
- utils/

#### 🟡 IMPORTANTE: Pipeline (91 archivos)
- enhance/
- enhancers/
- molecular-chains/
- phases/

#### 🟡 IMPORTANTE: Pattern Detection (25 archivos)
- detectors/
- engine/
- runners/

---

## 🏗️ Factories Disponibles (6)

1. **analysis.factory.js** - Para Tier 1-2 analyses
2. **detector-test.factory.js** - Para detectores
3. **extractor-test.factory.js** - Para extractores
4. **extractor.factory.js** - Para extractores (duplicado?)
5. **race-detector-test.factory.js** - Para race detector
6. **tier3-analysis.factory.js** - Para Tier 3 analyses

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Arreglar Tests Existentes (9 archivos)
Convertir tests que no usan factories al patrón correcto:
- [ ] report-generator.test.js
- [ ] severity-calculator.test.js
- [ ] event-detector.test.js
- [ ] shared-state-detector.test.js
- [ ] side-effects-detector.test.js
- [ ] coupling-score.test.js
- [ ] issue-utils.test.js
- [ ] name-utils.test.js

**Estimado:** 1-2 días

### Fase 2: Tests Core Infrastructure (80+ archivos)
Priorizar componentes críticos del sistema:
- [ ] graph/ (11 archivos)
- [ ] parser/ (8 archivos)
- [ ] module-system/ (30 archivos)
- [ ] query/ (25 archivos)
- [ ] storage/ (16 archivos)

**Estimado:** 1 semana (~320 tests)

### Fase 3: Extractors Críticos (50 archivos)
- [ ] atomic/ (5 archivos)
- [ ] communication/ (8 archivos)
- [ ] state-management/ (15 archivos)
- [ ] static/ (12 archivos)
- [ ] metadata básicos (10 archivos)

**Estimado:** 1-2 semanas (~400 tests)

### Fase 4: Race Detector (30 archivos core)
- [ ] phases/ (6 archivos)
- [ ] trackers/ (6 archivos)
- [ ] strategies/ (10 archivos)
- [ ] scorers/ (8 archivos)

**Estimado:** 1 semana (~240 tests)

### Fase 5: Pipeline & Pattern Detection (60 archivos)
- [ ] pipeline/phases/ (20 archivos)
- [ ] pattern-detection/engine/ (10 archivos)
- [ ] pattern-detection/detectors/ (15 archivos)
- [ ] pipeline/enhancers/ (15 archivos)

**Estimado:** 1-2 semanas (~480 tests)

### Fase 6: Remaining (200+ archivos)
Resto de extractors, comprehensive-extractor, data-flow, typescript, etc.

**Estimado:** 2-3 semanas (~1600 tests)

---

## 📈 Proyección Total

| Fase | Archivos | Tests Estimados | Tiempo |
|------|----------|-----------------|--------|
| Fase 1 | 9 | 50 | 1-2 días |
| Fase 2 | 80 | 320 | 1 semana |
| Fase 3 | 50 | 400 | 1-2 semanas |
| Fase 4 | 30 | 240 | 1 semana |
| Fase 5 | 60 | 480 | 1-2 semanas |
| Fase 6 | 200+ | 1600 | 2-3 semanas |
| **TOTAL** | **~430** | **~3100** | **6-8 semanas** |

---

## 🎯 Objetivo Realista

Dado el scope, recomiendo:

1. **Corto plazo (1 semana)**: 
   - Fase 1: Arreglar tests existentes
   - Fase 2: Core infrastructure (graph, parser, query)
   - **Meta: 600+ tests**

2. **Mediano plazo (1 mes)**:
   - Fases 3-5: Extractors críticos, Race Detector, Pipeline
   - **Meta: 1500+ tests**

3. **Largo plazo (2 meses)**:
   - Fase 6: Cobertura completa
   - **Meta: 3000+ tests**

---

## ✅ Verificación de Calidad

Todos los tests NUEVOS deben:
1. ✅ Usar factories para crear datos de prueba
2. ✅ Tener sección "Structure Contract"
3. ✅ Tener sección "Error Handling Contract"
4. ✅ Usar `describe` anidados por funcionalidad
5. ✅ Tener al menos 3 tests por función pública

---

*Última actualización: 2026-02-14*
