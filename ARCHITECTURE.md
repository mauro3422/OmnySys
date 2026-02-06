# OmnySys - Arquitectura Técnica

**Versión**: v0.5.3  
**Última actualización**: 2026-02-06

## 🎯 Visión General

OmnySys es un **motor de contexto multi-capa** que actúa como memoria externa para IAs que modifican código. Resuelve el problema de "visión de túnel" mediante tres capas que trabajan en conjunto:

1. **Layer A (Estática)**: Análisis determinista y rápido (imports, exports, grafo de dependencias)
2. **Layer B (Semántica)**: Análisis inteligente con IA local (arquetipos, conexiones ocultas)
3. **Layer C (Memoria)**: Persistencia y servicio de consulta vía MCP (9 herramientas HTTP)

**Innovación clave**: El **MCP Server es el entry point unico** vía HTTP. Un solo comando (`npm start`) inicia todo el sistema incluyendo LLM + MCP + auto-configuración de OpenCode.

---

## 🏗️ Arquitectura de 3 Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tu IA (Claude/OpenCode)                      │
│                                                                 │
│  Usa: get_impact_map("src/core.js")                             │
│  Recibe: Mapa completo de impacto (8 archivos afectados)        │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP (localhost:9999)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              OMNYsys MCP SERVER (Puerto 9999)                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LAYER C: MEMORIA                                        │   │
│  │ • UnifiedCache: Datos en RAM + disco                    │   │
│  │ • Query Service: API eficiente para consultas           │   │
│  │ • Storage: .omnysysdata/ particionado por archivo       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ▲                                    │
│  ┌─────────────────────────┼───────────────────────────────┐   │
│  │ ORCHESTRATOR (Interno)  │                               │   │
│  │ • Analysis Queue: CRITICAL→HIGH→MEDIUM→LOW              │   │
│  │ • Worker: Procesa con LLM cuando necesario              │   │
│  │ • FileWatcher: Detecta cambios en tiempo real           │   │
│  └─────────────────────────┼───────────────────────────────┘   │
│                            ▲                                    │
│  ┌─────────────────────────┴───────────────────────────────┐   │
│  │ LAYER B: SEMÁNTICA (La Mente)                            │   │
│  │ • Archetype System: Detecta patrones de conexión        │   │
│  │ • LLM Analyzer: Conexiones invisibles (20% restante)    │   │
│  │ • Prompt Engine: Prompts específicos por arquetipo      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ▲                                    │
│  ┌─────────────────────────┴───────────────────────────────┐   │
│  │ LAYER A: ESTÁTICA (El Cuerpo)                            │   │
│  │ • Scanner: Recorre filesystem (JS/TS/JSON)              │   │
│  │ • AST Parser: Imports, exports, definiciones            │   │
│  │ • Graph Builder: Grafo file→file, ciclos, métricas      │   │
│  │ • Extractors: localStorage, eventos, globals            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  LLM SERVER (Puerto 8000) - GPU Optimizado                      │
│  Modelo: LFM2.5-Instruct-Q8_0.gguf                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Las 3 Capas en Detalle

### **Layer A - Análisis Estático** (Sin IA)

**Responsabilidad**: Extraer datos verificables del código fuente.

**Componentes**:
- **Scanner**: Recorre el proyecto, detecta archivos JS/TS/JSON
- **AST Parser** (@babel/parser): Extrae imports, exports, funciones, clases
- **Graph Builder**: Construye grafo de dependencias file→file
- **Extractors**: Detecta localStorage keys, event names, global state

**Output**: `system-map.json` con datos estructurados de 433 archivos

**Conexiones detectadas** (confidence = 1.0):
- File A exporta X → File B importa X (estático)
- File A escribe localStorage['key'] → File B lee localStorage['key'] (semántico)
- File A emite evento 'login' → File B escucha evento 'login' (semántico)

**NO necesita LLM** porque los datos son verificables estáticamente.

---

### **Layer B - Análisis Semántico** (Con IA selectiva)

**Responsabilidad**: Detectar patrones arquitectónicos invisibles para el análisis estático.

**Sistema de Arquetipos**:

