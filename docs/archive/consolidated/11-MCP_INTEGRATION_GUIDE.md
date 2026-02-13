---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# OmnySys MCP - Guia de Integracion

OmnySys expone un servidor MCP (Model Context Protocol) que permite a cualquier cliente IA compatible consultar el mapa de dependencias, conexiones semanticas y riesgos de un proyecto.

## Requisitos Previos

1. **Node.js** >= 18
2. **Dependencias instaladas**: `npm install` en el directorio de OmnySys
3. **LLM local** (opcional): llama-server corriendo en port 8000 (GPU) o 8002 (CPU)
   - Sin LLM, el analisis estatico funciona igual. Solo el analisis semantico profundo (god-objects, orphan-modules) requiere LLM.

## Tools Disponibles

| Tool | Parametros | Descripcion |
|------|-----------|-------------|
| `get_impact_map` | `filePath` | Mapa de impacto: que archivos se ven afectados si tocas este archivo |
| `analyze_change` | `filePath`, `symbolName` | Analisis de impacto de cambiar un simbolo especifico |
| `explain_connection` | `fileA`, `fileB` | Explica como dos archivos estan conectados |
| `get_risk_assessment` | `minSeverity` | Lista archivos por nivel de riesgo (low/medium/high/critical) |
| `search_files` | `pattern` | Busca archivos por patron |
| `get_server_status` | (ninguno) | Estado del servidor, cache y metadata |

## Transporte

OmnySys MCP usa **stdio** (stdin/stdout). El cliente IA spawna el proceso y se comunica via JSON-RPC sobre stdio.

```
[Cliente IA] <--stdin/stdout--> [node src/layer-c-memory/mcp/index.js]
```

---

## 1. Claude Code (Anthropic CLI)

Archivo: `.mcp.json` en la raiz del proyecto analizado.

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

**Si OmnySys analiza su propio codigo** (self-analysis):
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

Claude Code detecta `.mcp.json` al iniciar sesion y pregunta si aprobar el server.

---

## 2. VS Code - Copilot (GitHub Copilot Chat)

VS Code Copilot soporta MCP servers desde la extension v1.250+.

Archivo: `.vscode/mcp.json`

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

O en `settings.json` de VS Code:
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

Despues de configurar, Copilot Chat puede usar las tools con `@omnysys`.

---

## 3. Cline (VS Code Extension)

Cline soporta MCP servers nativamente.

1. Abrir Cline Settings (icono de engranaje)
2. Ir a "MCP Servers"
3. Agregar nuevo server:

```json
{
  "omnysys": {
    "command": "node",
    "args": ["/ruta/a/OmnySys/src/layer-c-memory/mcp/index.js"],
    "disabled": false
  }
}
```

O editar directamente `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` (Mac) o el equivalente en Windows:
`%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

---

## 4. Cursor

Cursor soporta MCP desde v0.48+.

Archivo: `.cursor/mcp.json` en la raiz del proyecto:

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

O globalmente en `~/.cursor/mcp.json`.

---

## 5. Windsurf (Codeium)

Archivo: `~/.codeium/windsurf/mcp_config.json`

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

---

## 6. Claude Desktop (Anthropic App)

Archivo: `claude_desktop_config.json`

- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "omnysys": {
      "command": "node",
      "args": ["C:\\Dev\\OmnySys\\src\\layer-c-memory\\mcp\\index.js"],
      "env": {}
    }
  }
}
```

---

## 7. Cualquier cliente MCP compatible

OmnySys cumple con el protocolo MCP estandar. Cualquier cliente que soporte MCP via stdio puede conectarse:

```bash
# El servidor se ejecuta asi:
node /ruta/a/OmnySys/src/layer-c-memory/mcp/index.js

# Comunicacion: JSON-RPC via stdin/stdout
# Logs: stderr (no interfiere con el protocolo)
```

Para testing manual con `npx`:
```bash
npx @anthropic-ai/mcp-inspector node /ruta/a/OmnySys/src/layer-c-memory/mcp/index.js
```

---

## Analizando un Proyecto Externo

Por defecto, OmnySys analiza el directorio desde donde se ejecuta (`process.cwd()`). Para analizar otro proyecto:

```json
{
  "mcpServers": {
    "omnysys": {
      "command": "node",
      "args": [
        "/ruta/a/OmnySys/src/layer-c-memory/mcp/index.js",
        "/ruta/al/proyecto/a/analizar"
      ]
    }
  }
}
```

**Importante en Windows**: Usar forward slashes (`C:/Dev/MiProyecto`) en los args para evitar problemas de escape.

---

## Primera Ejecucion

La primera vez que el MCP server se conecta a un proyecto:

1. Busca `.omnysysdata/index.json` en el proyecto
2. Si no existe, ejecuta Layer A (analisis estatico completo) - tarda 30-60 seg
3. Si existe, carga los datos cacheados - tarda ~3 seg
4. Los datos quedan en `.omnysysdata/` dentro del proyecto analizado

Para forzar re-indexacion, borrar la carpeta `.omnysysdata/`:
```bash
rm -rf /ruta/al/proyecto/.omnysysdata
```

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| "LLM failed to start" | Verificar que llama-server esta corriendo o iniciar manualmente con `src/ai/scripts/brain_gpu.bat` |
| 0 files analyzed | Verificar que el path al proyecto es correcto. En Windows, usar forward slashes. |
| Tools no aparecen | Reiniciar la sesion del cliente IA. Verificar que el server esta aprobado. |
| "ENOENT" en algun archivo | Borrar `.omnysysdata/` y dejar que re-indexe |
| Server tarda mucho | Primera ejecucion indexa todo (~30-60s). Las siguientes cargan cache (~3s). |

---

Ultima actualizacion: 2026-02-06

