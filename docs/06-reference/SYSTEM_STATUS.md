# Estado del Sistema - Febrero 2026

**Versión**: 0.9.5  
**Archivos JS**: 1183  
**Estado**: Funcional con deuda técnica  

---

## ✅ HECHO

### Layer Graph (NUEVO - Hoy)
- [x] Estructura creada `src/layer-graph/`
- [x] API pública unificada (54 exports)
- [x] 17 archivos consolidados
- [x] Tests: 21 unit + 54 contract
- [x] Documentación: README + arquitectura
- [x] Compatibilidad hacia atrás (`core/graph/` re-exporta)

### Layer A - Static Analysis
- [x] Scanner de archivos
- [x] Parser AST (Babel)
- [x] 17 extractores de metadata
- [x] Pipeline de procesamiento
- [x] Query APIs
- [x] Module system

### Layer B - Semantic Analysis
- [x] LLM Analyzer
- [x] Prompt Engine
- [x] Schema Validator
- [x] Metadata Contract
- [x] Issue Detectors

### Layer C - Memory & API
- [x] MCP Server (14 tools)
- [x] Shadow Registry
- [x] Verification system
- [x] Storage en `.omnysysdata/`

### Core
- [x] Orchestrator
- [x] File Watcher
- [x] Unified Server (puertos 9999/9998)
- [x] Atomic Editor
- [x] Tunnel Vision Detection

---

## 🔴 PENDIENTE - Refactorización Original

### Deuda Técnica en Core
```
src/core/
├── orchestrator.js + orchestrator/     ← DUPLICADO
├── file-watcher.js + file-watcher/     ← DUPLICADO
├── unified-cache-manager.js + unified-cache-manager/ ← DUPLICADO
├── graph/                              ← YA MIGRADO a layer-graph ✅
├── storage/                            ← Debería ir a layer-c
└── handlers/                           ← Revisar responsabilidad
```

### Cache Disperso (3 lugares)
```
src/layer-a-static/cache/               ← Unificar
src/core/unified-cache-manager/         ← Unificar  
src/shared/atomic-cache.js              ← Unificar (si existe)
```

### Storage Confuso
```
src/layer-a-static/storage/             ← Solo README
src/core/storage/                       ← Implementación real
→ MOVER TODO a src/layer-c-memory/storage/
```

### Query Mal Ubicado
```
src/layer-a-static/query/               ← No es análisis estático
→ MOVER a src/layer-c-memory/query/
```

### Issue Detectors en Layer B
```
src/layer-b-semantic/issue-detectors/   ← Detecta god-objects, orphans
→ MOVER a src/layer-a-static/analyses/tier3/
```

---

## 🟡 NUEVO - Code Physics (Propuesto)

### Fase 1: Métricas Base
```
☐ Calcular entropía por archivo
☐ Calcular salud (health score)
☐ Implementar límites configurables
☐ Dashboard de métricas
```

### Fase 2: Pesos Dinámicos
```
☐ WeightedNode class
☐ connectionStrength que cambia
☐ impactScore dinámico
☐ Propagación de cambios
```

### Fase 3: Auto-Reparación
```
☐ Detectar imports rotos
☐ Buscar en exportIndex
☐ Sugerir fixes
☐ Aplicar con aprobación
```

### Fase 4: Sociedades de Átomos
```
☐ Detectar cadenas (chains)
☐ Detectar clusters
☐ Calcular cohesión
☐ Calcular estabilidad
```

### Fase 5: Predicción
```
☐ Recolectar historia
☐ Analizar patrones
☐ Predecir cambios probables
☐ Sugerir preventivamente
```

---

## 📊 Resumen por Prioridad

### Alta Prioridad (Rompe funcionalidad)
| Issue | Impacto | Esfuerzo |
|-------|---------|----------|
| Duplicados en core/ | Confusión, bugs | 2h |
| Cache disperso | Performance, bugs | 4h |
| Storage en layer-a | Arquitectura | 2h |

### Media Prioridad (Mejora arquitectura)
| Issue | Impacto | Esfuerzo |
|-------|---------|----------|
| Query a layer-c | Claridad | 2h |
| Issue detectors a layer-a | Responsabilidad | 1h |
| Limpiar imports | Mantenibilidad | 3h |

### Baja Prioridad (Nuevas features)
| Feature | Impacto | Esfuerzo |
|---------|---------|----------|
| Entropía | Detección de problemas | 8h |
| Pesos dinámicos | Sistema vivo | 16h |
| Auto-reparación | Productividad | 24h |
| Sociedades | Insights | 16h |
| Predicción | Prevención | 24h |

---

## 🎯 Recomendación

### Sprint 1 (Esta semana)
1. Eliminar duplicados en `core/` (`.js` que re-exportan carpetas)
2. Unificar cache en `core/cache/`
3. Mover storage a `layer-c-memory/storage/`

### Sprint 2 (Próxima semana)
4. Mover query a layer-c
5. Mover issue-detectors a layer-a
6. Actualizar todos los imports

### Sprint 3 (Code Physics v1)
7. Implementar cálculo de entropía
8. Implementar health score
9. Agregar endpoint MCP para métricas

---

## 📈 Métricas Actuales

```
Archivos JS:         1183
Layers:              4 (Graph, A, B, C)
Extractores:         17
MCP Tools:           14
Tests Layer Graph:   75
Documentación:       3 docs nuevos
```