| Arquetipo | ¿Qué detecta? | ¿Necesita LLM? | Prioridad |
|-----------|---------------|----------------|-----------|
| `god-object` | Archivo con 20+ dependencias (alto blast radius) | SIEMPRE | CRITICAL |
| `orphan-module` | Archivo exporta pero nadie usa (código muerto?) | SIEMPRE | HIGH |
| `dynamic-importer` | `import(variable)` - rutas dinámicas | SIEMPRE | HIGH |
| `state-manager` | Lee/escribe estado global (window.*, localStorage) | Condicional | HIGH |
| `event-hub` | Emite/escucha eventos (pub/sub) | Condicional | MEDIUM |
| `singleton` | Patrón singleton (acoplamiento implícito) | Condicional | MEDIUM |
| `default` | Fallback - análisis general | SI | LOW |

**Regla de Oro**:
```
¿La metadata sola puede determinar la conexión?
├── SI → NO usar LLM (Layer A ya lo resolvió)
└── NO → Usar LLM (conexiones invisibles)
```

**Output**: Enriquece `system-map.json` con `llmInsights` por archivo

---

### **Layer C - Memoria y Servicio MCP** (HTTP API)

**Responsabilidad**: Almacenar datos y exponer herramientas a la IA.

**Componentes**:
- **Storage**: `.omnysysdata/` con archivos JSON por archivo analizado
- **UnifiedCache**: Cache en RAM con invalidación en cascada
- **MCP HTTP Server**: Puerto 9999, 9 herramientas REST

**9 Herramientas MCP**:

| Herramienta | Propósito | Arquetipo Relacionado |
|-------------|-----------|----------------------|
| `get_impact_map` | Mapa de archivos afectados | god-object, state-manager |
| `get_call_graph` | Quién llama a qué función | orphan-module |
| `explain_value_flow` | Flujo de datos input→output | state-manager, event-hub |
| `analyze_change` | Impacto de cambiar símbolo | Todos |
| `analyze_signature_change` | Breaking changes de API | god-object |
| `explain_connection` | Por qué 2 archivos están conectados | Todos |
| `get_risk_assessment` | Riesgos del proyecto | god-object, orphan-module |
| `search_files` | Buscar archivos | N/A |
| `get_server_status` | Estado del sistema | N/A |

---

## 🔄 Flujo de Inicialización

```bash
npm start

  ┌─────────────────────────────────────┐
  │ STEP 0: Check LLM (puerto 8000)     │
  │         Si no está, iniciar         │
  └─────────────────┬───────────────────┘
                    ▼
  ┌─────────────────────────────────────┐
  │ STEP 1: Iniciar MCP HTTP (9999)     │
  │         OmnySysMCPServer            │
  └─────────────────┬───────────────────┘
                    ▼
  ┌─────────────────────────────────────┐
  │ STEP 2: Layer A - Análisis Estático │
  │         Cargar .omnysysdata/        │
  └─────────────────┬───────────────────┘
                    ▼
  ┌─────────────────────────────────────┐
  │ STEP 3: Iniciar Orchestrator        │
  │         Queue + Worker + Watcher    │
  └─────────────────┬───────────────────┘
                    ▼
  ┌─────────────────────────────────────┐
  │ STEP 4: Configurar OpenCode         │
  │         Auto-config mcpServers      │
  └─────────────────┬───────────────────┘
                    ▼
  ┌─────────────────────────────────────┐
  │ STEP 5: ✅ Listo!                   │
  │         9 herramientas disponibles  │
  └─────────────────────────────────────┘
```

---

## 🎯 Sistema de Arquetipos

### ¿Qué es un Arquetipo?

Un **arquetipo** clasifica archivos según sus **patrones de conexión**: cómo un archivo se conecta con otros archivos del proyecto.

**Test de la Caja**: *"Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no vería?"*

### Pipeline de Detección

```
┌────────────────────────────────────────────────────────────────┐
│ Layer A extrae metadata                                         │
│   - exportCount, dependentCount                                │
│   - hasDynamicImports, hasEventListeners                       │
│   - localStorageKeys, eventNames                               │
└────────────────┬───────────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ detectArchetypes(metadata)                                      │
│   ├─ ¿exportCount > 15 AND dependentCount > 10?                │
│   │   └─ Arquetipo: god-object (severity: 10)                  │
│   ├─ ¿exportCount > 0 AND dependentCount == 0?                 │
│   │   └─ Arquetipo: orphan-module (severity: 5)                │
│   ├─ ¿hasDynamicImports?                                       │
│   │   └─ Arquetipo: dynamic-importer (severity: 7)             │
│   └─ ... más detectores                                        │
└────────────────┬───────────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ ¿Arquetipo requiere LLM?                                        │
│   ├─ god-object, orphan-module, dynamic-importer               │
│   │   └─ Encolar para LLM (priority: CRITICAL/HIGH)            │
│   └─ state-manager, event-hub (condicional)                    │
│       └─ Solo si Layer A no resolvió todas las conexiones      │
└────────────────────────────────────────────────────────────────┘
```

