# Problemáticas Conocidas - OmniSystem v0.5.0

**Fecha:** 2026-02-05  
**Estado:** En desarrollo activo  
**Prioridad:** Media-Alta

---

## 🚨 Problemas Críticos

### 1. LLM No Utiliza Metadata Semántica Correctamente

**Descripción:**  
El LLM responde "No dependencies or responsibilities found" a pesar de recibir metadata completa sobre conexiones semánticas.

**Evidencia:**
```
🤖 RAW LLM RESPONSE:
{"confidence":0.98,"riskLevel":"none","reasoning":"No dependencies or responsibilities found in the provided code."}

PERO la metadata enviada incluía:
- semanticDependentCount: 25
- definesGlobalState: true
- globalStateWrites: ["gameState", "gameState", "gameState", "gameState"]
```

**Causa Probable:**  
El prompt template no está formateando correctamente la metadata semántica para que el LLM la entienda como contexto relevante.

**Archivos Afectados:**
- `src/layer-b-semantic/prompt-engine/prompt-templates/default.js`
- `src/layer-b-semantic/prompt-engine/index.js`

**Solución Propuesta:**
1. Revisar cómo se incluye la metadata en el userPrompt
2. Agregar ejemplos few-shot que muestren cómo interpretar campos semánticos
3. Mejorar el schema para incluir campos semánticos explícitamente

---

### 2. Procesamiento Secuencial Lento

**Descripción:**  
Cada archivo tarda ~10-15 segundos en procesarse con el LLM. Con 6 archivos, el proceso total toma ~90 segundos, lo cual es demasiado lento para uso interactivo.

**Evidencia:**
```
⏱️  Tiempos observados:
- Analytics.js: ~12 segundos
- GameStore.js: ~15 segundos
- Total estimado: 90+ segundos para 6 archivos
```

**Causa Probable:**  
El worker procesa archivos uno por uno en lugar de usar batch processing.

**Archivos Afectados:**
- `src/core/analysis-worker.js`
- `src/core/orchestrator.js`

**Solución Propuesta:**
1. Implementar batch processing en `llmAnalyzer.analyzeMultiple()`
2. Usar paralelismo real (Promise.all) para enviar múltiples archivos al LLM
3. Ajustar el timeout del consolidate a 5-10 minutos

---

### 3. Timeout del Consolidate Insuficiente

**Descripción:**  
El timeout de 120 segundos es insuficiente para procesar proyectos medianos. El proceso se corta antes de terminar.

**Evidencia:**
```
⚠️  Solo procesó 2/6 archivos antes del timeout:
✅ Analytics.js (1/6)
✅ GameStore.js (2/6)
❌ EventBus.js - Timeout
❌ GameEvents.js - Timeout
❌ Player.js - Timeout
❌ UI.js - Timeout
```

**Solución Propuesta:**
Aumentar el timeout en `omnysystem.js`:
```javascript
// De 120 segundos a 10 minutos
setTimeout(() => {
  reject(new Error('Analysis timeout after 10 minutes'));
}, 10 * 60 * 1000);
```

---

## ⚠️ Problemas Menores

### 4. Warnings de Deprecación en Importaciones

**Descripción:**  
Aparecen warnings sobre importaciones desde `layer-b-semantic/static-extractors.js` que deberían venir de `layer-a-static`.

**Evidencia:**
```
⚠️  DEPRECATED: Importing from layer-b-semantic/static-extractors.js
   Please update imports to: layer-a-static/extractors/static-extractors.js
```

**Archivos Afectados:**
- Algunos módulos aún importan desde rutas antiguas

**Solución:**  
Buscar y actualizar todas las importaciones deprecadas.

---

### 5. EventBus.js No Detectado como Event-Hub

**Descripción:**  
Aunque EventBus.js define `window.eventBus`, solo se detecta como `state-manager`, no como `event-hub`.

**Evidencia:**
```
❌ Actual: EventBus.js → state-manager
✅ Debería ser: EventBus.js → state-manager, event-hub
```

**Causa Probable:**  
El detector de `event-hub` en `PROMPT_REGISTRY.js` solo verifica `hasEventEmitters`/`hasEventListeners`, pero EventBus.js no tiene eventos directamente, define el bus para que otros lo usen.

**Solución:**  
Mejorar la lógica del detector para identificar definiciones de infraestructura de eventos.

---

## ✅ Mejoras Implementadas (v0.5.0)

### Arreglado: Metadatos Semánticos
- ✅ Global State Writes/Reads ahora funcionan correctamente
- ✅ Event Names se extraen y muestran bien
- ✅ Detección de arquetipos usa información semántica

### Arreglado: Flujo del Orchestrator
- ✅ Tracking de archivos procesados (processedFiles)
- ✅ Emisión correcta del evento `analysis:complete`
- ✅ Finalización limpia del proceso

---

## 📝 Tareas Pendientes

### Alta Prioridad
1. [ ] Arreglar prompt para que LLM use metadata semántica
2. [ ] Implementar batch processing en LLM analyzer
3. [ ] Aumentar timeout del consolidate

### Media Prioridad
4. [ ] Limpiar importaciones deprecadas
5. [ ] Mejorar detección de event-hub
6. [ ] Agregar métricas de rendimiento (tiempo por archivo)

### Baja Prioridad
7. [ ] Documentar el sistema de arquetipos en profundidad
8. [ ] Crear tests unitarios para detectores
9. [ ] Optimizar memoria del Orchestrator

---

## 🎯 Métricas Actuales

**Rendimiento:**
- Tiempo por archivo: ~12-15 segundos
- Archivos procesados por minuto: ~4-5
- Precisión de detección de arquetipos: ~85%

**Cobertura:**
- Layer A: 100% (todos los extractores funcionan)
- Layer B: 70% (detección OK, pero LLM no usa metadata)
- Orchestrator: 90% (flujo completo funciona)

---

**Última actualización:** 2026-02-05  
**Responsable:** OmniSystem Team
