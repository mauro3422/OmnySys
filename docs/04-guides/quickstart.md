# Quick Start - OmnySys en 5 Minutos

**Tiempo estimado**: 5 minutos  
**Prerrequisitos**: Node.js >= 18  
**Versión**: v0.9.61  
**Estado**: ✅ **100% Estático, 0% LLM** - SQLite + Dead Code Detection 85% preciso

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
# Modo básico (solo análisis estático - RECOMENDADO)
npm start

# O con hot-reload para desarrollo
OMNYSYS_HOT_RELOAD=true npm start
```

**NOTA**: El uso de LLM está **DEPRECATED** desde v0.9.61. Todo el análisis es 100% estático.

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
- SQLite database (`.omnysysdata/omnysys.db`)
- Metadatos de cada archivo
- Grafo de dependencias
- 13,485+ átomos extraídos (funciones con 50+ campos de metadata)

**Estructura:**
```
.omnysysdata/
├── omnysys.db           # SQLite database (principal)
├── atoms/               # Átomos individuales (JSON, backup)
├── files/               # Metadatos por archivo
└── system-map.json      # System map completo
```

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

# Dead code detection
curl -X POST http://localhost:9999/tools/detect_patterns \
  -H "Content-Type: application/json" \
  -d '{"patternType": "dead-code"}'

# Health metrics
curl http://localhost:9999/tools/get_health_metrics
```

### Opción B: Integrar con tu IDE

**Para Qwen Code / Claude Code / OpenCode:**

Crear `.mcp.json` en tu proyecto:
```json
{
  "mcpServers": {
    "omnysys": {
      "type": "http",
      "url": "http://127.0.0.1:9999/mcp"
    }
  }
}
```

Luego en tu IDE:
```
> Analiza el impacto de cambiar src/app.js
> ¿Qué funciones llaman a processOrder?
> Detecta código muerto en este archivo
```

### Opción C: Usar directamente en código

```javascript
import { getRepository } from '#layer-c/storage/repository/index.js';

const repo = getRepository();

// Query directa a SQLite
const atoms = repo.query({ 
  filePath: 'src/app.js',
  archetype: 'god-function'
});

// O usar APIs de alto nivel
import { getFileAnalysis } from '#layer-c/query/apis/file-api.js';
const analysis = await getFileAnalysis('src/app.js');
```

---

## 5. Ver Resultados

### Health Score del Proyecto

```bash
curl http://localhost:9999/tools/get_health_metrics
```

**Resultado típico (v0.9.61):**
```json
{
  "summary": {
    "totalAtoms": 13485,
    "overallScore": 99,
    "grade": "A"
  },
  "healthDistribution": {
    "A": 13093,  // 97.1%
    "B": 171,    // 1.3%
    "C": 81,     // 0.6%
    "D": 33,     // 0.2%
    "F": 27      // 0.2%
  }
}
```

### Dead Code Detection

```bash
curl -X POST http://localhost:9999/tools/detect_patterns \
  -H "Content-Type: application/json" \
  -d '{"patternType": "dead-code"}'
```

**Resultado (v0.9.61):**
```json
{
  "deadCode": {
    "count": 42,  // 85% menos que antes
    "top5": [
      {
        "name": "extract",
        "file": "src/extractors/OutputExtractor.js",
        "linesOfCode": 45
      }
      // ... más casos
    ]
  }
}
```

---

## 6. Siguientes Pasos

### Documentación

- [INDEX.md](./INDEX.md) - Índice completo de documentación
- [tools.md](./tools.md) - Guía de las 29 herramientas MCP
- [DATA_FLOW.md](../02-architecture/DATA_FLOW.md) - Flujo de datos detallado
- [code-physics.md](../02-architecture/code-physics.md) - Física del software

### Comandos Útiles

```bash
# Ver status completo
npm run status

# Reiniciar servidor (si hay problemas)
npm run restart

# Limpiar caché y reanalizar
npm run clean && npm run analyze

# Ver logs
npm run logs
```

### Métricas del Sistema (v0.9.61)

| Métrica | Valor |
|---------|-------|
| **Archivos analizados** | 1,860 |
| **Átomos extraídos** | 13,485 |
| **Health Score** | 99/100 (Grade A) |
| **Test Coverage** | 79% |
| **God Functions** | 193 |
| **Dead Code** | 42 (85% mejora) |
| **Herramientas MCP** | 29 |
| **LLM Usage** | 0% ✅ |

---

## 7. Troubleshooting

### El servidor no inicia

```bash
# Verificar puerto en uso
netstat -ano | findstr :9999

# Matar proceso y reiniciar
taskkill /PID <PID> /F
npm start
```

### Los datos no se actualizan

```bash
# Limpiar caché y reanalizar
npm run clean
npm run analyze
```

### Error de SQLite

```bash
# Verificar que el archivo existe
ls .omnysysdata/omnysys.db

# Si no existe, reanalizar
npm run analyze
```

---

**Última actualización**: 2026-02-25 (v0.9.61)  
**Estado**: ✅ 100% Estático, 0% LLM  
**Próximo**: 🚧 Migración a Tree-sitter (Q2 2026)
