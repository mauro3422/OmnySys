# Plan de Limpieza - Deuda Técnica

**Fecha**: 2026-02-18  
**Estado**: Fase 1 completada ✅  

---

## ✅ FASE 1 COMPLETADA

### Eliminado (5 min)

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

### Imports Actualizados

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `layer-c/mcp/.../cache-init-step.js` | `#core/unified-cache-manager.js` → `#core/unified-cache-manager/index.js` | ✅ |
| `layer-c/mcp/.../orchestrator-init-step.js` | `#core/orchestrator.js` → `#core/orchestrator/index.js` | ✅ |
| `tests/contracts/core/graph.contract.test.js` | `#core/graph/` → `#layer-graph/` | ✅ |

### Tests

- **546 tests pasando** ✅
- **11 archivos de test** ✅

---

## 📊 MAPA DE DEPENDENCIAS

```
core/storage/ usado por:
├── cli/commands/*.js (hasExistingAnalysis)
├── layer-a/query/*.js (getDataDirectory, loadAtoms)
├── layer-a/indexer.js (saveAtom)
├── layer-a/pipeline/*.js (saveAtom, savePartitionedSystemMap)
└── core/file-watcher/analyze.js (saveFileAnalysis)

core/unified-cache-manager/ usado por:
├── layer-a/indexer.js
└── layer-c/mcp/init/cache-init-step.js

core/orchestrator/ usado por:
└── layer-c/mcp/init/orchestrator-init-step.js
```

---

## 🎯 PLAN DE ACCIÓN

### Fase 1: Eliminar Basura (30 min)

```bash
# Eliminar wrappers (mantener carpetas)
rm src/core/orchestrator.js
rm src/core/file-watcher.js
rm src/core/unified-cache-manager.js
rm src/core/unified-server.js

# Eliminar placeholders vacíos
rm -rf src/core/handlers/
rm -rf src/layer-a-static/cache/
rm -rf src/layer-a-static/storage/

# Eliminar graph antiguo (ya migrado a layer-graph)
rm -rf src/core/graph/
```

### Fase 2: Unificar Tunnel Vision (30 min)

```bash
# Verificar cuál tiene más contenido
diff -r src/core/tunnel-vision-detector/ src/core/tunnel-vision-detectors/

# Unificar en uno (elegir el más completo)
# Mover todo a tunnel-vision-detector/ (singular)
```

### Fase 3: Mover Storage a Layer C (1 hora)

```bash
# Mover storage de core a layer-c
mv src/core/storage/ src/layer-c-memory/storage/

# Actualizar imports (16 archivos)
# De: '#core/storage/...'
# A:  '#layer-c/storage/...'
```

### Fase 4: Unificar Cache (1 hora)

Opción A: Mantener en core (más simple)
```
core/cache/
├── index.js           # unified-cache-manager/index.js
├── integration.js     # cache-integration.js
├── invalidator/       # cache-invalidator/
└── ...
```

Opción B: Crear Layer Cache (más arquitectura)
```
src/layer-cache/
├── index.js
├── manager/
├── integration/
└── invalidator/
```

---

## 📈 Resultado Esperado

### Antes
```
src/core/
├── orchestrator.js + orchestrator/     ← DUPLICADO
├── file-watcher.js + file-watcher/     ← DUPLICADO
├── unified-cache-manager.js + .../     ← DUPLICADO
├── unified-server.js + unified-server/ ← DUPLICADO
├── graph/                              ← MIGRADO
├── storage/                            ← MOVER
├── handlers/                           ← VACÍO
├── tunnel-vision-detector/             ← DUPLICADO
├── tunnel-vision-detectors/            ← DUPLICADO
└── ...

src/layer-a-static/
├── cache/                              ← VACÍO
├── storage/                            ← VACÍO (solo README)
└── ...
```

### Después
```
src/core/
├── orchestrator/           # Sin wrapper .js
├── file-watcher/           # Sin wrapper .js
├── cache/                  # Unificado
│   ├── manager/
│   ├── integration.js
│   └── invalidator/
├── unified-server/         # Sin wrapper .js
├── atomic-editor/          # Tools
├── batch-processor/
├── error-guardian/
├── tunnel-vision/          # Unificado
├── worker/
├── utils/
└── index.js

src/layer-c-memory/
├── storage/                # Movido de core
├── mcp/
├── shadow-registry/
└── ...

src/layer-a-static/
# Sin cache/ ni storage/
```

---

## ⚠️ RIESGOS

1. **Imports rotos**: 16+ archivos necesitan actualizar imports de storage
2. **Tests**: Los tests que importan desde `#core/storage` fallarán
3. **MCP Server**: Puede necesitar reinicio después de cambios

---

## ✅ CHECKLIST

- [ ] Fase 1: Eliminar basura
- [ ] Fase 2: Unificar tunnel-vision
- [ ] Fase 3: Mover storage a layer-c
- [ ] Fase 4: Unificar cache
- [ ] Actualizar imports
- [ ] Correr tests
- [ ] Verificar MCP server funciona
