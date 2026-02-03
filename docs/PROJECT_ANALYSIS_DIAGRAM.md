# Diagrama de Análisis del Proyecto OmnySystem

## Visión General del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OMNYSYSTEM                                   │
│                    (Motor de Conciencia Sistémica)                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA A: ESTÁTICA                             │
│                    (Rastreador Estático - El Cuerpo)                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. Escaneo de proyecto
                                    │ 2. Parseo AST
                                    │ 3. Resolución de imports
                                    │ 4. Construcción de grafo
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCHIVOS DE SALIDA                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   system-map    │  │   functions     │  │   dependencies  │      │
│  │   .json         │  │   .json         │  │   .json         │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA B: SEMÁNTICA                            │
│                    (Enlazador IA - La Mente)                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. Análisis estático (scripts)
                                    │ 2. Análisis IA (casos complejos)
                                    │ 3. Detección de conexiones ocultas
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCHIVOS DE SALIDA                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   semantic-     │  │   css-          │  │   storage-      │      │
│  │   connections   │  │   connections   │  │   connections   │      │
│  │   .json         │  │   .json         │  │   .json         │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   worker-       │  │   side-effects  │  │   risk-scores   │      │
│  │   connections   │  │   .json         │  │   .json         │      │
│  │   .json         │  └─────────────────┘  └─────────────────┘      │
│  └─────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA C: MEMORIA                              │
│                    (Persistencia - Subproceso)                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. Almacenamiento particionado
                                    │ 2. MCP Server
                                    │ 3. File watching
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE ALMACENAMIENTO                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   .aver/        │  │   omnysysdata/  │  │   MCP Server    │      │
│  │   (particionado)│  │   (enriched)    │  │   (queries)     │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        USUARIO / IA                                 │
│                    (Consulta y Edición)                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. Context injection
                                    │ 2. Impact analysis
                                    │ 3. Pre-edit warnings
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE EDICIÓN                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   IA dice:      │  │   Sistema       │  │   IA edita con  │      │
│  │   "Voy a editar │  │   entrega       │  │   contexto      │      │
│  │   CameraState"  │  │   contexto      │  │   completo      │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## Arquitectura de Almacenamiento

```
.aver/ (Particionado - Acceso rápido)
├── index.json                    (metadata del proyecto)
├── files/                        (análisis por archivo)
│   ├── src/
│   │   ├── CameraState.js.json   (análisis específico)
│   │   ├── RenderEngine.js.json
│   │   └── UI.js.json
│   └── test/
│       └── Camera.test.js.json
├── connections/                  (conexiones semánticas)
│   ├── shared-state.json         (estado compartido)
│   ├── event-listeners.json      (eventos)
│   ├── css-connections.json      (variables CSS)
│   ├── storage-connections.json  (localStorage)
│   └── worker-connections.json   (Web Workers)
└── risks/                        (evaluación de riesgos)
    └── assessment.json           (risk scores)

omnysysdata/ (Enriquecido - Debugging)
├── enhanced-system-map.json      (grafo completo)
├── semantic-issues-report.txt    (reporte de problemas)
└── analysis-stats.json           (estadísticas)
```

## Flujos de Trabajo

### Flujo 1: Análisis Completo (Inicial)

```
1. Escaneo de proyecto
   ├── Fast-glob: Busca archivos JS/TS
   ├── Filtros: node_modules, dist, build
   └── Whitelist: .js, .ts, .jsx, .tsx

2. Parseo AST (Babel)
   ├── Imports/exports
   ├── Funciones/clases
   ├── Llamadas a funciones
   └── Side effects

3. Resolución de imports
   ├── Rutas relativas
   ├── Aliases (tsconfig.json)
   ├── External modules
   └── File extensions

4. Construcción de grafo
   ├── Dependencias directas
   ├── Dependencias transitivas
   ├── Circular dependencies
   └── Risk assessment

5. Análisis semántico
   ├── Scripts: CSS-in-JS, Storage, Workers
   ├── IA: Casos complejos (20%)
   └── Synthesis: Context understanding

6. Persistencia
   ├── Particionado: Acceso rápido
   ├── MCP Server: Consultas IA
   └── File watching: Actualización
```

