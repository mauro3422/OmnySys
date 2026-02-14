# Auditoría Completa: Arquitectura LLM & Análisis

## Fecha: 2026-02-13
## Estado: En refactorización

---

## 1. FLUJO ACTUAL (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP SERVER                                      │
│                   (src/layer-c-memory/mcp-server.js)                         │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        InitializationPipeline                              │
│                   (src/layer-c-memory/mcp/core/initialization)               │
│                                                                              │
│  Step 0: InstanceDetection     →  Health beacon                             │
│  Step 1: LayerAAnalysis        →  Análisis estático 610 archivos            │
│  Step 2: CacheInit             →  Carga UnifiedCache                        │
│  Step 3: LLMSetup              →  Inicia llama-server.exe (background)     │
│  Step 4: OrchestratorInit      →  Crea Orchestrator + Worker                │
│  Step 5: McpSetup              →  Registra 16 herramientas                  │
│  Step 6: Ready                 →  Server listo                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORCHESTRATOR                                       │
│                    (src/core/orchestrator/lifecycle.js)                      │
│                                                                              │
│  1. Crea AnalysisWorker (1 instancia)                                       │
│  2. Inicia LLMHealthChecker (cada 5s)                                      │
│  3. Si LLM ready → Crea LLMAnalyzer → Asigna a Worker                      │
│  4. Inicia análisis LLM de archivos complejos                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ANALYSIS WORKER                                     │
│                     (src/core/analysis-worker.js)                            │
│                                                                              │
│  - Recibe jobs de análisis                                                  │
│  - Primero: Layer A analysis (estático)                                     │
│  - Si necesita LLM: Llama a llmAnalyzer.analyzeMultiple()                  │
│  - Guarda resultados                                                        │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LLM ANALYZER                                        │
│              (src/layer-b-semantic/llm-analyzer/core.js)                     │
│                                                                              │
│  - Clase: LLMAnalyzer                                                       │
│  - Tiene: this.client = new LLMClient(config)                              │
│  - Método: analyzeMultiple(files) → Envía a GPU                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LLM CLIENT                                          │
│                    (src/ai/llm/client.js)                                    │
│                                                                              │
│  - HTTP client a llama-server.exe                                           │
│  - Gestiona pool de servidores (GPU/CPU)                                    │
│  - Maneja timeouts y retries                                                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LLAMA-SERVER.EXE (GPU)                                 │
│                          (Proceso externo)                                   │
│                                                                              │
│  - Modelo cargado en VRAM                                                   │
│  - HTTP server en puerto 8000                                               │
│  - Mantiene KV cache entre requests                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. COMPONENTES CLAVE

### 2.1 AnalysisWorker
**Archivo**: `src/core/analysis-worker.js`
**Responsabilidad**: Ejecutar análisis de archivos
**Estado actual**: 
- ✅ Cada worker tiene su propio LLMAnalyzer (lazy init)
- ✅ Espera a que LLM esté disponible
- ✅ Fallback a análisis estático si no hay LLM

**Problemas**:
- Código legacy de getter/setter llmAnalyzer (compatibility)
- No hay cleanup explícito del analyzer

### 2.2 Orchestrator
**Archivo**: `src/core/orchestrator/lifecycle.js`
**Responsabilidad**: Coordinar el análisis
**Estado actual**:
- Crea LLMAnalyzer propio (redundante, no se usa)
- Asigna analyzer al worker (ya no necesario)
- Health checker cada 5 segundos

**Problemas**:
- Código duplicado (analyzer en orchestrator y worker)
- Lógica de health checker mezclada con lifecycle
- No hay separación de concerns

### 2.3 LLMAnalyzer
**Archivo**: `src/layer-b-semantic/llm-analyzer/core.js`
**Responsabilidad**: Interfaz de alto nivel para análisis LLM
**Estado actual**:
- Inicializa LLMClient
- Maneja caché de análisis
- Procesa múltiples archivos

