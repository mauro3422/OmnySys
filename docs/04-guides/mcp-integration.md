# Integración MCP con IDEs

**Versión**: v0.9.44  
**Soportado**: Claude Code, VS Code + Copilot, Cline, OpenCode  
**Total Tools**: 21 implementadas

---

## Claude Code (Anthropic CLI)

### Configuración

Crear `.mcp.json` en la raíz del proyecto:

```json
{
  "mcpServers": {
    "omnysys": {
      "command": "node",
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp-server.js"]
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
      "args": ["src/layer-c-memory/mcp-server.js"]
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
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp-server.js"],
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
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp-server.js"]
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
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp-server.js"],
      "transportType": "stdio"
    }
  ]
}
```

### Uso

Cline detecta automáticamente las tools disponibles.

---

## OpenCode (CLI)

### Configuración

Crear `opencode.json` en la raíz del proyecto:

```json
{
  "mcp": {
    "servers": [{
      "name": "omnysys",
      "command": "node",
      "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp-server.js", "/ruta/a/tu/proyecto"]
    }]
  }
}
```

### Uso

OpenCode detecta automáticamente las 21 tools MCP disponibles.

---

## Troubleshooting

### "MCP Server not found"
```bash
# Verificar ruta
ls /ruta/a/OmnySys/src/layer-c-memory/mcp-server.js

# Probar manualmente
node /ruta/a/OmnySys/src/layer-c-memory/mcp-server.js
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
ls /ruta/a/OmnySys/src/layer-c-memory/mcp/tools/
```

---

## Referencias

- [tools.md](./tools.md) - Documentación de tools
- [quickstart.md](./quickstart.md) - Primeros pasos