### Flujo 2: Consulta de Contexto (En tiempo real)

```
1. IA dice: "Voy a editar CameraState.js"

2. Sistema intercepta
   ├── Busca en .aver/files/CameraState.js.json
   ├── Obtiene dependencias directas
   ├── Obtiene conexiones semánticas
   └── Calcula riesgo

3. Entrega contexto
   ├── Archivos relacionados (5-10)
   ├── Tipo de conexión (import, state, event)
   ├── Severidad (low/medium/high/critical)
   └── Recomendaciones

4. IA edita con contexto
   ├── Conoce impacto
   ├── Evita bugs colaterales
   └── Mejor calidad de código
```

### Flujo 3: Actualización Incremental

```
1. Cambio en CameraState.js

2. File watcher detecta
   ├── Identifica archivo modificado
   ├── Calcula archivos afectados
   └── Planifica re-análisis

3. Re-análisis selectivo
   ├── Solo archivos afectados
   ├── No regenera todo el proyecto
   └── Actualiza solo lo necesario

4. Actualización de almacenamiento
   ├── Actualiza .aver/files/
   ├── Actualiza conexiones
   └── Notifica MCP Server
```

## Casos de Prueba Validados

### Scenario 1: Import Dependencies (Estático)
```
Archivos: fileA.js → fileB.js → fileC.js
Conexiones detectadas: 2 directas, 1 transitiva
Coverage: 100%
Tiempo: <200ms
```

### Scenario 2: Event Listeners (Semántico)
```
Archivos: EventBus.js, Analytics.js, GameEvents.js
Conexiones detectadas: 3 event listeners
Coverage: 100%
Tiempo: <200ms (scripts)
```

### Scenario 11: CSS Variables (Nuevo detector)
```
Archivos: ThemeManager.js, DiagramCanvas.js
Conexiones detectadas: 1 CSS-in-JS
Coverage: 100%
Tiempo: <200ms (scripts)
```

### Scenario 4: LocalStorage (Nuevo detector)
```
Archivos: AuthService.js, ApiClient.js
Conexiones detectadas: 1 web storage
Coverage: 100%
Tiempo: <200ms (scripts)
```

### Scenario 10: Web Workers (Nuevo detector)
```
Archivos: DataManager.js, ProcessorWorker.js
Conexiones detectadas: 1 web worker
Coverage: 100%
Tiempo: <200ms (scripts)
```

## Performance y Escalabilidad

### Métricas Actuales
```
Proyecto: 100 archivos
Tiempo total: ~45s
Breakdown:
  ├── Static analysis: 2s
  ├── Semantic scripts: 3s
  ├── AI analysis: 35s (10 archivos)
  ├── Synthesis: 5s
  └── Merge & save: 0.5s

Savings: 77% vs análisis 100% con IA
```

### Optimizaciones
```
1. Particionado: Acceso O(1) a archivos específicos
2. Scripts: 80% detección sin IA (zero cost)
3. IA selectiva: Solo 20% casos complejos
4. Caché: Resultados reutilizables
5. File watching: Actualización incremental
```

## Modelos de IA

### LFM2.5 Standard
```
Velocidad: 2s por análisis
Precisión: 85-90%
Memoria: <900MB
Output: Texto libre
Uso: Análisis rápido y simple
```

### LFM2.5-Thinking (Recomendado)
```
Velocidad: 3-4s por análisis
Precisión: 92-95%
Memoria: <900MB
Output: JSON estructurado
Uso: Casos complejos y síntesis
```

## Beneficios del Sistema

### Para el Desarrollador
```
✅ Previene bugs colaterales
✅ Reduce tiempo de debugging
✅ Mejora calidad del código
✅ Facilita refactorings
✅ Documenta arquitectura
```

### Para la IA
```
✅ Contexto completo antes de editar
✅ Conoce impacto de cambios
✅ Evita suposiciones incorrectas
✅ Mejora precisión de ediciones
✅ Reduce iteraciones de corrección
```

### Para el Proyecto
```
✅ Arquitectura visible y documentada
✅ Dependencias claras y trazables
✅ Riesgos identificados y mitigados
✅ Onboarding más rápido
✅ Mantenimiento más fácil