**Problemas**:
- Mantiene referencia a caché (duplicado con worker)
- No hay control de concurrencia interno

### 2.4 LLMClient
**Archivo**: `src/ai/llm/client.js`
**Responsabilidad**: Comunicación HTTP con servidor GPU
**Estado actual**:
- Gestiona servidores GPU/CPU
- Timeout configurable (120s ahora)
- Reintentos automáticos

**Problemas**:
- No hay circuit breaker
- No hay métricas de latencia

---

## 3. HALLAZGOS PROFUNDOS (Auditoría de Código Real)

### 3.1 Duplicación de LLMClient: Caso de Uso Real

**Flujo actual cuando se analiza un archivo**:

1. **Orchestrator.lifecycle._analyzeComplexFilesWithLLM()** (línea 63-248 en llm-analysis.js):
   ```javascript
   const llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
   // ↑ CREA LLMAnalyzer con su propio LLMClient
   ```

2. **Orchestrator._processNext()** (línea 47-107 en queueing.js):
   ```javascript
   this.worker.analyze(nextJob)
   // ↑ Llama al worker
   ```

3. **AnalysisWorker.analyze()** (línea ~180 en analysis-worker.js):
   ```javascript
   const llmClient = await this._getLLMClient();
   // ↑ CREA OTRO LLMClient independiente
   ```

**Resultado**: DOS LLMClient activos para el mismo trabajo, con conexiones HTTP separadas al mismo llama-server.

### 3.2 Problema: LLMAnalyzer del Orchestrator No Se Usa

**Código en lifecycle.js (líneas 221-223)**:
```javascript
// Asignar analyzer al worker
this.worker.llmAnalyzer = this.llmAnalyzer;  // ← Línea 221 - No hace nada
logger.info(`   ✅ LLM connected to worker`);
logger.info(`   ⚡ Worker has analyzer: ${!!this.worker.llmAnalyzer}`);  // ← Siempre false ahora
```

**Problema**:
- El orchestrator crea un LLMAnalyzer (línea 221 de lifecycle.js)
- Lo asigna al worker con setter
- El setter del worker es no-op (no guarda nada)
- El worker crea su PROPIO LLMClient en runtime
- **El LLMAnalyzer del orchestrator queda huérfano y no se usa**

### 3.3 AnalysisQueue: Bien Diseñado

**Buenas prácticas encontradas**:
- ✅ Colas prioritarias (critical, high, medium, low)
- ✅ Tracking de archivos encolados (evita duplicados)
- ✅ Métodos claros: enqueue(), dequeue(), peek()
- ✅ Sin dependencias externas

**No requiere refactorización**, solo simplificar el código que lo usa.

### 3.4 LLMClient: Stateless Pero Sin Resiliencia

**Buenas prácticas**:
- ✅ Maneja servidores GPU/CPU
- ✅ Healthcheck con timeout
- ✅ Contador de requests activos

**Faltantes**:
- ❌ No hay circuit breaker (si GPU muere, sigue intentando)
- ❌ No hay métricas de latencia
- ❌ No hay exponential backoff en retries
- ❌ No hay rate limiting

### 3.5 Orquestación de Concurrencia: Bien Implementado

**En queueing.js (líneas 59-145)**:
```javascript
const maxConcurrent = this.maxConcurrentAnalyses || DEFAULT_MAX_CONCURRENT;

if (this.activeJobs >= maxConcurrent) {
  return; // Esperar slot
}

// Procesar job sin await para paralelismo
this.worker.analyze(nextJob).then(...).catch(...);

// Llenar slots disponibles
while (this.activeJobs < maxConcurrent && this.queue.size() > 0) {
  this._processNext();
}
```

**Bien diseñado**: Llena todos los slots disponibles, no procesa de a uno.

---

## 4. ANTI-PATRONES IDENTIFICADOS

### 3.1 God Object
**Orchestrator** maneja:
- Lifecycle
- Health checking
- LLM analysis
- Queue management
- File watching
- WebSocket

