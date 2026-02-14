# Backlog de Modularización v0.9.4+

**Fecha**: 2026-02-14  
**Estado**: En progreso - 204 módulos completados, ~25 archivos pendientes

---

## 📊 Resumen

| Métrica | Valor |
|---------|-------|
| **Módulos completados** | 204 |
| **Archivos grandes pendientes** | ~25 |
| **Líneas totales pendientes** | ~9,500 |
| **Prioridad ALTA** | 8 archivos |
| **Prioridad MEDIA** | 12 archivos |
| **Prioridad BAJA** | 5 archivos |

---

## 🔴 Prioridad ALTA (>400 líneas, no orquestadores)

### 1. `error-flow.js` (413 líneas)
**Ubicación**: `src/layer-a-static/extractors/metadata/error-flow.js`

**Descripción**: Mapeo de flujo de errores (throws/catches)

**Estrategia de modularización**:
```
error-flow/
├── analyzers/
│   ├── throw-analyzer.js       # Analiza throw statements
│   ├── catch-analyzer.js       # Analiza catch blocks
│   └── propagation-analyzer.js # Analiza propagación
├── mappers/
│   ├── error-mapper.js         # Mapea errores a handlers
│   └── unhandled-detector.js   # Detecta errores no manejados
├── index.js
└── ErrorFlowExtractor.js       # Orquestador (~100 líneas)
```

**Complejidad**: Media  
**Tiempo estimado**: 2-3 horas

---

### 2. `input-extractor.js` (408 líneas)
**Ubicación**: `src/layer-a-static/extractors/data-flow/visitors/input-extractor.js`

**Descripción**: Extrae inputs de funciones (parámetros)

**Estrategia de modularización**:
```
input-extractor/
├── extractors/
│   ├── param-extractor.js      # Extrae parámetros
│   ├── destructuring-extractor.js # Extrae destructuring
│   └── default-value-extractor.js # Extrae valores por defecto
├── analyzers/
│   ├── usage-analyzer.js       # Analiza uso de parámetros
│   └── mutation-analyzer.js    # Detecta mutaciones
├── index.js
└── InputExtractor.js
```

**Complejidad**: Baja  
**Tiempo estimado**: 1-2 horas

---

### 3. `redux-context-extractor.js` (398 líneas)
**Ubicación**: `src/layer-b-semantic/redux-context-extractor.js`

**Descripción**: Extrae información de Redux y React Context

**Estrategia de modularización**:
```
redux-context-extractor/
├── redux/
│   ├── action-extractor.js     # Extrae actions
│   ├── reducer-extractor.js    # Extrae reducers
│   ├── selector-extractor.js   # Extrae selectors
│   └── store-extractor.js      # Extrae store configuration
├── context/
│   ├── provider-extractor.js   # Extrae providers
│   ├── consumer-extractor.js   # Extrae consumers
│   └── hook-extractor.js       # Extrae useContext hooks
├── index.js
└── ReduxContextExtractor.js
```

**Complejidad**: Media-Alta  
**Tiempo estimado**: 3-4 horas

---

### 4. `PROMPT_REGISTRY.js` (384 líneas)
**Ubicación**: `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js`

**Descripción**: Registro de prompts para LLM

**Estrategia de modularización**:
```
prompt-registry/
├── prompts/
│   ├── analysis-prompts.js     # Prompts de análisis
│   ├── detection-prompts.js    # Prompts de detección
│   ├── explanation-prompts.js  # Prompts de explicación
│   └── refactoring-prompts.js  # Prompts de refactorización
├── builders/
│   ├── prompt-builder.js       # Constructor de prompts
│   ├── context-builder.js      # Constructor de contexto
│   └── template-engine.js      # Motor de templates
├── index.js
└── PromptRegistry.js
```

**Complejidad**: Baja  
**Tiempo estimado**: 1-2 horas

---

## 🟡 Prioridad MEDIA (350-400 líneas)

### 5. `atomic-tools.js` (383 líneas)
**Ubicación**: `src/core/unified-server/tools/atomic-tools.js`

**Descripción**: Herramientas MCP para análisis atómico

**Estrategia**:
```
atomic-tools/
├── tools/
│   ├── get-function-details.js
│   ├── get-atomic-functions.js
│   └── analyze-function-change.js
├── formatters/
│   └── response-formatter.js
└── index.js
```

---

### 6. `enhance.js` (381 líneas)
**Ubicación**: `src/layer-a-static/pipeline/enhance.js`

**Descripción**: Pipeline de enriquecimiento de metadata

**Estrategia**:
```
pipeline/enhance/
├── phases/
│   ├── extraction-phase.js
│   ├── analysis-phase.js
│   └── enrichment-phase.js
├── index.js
└── EnhancePipeline.js
```

