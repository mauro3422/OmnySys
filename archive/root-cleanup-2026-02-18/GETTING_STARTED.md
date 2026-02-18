# Getting Started - Primeros Pasos

**Version**: v0.5.2
**Ultima actualizacion**: 2026-02-06

---

## Inicio Rapido

### 1. Instalacion

```bash
cd OmnySystem
npm install
```

### 2. Iniciar el Sistema

```bash
# Un solo comando inicia todo
node src/layer-c-memory/mcp-server.js /ruta/a/tu/proyecto
```

Esto inicia automaticamente:
- MCP Server con tools disponibles
- Orchestrator (cola + worker)
- FileWatcher para cambios en tiempo real
- Indexacion en background (si es necesaria)
- WebSocket en puerto 9997

### 3. Usar las Tools MCP

Una vez iniciado, la IA puede llamar estas tools:

| Tool | Descripcion |
|------|-------------|
| `get_impact_map(filePath)` | Mapa de impacto de un archivo |
| `analyze_change(file, symbol)` | Analisis de cambio en un simbolo |
| `explain_connection(a, b)` | Explicar conexion entre archivos |
| `get_risk_assessment(minSeverity)` | Evaluacion de riesgos del proyecto |
| `search_files(pattern)` | Buscar archivos por patron |
| `get_server_status()` | Estado del servidor |

Para documentacion completa de cada tool, ver [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md).

---

## Flujo de Trabajo Tipico

```
1. Usuario: "Voy a modificar Button.js"
   |
   v
2. IA llama: get_impact_map("src/components/Button.js")
   |
   v
3. OmnySys responde:
   - directlyAffects: ["Card.js", "Modal.js", "Form.js"]
   - semanticConnections: [{ target: "theme.js", type: "shared-state" }]
   - riskLevel: "medium"
   |
   v
4. IA informa: "Button.js afecta 3 archivos y comparte estado con theme.js"
   |
   v
5. IA edita todos los archivos necesarios en una sola pasada
   |
   v
6. FileWatcher detecta cambios -> Regenera grafo automaticamente
```

---

## Comandos Utiles

```bash
# Iniciar servidor MCP
node src/layer-c-memory/mcp-server.js /ruta/a/proyecto

# Iniciar sin analisis LLM (solo estatico, mas rapido)
node src/layer-c-memory/mcp-server.js /ruta/a/proyecto --skip-llm

# Ver estado del sistema
curl http://localhost:8080/api/status
```

---

## Troubleshooting

### "No se encuentra el modulo"

Usa siempre los facades (index.js), no archivos internos:
```javascript
// Correcto
import { buildSystemMap } from './src/layer-a-static/graph/index.js';

// Incorrecto
import { buildSystemMap } from './src/layer-a-static/graph/builders/system-map.js';
```

### LLM no responde

Verifica que llama-server este corriendo:
```bash
lmstudio status
```
O usa modo solo estatico con `--skip-llm`.

### Archivo no analizado

El sistema tiene auto-analisis. Simplemente consulta el archivo y se encola automaticamente:
```javascript
get_impact_map("src/nuevo-archivo.js")
```

---

## Testing y Desarrollo

### Flujo de Trabajo para Desarrolladores

**ANTES de hacer push a GitHub, ejecutar:**

```bash
# 1. Instalar dependencias (sin iniciar servicios)
npm ci --ignore-scripts

# 2. Ejecutar tests de Layer A (obligatorio)
npm run test:layer-a:core

# 3. Ejecutar tests de integración
npm run test:integration

# 4. Validar sintaxis (IMPORTANTE - no olvidar!)
npm run validate

# 5. Si TODO pasa, hacer push
git push origin main
```

### Comandos de Test

```bash
# Tests unitarios de Layer A
npm run test:layer-a:core

# Tests de integración
npm run test:integration

# Validación de sintaxis
npm run validate

# Todos los tests
npm test
```

### Estado de Tests

- ✅ **86 archivos** de tests unitarios
- ✅ **2 archivos** de tests de integración
- ✅ **268 tests** pasando
- ✅ **0 fallos**

Ver [LAYER_A_STATUS.md](LAYER_A_STATUS.md) para detalles completos.

---

## Documentacion

- [README.md](README.md) - Vision general
- [ARCHITECTURE.md](ARCHITECTURE.md) - Diseno tecnico
- [LAYER_A_STATUS.md](LAYER_A_STATUS.md) - Estado actual de Layer A + Flujo de trabajo
- [docs/INDEX.md](docs/INDEX.md) - Indice completo de documentacion
- [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) - Documentacion detallada de tools
- [ROADMAP.md](ROADMAP.md) - Plan de desarrollo
