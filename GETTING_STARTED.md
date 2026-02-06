# Getting Started - Primeros Pasos

**Versión**: v0.5.1 - Enterprise Architecture Refactor  
**Última actualización**: 2026-02-06

---

## Estado Actual del Proyecto

✅ **FASE 5 COMPLETADA** - Sistema Funcional con Arquitectura Enterprise

CogniSystem está completamente funcional con una arquitectura modular de 147 módulos:

- ✅ Capa A: Análisis estático completo (27 módulos)
- ✅ Capa B: Análisis semántico con IA (40+ módulos)
- ✅ Capa C: Memoria persistente y MCP Server (15 módulos)
- ✅ Core: Orchestrator, FileWatcher, BatchProcessor (25 módulos)
- ✅ 15+ casos de prueba sintéticos validados
- ✅ MCP Tools listas para usar

**Próximo paso**: Fase 6 - Beta Testing en proyectos reales

---

## Inicio Rápido (5 minutos)

### 1. Instalación

```bash
# Clonar o navegar al repositorio
cd OmnySystem

# Instalar dependencias
npm install
```

### 2. Iniciar el Sistema

```bash
# Un solo comando inicia todo
node src/layer-c-memory/mcp-server.js /ruta/a/tu/proyecto
```

Esto inicia automáticamente:
- MCP Server con tools disponibles
- Orchestrator (cola + worker)
- FileWatcher para cambios en tiempo real
- Indexación en background (si es necesaria)
- WebSocket en puerto 9997

### 3. Usar las Tools MCP

Una vez iniciado, las siguientes tools están disponibles para la IA:

```javascript
// Obtener mapa de impacto
get_impact_map("src/components/Button.js")

// Analizar cambio en un símbolo específico
analyze_change("src/store.js", "userState")

// Explicar conexión entre archivos
explain_connection("src/App.js", "src/store.js")

// Evaluación de riesgos del proyecto
get_risk_assessment("medium")

// Buscar archivos
search_files("**/*.test.js")

// Estado del servidor
get_server_status()
```

---

## Estructura del Proyecto

```
OmnySystem/
├── README.md                           ⭐ Empieza aquí
├── ROADMAP.md                          📋 Plan de desarrollo
├── ARCHITECTURE.md                     🏗️ Diseño técnico detallado
├── GETTING_STARTED.md                  👉 Este archivo
├── CHANGELOG.md                        📝 Historial de versiones
│
├── docs/
│   ├── INDEX.md                        📑 Índice de documentación
│   ├── ARCHITECTURE_LAYER_A_B.md       🏗️ Arquitectura Capas A/B
│   ├── MCP_TOOLS.md                    🛠️ Documentación de tools
│   ├── PROBLEM_ANALYSIS.md             📊 Análisis del problema
│   └── ...
│
├── changelog/
│   ├── v0.5.1.md                       🆕 Enterprise Architecture
│   ├── v0.5.0.md                       Layer A/B Unification
│   └── ...
│
├── test-cases/
│   ├── scenario-1-simple-import/       ✅ Casos de prueba
│   ├── scenario-2-semantic/
│   └── ... (15+ escenarios)
│
├── src/
│   ├── core/                           🔧 Componentes core (25 módulos)
│   │   ├── batch-processor/            🆕 Batch processor (9 módulos)
│   │   ├── websocket/                  🆕 WebSocket server (10 módulos)
│   │   ├── unified-server/             HTTP API + WebSocket
│   │   ├── orchestrator.js             🔄 Cola y worker
│   │   ├── file-watcher.js             👁️ Detección de cambios
│   │   └── unified-cache-manager.js    💾 Cache unificado
│   │
│   ├── layer-a-static/                 🔵 Capa A: Análisis Estático (27 módulos)
│   │   ├── graph/                      🆕 Graph builder (11 módulos)
│   │   ├── parser/                     🆕 AST parser (8 módulos)
│   │   ├── extractors/                 🆕 Extractors organizados (17 módulos)
│   │   │   ├── communication/          Web Workers, WebSocket, etc.
│   │   │   ├── metadata/               JSDoc, async, errors
│   │   │   ├── static/                 localStorage, events, globals
│   │   │   └── state-management/       Redux & React Context
│   │   └── query/                      🆕 Query service (6 módulos)
│   │
│   ├── layer-b-semantic/               🟢 Capa B: IA Semántica (40+ módulos)
│   │   ├── llm-analyzer/               🆕 LLM analyzer (5 módulos)
│   │   ├── issue-detectors/            🆕 Issue detection (8 módulos)
│   │   ├── project-analyzer/           🆕 Project analysis (10 módulos)
│   │   ├── validators/                 🆕 LLM validation (17 módulos)
│   │   └── metadata-contract/          🆕 A→B contract (10 módulos)
│   │
│   └── layer-c-memory/                 🟣 Capa C: Memoria Persistente
│       ├── mcp-server.js               🚀 Entry point único
│       ├── mcp/                        🆕 MCP modules
│       ├── storage/                    💾 Persistencia
│       └── query/                      🔍 Consultas
│
├── package.json
└── .gitignore
```

---

## Flujo de Trabajo Típico

### Escenario: Modificar un Componente React

