# Plan: Aprovechar Mejor la Metadata

> **Estado:** Planificación  
> **Basado en:** Estabilización completada del compilador - 27/27 familias canónicas adoptadas  
> **Fecha:** Marzo 2026

---

## Contexto

El compilador de OmnySys ha alcanzado estabilidad:
- ✅ 27/27 familias canónicas adoptadas
- ✅ `pipeline_health` limpio
- ✅ `recentErrors` bajo control
- ✅ `metadata_surface_parity` healthy
- ✅ `file_universe_granularity` saludable

**El siguiente paso es usar esta metadata para algo más fuerte que estabilización.**

---

## 1. Score Causal Unificado de Backlog

### Objetivo
Construir un score único por issue que combine señales para ordenar deuda real antes que ruido.

### Fórmula Propuesta
```
score_causal = (
    signalConfidence * 0.30 +
    impact_potential * 0.25 +
    domain_criticality * 0.20 +
    freshness_recency * 0.15 +
    watcher_recurrence * 0.10
)
```

### Componentes
| Factor | Descripción | Fuente |
|--------|-------------|--------|
| `signalConfidence` | Nivel de confianza de la señal (high/medium/low) | watcher confidence |
| `impact_potential` | Potencial de impacto basado en dependencias | impact-wave analysis |
| `domain_criticality` | Criticalidad del dominio (arch > sem > code > perf > runtime) | guard metadata |
| `freshness_recency` | Recencia del issue (más reciente = más alto) | timestamp |
| `watcher_recurrence` | Frecuencia de reaparición del mismo issue | churn detection |

### API Surface
```javascript
// Nueva tool o extensión de aggregate_metrics
{
  "aggregationType": "prioritized_backlog",
  "options": {
    "limit": 20,
    "minScore": 0.5,
    "includePredicted": true
  }
}
```

---

## 2. Drift Anticipado de Contratos

### Objetivo
Detectar cuando productor y consumidor todavía "funcionan" pero ya no comparten shape/cobertura esperada — **alerta pre-break**.

### Señales de Drift
1. **Shape Drift**: Campos en común han cambiado de tipo/opcionalidad
2. **Cardinality Drift**: Cambios en arrays/objetos anidados
3. **Nullability Drift**: Campos que eran requeridos ahora son opcionales o viceversa
4. **Coverage Drift**: Nuevos campos no reflejados en consumidores

### Implementación
```javascript
// Nueva surface: contract-drift-detector.js
async function detectContractDrift(producerPath, consumerPath) {
    const producerShape = await extractShape(producerPath);
    const consumerShape = await extractShape(consumerPath);
    
    return {
        driftDetected: boolean,
        driftType: 'shape' | 'cardinality' | 'nullability' | 'coverage',
        confidence: number,
        breakingRisk: 'none' | 'low' | 'medium' | 'high',
        suggestedAction: string
    };
}
```

### Integración
- Hook en `metadata-surface-parity` para detectar drift automáticamente
- Alerta antes de que rompa una surface

---

## 3. Provenance Explícita por Resultado MCP

### Objetivo
Que cada respuesta MCP diga explícitamente de dónde viene la data.

### Niveles de Provenance
| Nivel | Descripción | Confianza |
|-------|-------------|-----------|
| `live` | Datos en tiempo real del runtime | ⭐⭐⭐⭐⭐ |
| `summary` | Agregados calculados sobre datos frescos | ⭐⭐⭐⭐ |
| `mirror` | Datos replicados (system-map, file-dependencies) | ⭐⭐⭐ |
| `legacy-adapted` | Datos transformados de formatos legacy | ⭐⭐ |
| `cached` | Datos cacheados (pueden ser stale) | ⭐ |

### Implementación
```javascript
// En cada respuesta MCP, agregar:
{
  "_provenance": {
    "source": "live|summary|mirror|legacy-adapted|cached",
    "freshness": "2026-03-06T20:22:05Z",
    "confidenceScore": 0.95,
    "trustHints": ["Phase 2 settled", "No restart pending"]
  }
}
```

