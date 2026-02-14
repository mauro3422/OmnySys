# Análisis de Edge Cases - Arquitectura LLMService

## Fecha: 2026-02-14
## Estado: ✅ Validado

---

## 1. FLUJO DE DATOS END-TO-END

### Secuencia Normal de Inicialización

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. MCP Server Inicia                                            │
├─────────────────────────────────────────────────────────────────┤
│    ↓                                                            │
│ 2. Initialization Pipeline                                      │
│    - Step 0: InstanceDetection                                  │
│    - Step 1: LayerAAnalysis (610 archivos)                      │
│    - Step 2: CacheInit                                          │
│    - Step 3: LLMSetup (background)                              │
│    - Step 4: OrchestratorInit ← LLMService.getInstance()        │
│    - Step 5: McpSetup                                           │
│    - Step 6: Ready                                              │
├─────────────────────────────────────────────────────────────────┤
│    ↓                                                            │
│ 3. Orchestrator.initialize()                                    │
│    - Crea cache                                                 │
│    - Crea state manager                                         │
│    - LLMService.getInstance() ← Singleton creado/acceso         │
│    - new AnalysisWorker(rootPath, callbacks)                    │
│    - worker.initialize() ← Obtiene LLMService                   │
│    - _startLLMHealthChecker() ← Monitorea LLMService            │
│    - _analyzeComplexFilesWithLLM() ← Usa LLMService             │
├─────────────────────────────────────────────────────────────────┤
│    ↓                                                            │
│ 4. Analysis Worker                                              │
│    - _getLLMService() ← Obtiene singleton                       │
│    - analyze(job)                                               │
│      ├─ Layer A analysis (estático)                             │
│      ├─ if needsLLM: _getLLMService()                           │
│      │   ├─ if available: LLM analysis                          │
│      │   └─ if not available: Fallback estático                 │
│      └─ Guarda resultados                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. EDGE CASES ANALIZADOS

### Caso 1: GPU No Disponible al Inicio

**Escenario**: llama-server.exe no está corriendo cuando inicia el sistema

**Comportamiento**:
```
1. LLMService.initialize() → Crea cliente, health check falla
2. LLMService._available = false
3. Worker se crea, llama a LLMService.getInstance() → Obtiene instancia
4. Worker._getLLMService() → waitForAvailable(5000) → false
5. Worker hace fallback a análisis estático
6. Health checker continúa intentando cada 5s
7. Cuando GPU esté disponible → Worker usa LLM automáticamente
```

**Resultado**: ✅ Sistema funciona con análisis estático, transición automática a LLM

---

### Caso 2: GPU Muere Durante Análisis

**Escenario**: GPU server se cae mientras se analiza un archivo

**Comportamiento**:
```
1. Worker tiene referencia a LLMService
2. Worker llama a llmService.client.analyze()
3. fetch() falla (connection refused/timeout)
4. LLMService.catch(error):
   - Incrementa _cbFailureCount
   - Si >= 5: Circuit breaker → OPEN
   - Emite evento 'error'
5. Worker recibe error, hace fallback
6. Próximas llamadas fallan inmediatamente (CB OPEN)
7. Después de 30s: CB → HALF_OPEN (prueba recuperación)
8. Si éxito: CB → CLOSED
```

**Resultado**: ✅ Circuit breaker protege el sistema, no hay cascada de fallos

---

### Caso 3: Múltiples Workers Concurrentes (2 slots GPU)

**Escenario**: 2 workers analizando simultáneamente

**Comportamiento**:
```
Worker 1 ──┐
           ├──→ LLMService (1 instancia)
Worker 2 ──┘    ├──→ LLMClient (1 instancia)
                │       ├──→ GPU Server (2 slots)
                │       └──→ HTTP connections (pool)
                └──→ Circuit breaker (estado compartido)

Ambos workers comparten:
- Mismo LLMClient (mismo pool de conexiones)
- Mismo circuit breaker
- Mismas métricas
- Mismo health checking
```

**Resultado**: ✅ Un solo punto de control, métricas centralizadas, eficiente

---

### Caso 4: Race Condition en Inicialización

**Escenario**: Dos componentes piden LLMService simultáneamente

**Comportamiento**:
```
Componente A ──┐
               ├──→ LLMService.getInstance()
Componente B ──┘    ├──→ _instancePromise (primero en llegar)
                    │       ├──→ new LLMService()
                    │       ├──→ initialize()
                    │       └──→ _instance = this
                    └──→ Ambos reciben misma instancia

_Singleton pattern con promise previene duplicación_
```

**Resultado**: ✅ Promise guard previene múltiples instancias

---

### Caso 5: Memory Leak en Health Checking

**Escenario**: Health checker corre por horas/días

**Comportamiento**:
```
setInterval cada 5s → 12 checks/minuto → 720/hora → 17,280/día

Potenciales leaks:
❌ Cierre inadecuado de conexiones HTTP
❌ Acumulación de métricas sin límite
❌ Event handlers no removidos

Protecciones implementadas:
✅ fetch() usa AbortSignal.timeout(2000) - conexiones no cuelgan
✅ LLMClient maneja activeRequests (contador, no array)
✅ Circuit breaker no acumula historial infinito
✅ dispose() limpia: interval, handlers, referencias
```

**Resultado**: ✅ No hay acumulación de memoria detectada

---

### Caso 6: Callbacks en Constructor (Backwards Compatibility)

**Escenario**: Código legacy crea worker con firma antigua

