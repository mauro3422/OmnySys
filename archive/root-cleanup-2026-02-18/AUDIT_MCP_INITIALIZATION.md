# Auditoría: Inicialización MCP Server

## Fecha: 2026-02-13
## Estado: CRÍTICO - Múltiples race conditions y bugs

---

## 1. PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1.1 Race Condition: LLM Analyzer

**Archivo**: `src/core/orchestrator/lifecycle.js`

**Problema**: El análisis LLM se inicia ANTES de que el LLM esté disponible

```javascript
// Líneas 66-102
1. Se crea worker con llmAnalyzer = null (si LLM no está listo)
2. Se inicia health checker (línea 89) 
3. Se inicia análisis LLM INMEDIATAMENTE (línea 95)
   - Esto encola jobs que necesitan LLM
   - Los jobs inician con worker.llmAnalyzer = null
4. Health checker detecta LLM disponible (línea 206)
5. Health checker inicializa llmAnalyzer (línea 214)
6. Health checker asigna al worker (línea 222)
   - PERO los jobs ya están procesándose sin LLM
```

**Impacto**: 
- Cada worker crea su propio LLMAnalyzer (fallback) - INEFICIENTE
- Múltiples inicializaciones simultáneas = race condition
- Posible saturación de memoria

### 1.2 Variable No Definida

**Archivo**: `src/core/orchestrator/lifecycle.js:214`

```javascript
// ERROR: aiConfig no está definido en el scope del health checker
this.llmAnalyzer = new LLMAnalyzer(aiConfig, this.projectPath);
```

La variable `aiConfig` solo existe en `initialize()`, no en `_startLLMHealthChecker()`.

### 1.3 Cache Invalidator Fallando

**Error**: `Cannot read properties of undefined (reading 'entries')`

**Causa**: El cache invalidator intenta acceder a `index.entries` pero el índice no está cargado o es undefined.

### 1.4 Timeouts del LLM

**Configuración actual**: 30 segundos timeout
**Problema**: Archivos grandes pueden tardar más de 30s en analizarse

---

## 2. FLUJO CORRECTO (Target)

```
┌─────────────────────────────────────────────────────────────┐
│                    INICIALIZACIÓN MCP                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Paso 1: Instance Detection                                   │
│ - Verificar si hay otra instancia corriendo                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Paso 2: Layer A Analysis                                     │
│ - Análisis estático (no requiere LLM)                       │
│ - Genera system-map.json                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Paso 3: Cache Initialization                                 │
│ - Cargar caché unificado                                    │
│ - Compartir con orchestrator                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Paso 4: LLM Setup (BACKGROUND - NO BLOQUEANTE)              │
│ - Iniciar llama-server.exe en background                    │
│ - NO esperar a que esté listo                               │
│ - Retornar inmediatamente                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Paso 5: Orchestrator Initialization                         │
│ - Crear orchestrator con shared cache                       │
│ - Crear worker SIN LLM analyzer (null)                      │
│ - Iniciar health checker                                    │
│ - NO iniciar análisis LLM todavía                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Paso 6: MCP Server Setup                                     │
│ - Configurar herramientas MCP                               │
│ - Server listo para recibir requests                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Paso 7: Health Checker (Async)                              │
│ - Revisar cada 5s si LLM está disponible                    │
│ - Cuando LLM ready:                                         │
│   a) Inicializar LLMAnalyzer                                │
│   b) Asignar a worker                                       │
│   c) INICIAR análisis LLM                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. ARCHIVOS AFECTADOS

### Críticos:
1. `src/core/orchestrator/lifecycle.js` - Race condition + variable no definida
2. `src/core/analysis-worker.js` - No accede a llmAnalyzer actualizado
3. `src/core/orchestrator/llm-analysis.js` - Inicia análisis antes de tiempo
4. `src/core/cache-invalidator/index.js` - Error con entries undefined

### Secundarios:
5. `src/ai/llm/client.js` - Timeout muy bajo (30s)
6. `src/core/orchestrator/queueing.js` - Demasiados jobs concurrentes

---

## 4. SOLUCIONES REQUERIDAS

### Fix 1: Corregir variable no definida
```javascript
// Guardar aiConfig como propiedad del orchestrator
this.aiConfig = await loadAIConfig();

// Usar en health checker
this.llmAnalyzer = new LLMAnalyzer(this.aiConfig, this.projectPath);
```

### Fix 2: No iniciar análisis hasta que LLM esté listo
```javascript
// En lugar de iniciar inmediatamente, esperar señal
if (llmAnalyzer) {
  // Solo iniciar si LLM ya está disponible
  this._analyzeComplexFilesWithLLM();
} else {
  // Health checker lo iniciará cuando LLM esté listo
  logger.info('⏳ LLM analysis will start when server is ready...');
}
```

### Fix 3: Worker debe usar getter para llmAnalyzer
```javascript
// En lugar de copia estática, usar referencia dinámica
get llmAnalyzer() {
  return this.orchestrator?.llmAnalyzer || this._llmAnalyzer;
}
```

### Fix 4: Aumentar timeout del LLM
```javascript
// De 30s a 120s para archivos grandes
timeout: 120000
```

### Fix 5: Arreglar cache invalidator
```javascript
// Verificar que index existe antes de acceder entries
if (!index || !index.entries) {
  return { success: false, error: 'Index not loaded' };
}
```

---

## 5. VERIFICACIÓN POST-FIX

Logs esperados después de los fixes:

```
[1/7] instance-detection...
   ✅ instance-detection complete

[2/7] layer-a-analysis...
   ✅ Layer A analysis complete (610 files)

[3/7] cache-init...
   ✅ Using shared cache from server

[4/7] llm-setup...
   🚀 LLM server starting in background...
   ✅ llm-setup complete (non-blocking)

[5/7] orchestrator-init...
   ✅ Orchestrator ready
   ⏳ LLM analysis will start when server is ready...

[6/7] mcp-setup...
   ✅ MCP server configured

[7/7] ready...
   ✅ Server ready in 12s

🔍 [HEALTH-CHECK] Attempt 1/60
   ⏳ Waiting for LLM...

🔍 [HEALTH-CHECK] Attempt 3/60
✅ LLM server is now available!
✅ LLM analyzer initialized
✅ Worker updated with LLM analyzer
🤖 Triggering LLM analysis queue (from health checker)...
   📊 Found 54 files needing LLM analysis
   🚀 Starting processing...

[Worker:xxx] this.llmAnalyzer exists = true  <-- DEBE ser true
[Worker:xxx] Client servers: GPU=true, CPU=false
```

---

## 6. RIESGOS IDENTIFICADOS

1. **Memory Leak**: Si múltiples LLMAnalyzers se crean simultáneamente
2. **Deadlock**: Si health checker falla silenciosamente
3. **Data Loss**: Si cache invalidator falla, datos inconsistentes
4. **Performance**: Si se analizan archivos sin LLM, resultados incompletos

---

## 7. RECOMENDACIONES

1. **Agregar tests de integración** para el flujo completo
2. **Implementar circuit breaker** para el health checker
3. **Agregar métricas** de tiempo de inicialización
4. **Crear modo "offline"** que funcione sin LLM