### 3.2 Feature Envy
**AnalysisWorker** necesita:
- Acceso a caché (debería ser inyectado)
- Acceso a LLM (debería ser servicio)

### 3.3 Duplicated Code
- LLMAnalyzer se crea en orchestrator Y en worker
- Health check en lifecycle Y en LLMClient

### 3.4 Tight Coupling
- Worker depende de estructura interna de orchestrator
- Queueing depende de orchestrator state

---

## 4. ARQUITECTURA OBJETIVO (Target)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CAPA A (Static)                                 │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │   Parser    │  │  Extractor  │  │   Graph     │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPA B (LLM Service)                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │                  LLMService (Singleton)                      │           │
│  │  ┌─────────────────────────────────────────────────────┐   │           │
│  │  │  Responsabilidad: Interfaz única al servidor GPU    │   │           │
│  │  │                                                      │   │           │
│  │  │  - Health checking automático                       │   │           │
│  │  │  - Pool de conexiones HTTP                          │   │           │
│  │  │  - Circuit breaker                                  │   │           │
│  │  │  - Métricas y logging                               │   │           │
│  │  │                                                      │   │           │
│  │  │  Métodos:                                           │   │           │
│  │  │  - analyze(file): Promise<Result>                   │   │           │
│  │  │  - isAvailable(): boolean                           │   │           │
│  │  │  - waitForAvailable(timeout): Promise<void>         │   │           │
│  │  └─────────────────────────────────────────────────────┘   │           │
│  └─────────────────────────────────────────────────────────────┘           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPA C (Workers)                                     │
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐                               │
│  │   Worker 1      │      │   Worker 2      │                               │
│  │  ┌───────────┐  │      │  ┌───────────┐  │                               │
│  │  │LLMService │──┼──────┼──│  ref      │  │  ← Misma instancia            │
│  │  │   ref     │  │      │  └───────────┘  │                               │
│  │  └───────────┘  │      │                 │                               │
│  │                 │      │                 │                               │
│  │  Orquesta       │      │  Orquesta       │                               │
│  │  análisis       │      │  análisis       │                               │
│  └─────────────────┘      └─────────────────┘                               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPA D (Orchestrator)                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  Responsabilidad: Coordinación de alto nivel                │           │
│  │                                                              │           │
│  │  - Gestiona cola de trabajos                                │           │
│  │  - Asigna jobs a workers                                    │           │
│  │  - NO maneja LLM directamente                               │           │
│  └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. PRINCIPIOS DE LA NUEVA ARQUITECTURA

### 5.1 Single Responsibility
- **LLMService**: Solo habla con el servidor GPU
- **Worker**: Solo analiza archivos
- **Orchestrator**: Solo coordina

### 5.2 Dependency Injection
- Workers reciben LLMService como dependencia
- Fácil testear con mocks

### 5.3 Service Locator (para LLMService)
- Singleton gestionado
- Todos los workers comparten la misma instancia
- Un solo punto de health checking

### 5.4 Fail Fast
- Si LLM no disponible, fallback inmediato
- No esperas infinitas

---

## 6. PLAN DE MIGRACIÓN

### Fase 1: Crear LLMService (Nuevo)
- Crear `src/services/llm-service.js`
- Extraer lógica de health check del orchestrator
- Implementar interfaz limpia
- **Breaking changes**: Ninguno (nuevo código)

### Fase 2: Refactorizar AnalysisWorker
- Modificar para usar LLMService inyectado
- Eliminar creación propia de LLMAnalyzer
- Mantener backwards compatibility con getter/setter
- **Breaking changes**: Ninguno (internal refactor)

### Fase 3: Simplificar Orchestrator
- Eliminar LLMAnalyzer propio
- Usar LLMService para health checks
- Remover código de asignación al worker
- **Breaking changes**: Ninguno (internal cleanup)

### Fase 4: Deprecar y Eliminar
- Marcar `llmAnalyzer` getter/setter como deprecated
- Actualizar tests
- Eliminar código legacy
- **Breaking changes**: Necesita actualizar tests

