# Integración MCP con IDEs

**Versión**: v0.7.1  
**Soportado**: Claude Code, VS Code + Copilot, Cline

---

## Claude Code (Anthropic CLI)

### Configuración

Crear `.mcp.json` en la raíz del proyecto:

```json
{
  "mcpServers": {
    "omnysys": {
      "command": "node",
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp/index.js"]
    }
  }
}
```

**OmnySys analizando sí mismo**:
```json
{
  "mcpServers": {
    "omnysys": {
      "command": "node",
      "args": ["src/layer-c-memory/mcp/index.js"]
    }
  }
}
```

### Uso

Claude Code detecta `.mcp.json` al iniciar y pregunta si aprobar el server.

```bash
# Iniciar sesión en el proyecto
cd mi-proyecto
claude

# Aprobar el servidor MCP cuando pregunte
# Luego usar naturalmente:
> Analiza el impacto de cambiar src/app.js
> Cuál es el grafo de llamadas de processOrder?
> Qué archivos dependen de utils/helpers?
```

---

## VS Code + GitHub Copilot

### Configuración

**Opción A**: `.vscode/mcp.json`
```json
{
  "servers": {
    "omnysys": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp/index.js"],
      "env": {}
    }
  }
}
```

**Opción B**: `settings.json`
```json
{
  "github.copilot.chat.mcpServers": {
    "omnysys": {
      "type": "stdio",
      "command": "node",
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp/index.js"]
    }
  }
}
```

### Uso

En Copilot Chat:
```
@omnysys Analiza el archivo src/components/UserCard.jsx
```

---

## Cline (VS Code Extension)

### Configuración

En Cline settings (UI):

```json
{
  "mcpServers": [
    {
      "name": "omnysys",
      "command": "node",
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp/index.js"],
      "transportType": "stdio"
    }
  ]
}
```

### Uso

Cline detecta automáticamente las tools disponibles.

---

## Troubleshooting

### "MCP Server not found"
```bash
# Verificar ruta
ls /ruta/a/OmnySys/src/layer-c-memory/mcp/index.js

# Probar manualmente
node /ruta/a/OmnySys/src/layer-c-memory/mcp/index.js
```

### "Connection refused"
```bash
# Verificar que OmnySys está corriendo
curl http://localhost:9999/status

# Reiniciar si es necesario
npm restart
```

### Tools no aparecen
```bash
# Verificar que el servidor MCP exporta tools
cat /ruta/a/OmnySys/src/layer-c-memory/mcp/index.js | grep "tools"
```

---

## Referencias

- [tools.md](./tools.md) - Documentación de tools
- [quickstart.md](./quickstart.md) - Primeros pasos
