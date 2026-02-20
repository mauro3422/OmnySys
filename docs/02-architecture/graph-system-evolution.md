# Graph System Evolution - v0.9.36+

## 📊 Estado Actual del Sistema

### Datos Disponibles

| Tipo | Cantidad | Descripción |
|------|----------|-------------|
| Átomos | 5,842 | Funciones extraídas con metadata completa |
| Archivos | 1,733 | Código fuente analizado |
| Conexiones calledBy | 2,437 | Relaciones caller→callee |
| Conexiones calls | 3,907 | Relaciones callee→caller |
| Event handlers | 45 | Con 187 eventos detectados |
| Data transforms | 3,732 | Operaciones de transformación |

### Purpose Distribution

```
📤 API_EXPORT:     2,065 (35.4%) - Funciones exportadas, API pública
🧪 TEST_HELPER:    1,738 (29.9%) - Funciones en archivos de test
📦 CLASS_METHOD:   1,534 (26.4%) - Métodos de clase (llamados dinámicamente)
💀 DEAD_CODE:        363 (6.2%)  - Sin evidencia de uso
🚀 SCRIPT_MAIN:      116 (2.0%)  - Entry points de scripts
⏱️ TIMER_ASYNC:       19 (0.3%)  - Callbacks de timers
⚡ EVENT_HANDLER:      7 (0.1%)  - Manejadores de eventos
```

### Archetype Distribution

```
class-method:      2,481 (42.5%) - Métodos de clase
utility:           1,307 (22.4%) - Funciones puras, sin side effects
private-utility:   1,008 (17.3%) - Helpers internos no exportados
standard:            878 (15.1%) - Funciones normales
dead-function:       137 (2.3%)  - Código potencialmente muerto
fragile-network:      31 (0.5%)  - Código con patrones frágiles de red
```

### Hubs (Nodos con más callers)

| Método | Callers | Purpose | Tipo |
|--------|---------|---------|------|
| `has` | 192 | API_EXPORT | Map/Set method |
| `set` | 189 | API_EXPORT | Map/Set method |
| `get` | 177 | API_EXPORT | Map/Set method |
| `readFile` | 117 | TEST_HELPER | FS method |
| `add` | 110 | API_EXPORT | Collection method |

---

## 🎯 Propuestas de Mejora

### 1. Grafo Estratificado por Purpose

**Concepto**: Separar el grafo en capas según el propósito del átomo.

```
┌─────────────────────────────────────────────────┐
│           LAYER 0: ENTRY POINTS                  │
│     (SCRIPT_MAIN, EVENT_HANDLER)                │
└─────────────────────┬───────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────┐
│           LAYER 1: API SURFACE                   │
│              (API_EXPORT)                        │
│     Funciones públicas, interface externa       │
└─────────────────────┬───────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────┐
│         LAYER 2: IMPLEMENTATION                  │
│           (CLASS_METHOD)                         │
│     Métodos de clase, lógica interna            │
└─────────────────────┬───────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────┐
│           LAYER 3: UTILITIES                     │
│       (UTILITY, PRIVATE_UTILITY)                 │
│     Helpers, funciones puras                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         PARALLEL: TEST GRAPH                     │
│           (TEST_HELPER)                          │
│     Grafo aislado, no afecta producción         │
└─────────────────────────────────────────────────┘
```

**Beneficios**:
- Análisis de impacto más preciso
- Dead code detection por capa
- Visualización más clara

### 2. Event Graph

**Concepto**: Nodos de eventos conectando emisores y receptores.

```
EventEmitter.emit('data')  ───►  EventEmitter.on('data', handler)
                                       │
                                       ▼
                                 handler_function()
```

**Datos disponibles**:
- 45 event handlers detectados
- 187 eventos `EventEmitter.on`
- 6 eventos `addEventListener`
- 7 eventos React

**Implementación**:
```javascript
// Event Graph Node
{
  type: 'event',
  name: 'data',
  emitter: 'EventEmitter',
  handlers: ['handler1', 'handler2'],
  line: 42,
  file: 'src/stream.js'
}

// Event Graph Edge
{
  type: 'emits',
  from: 'emit_function',
  to: 'event:data',
  line: 38
}
{
  type: 'handles', 
  from: 'event:data',
  to: 'handler_function',
  line: 42
}
```