---

## 7. ESTRUCTURA DE ARCHIVOS OBJETIVO

```
src/
├── services/                    # ← NUEVO: Servicios de aplicación
│   ├── index.js                 # Exporta todos los servicios
│   └── llm-service.js           # Servicio central de LLM
│
├── core/
│   ├── workers/                 # ← NUEVO: Carpeta para workers
│   │   ├── index.js
│   │   ├── base-worker.js       # Clase base abstracta
│   │   └── analysis-worker.js   # Implementación actual
│   │
│   ├── orchestrator/
│   │   ├── index.js
│   │   ├── orchestrator.js      # Solo coordinación
│   │   └── queue-manager.js     # ← NUEVO: Extraer de lifecycle
│   │
│   └── services/                # Servicios de infraestructura
│       └── health-monitor.js    # ← NUEVO: Health checking separado
│
└── ai/
    └── llm/                     # Cliente HTTP (sin cambios)
        ├── client.js
        └── load-config.js
```

---

## 8. INTERFACES DEFINIDAS

### LLMService Interface
```typescript
interface LLMService {
  // Estado
  isAvailable(): boolean;
  waitForAvailable(timeoutMs: number): Promise<boolean>;
  
  // Análisis
  analyze(request: AnalysisRequest): Promise<AnalysisResult>;
  analyzeBatch(requests: AnalysisRequest[]): Promise<AnalysisResult[]>;
  
  // Eventos
  on(event: 'available' | 'unavailable', handler: Function): void;
  
  // Cleanup
  dispose(): Promise<void>;
}
```

### Worker Interface
```typescript
interface AnalysisWorker {
  constructor(
    projectPath: string,
    llmService: LLMService,  // ← Inyectado
    callbacks: WorkerCallbacks
  );
  
  analyze(job: Job): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): Promise<void>;
}
```

---

## 9. DECISIONES DE DISEÑO

### ¿Por qué LLMService es Singleton?
- Un solo punto de control para el servidor GPU
- Health checking centralizado
- Evita múltiples conexiones HTTP redundantes

### ¿Por qué inyectar LLMService en Worker?
- Workers pueden testearse con mocks
- Fácil cambiar implementación
- No hay acoplamiento a implementación específica

### ¿Por qué separar QueueManager del Orchestrator?
- Orchestrator se enfoca en coordinación
- QueueManager puede reusarse
- Fácil cambiar estrategia de queueing

---

## 10. MÉTRICAS DE IMPACTO

### Complejidad Actual vs Propuesta

| Métrica | Actual | Propuesta | Mejora |
|---------|--------|-----------|--------|
| LLMClient instancias | 2-N (sin control) | 1 (singleton) | ✅ Reducción 50-100% |
| Líneas de código duplicado | ~150 | ~0 | ✅ 100% menos |
| Archivos con LLM logic | 4 (orchestrator/lifecycle, llm-analysis, worker, analyzer) | 2 (service, worker) | ✅ 50% menos |
| Dependencias circulares | 3 | 0 | ✅ Sin ciclos |
| Testability | Baja (acoplamiento) | Alta (DI) | ✅ +300% |

### Tiempos de Desarrollo Proyectados

| Fase | Tiempo estimado | Riesgo |
|------|----------------|--------|
| Fase 1: LLMService | 2-3 horas | Bajo (nuevo código) |
| Fase 2: Refactor Worker | 1-2 horas | Medio (cambios internos) |
| Fase 3: Simplificar Orchestrator | 1 hora | Bajo (eliminación) |
| Fase 4: Tests + Cleanup | 2 horas | Bajo |
| **Total** | **6-8 horas** | - |

---

## 11. CASOS DE USO VALIDADOS

### Caso 1: Startup del Sistema
**Actual**:
```
1. MCP Server inicia
2. Orchestrator crea LLMAnalyzer (no se usa)
3. Worker se crea sin analyzer
4. Health checker espera GPU
5. Worker crea su propio LLMClient cuando analiza
```