---

### 7. `integrity-validator.js` (379 líneas)
**Ubicación**: `src/layer-c-memory/verification/validators/integrity-validator.js`

**Descripción**: Validador de integridad de datos

**Estrategia**:
```
integrity-validator/
├── validators/
│   ├── checksum-validator.js
│   ├── consistency-validator.js
│   └── schema-validator.js
├── index.js
└── IntegrityValidator.js
```

---

### 8. `rule-registry.js` (378 líneas)
**Ubicación**: `src/validation/core/rule-registry.js`

**Descripción**: Registro de reglas de validación

**Estrategia**:
```
validation/rule-registry/
├── rules/
│   ├── syntax-rules.js
│   ├── semantic-rules.js
│   └── style-rules.js
├── registry/
│   ├── rule-loader.js
│   └── rule-cache.js
└── index.js
```

---

### 9. `invariant-detector.js` (376 líneas)
**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/analyzers/invariant-detector.js`

**Descripción**: Detecta invariantes en código (⚠️ stub parcial)

**Estrategia**:
```
invariant-detector/
├── detectors/
│   ├── type-invariant-detector.js
│   ├── range-invariant-detector.js
│   └── null-safety-detector.js
├── index.js
└── InvariantDetector.js
```

---

### 10. `storage-manager.js` (365 líneas)
**Ubicación**: `src/layer-a-static/storage/storage-manager.js`

**Descripción**: Gestión de almacenamiento (FileSystem, etc.)

**Estrategia**:
```
storage/
├── adapters/
│   ├── filesystem-adapter.js
│   ├── memory-adapter.js
│   └── cache-adapter.js
├── managers/
│   ├── read-manager.js
│   ├── write-manager.js
│   └── sync-manager.js
└── index.js
```

---

### 11. `typescript-extractor.js` (363 líneas)
**Ubicación**: `src/layer-a-static/extractors/typescript-extractor.js`

**Descripción**: Extracción de tipos TypeScript

**Estrategia**:
```
typescript-extractor/
├── extractors/
│   ├── interface-extractor.js
│   ├── type-alias-extractor.js
│   ├── generic-extractor.js
│   └── decorator-extractor.js
├── index.js
└── TypeScriptExtractor.js
```

---

### 12. `lifecycle.js` (362 líneas)
**Ubicación**: `src/core/orchestrator/lifecycle.js`

**Descripción**: Gestión del ciclo de vida del orchestrator

**Estrategia**:
```
orchestrator/lifecycle/
├── phases/
│   ├── init-phase.js
│   ├── execution-phase.js
│   └── cleanup-phase.js
├── hooks/
│   ├── pre-execution-hook.js
│   └── post-execution-hook.js
└── index.js
```

---

## 🟢 Prioridad BAJA (Orquestadores grandes pero estables)

Estos son archivos grandes pero que son **orquestadores naturales** - su trabajo es coordinar módulos ya existentes. Podrían beneficiarse de refactorización, pero no es crítico:

| Archivo | Líneas | Justificación |
|---------|--------|---------------|
| `LLMService.js` | 634 | Orquestador de 4 providers + caché + handlers |
| `AtomicEditor.js` | 494 | Orquestador de 4 operaciones + history |
| `ComprehensiveExtractor.js` | 451 | Orquestador de 4 extractores |
| `TemporalConnectionExtractor.js` | 431 | Orquestador de 4 detectors |
| `ast-parser.js` | 421 | Parser complejo con muchos casos edge |

---

## 📋 Plan de Ejecución Recomendado

### Semana 1 (Prioridad ALTA)
- [ ] `input-extractor.js` → 2 horas
- [ ] `PROMPT_REGISTRY.js` → 2 horas
- [ ] `error-flow.js` → 3 horas

### Semana 2 (Prioridad ALTA + MEDIA)
- [ ] `redux-context-extractor.js` → 4 horas
- [ ] `atomic-tools.js` → 2 horas
- [ ] `enhance.js` → 2 horas

### Semana 3 (Prioridad MEDIA)
- [ ] `integrity-validator.js` → 2 horas
- [ ] `rule-registry.js` → 2 horas
- [ ] `invariant-detector.js` → 3 horas

**Total estimado**: ~20-25 horas de trabajo

---

## 🎯 Resultado Esperado

Después de completar este backlog:

| Métrica | Antes | Después |
|---------|-------|---------|
| **Módulos totales** | 204 | ~280 |
| **Archivos >300 líneas** | 25 | ~5 (orquestadores legítimos) |
| **Líneas promedio/archivo** | ~100 | ~80 |
| **Testeabilidad** | Media | Alta |

---

**Última actualización**: 2026-02-14
