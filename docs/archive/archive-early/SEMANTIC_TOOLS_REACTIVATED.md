# 🚀 Herramientas Semánticas Reactivadas

## Resumen de Cambios

### 1. Nueva Clase Base: `SemanticQueryTool`

**Archivo**: `src/layer-c-memory/mcp/tools/semantic/semantic-query-tool.js`

Extiende `GraphQueryTool` con métodos reutilizables para consultar datos semánticos de SQLite:

- `getRaceConditions(options)` - Race conditions (shared state + async)
- `getEventPatterns(options)` - Patrones de eventos (emitters/listeners)
- `getAsyncAnalysis(options)` - Análisis de funciones asíncronas
- `getAtomSociety(options)` - Conexiones semánticas entre archivos

**Características**:
- ✅ Todas las consultas usan SQLite (cero AST parsing en tiempo real)
- ✅ Paginación incluida (offset, limit, hasMore)
- ✅ Cálculo de severidad para race conditions
- ✅ Filtros opcionales (scopeType, asyncOnly, minSeverity, etc.)

---

### 2. `aggregate_metrics` - Funcionalidades Reactivadas

**Archivo**: `src/layer-c-memory/mcp/tools/aggregate-metrics.js`

Ahora extiende `SemanticQueryTool` y las siguientes funcionalidades deprecated **AHORA FUNCIONAN**:

| aggregationType | Qué devuelve | Opciones |
|----------------|--------------|----------|
| `race_conditions` | Átomos con shared state + async | `offset`, `limit`, `scopeType`, `asyncOnly`, `minSeverity` |
| `patterns` | Átomos con event emitters/listeners | `offset`, `limit`, `patternType` (emitters/listeners/all) |
| `async_analysis` | Funciones asíncronas | `offset`, `limit`, `withNetworkCalls`, `withErrorHandling` |
| `society` | Conexiones semánticas | `offset`, `limit`, `connectionType`, `filePath` |

**Ejemplo de uso**:
```javascript
// Obtener race conditions
aggregate_metrics({
  aggregationType: 'race_conditions',
  options: { limit: 20, offset: 0, asyncOnly: true, minSeverity: 5 }
})

// Obtener patrones de eventos
aggregate_metrics({
  aggregationType: 'patterns',
  options: { limit: 20, patternType: 'emitters' }
})
```

---

### 3. `query_graph` - Parámetro `includeSemantic`

**Archivo**: `src/layer-c-memory/mcp/tools/query-graph.js`

Ahora extiende `SemanticQueryTool` y acepta `options.includeSemantic`:

```javascript
// Obtener instancias con datos semánticos
query_graph({
  queryType: 'instances',
  symbolName: 'processOrder',
  options: { includeSemantic: true }
})
```

**Datos semánticos incluidos**:
- `sharedStateAccess[]` - Accesos a shared state
- `eventEmitters[]` - Emisores de eventos
- `eventListeners[]` - Listeners de eventos
- `isAsync` - Es asíncrona
- `scopeType` - Scope (global, closure, module)
- `hasNetworkCalls` - Tiene llamadas de red
- `hasErrorHandling` - Tiene manejo de errores

---

### 4. `traverse_graph` - Parámetro `includeSemantic`

**Archivo**: `src/layer-c-memory/mcp/tools/traverse-graph.js`

Ahora extiende `SemanticQueryTool` y acepta `options.includeSemantic`:

```javascript
// Obtener impact map con datos semánticos
traverse_graph({
  traverseType: 'impact_map',
  filePath: 'src/file.js',
  options: { includeSemantic: true }
})
```

**Para `impact_map`**:
- `semanticSummary.hasSharedState` - Tiene shared state
- `semanticSummary.hasEvents` - Tiene eventos
- `semanticSummary.sharedStateReads[]` - Lecturas de shared state
- `semanticSummary.sharedStateWrites[]` - Escrituras de shared state
- `semanticSummary.eventEmitters[]` - Emisores
- `semanticSummary.eventListeners[]` - Listeners

**Para `call_graph`**:
- Cada nodo del grafo se enriquece con:
  - `semantic.hasSharedState`
  - `semantic.hasEvents`
  - `semantic.asyncCount`
  - `semantic.totalAtoms`

---

### 5. Documentación Actualizada

**Archivo**: `src/layer-c-memory/mcp/tools/index.js`

Se actualizaron las descripciones de las herramientas para incluir las nuevas opciones:
- `includeSemantic` en `query_graph` y `traverse_graph`
- Opciones de paginación y filtrado en `aggregate_metrics`

---

## 📊 Datos Subyacentes

Todas estas funcionalidades consultan datos **YA EXISTENTES** en SQLite:

### Tabla `atoms`:
- `shared_state_json` - sharedStateAccess[]
- `event_emitters_json` - eventEmitters[]
- `event_listeners_json` - eventListeners[]
- `scope_type` - scopeType
- `is_async` - isAsync
- `has_network_calls` - hasNetworkCalls
- `has_error_handling` - hasErrorHandling

### Tabla `semantic_connections`:
- Todas las conexiones semánticas entre archivos

### Tabla `risk_assessments`:
- `shared_state_count` - Cantidad de shared state connections

---

## 🎯 Beneficios

1. **Cero AST parsing en tiempo real** - Todo viene de SQLite
2. **Paginación incluida** - offset/limit en todas las consultas
3. **Datos ricos** - Shared state, eventos, async, etc.
4. **Reutilizable** - `SemanticQueryTool` es una base para futuras herramientas
5. **Backward compatible** - Las opciones son opcionales, no rompen código existente

---

## 🧪 Pruebas

```javascript
// 1. Race conditions
aggregate_metrics({ aggregationType: 'race_conditions', options: { limit: 10 } })

// 2. Patrones de eventos
aggregate_metrics({ aggregationType: 'patterns', options: { patternType: 'listeners' } })

// 3. Análisis asíncrono
aggregate_metrics({ aggregationType: 'async_analysis', options: { withNetworkCalls: true } })

// 4. Conexiones semánticas
aggregate_metrics({ aggregationType: 'society', options: { connectionType: 'shared_state' } })

// 5. Query con datos semánticos
query_graph({ queryType: 'instances', symbolName: 'foo', options: { includeSemantic: true } })

// 6. Impact map con datos semánticos
traverse_graph({ traverseType: 'impact_map', filePath: 'src/file.js', options: { includeSemantic: true } })
```

---

## 📁 Archivos Creados/Modificados

### Creados:
- `src/layer-c-memory/mcp/tools/semantic/semantic-query-tool.js`
- `src/layer-c-memory/mcp/tools/semantic/index.js`

### Modificados:
- `src/layer-c-memory/mcp/tools/aggregate-metrics.js`
- `src/layer-c-memory/mcp/tools/query-graph.js`
- `src/layer-c-memory/mcp/tools/traverse-graph.js`
- `src/layer-c-memory/mcp/tools/index.js`

---

## 🔄 Reinicio Requerido

Para cargar los cambios, reiniciar el servidor MCP:

```bash
# Opción 1: Restart completo
npm run mcp

# Opción 2: HTTP server
npm run mcp:http
```
