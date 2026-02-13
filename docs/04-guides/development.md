# Guía de Desarrollo

**Versión**: v0.7.1  
**Para**: Contribuidores a OmnySys

---

## Hot Reload

El sistema de **Hot-Reload** permite que OmnySys se actualice automáticamente cuando su propio código cambia, **sin perder el estado** (cache, colas, datos analizados).

### Activar

```bash
# Variable de entorno
export OMNYSYS_HOT_RELOAD=true
npm start

# O en Windows
set OMNYSYS_HOT_RELOAD=true
npm start
```

### Qué se recarga

✅ **Recargable automáticamente**:
- `src/layer-c-memory/mcp/tools/*.js` - Tools MCP
- `src/layer-a-static/extractors/*.js` - Extractores
- `src/core/file-watcher/handlers.js` - Handlers
- `src/layer-a-static/query/apis/*.js` - APIs de queries

⚠️ **Crítico (requiere reinicio manual)**:
- `src/layer-c-memory/mcp/core/server-class.js`
- `src/layer-c-memory/mcp-server.js`
- `src/core/orchestrator/index.js`

### Verificar estado

```javascript
const stats = server.hotReloadManager?.getStats();
console.log(stats);
// {
//   isWatching: true,
//   isReloading: false,
//   criticalModules: 3,
//   reloadablePatterns: 5
// }
```

---

## Debugging

### Logs

```bash
# Logs en tiempo real
tail -f logs/mcp-server.log

# Buscar errores
grep "ERROR" logs/mcp-server.log

# Logs específicos de análisis
tail -f logs/analysis.log
```

### Debug con VS Code

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "OmnySys Server",
      "program": "${workspaceFolder}/src/layer-c-memory/mcp-server.js",
      "env": {
        "DEBUG": "true",
        "OMNYSYS_HOT_RELOAD": "true"
      }
    }
  ]
}
```

### Debug de Tools

```javascript
// En cualquier tool, agregar temporalmente:
console.log('Debug:', { args, context, serverState: server.state });
```

---

## Testing

### Tests unitarios

```bash
# Correr todos los tests
npm test

# Correr tests específicos
npm test -- --grep "data-flow"

# Correr con coverage
npm run test:coverage
```

### Tests de integración

```bash
# Test del pipeline completo
npm run test:integration

# Test de tools MCP
npm run test:mcp
```

---

## Cache

### Limpiar cache

```bash
# Borrar todo el cache
rm -rf .omnysysdata/

# Re-analizar
npm run analyze
```

### Invalidar archivo específico

```bash
# Touch el archivo para forzar re-análisis
touch src/app.js
```

---

## Estructura del Proyecto

```
src/
├── core/                    # Orchestrator, workers, cache
│   ├── orchestrator/
│   ├── cache-invalidator/
│   └── file-watcher/
│
├── layer-a-static/          # Análisis estático
│   ├── extractors/
│   ├── pipeline/
│   └── query/
│
├── layer-b-semantic/        # Detección semántica
│   ├── llm-analyzer/
│   └── prompt-engine/
│
└── layer-c-memory/          # MCP server, storage
    ├── mcp/
    └── shadow-registry/
```

---

## Agregar un Nuevo Extractor

Ver: [archetypes/development.md](../02-architecture/archetypes/development.md)

Pasos rápidos:
1. Crear archivo en `src/layer-a-static/extractors/`
2. Implementar lógica de extracción
3. Agregar a `buildPromptMetadata()`
4. Correr Metadata Insights Verification
5. Actualizar documentación

---

## Referencias

- [ai-setup.md](./ai-setup.md) - Configurar modelos AI
- [../02-architecture/archetypes/development.md](../02-architecture/archetypes/development.md) - Crear arquetipos
