# Guía de Herramientas MCP

**Versión**: v0.7.1  
**Total**: 14 herramientas  
**Endpoint**: `http://localhost:9999/tools/`

---

## Índice Rápido

| Categoría | Herramientas |
|-----------|--------------|
| **Atómicas** (funciones) | `get_function_details`, `get_atomic_functions` |
| **Moléculares** (archivos) | `get_impact_map`, `get_call_graph`, `analyze_change`, `analyze_signature_change`, `explain_value_flow`, `explain_connection`, `get_molecule_summary` |
| **Sistema** | `get_risk_assessment`, `search_files`, `get_server_status`, `restart_server`, `get_tunnel_vision_stats` |

---

## Herramientas Atómicas (Funciones)

### `get_function_details`

**Descripción**: Metadata completa de una función (átomo).

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/get_function_details \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/utils.js",
    "functionName": "processOrder"
  }'
```

**Retorna**:
```json
{
  "id": "src/utils.js::processOrder",
  "name": "processOrder",
  "dataFlow": { "inputs": [...], "transformations": [...], "outputs": [...] },
  "dna": { "structuralHash": "...", "flowType": "..." },
  "archetype": { "type": "read-transform-persist", "confidence": 0.85 },
  "ancestry": { "generation": 2, "vibrationScore": 0.73 }
}
```

---

### `get_atomic_functions`

**Descripción**: Lista todas las funciones de un archivo.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/get_atomic_functions \
  -d '{"filePath": "src/api.js"}'
```

---

## Herramientas Moléculares (Archivos)

### `get_impact_map` ⭐

**Descripción**: Mapa de archivos afectados si modificas uno.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/get_impact_map \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

**Retorna**:
```json
{
  "file": "src/core/orchestrator.js",
  "directlyAffects": ["src/cli/commands/consolidate.js"],
  "transitiveAffects": ["src/cli/index.js"],
  "semanticConnections": [{"type": "eventListener", "event": "job:progress"}],
  "totalAffected": 8,
  "riskLevel": "high"
}
```

**Cuándo usar**:
- ✅ Antes de editar CUALQUIER archivo
- ✅ Para estimar scope de cambio
- ✅ Para identificar god-objects

---

### `get_call_graph` ⭐

**Descripción**: Encuentra todos los sitios donde se llama una función.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/get_call_graph \
  -d '{
    "filePath": "src/api/users.js",
    "symbolName": "getUserById"
  }'
```

**Retorna**:
```json
[
  {
    "location": "src/controllers/user.js:42",
    "type": "direct call",
    "code": "const user = await getUserById(userId)",
    "calledFrom": "handleGetUser()"
  }
]
```

---

### `analyze_change`

**Descripción**: Análisis de impacto de cambiar un símbolo.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/analyze_change \
  -d '{
    "filePath": "src/api.js",
    "symbolName": "processOrder"
  }'
```

---

### `analyze_signature_change` ⭐

**Descripción**: Predice qué se rompe si cambias la firma de una función.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/analyze_signature_change \
  -d '{
    "filePath": "src/api/order.js",
    "functionName": "createOrder"
  }'
```

**Retorna**:
```json
{
  "currentSignature": "createOrder(userId, items, metadata = {})",
  "breakingChanges": [
    {
      "file": "src/controllers/order.js",
      "calls": "createOrder(u, i, m)",
      "error": "Missing required argument 'options'"
    }
  ],
  "riskLevel": "high"
}
```

---

### `explain_value_flow` ⭐

**Descripción**: Muestra el flujo completo de datos: inputs → process → outputs → consumers.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/explain_value_flow \
  -d '{
    "filePath": "src/utils/validator.js",
    "symbolName": "validateEmail"
  }'
```

**Retorna**:
```json
{
  "inputs": [{"name": "email", "type": "string"}],
  "processing": ["Trim", "Check length", "Validate domain"],
  "outputs": [{"valid": true, "errors": []}],
  "consumers": [
    {"file": "src/auth/register.js", "usages": 1},
    {"file": "src/auth/reset-password.js", "usages": 2}
  ],
  "totalImpact": "6 files, 15 functions"
}
```

---

### `explain_connection`

**Descripción**: Explica cómo dos archivos están conectados.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/explain_connection \
  -d '{
    "fileA": "src/api.js",
    "fileB": "src/db.js"
  }'
```

---

### `get_molecule_summary`

**Descripción**: Resumen molecular con insights derivados.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/get_molecule_summary \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

---

## Herramientas de Sistema

### `get_risk_assessment`

**Descripción**: Evaluación de riesgo del proyecto.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/get_risk_assessment \
  -d '{"minSeverity": "high"}'
```

---

### `search_files`

**Descripción**: Búsqueda de archivos.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/search_files \
  -d '{"pattern": "controller"}'
```

---

### `get_server_status`

**Descripción**: Estado del sistema.

**Uso**:
```bash
curl http://localhost:9999/tools/get_server_status
```

**Retorna**:
```json
{
  "initialized": true,
  "orchestrator": {
    "isRunning": true,
    "queue": {"size": 0, "active": 0}
  },
  "cache": {"totalFiles": 618}
}
```

---

### `restart_server`

**Descripción**: Reinicia el servidor.

**Uso**:
```bash
curl -X POST http://localhost:9999/tools/restart_server
```

---

## Debugging

### Ver logs
```bash
# Logs del servidor
tail -f logs/mcp-server.log

# Logs de análisis
tail -f logs/analysis.log
```

### Verificar tool específica
```bash
# Test rápido de una tool
curl -s http://localhost:9999/tools/get_server_status | jq
```

---

## Referencias

- [mcp-integration.md](./mcp-integration.md) - Integrar con IDEs
- [../03-orchestrator/README.md](../03-orchestrator/README.md) - Cómo funciona internamente