### Beneficios
- El agente sabe cuándo puede confiar ciegamente vs. cuando debe verificar
- Priorización automática de fuentes más confiables

---

## 4. Cola Accionable Única

### Objetivo
Fusionar `pipeline_health`, `recent_errors`, `risk`, y `standardization` en una **lista única priorizada** con "next best action" automático.

### Arquitectura
```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Action Queue                      │
├─────────────────────────────────────────────────────────────┤
│  Sources:                                                    │
│  • pipeline_health (orphans, coverage gaps)                 │
│  • recent_errors (runtime issues)                           │
│  • risk (complexity hotspots)                               │
│  • standardization (missing canonical APIs)                 │
│  • watcher_alerts (semantic guards)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Prioritizer (score causal)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Output: [{                                                  │
│    id, severity, score,                                      │
│    source,                                                   │
│    description,                                              │
│    suggestedAction,  ← "next best action"                   │
│    estimatedEffort,                                          │
│    impactPrediction                                          │
│  }]                                                          │
└─────────────────────────────────────────────────────────────┘
```

### API Surface
```javascript
// Nueva tool
{
  "name": "getActionableBacklog",
  "parameters": {
    "limit": 10,
    "severity": ["high", "medium"],
    "includeEffort": true
  }
}
```

---

## 5. Política de Salud Runtime-Registry

### Objetivo
Detector formal para registries runtime que deberían ser idempotentes y no lo son.

### Patrones a Detectar
1. **Re-registro por nombre**: Un guard se registra múltiples veces con el mismo nombre
2. **Churn por reload**: Inicializaciones repetidas durante reload parcial
3. **Inicializaciones concurrentes**: Múltiples llamadas simultáneas a `initialize*()`
4. **Registry leak**: Registries que crecen indefinidamente sin cleanup

### Estado Actual (Ya Implementado ✅)
- [x] Guard registry idempotente por nombre
- [x] Lock de inicialización con `initializationPromise`
- [x] Split en `registerDefaultSemanticGuards()` y `registerDefaultImpactGuards()`

### Siguiente Paso
Crear la **surface canónica** para detectar estos patrones en cualquier registry del sistema:

```javascript
// runtime-registry-health-guard.js
async function detectRegistryHealthIssues(rootPath, filePath, context) {
    return {
        issues: [{
            type: 're-registration' | 'concurrent-init' | 'churn' | 'leak',
            registry: string,
            evidence: object,
            severity: 'low' | 'medium' | 'high'
        }]
    };
}
```

---

## Roadmap de Implementación

### Fase 1: Fundamentos (Semana 1)
1. [ ] Implementar `_provenance` en respuestas MCP existentes
2. [ ] Crear `getActionableBacklog` básico (unificación simple)

### Fase 2: Score Causal (Semana 2)
3. [ ] Implementar fórmula de score causal
4. [ ] Integrar con `aggregate_metrics`
5. [ ] Validar con datos reales del proyecto

### Fase 3: Drift Detection (Semana 3)
6. [ ] Implementar `extractShape()` para contratos
7. [ ] Crear `detectContractDrift()`
8. [ ] Integrar con `metadata-surface-parity`

### Fase 4: Registry Health (Semana 4)
9. [ ] Formalizar `runtime-registry-health-guard`
10. [ ] Auditar otros registries en el codebase
11. [ ] Crear surface canónica

---

## Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Tiempo para identificar siguiente acción | 5-10 min | < 1 min |
| Falsos positivos en alerts | ~20% | < 5% |
| Issues detectados antes de break | ~30% | > 70% |
| Confianza en respuestas MCP | medium | high |

---

## Notas

- Este plan asume que la base del compilador sigue estable
- Cada fase debe incluir tests y validación
- La fase 1 (provenance) es la más simple y da el mayor valor inmediato
- La fase 4 (registry health) ya está parcialmente implementada
