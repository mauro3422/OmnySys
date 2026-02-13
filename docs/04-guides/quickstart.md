# Quick Start - OmnySys en 5 Minutos

**Tiempo estimado**: 5 minutos  
**Prerrequisitos**: Node.js >= 18

---

## 1. Instalación (1 minuto)

```bash
# Clonar o navegar al directorio
cd OmnySys

# Instalar dependencias
npm install
```

---

## 2. Iniciar el Servidor (1 minuto)

```bash
# Modo básico (solo análisis estático)
npm start

# O con hot-reload para desarrollo
OMNYSYS_HOT_RELOAD=true npm start

# O con LLM local (opcional, para análisis semántico profundo)
npm run start:with-llm
```

**Verificar que está corriendo:**
```bash
curl http://localhost:9999/status
# {"initialized": true, "orchestrator": {"isRunning": true}}
```

---

## 3. Primer Análisis (2 minutos)

### Analizar tu proyecto

```bash
# Analizar directorio actual
npm run analyze

# O analizar otro directorio
npm run analyze -- ../mi-proyecto
```

**Esto crea `.omnysysdata/` con:**
- Metadatos de cada archivo
- Grafo de dependencias
- Átomos y moléculas extraídas

---

## 4. Usar las Tools MCP (1 minuto)

### Opción A: CLI con curl

```bash
# Mapa de impacto
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/app.js"}'

# Status del servidor
curl http://localhost:9999/tools/get_server_status
```

### Opción B: Integrar con Claude Code

Crear `.mcp.json` en tu proyecto:
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

Luego en Claude Code:
```
> Analiza el impacto de cambiar src/app.js
```

---

## 5. Ver Resultados

Los datos se guardan en `.omnysysdata/`:

```
.omnysysdata/
├── index.json              # Índice del proyecto
├── files/                  # Metadatos por archivo
├── atoms/                  # Átomos (funciones)
└── shadows/                # Sombras (historia)
```

**Inspeccionar:**
```bash
# Ver estructura
ls .omnysysdata/files/

# Ver un archivo
cat .omnysysdata/files/src/app.js.json | jq '.metadata'
```

---

## Troubleshooting

### "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### "Port 9999 already in use"
```bash
# Matar proceso previo
npx kill-port 9999

# O usar otro puerto
PORT=9998 npm start
```

### "LLM not available"
```bash
# El sistema funciona sin LLM (solo análisis estático)
# Para LLM, ver: ai-setup.md
```

### Análisis muy lento
```bash
# Excluir directorios grandes
echo "node_modules/" > .omnyignore
echo "dist/" >> .omnyignore
```

---

## Siguientes Pasos

| Guía | Descripción |
|------|-------------|
| [tools.md](./tools.md) | Aprender las 14 herramientas MCP |
| [mcp-integration.md](./mcp-integration.md) | Integrar con VS Code, Cline, etc. |
| [development.md](./development.md) | Setup para desarrollar OmnySys |

---

**¡Listo!** Ya tienes OmnySys corriendo y analizando tu código.