```
1. Usuario: "Voy a modificar Button.js"
   │
   ▼
2. IA (Claude) llama automáticamente:
   get_impact_map("src/components/Button.js")
   │
   ▼
3. CogniSystem responde:
   {
     "file": "Button.js",
     "directlyAffects": ["Card.js", "Modal.js", "Form.js"],
     "transitiveAffects": ["Dashboard.js"],
     "semanticConnections": [
       { "target": "theme.js", "type": "shared-state" }
     ],
     "riskLevel": "medium"
   }
   │
   ▼
4. IA informa al usuario:
   "Button.js afecta a 3 archivos directamente y 1 indirectamente.
    También comparte estado con theme.js."
   │
   ▼
5. Usuario: "Ok, haz los cambios"
   │
   ▼
6. IA edita los 4 archivos necesarios en una sola pasada
   │
   ▼
7. FileWatcher detecta cambios → Regenera grafo automáticamente
```

---

## Comandos Útiles

```bash
# Iniciar servidor MCP
node src/layer-c-memory/mcp-server.js /ruta/a/proyecto

# Ver estado del sistema
curl http://localhost:8080/api/status

# Ver estructura del proyecto (excluyendo node_modules)
tree -L 2 -I 'node_modules'

# Ejecutar tests (cuando estén implementados)
npm test

# Ver documentación de changelog
cat changelog/v0.5.1.md
```

---

## Desarrollo y Contribución

### Estructura Modular (v0.5.1)

CogniSystem v0.5.1 sigue principios SOLID con 147 módulos organizados:

**Principios aplicados**:
- **Single Responsibility**: Cada módulo tiene UNA razón para cambiar
- **Open/Closed**: Extensible sin modificar código existente
- **SSOT**: Single Source of Truth para tipos, configs, utilidades

**Agregar un nuevo extractor**:
```javascript
// 1. Crear archivo en la carpeta apropiada
// src/layer-a-static/extractors/metadata/nuevo-extractor.js

// 2. Exportar función principal
export function extractNuevoPattern(filePath, content) {
  // Implementación
}

// 3. Actualizar index.js de la carpeta
// No necesitas modificar código existente
```

**SSOT Locations**:
- SystemMap Structure: `src/layer-a-static/graph/types.js`
- Path Normalization: `src/layer-a-static/graph/utils/path-utils.js`
- Babel Config: `src/layer-a-static/parser/config.js`
- Prompt Building: `src/layer-b-semantic/llm-analyzer/prompt-builder.js`

---

## Troubleshooting

### Problema: "No se encuentra el módulo"

**Solución**: Asegúrate de usar las rutas correctas con los index.js facades:
```javascript
// ✅ Correcto - usa el facade
import { buildSystemMap } from './src/layer-a-static/graph/index.js';

// ❌ Incorrecto - archivo específico
import { buildSystemMap } from './src/layer-a-static/graph/builders/system-map.js';
```

### Problema: LLM no responde

**Solución**: Verifica que llama-server esté corriendo:
```bash
# Verificar estado
lmstudio status

# O usar análisis sin IA (solo estático)
# En config, set enableAI: false
```

### Problema: Archivo no analizado

**Solución**: El sistema tiene auto-análisis. Simplemente consulta el archivo:
```javascript
// Esto encolará automáticamente el archivo como CRITICAL
get_impact_map("src/nuevo-archivo.js")
```

---

## Próximos Pasos

### Para Usuarios

1. **Instala CogniSystem** en un proyecto real pequeño (50-100 archivos)
2. **Prueba las tools MCP** con diferentes archivos
3. **Reporta issues** o comportamientos inesperados
4. **Da feedback** sobre la utilidad de las conexiones detectadas

### Para Desarrolladores

1. **Lee ARCHITECTURE.md** para entender la arquitectura técnica
2. **Explora los módulos** en `src/` - cada uno tiene ~50 líneas
3. **Añade casos de prueba** para nuevos escenarios
4. **Contribuye** con mejoras siguiendo los principios SOLID

---

## Recursos

### Documentación Principal
- [README.md](README.md) - Overview y visión general
- [ARCHITECTURE.md](ARCHITECTURE.md) - Diseño técnico detallado
- [ROADMAP.md](ROADMAP.md) - Plan de desarrollo y fases
- [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) - Documentación de tools MCP

### Documentación de Arquitectura
- [docs/ARCHITECTURE_LAYER_A_B.md](docs/ARCHITECTURE_LAYER_A_B.md) - Capas A y B
- [docs/AI_CONSOLIDATION_MODE.md](docs/AI_CONSOLIDATION_MODE.md) - Modo consolidación IA
- [docs/ITERATIVE_MODE.md](docs/ITERATIVE_MODE.md) - Modo iterativo

### Changelogs
- [changelog/v0.5.1.md](changelog/v0.5.1.md) - Enterprise Architecture Refactor
- [changelog/v0.5.0.md](changelog/v0.5.0.md) - Layer A/B Unification
- [CHANGELOG.md](CHANGELOG.md) - Índice de todos los changelogs

---

## Motivación

> "Las IAs que trabajan con código sufren de **visión de túnel**: cuando editan un archivo, pierden de vista el contexto completo del sistema."

**CogniSystem soluciona esto** inyectando contexto relevante **antes** de que la IA edite código.

Cada módulo de los 147 que componen el sistema trabaja para que tus proyectos puedan crecer sin miedo a bugs colaterales.

---

## Primer Paso Concreto

**Ahora mismo, haz esto**:

1. Abre una terminal en la carpeta del proyecto
2. Elige un proyecto pequeño tuyo (10-50 archivos JS/TS)
3. Ejecuta:
   ```bash
   node src/layer-c-memory/mcp-server.js /ruta/a/tu/proyecto
   ```
4. Espera a que se complete la indexación inicial
5. La IA ahora tiene acceso a `get_impact_map()` y otras tools

**¡Empieza a usarlo! 🚀**

---

*Para más información, consulta [README.md](README.md) o [ARCHITECTURE.md](ARCHITECTURE.md)*