### Ejemplo Real: god-object

**Archivo**: `src/core/orchestrator.js`

**Metadata Layer A**:
```javascript
{
  exportCount: 12,
  dependentCount: 15,        // Archivos que importan de orchestrator
  semanticDependentCount: 8, // Archivos que usan estado/eventos
  totalDependents: 23        // 15 + 8
}
```

**Detector**:
```javascript
if (exportCount > 10 && totalDependents > 20) {
  return {
    type: 'god-object',
    severity: 10,
    requiresLLM: true
  };
}
```

**Acción**: Encolar como CRITICAL para análisis LLM que determine:
- Qué responsabilidades tiene (¿es un god object real?)
- Score de riesgo (0-100)
- Qué partes son seguras de refactorizar

---

## 🛠️ Comandos CLI

```bash
# Control del sistema
npm run install:all    # Instala todo y arranca automáticamente
npm start              # Inicia LLM + MCP
npm stop               # Detiene todo
npm status             # Muestra estado (LLM + MCP)

# Herramientas MCP
npm tools              # Lista las 9 herramientas disponibles
omny call get_impact_map '{"filePath":"src/core.js"}'
omny status            # Estado detallado

# Análisis
npm run analyze        # Analizar proyecto completo con Layer A
```

---

## 📡 Endpoints HTTP

### LLM Server (Puerto 8000)
```bash
GET http://localhost:8000/health
POST http://localhost:8000/generate  # Generar texto
```

### MCP Server (Puerto 9999)
```bash
GET  http://localhost:9999/health          # Estado
GET  http://localhost:9999/tools           # Lista herramientas
POST http://localhost:9999/tools/:name     # Ejecutar herramienta
POST http://localhost:9999/call            # Ejecutar (formato MCP)
```

**Ejemplo**:
```bash
curl -X POST http://localhost:9999/tools/get_impact_map \
  -H "Content-Type: application/json" \
  -d '{"filePath": "src/core/orchestrator.js"}'
```

---

## 📊 Métricas del Sistema

**Proyecto analizado**: 431 archivos

| Métrica | Valor |
|---------|-------|
| Archivos JS/TS | 418 |
| Funciones totales | 943 |
| Arquetipos detectados | ~50 |
| Conexiones semánticas | ~100 |
| Módulos huérfanos | ~15 |
| God Objects | ~3 |

---

## 🎓 Flujo de Uso para IAs

### Escenario: Refactorizar un archivo

**Paso 1**: IA llama a herramienta
```javascript
const impact = await get_impact_map({
  filePath: "src/core/orchestrator.js"
});
```

**Paso 2**: OmnySys analiza
- Layer A: Carga datos del archivo (exports, dependents)
- Layer B: Detecta arquetipos (god-object detectado)
- Layer C: Calcula impacto transitivo

**Paso 3**: OmnySys responde
```javascript
{
  file: "src/core/orchestrator.js",
  directlyAffects: 2,      // Layer A
  transitiveAffects: 6,    // Grafo calculado
  totalAffected: 8,
  riskLevel: "medium",
  archetype: "god-object", // Layer B
  exports: ["initialize", "analyzeAndWait", ...]
}
```

**Paso 4**: IA toma decisión informada
- "Este archivo afecta a 8 otros, incluyendo el CLI principal"
- "Es un god-object, debería dividirse en responsabilidades más pequeñas"
- "Voy a refactorizar una función a la vez"

---

## 📚 Documentación Relacionada

| Documento | Descripción |
|-----------|-------------|
| [docs/TOOLS_GUIDE.md](docs/TOOLS_GUIDE.md) | Guía completa de las 9 herramientas MCP |
| [docs/ARCHETYPE_SYSTEM.md](docs/ARCHETYPE_SYSTEM.md) | Sistema de arquetipos detallado |
| [README.md](README.md) | Instalación y uso rápido |

---

**OmnySys - De la visión de túnel a la visión de caja completa.**