### 3. Data Flow Graph

**Concepto**: Grafo de transformaciones de datos.

```
input(data) → transform1 → transform2 → output(result)
```

**Operaciones detectadas**:
- `function_call`: 2,782 (llamadas a funciones)
- `assignment`: 2,208 (asignaciones)
- `mutation`: 2,004 (mutaciones de estado)
- `property_access`: 1,389 (acceso a propiedades)
- `binary_operation`: 1,180 (operaciones binarias)

**Pipeline Detection**:
```javascript
// Detectar cadenas de transformación
input → op1 → intermediate → op2 → output

// Ejemplo real:
params → parseJSON → validate → transform → saveToDB
```

### 4. Weighted Edges

**Concepto**: Ponderar conexiones por importancia.

| Factor | Peso | Criterio |
|--------|------|----------|
| Call Frequency | +0.1 per call | Número de veces que se llama |
| Archetype Severity | +0.5 | Si es hot-path o fragile-network |
| Export Status | +0.3 | Si es parte de API pública |
| Test Coverage | +0.2 | Si tiene tests |
| Complexity | -0.1 per 10 LOC | Funciones muy largas penalizan |

### 5. Automatic Clustering

**Concepto**: Agrupar átomos relacionados en clusters.

**Por archivo** (módulos cohesivos):
```
src/layer-a-static/indexer.js
  └── cluster: indexer
      ├── indexProject() [API_EXPORT]
      ├── findTargetAtom() [INTERNAL_HELPER]
      └── buildLookup() [INTERNAL_HELPER]
```

**Por purpose + archetype**:
```
TEST_HELPER:class-method (1,471 atoms)
  └── Cluster de test factories
API_EXPORT:utility (1,307 atoms)  
  └── Cluster de utilidades públicas
```

---

## 🔧 Implementación Recomendada

### Fase 1: Separación por Purpose

1. Modificar `buildCallGraph()` para filtrar por purpose
2. Crear `GraphBuilder` con estrategia de capas
3. Generar subgrafos: `api-graph.json`, `test-graph.json`

### Fase 2: Event Graph

1. Extraer eventos de `temporal.patterns.events`
2. Crear nodos tipo `event`
3. Conectar emit → event → handlers

### Fase 3: Data Flow

1. Usar `dataFlow.transformations` existente
2. Detectar pipelines automáticamente
3. Identificar data sources y sinks

### Fase 4: Weighted Graph

1. Calcular pesos en `buildSystemGraph()`
2. Almacenar en edges como `weight: 0.8`
3. Usar en análisis de impacto

---

## 📁 Archivos del Sistema Actual

```
src/layer-graph/
├── builders/
│   └── graph-builder.js      # Construye el grafo principal
├── query/
│   └── graph-query.js        # Consultas al grafo
└── index.js

.omnysysdata/
├── system-map.json           # Grafo principal (archivos)
├── system-map-enhanced.json  # Con metadata semántica
└── atoms/                    # Átomos individuales
```

---

## 📊 Métricas Objetivo

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| CalledBy coverage | 41.7% | 90%+ (con purpose) |
| False dead code | 85% | <15% |
| Event detection | 45 handlers | 100% coverage |
| Data flow | 64% atoms | 95% atoms |

---

## Próximos Pasos

1. ✅ Documentar hallazgos (este documento)
2. ✅ Revisar sistema de grafos actual
3. ✅ Implementar separación por purpose
4. ✅ Agregar event nodes (`event-graph.js`)
5. ✅ Weighted edges (`function-links.js`)
6. ✅ Tests de validación
7. ✅ Clustering (`cluster-builder.js`)

---

## Implementación Completada

| Feature | Archivo | Estado |
|---------|---------|--------|
| Purpose Detection | `metadata/purpose.js` | ✅ |
| Weighted Edges | `function-links.js` | ✅ |
| Event Graph | `builders/event-graph.js` | ✅ |
| Clustering | `builders/cluster-builder.js` | ✅ |
| Types Extended | `core/types.js` | ✅ |

---

*Documento creado: 2026-02-20*
*Versión: 0.9.36*
*Actualizado: Completado*