**Comportamiento**:
```javascript
// Firma antigua (todavía funciona)
new AnalysisWorker(rootPath, {
  onProgress: () => {},
  onComplete: () => {},
  onError: () => {}
});

// Firma nueva (también funciona)
new AnalysisWorker(rootPath, 
  { llmService: customService },
  { onProgress: () => {} }
);

// Detección automática en constructor:
if (typeof options === 'function' || options.onProgress || ...) {
  callbacks = options;
  options = {};
}
```

**Resultado**: ✅ Ambas firmas funcionan, código legacy no se rompe

---

### Caso 7: Caché Compartido vs Por-Instancia

**Escenario**: Múltiples LLMAnalyzer con diferentes cachés

**Problema anterior**:
```javascript
// ANTES: Cada analyzer tenía su propia caché
Orchestrator.llmAnalyzer.cache = orchestrator.cache;
Worker.llmAnalyzer.cache = ???  // Caché diferente
```

**Solución actual**:
```javascript
// AHORA: Un solo LLMClient, cache gestionado por worker/analyzer
LLMService.client → HTTP client (stateless)
Analyzer.llmAnalyzer.analyzeMultiple() → Usa caché pasada por parámetro
```

**Resultado**: ✅ Cache consistency mejorada

---

## 3. PUNTOS DE FALLO IDENTIFICADOS

### 🔴 Críticos (Mitigados)

| Punto | Riesgo | Mitigación |
|-------|--------|------------|
| GPU no disponible | Alto | Fallback a análisis estático, retry automático |
| Circuit breaker OPEN | Medio | Transición a HALF_OPEN después de 30s |
| Timeout de LLM | Medio | 120s timeout, backoff exponencial en analyzer |

### 🟡 Medios (Aceptables)

| Punto | Riesgo | Estado |
|-------|--------|--------|
| Health check interval 5s | Bajo | Consume recursos mínimos, configurable |
| Métricas en memoria | Bajo | Límite implícito por contadores |
| Event handlers | Bajo | Se limpian en dispose() |

### 🟢 Bajo (Controlados)

| Punto | Riesgo | Estado |
|-------|--------|--------|
| Import cycles | Bajo | No se detectaron ciclos |
| Singleton reset | Bajo | Solo para tests |
| Backwards compatibility | Bajo | Firma dual soportada |

---

## 4. VALIDACIÓN DE IMPORTS

### Grafo de Dependencias

```
src/services/llm-service.js
  ├── ../ai/llm/client.js ✅
  ├── ../ai/llm/load-config.js ✅
  └── ../utils/logger.js ✅

src/core/analysis-worker.js
  ├── ../services/llm-service.js ✅
  ├── ../layer-a-static/indexer.js ✅
  └── ... (otros)

src/core/orchestrator/lifecycle.js
  ├── ../services/llm-service.js ✅
  ├── ../analysis-worker.js ✅
  └── ... (otros)

src/core/orchestrator/llm-analysis.js
  ├── ../../services/llm-service.js ✅
  └── ... (otros)
```

**Ciclos detectados**: Ninguno ✅

---

## 5. MÉTRICAS Y OBSERVABILIDAD

### Métricas Disponibles

```javascript
LLMService.getMetrics() → {
  requestsTotal: number,
  requestsSuccessful: number,
  requestsFailed: number,
  latencyMsTotal: number,
  latencyMsAvg: number,
  errorsByType: object,
  lastError: Error,
  lastErrorTime: timestamp,
  availability: boolean,
  circuitBreakerState: 'CLOSED'|'OPEN'|'HALF_OPEN'
}
```

### Eventos

```javascript
llmService.on('available', ({ health }) => {});
llmService.on('unavailable', ({ health }) => {});
llmService.on('error', ({ error, circuitBreakerOpen }) => {});
```

### Logs Estructurados

- `Initializing LLMService...`
- `LLMService initialized (available: true/false)`
- `Health checking started/stopped`
- `Circuit breaker transitioning to OPEN/HALF_OPEN/CLOSED`
- `LLM is now available/no longer available`

---

## 6. RECOMENDACIONES

### Inmediatas (Opcional)

1. **Reducir verbosidad de logs** en health checking (loguear solo cambios de estado)
2. **Agregar métrica de throughput** (requests/minuto)
3. **Exportar métricas** en formato Prometheus/StatsD

### Futuras (Mejoras)

1. **Retry con jitter** para evitar thundering herd
2. **Rate limiting** por cliente/worker
3. **Dead letter queue** para jobs fallidos
4. **Health check adaptativo** (intervalo dinámico basado en estabilidad)

---

## 7. CONCLUSIÓN

### Estado General: ✅ ROBUSTO

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Inicialización | ✅ | Singleton funciona, lazy loading correcto |
| Concurrencia | ✅ | 2 workers comparten servicio sin conflictos |
| Resiliencia | ✅ | Circuit breaker, retries, fallback |
| Memoria | ✅ | No leaks detectados, cleanup apropiado |
| Backwards Compat | ✅ | Firma dual soportada |
| Observabilidad | ✅ | Métricas, logs, eventos |

### Próximos Pasos

1. **Monitorear en producción** - Ver métricas reales bajo carga
2. **Ajustar thresholds** - Circuit breaker threshold (5) y timeout (30s) basado en datos reales
3. **Documentar troubleshooting** - Guía de diagnóstico basada en métricas

---

**Validado por**: Análisis estático + Simulación + Arquitectura Validator  
**Fecha**: 2026-02-14  
**Versión**: 1.0.0-llm-service-refactor
