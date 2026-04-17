# OpenCODE - Guía de Uso MCP OmnySys

## ⚠️ IMPORTANTE: SIEMPRE USAR NODE SHELL HELPER

> El protocolo MCP de opencode tiene problemas de timeout. **NUNCA usar las tools MCP directamente en opencode**.
> Siempre ejecutar los comandos con `node src/shells/mcp-shell-helper.js ...`

---

## 🚀 Shell Helper (Método Principal)

> **Este es el método recomendado** cuando el MCP de opencode falla.

### Ubicación
```
src/shells/mcp-shell-helper.js
```

### Comandos Rápidos

```bash
# Lista todas las tools disponibles
node src/shells/mcp-shell-helper.js list

# Ver estado del servidor
node src/shells/mcp-shell-helper.js status

# Panel de salud
node src/shells/mcp-shell-helper.js health

# Debt técnico
node src/shells/mcp-shell-helper.js debt
```

### Cómo Usar con Args

```bash
# Buscar un símbolo
node src/shells/mcp-shell-helper.js query_graph --queryType instances --symbolName atomic_edit

# Ver schema de atoms
node src/shells/mcp-shell-helper.js schema --type atoms

# Ver impacto de un átomo
node src/shells/mcp-shell-helper.js impact_atomic --symbolName atomic_edit

# Métricas de salud
node src/shells/mcp-shell-helper.js aggregate_metrics --aggregationType health

# Traversar impacto
node src/shells/mcp-shell-helper.js traverse_graph --filePath src/core/file.js --traverseType impact_map
```

### Shortcuts Disponibles

| Comando | Descripción |
|---------|-------------|
| `list` |.Listar las 47 tools disponibles |
| `status` | Estado del servidor MCP |
| `health` | Panel de salud del sistema |
| `schema` | Schema de atoms (stats) |
| `debt` | Reporte de deuda técnica |
| `modules` | Inventario de módulos |

### Errores Comunes

| Error | Solución |
|-------|----------|
| `ECONNREFUSED` | Verificar que el servidor MCP está corriendo en puerto 9999 |
| `SESSION_EXPIRED` | El shell helper re-inicializa automáticamente |
| `Parse error` | Usar `--key value` en lugar de JSON texto |

---

## 📋 Método Manual (curl)

### Paso 1: Verificar que el servidor está corriendo
```bash
curl.exe -s http://localhost:9999/health
```
Debe responder con `"status":"healthy"`

### Paso 2: Inicializar sesión MCP
```bash
# Este comando devuelve el session ID en los headers
curl.exe -s -i http://localhost:9999/mcp -X POST -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"opencode\",\"version\":\"1.0.0\"}},\"id\":1}"
```

Del response, copiar el valor del header `mcp-session-id:` (ej: `da652378-60e0-4283-b4ac-712ebed0c1c8`)

### Paso 3: Usar tools con el session ID
```bash
# Reemplazar SESSION_ID con el valor obtenido arriba
curl.exe -s http://localhost:9999/mcp -X POST -H "Content-Type: application/json" -H "mcp-session-id: SESSION_ID" -d "@request.json"
```

---

## 📋 Comandos Útiles por Shell

### Health check
```bash
curl.exe -s http://localhost:9999/health
```

### Listar tools disponibles
```bash
# 1. Initialize y guardar session ID
curl.exe -s -i http://localhost:9999/mcp -X POST -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"opencode\",\"version\":\"1.0.0\"}},\"id\":1}"

# 2. tools/list (usar session ID del paso anterior)
curl.exe -s http://localhost:9999/mcp -X POST -H "Content-Type: application/json" -H "mcp-session-id: TU_SESSION_ID" -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/list\",\"params\":{},\"id\":2}"
```

### Query graph (buscar símbolos)
```bash
curl.exe -s http://localhost:9999/mcp -X POST -H "Content-Type: application/json" -H "mcp-session-id: TU_SESSION_ID" -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"mcp_omnysystem_query_graph\",\"arguments\":{\"queryType\":\"instances\",\"symbolName\":\"miFuncion\"}},\"id\":3}"
```

### Get server status
```bash
curl.exe -s http://localhost:9999/mcp -X POST -H "Content-Type: application/json" -H "mcp-session-id: TU_SESSION_ID" -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"mcp_omnysystem_get_server_status\",\"arguments\":{}},\"id\":4}"
```

---

## 🔧 Solución de Problemas

### "Parse error: invalid JSON payload"
- El body del JSON está malformado
- Usar archivo: `curl ... -d @request.json`

### "Bad Request: invalid or missing MCP session"
- Sesión expirada o no inicializada
- Repetir desde Paso 2

### "Server not initialized"
- El servidor aún está inicializando
- Esperar y verificar con health check

### Timeout (-32001)
- Configurar en opencode.json global:
```json
{
  "experimental": {
    "mcp_timeout": 1200000
  }
}
```

---

## 📁 Archivos de Request de Ejemplo

Guardar requests en archivos `.json` para evitar problemas de encoding:

```json
// request.json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"mcp_omnysystem_query_graph","arguments":{"queryType":"instances","symbolName":"miFuncion"}},"id":1}
```

Luego ejecutar:
```bash
curl.exe -s http://localhost:9999/mcp -X POST -H "Content-Type: application/json" -H "mcp-session-id: TU_SESSION_ID" -d @request.json
```

---

## 🤖 Script Automático (Fallback)

Si preferís no liarte con headers, usá el script helper:

```bash
node src/shells/mcp-shell-helper.js mcp_omnysystem_get_server_status '{}'
```

Argumentos en JSON:
```bash
node src/shells/mcp-shell-helper.js mcp_omnysystem_query_graph '{"queryType":"instances","symbolName":"atomic_edit"}'
```

---

## 🎯 Tips

1. **Siempre guardar el session ID** - Se necesita para cada request
2. **El session ID va en header** `mcp-session-id`, NO en cookies
3. **El servidor es rápido** - Si tarda >5s, está ocupado o caído
4. **47 tools disponibles** - consultar con tools/list
5. **Revisar `_recentErrors`** - Toda response incluye alertas del watcher

---

## 🚨 Alertas del Watcher (_recentErrors)

Toda respuesta MCP incluye un objeto `_recentErrors` con alertas del sistema de vigilancia.

### Tipos de Alertas

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| `arch_impact_high` | HIGH | Impacto alto - cambiar esto puede romper callers |
| `code_duplicate_unified_critical_high` | CRITICAL | Mismos símbolos tienen duplicates estructurales Y conceptuales |
| `code_duplicate_unified_high` | HIGH | Duplicates estructurales - usar atomic_edit |
| `code_conceptual_duplicate_medium` | MEDIUM | Duplicates semánticos - consolidar a SSOT |
| `arch_policy_drift_medium` | MEDIUM | Violaciones de contratos canónicos |
| `code_file_size_medium` | MEDIUM | Archivo muy grande (>300 líneas) |
| `code_function_length_medium` | MEDIUM | Función excede complejidad |

### Cómo Responder

- **Duplicates**: `consolidate_conceptual_cluster` para consolidar
- **Impact**: `traverse_graph({ traverseType: "impact_map" })` antes de editar
- **Policy Drift**: `consolidate_policy_drifts({ execute: false })` para previsualizar
- **Archivos grandes**: `split_large_file({ execute: false })` para dividir

---