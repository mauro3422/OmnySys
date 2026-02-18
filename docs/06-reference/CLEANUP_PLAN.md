# Plan de Limpieza - Deuda Técnica

**Fecha**: 2026-02-18  
**Estado**: Fase 5 completada ✅  

---

## ✅ FASE 1: Eliminar Wrappers y Vacíos

| Qué | Acción | Estado |
|-----|--------|--------|
| `core/orchestrator.js` | Wrapper eliminado | ✅ |
| `core/file-watcher.js` | Wrapper eliminado | ✅ |
| `core/unified-cache-manager.js` | Wrapper eliminado | ✅ |
| `core/unified-server.js` | Wrapper eliminado | ✅ |
| `core/graph/` | Migrado a layer-graph | ✅ |
| `core/handlers/` | Vacío, eliminado | ✅ |
| `layer-a-static/cache/` | Vacío, eliminado | ✅ |
| `layer-a-static/storage/` | Vacío, eliminado | ✅ |
| `core/tunnel-vision-detectors/` | Vacío, eliminado | ✅ |

---

## ✅ FASE 2: Mover Storage a Layer C

| Qué | Desde | Hasta | Estado |
|-----|-------|-------|--------|
| Storage | `core/storage/` | `layer-c-memory/storage/` | ✅ |
| Imports actualizados | 16 archivos | - | ✅ |

---

## ✅ FASE 3: Mover Query a Layer C

| Qué | Desde | Hasta | Estado |
|-----|-------|-------|--------|
| Query APIs | `layer-a-static/query/` | `layer-c-memory/query/` | ✅ |
| Imports actualizados | 38+ archivos | - | ✅ |

**Razón**: Query es exposición de datos, no análisis estático → Layer C

---

## ✅ FASE 4: Unificar Cache en Core

| Qué | Desde | Hasta | Estado |
|-----|-------|-------|--------|
| Cache Manager | `core/unified-cache-manager/` | `core/cache/manager/` | ✅ |
| Cache Integration | `core/cache-integration.js` | `core/cache/integration.js` | ✅ |
| Cache Invalidator | `core/cache-invalidator/` | `core/cache/invalidator/` | ✅ |

**Razón**: Cache es transversal, usado por todas las capas → Core

---

## ✅ FASE 5: Mover Issue Detectors a Layer A

| Qué | Desde | Hasta | Estado |
|-----|-------|-------|--------|
| Issue Detectors | `layer-b-semantic/issue-detectors/` | `layer-a-static/analyses/tier3/issue-detectors/` | ✅ |
| Test files movidos | `tests/unit/layer-b-semantic/issue-detectors/` | `tests/unit/layer-a-static/analyses/tier3/issue-detectors/` | ✅ |
| Imports actualizados | 12 archivos | - | ✅ |

**Razón**: Issue detectors detectan patrones estáticos (orphans, unhandled events, dead state) → Layer A Tier 3

---

## 📊 ARQUITECTURA FINAL

```
src/
├── layer-graph/              # Nivel 0: Grafo matemático
│   ├── algorithms/
│   ├── builders/
│   ├── query/
│   └── persistence/
│
├── layer-a-static/           # Nivel 1: Análisis estático
│   ├── analyses/
│   │   ├── tier1/           # Detección básica
│   │   ├── tier2/           # Análisis intermedio
│   │   └── tier3/           # Detección avanzada
│   │       ├── detectors/
│   │       └── issue-detectors/  ← MOVIDO AQUÍ
│   ├── extractors/
│   ├── parser/
│   ├── pipeline/
│   └── scanner/
│
├── layer-b-semantic/         # Nivel 2: Análisis semántico
│   ├── llm-analyzer/
│   ├── metadata-contract/
│   ├── prompt-engine/
│   └── validators/
│
├── layer-c-memory/           # Nivel 3: Memoria y exposición
│   ├── storage/             ← MOVIDO DE core/
│   ├── query/               ← MOVIDO DE layer-a-static/
│   ├── mcp/
│   └── shadow-registry/
│
└── core/                     # Transversal
    ├── orchestrator/
    ├── file-watcher/
    ├── cache/               ← UNIFICADO
    │   ├── manager/
    │   ├── integration.js
    │   └── invalidator/
    ├── unified-server/
    └── ...
```

---

## 📈 RESULTADO

### Tests
- **3852+ tests pasando** ✅
- **Todos los issue-detectors tests pasando** ✅

### Commits
1. `457a213` - Create Layer Graph + cleanup technical debt
2. `8f7f6ab` - Move storage from core to layer-c-memory
3. `ada31ea` - Move query from layer-a to layer-c-memory
4. `bb29645` - Unify cache in core/cache/
5. *(pendiente)* - Move issue-detectors to layer-a

---

## ⚠️ LECCIONES APRENDIDAS

1. **Query no es Layer A**: Exponer datos ≠ analizar estáticamente
2. **Cache es transversal**: Todas las capas lo usan → Core
3. **Issue Detectors son análisis estático**: Detectan patrones sin ejecutar código → Layer A
4. **Storage es persistencia**: Pertenece a Layer C (memoria/datos)

---

## ✅ CHECKLIST FINAL

- [x] Fase 1: Eliminar wrappers y vacíos
- [x] Fase 2: Mover storage a layer-c
- [x] Fase 3: Mover query a layer-c  
- [x] Fase 4: Unificar cache en core
- [x] Fase 5: Mover issue-detectors a layer-a
- [x] Actualizar todos los imports
- [x] Correr tests (3852+ pasando)
- [ ] Commit final