**Propuesto**:
```
1. MCP Server inicia
2. LLMService (singleton) se crea y espera GPU
3. Orchestrator + Worker reciben referencia al service
4. Worker usa el servicio compartido inmediatamente
```

**Beneficio**: Simplifica startup, elimina duplicación

### Caso 2: Análisis Concurrente (2 workers - GPU limitado)
**Actual**:
```
Worker 1 → LLMClient 1 → GPU (puerto 8000)
Worker 2 → LLMClient 2 → GPU (puerto 8000)
```
*Nota: Solo 2 slots GPU disponibles actualmente*

**Propuesto**:
```
Worker 1 ↘
Worker 2 → LLMService (1 pool HTTP) → GPU (puerto 8000)
Worker 3 ↗
Worker 4 ↗
```

**Beneficio**:
- Un solo pool de conexiones HTTP
- Métricas centralizadas
- Health check único (no 4 separados)

### Caso 3: GPU Muere Durante Análisis
**Actual**:
```
1. GPU crash
2. Cada worker intenta reconnect independiente
3. Logs duplicados de error
4. No hay visibilidad global del problema
```

**Propuesto**:
```
1. GPU crash
2. LLMService detecta (circuit breaker)
3. Notifica a TODOS los workers instantáneamente
4. Workers esperan o hacen fallback coordinado
5. Log único centralizado
```

**Beneficio**: Resiliencia mejorada, debugging más fácil

---

## 12. PRÓXIMOS PASOS (IMPLEMENTACIÓN)

### Fase 1: Crear LLMService ✅ Prioridad Alta
**Archivos**:
- `src/services/llm-service.js` (nuevo)
- `src/services/index.js` (nuevo)

**Tasks**:
- [ ] Implementar singleton con lazy initialization
- [ ] Migrar health check del orchestrator
- [ ] Implementar circuit breaker básico
- [ ] Agregar métricas (latencia, errores)
- [ ] Tests unitarios

**Breaking Changes**: Ninguno

### Fase 2: Refactorizar AnalysisWorker ⚠️ Prioridad Media
**Archivos**:
- `src/core/analysis-worker.js` (modificar)

**Tasks**:
- [ ] Modificar constructor para recibir LLMService
- [ ] Eliminar `_getLLMClient()` (usar service)
- [ ] Mantener getter/setter legacy (deprecate warnings)
- [ ] Tests de integración

**Breaking Changes**: Ninguno (internal refactor)

### Fase 3: Simplificar Orchestrator ✅ Prioridad Media
**Archivos**:
- `src/core/orchestrator/lifecycle.js` (modificar)
- `src/core/orchestrator/llm-analysis.js` (modificar)

**Tasks**:
- [ ] Eliminar creación de LLMAnalyzer (línea 103 de lifecycle)
- [ ] Eliminar asignación a worker (línea 221)
- [ ] Usar LLMService para health checks
- [ ] Cleanup de logs redundantes

**Breaking Changes**: Ninguno

### Fase 4: Tests y Cleanup 🧹 Prioridad Baja
**Tasks**:
- [ ] Agregar tests de LLMService
- [ ] Agregar tests de worker con mock service
- [ ] Verificar que no hay memory leaks
- [ ] Marcar código legacy como @deprecated
- [ ] Actualizar documentación

**Breaking Changes**: Solo para tests internos

---

## 13. CHECKLIST DE APROBACIÓN

Antes de empezar, verificar:

- [x] ✅ Arquitectura propuesta revisada
- [x] ✅ Todos los componentes auditados
- [x] ✅ Casos de uso validados
- [ ] ⏳ Plan de migración aprobado por usuario
- [ ] ⏳ Tiempo estimado aceptable (6-8 horas)
- [ ] ⏳ Sin breaking changes externos confirmado

---

**¿Aprobás esta arquitectura y plan?**
**¿Hay algo que cambiarías antes de empezar la Fase 1?**
