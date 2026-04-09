# Plan de Limpieza - OmnySys

**Versión**: v0.9.61  
**Última actualización**: 2026-02-25  
**Estado**: ✅ **3 archivos refactorizados, 12 pendientes**

---

## 📊 Estado Actual

### Deuda Arquitectónica Total

| Tipo | Cantidad | Estado |
|------|----------|--------|
| **Archivos >250 líneas** | 15 | 🔴 En progreso |
| **God Functions** | 193 | 🔴 En progreso |
| **Dead Code** | 42 | ✅ 85% mejora |
| **Duplicados** | 118 exactos | 🔴 Pendiente |

---

## ✅ COMPLETADO - Refactorizaciones

### 1. audit-logger.js (269 → ~150 líneas, ⬇️ 44%)

**Archivo**: `src/layer-c-memory/shadow-registry/audit-logger.js`

**Problema**: 16 responsabilidades en un solo archivo

**Solución**: Split en 4 módulos

```
audit-logger/
├── decision-id-generator.js    # ID generation
├── decision-logger.js          # File I/O operations
├── decision-stats.js           # Statistics calculation
└── (main file)                 # Orchestrator class
```

**Estado**: ✅ COMPLETADO  
**Líneas ahorradas**: ~119 líneas

---

### 2. write-queue.js (313 → ~160 líneas, ⬇️ 49%)

**Archivo**: `src/layer-c-memory/storage/atoms/write-queue.js`

**Problema**: Cola de escritura con lógica embebida

**Solución**: Split en 3 módulos

```
write-queue/
├── queue-stats.js       # Statistics management
├── task-executor.js     # Task execution with EMFILE handling
└── (main file)          # Queue orchestration
```

**Estado**: ✅ COMPLETADO  
**Líneas ahorradas**: ~153 líneas

---

### 3. resolver.js (279 → ~117 líneas, ⬇️ 58%)

**Archivo**: `src/layer-a-static/resolver.js`

**Problema**: Resolver de imports con lógica de filesystem embebida

**Solución**: Split en 3 módulos

```
resolver/
├── resolver-fs.js          # File system utilities
├── resolver-aliases.js     # Alias configuration reading
└── (main file)             # Import resolution logic
```

**Estado**: ✅ COMPLETADO  
**Líneas ahorradas**: ~162 líneas

---

## 🔴 PENDIENTE - Próximas Refactorizaciones

### 4. extractJSON (complejidad 34, 73 líneas)

**Archivo**: `src/ai/llm/json-cleaners.js`

**Problema**: Función con parsing manual de JSON

**Solución Propuesta**:
```javascript
// Split en funciones más pequeñas
- findJsonStart(text)
- findJsonEnd(text, startIndex)
- validateBraces(text)
- extractJsonContent(text)
```

**Estado**: 🔴 PENDIENTE (LLM deprecated, prioridad baja)

---

### 5. enhanceSystemMap (complejidad 34, 118 líneas)

**Archivo**: `src/layer-a-static/pipeline/enhancers/legacy/system-map-enhancer.js`

**Problema**: Pipeline de enriquecimiento monolítico

**Solución Propuesta**:
```javascript
// Split por step del pipeline
- buildSourceCodeMap()
- detectSemanticConnections()
- calculateRiskScores()
- collectSemanticIssues()
```

**Estado**: 🔴 PENDIENTE (archivo legacy, prioridad media)

---

### 6. cleanLLMResponse (complejidad 31, 82 líneas)

**Archivo**: `src/utils/response-cleaner.js`

**Problema**: Limpieza de respuestas LLM

**Solución Propuesta**:
```javascript
// Split por tipo de limpieza
- removeMarkdownBlocks(text)
- removeComments(text)
- removeTrailingCommas(text)
- normalizeQuotes(text)
- extractJsonContent(text)
```

**Estado**: 🔴 PENDIENTE (LLM deprecated, prioridad baja)

---

### 7-15. Archivos de Test/Factory

**Archivos**:
- `tests/unit/layer-a-analysis/pipeline/molecular-chains/molecular-chains-test.factory.js` (1146 líneas)
- `tests/factories/cross-layer.factory.js` (263 líneas)
- `tests/factories/real/filesystem.factory.js` (263 líneas)
- `tests/unit/layer-a-analysis/extractors/data-flow/__factories__/data-flow-test.factory.js` (775 líneas)
- `src/layer-c-memory/mcp/tools/index.js` (616 líneas)
- `src/layer-a-static/preprocessor/context-model.js` (282 líneas)
- `src/layer-a-static/preprocessor/token-classifier.js` (292 líneas)
- `src/layer-c-memory/mcp/tools/get-atom-schema.js` (332 líneas)
- `src/layer-c-memory/storage/atoms/atom.js` (377 líneas)
- `src/layer-c-memory/storage/atoms/debounced-batch-writer.js` (290 líneas)
- `src/services/llm-service/handlers/response-handler.js` (271 líneas)
- `src/core/file-watcher/analyze.js` (403 líneas)

**Estado**: 🔴 PENDIENTE (archivos de test, prioridad baja)

---

## 📋 Criterios de Prioridad

### Alta Prioridad

- [ ] Archivos de producción >250 líneas
- [ ] God functions con complejidad >30
- [ ] Dead code real (no falsos positivos)

### Media Prioridad

- [ ] Archivos de test >500 líneas
- [ ] Duplicados exactos >10 líneas

### Baja Prioridad

- [ ] Archivos de test >250 líneas
- [ ] Duplicados <10 líneas
- [ ] Código deprecated (LLM)

---

## 🎯 Objetivos

### Corto Plazo (Q2 2026)

- [ ] Refactorizar 5 god functions restantes
- [ ] Consolidar 50% de duplicados
- [ ] Alcanzar 80% test coverage

### Mediano Plazo (Q3 2026)

- [ ] Eliminar TODA la deuda arquitectónica
- [ ] 100% test coverage
- [ ] 0 god functions

### Largo Plazo (Q4 2026)

- [ ] Mantener deuda <5 archivos
- [ ] God functions <10
- [ ] Duplicados <20

---

## 📈 Progreso

### Líneas Refactorizadas

```
Total deuda inicial:  ~4,000 líneas
Refactorizado:        ~434 líneas (11%)
Pendiente:            ~3,566 líneas (89%)
```

### Archivos Refactorizados

```
Total deuda inicial:  15 archivos
Refactorizados:       3 archivos (20%)
Pendientes:           12 archivos (80%)
```

---

## 🔧 Herramientas de Refactorización

### MCP Tools Disponibles

- `detect_patterns` - Detecta deuda arquitectónica
- `get_function_details` - Analiza funciones en detalle
- `get_call_graph` - Ve dependencias antes de editar
- `analyze_change` - Predice impacto de cambios
- `suggest_refactoring` - Sugiere mejoras

### Comandos Útiles

```bash
# Detectar deuda arquitectónica
curl -X POST http://localhost:9999/tools/detect_patterns \
  -H "Content-Type: application/json" \
  -d '{"patternType": "architectural-debt"}'

# Ver god functions
curl -X POST http://localhost:9999/tools/detect_patterns \
  -H "Content-Type: application/json" \
  -d '{"patternType": "god-functions"}'

# Sugerir refactoring
curl -X POST http://localhost:9999/tools/suggest_refactoring \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/file.js"}'
```

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ 3 archivos refactorizados, 12 pendientes  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
