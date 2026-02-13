# Sistema de Arquetipos - Catálogo y Confianza

**Versión**: v0.7.1  
**Estado**: v0.6.0+ (Confidence-Based Bypass implementado)

---

## Propósito

Los arquetipos clasifican archivos y funciones según sus **patrones de conexión**: cómo una entidad se conecta con otras entidades del proyecto.

**IMPORTANTE**: Los arquetipos NO son para detectar calidad de código. Cosas como "usa CSS-in-JS" o "tiene tipos TypeScript" no son arquetipos porque no cambian las conexiones del archivo.

---

## Test de la Caja (Box Test)

Antes de que un arquetipo sea válido, debe pasar este test:

> **"Al levantar la caja (archivo), este arquetipo me ayuda a ver cables (conexiones) que de otra forma no vería?"**

| Arquetipo | Pasa? | Qué cables revela | Confianza |
|-----------|-------|-------------------|-----------|
| `god-object` | ✅ SÍ | Caja con 20+ cables a todos lados. Alto blast radius. | Confidence-based |
| `dynamic-importer` | ✅ SÍ | Cables invisibles (resueltos en runtime). Sin análisis no los ves. | Siempre LLM |
| `event-hub` | ✅ SÍ | Cables invisibles (emit/listen). No aparecen en imports. | Confidence-based |
| `global-state` | ✅ SÍ | Cables invisibles via `window.*`. Conecta lectores con escritores. | Confidence-based |
| `state-manager` | ✅ SÍ | Cables a todos los consumidores de estado (localStorage, etc). | Confidence-based |
| `orphan-module` | ✅ SÍ | Caja SIN cables visibles. Sospechoso: o es código muerto o tiene cables ocultos. | Confidence-based |
| `singleton` | ✅ SÍ (débil) | Acoplamiento implícito: todos los usuarios de la instancia están conectados entre sí. | Confidence-based |
| `facade` | ✅ SÍ | Cables de re-export: todos los consumidores dependen transitivamente de los módulos internos. | 1.0 (determinístico) |
| `config-hub` | ✅ SÍ | Caja de config con cables a todos los consumidores. Cambiar una key afecta a muchos. | 1.0 (determinístico) |
| `entry-point` | ✅ SÍ | Punto de entrada: cables de import hacia adentro, cero hacia afuera. | 1.0 (determinístico) |
| `network-hub` | ✅ SÍ | Cables compartidos por endpoints de API. Múltiples archivos llaman al mismo backend. | Confidence-based |
| `critical-bottleneck` | ✅ SÍ | Cables a muchos + alta complejidad + hotspot git. Punto crítico del sistema. | Confidence-based |
| `api-event-bridge` | ✅ SÍ | Cables de coordinación: APIs + eventos. Race conditions potenciales. | Confidence-based |
| `storage-sync-manager` | ✅ SÍ | Cables multi-tab: sincronización de estado entre pestañas. | Confidence-based |
| `default` | N/A | Fallback, no es un arquetipo real. | N/A |

---

## Sistema de Confianza (Confidence-Based Bypass)

### Principio

> *"Si tenemos suficiente evidencia estática, no necesitamos LLM"*

Cada arquetipo calcula un **score de confianza** (0.0 - 1.0) basado en evidencia metadata. Si confidence >= 0.8, se hace bypass del LLM.

### Fórmula de Confianza

```javascript
// Ejemplo: god-object confidence calculation
const calculateConfidence = (metadata) => {
  let confidence = 0.0;
  const evidence = [];
  
  // Evidencia de exports (0.3)
  if (metadata.exportCount > 15) {
    confidence += 0.3;
    evidence.push(`exports:${metadata.exportCount}`);
  }
  
  // Evidencia de dependencias (0.3)
  const totalDeps = (metadata.dependentCount || 0) + 
                    (metadata.semanticDependentCount || 0);
  if (totalDeps > 20) {
    confidence += 0.3;
    evidence.push(`dependents:${totalDeps}`);
  }
  
  // Evidencia de átomos críticos (0.4)
  const hasGodFunction = metadata.atoms?.some(
    a => a.archetype?.type === 'god-function'
  );
  if (hasGodFunction) {
    confidence += 0.4;
    evidence.push('has-god-function');
  }
  
  // Evidencia de conexiones resueltas (0.3 bonus)
  const resolvedConnections = (metadata.semanticConnections || [])
    .filter(c => c.confidence >= 1.0).length;
  if (resolvedConnections > 5) {
    confidence += 0.3;
    evidence.push(`resolved-connections:${resolvedConnections}`);
  }
  
  return { 
    confidence: Math.min(confidence, 1.0), // Cap at 1.0
    evidence 
  };
};
```

### Decision Matrix

```javascript
// Layer C decision logic
function decideLLMNeed(archetype, metadata) {
  const { confidence, evidence } = calculateConfidence(metadata);
  
  if (confidence >= 0.8) {
    // ✅ BYPASS: Evidencia suficiente
    return {
      needsLLM: false,
      result: {
        type: archetype.type,
        confidence,
        evidence,
        detectionMethod: 'static-metadata',
        insights: generateInsightsFromEvidence(evidence)
      }
    };
  }
  
  if (confidence >= 0.5) {
    // ⚠️ CONDITIONAL: Evidencia parcial
    return {
      needsLLM: true,
      context: {
        confidence,
        evidence,
        missingInfo: inferMissingInfo(archetype, evidence),
        promptAugmentation: `Ya detecté: ${evidence.join(', ')}. 
                            Necesito verificar: ${inferMissingInfo(archetype, evidence)}`
      }
    };
  }
  
  // 🔍 LLM FULL: Sin evidencia suficiente
  return {
    needsLLM: true,
    context: {
      confidence,
      evidence: [],
      missingInfo: 'all',
      promptAugmentation: 'Análisis completo necesario'
    }
  };
}
```

### Ejemplos de Confianza

#### Caso 1: Alta Confianza (Bypass)

```javascript
// Archivo: src/core/orchestrator.js
const metadata = {
  exportCount: 23,
  dependentCount: 35,
  semanticDependentCount: 12,
  atoms: [
    { archetype: { type: 'god-function', severity: 9 } },
    { archetype: { type: 'hot-path', severity: 7 } }
  ],
  semanticConnections: [
    { type: 'eventListener', confidence: 1.0 },
    { type: 'localStorage', confidence: 1.0 }
  ]
};

// Resultado:
{
  confidence: 0.95,  // 0.3 + 0.3 + 0.4 + 0.3 (capped at 1.0)
  evidence: [
    'exports:23',
    'dependents:47',  // 35 + 12
    'has-god-function',
    'resolved-connections:2'
  ],
  decision: { needsLLM: false },
  savings: '~2-3 segundos de LLM'
}
```

#### Caso 2: Confianza Media (Conditional LLM)

```javascript
// Archivo: src/utils/helpers.js
const metadata = {
  exportCount: 8,
  dependentCount: 3,
  semanticDependentCount: 0,
  hasNetworkCalls: true,
  hasEventEmitters: true,
  networkEndpoints: ['/api/users']
};

// Resultado:
{
  confidence: 0.55,
  evidence: [
    'has-network-calls',
    'has-event-emitters',
    'single-endpoint'
  ],
  decision: { 
    needsLLM: true,
    context: 'Tengo evidencia de network + events, pero no sé si coordina múltiples APIs'
  }
}
```

#### Caso 3: Baja Confianza (Full LLM)

```javascript
// Archivo: src/legacy/plugin.js
const metadata = {
  exportCount: 1,
  dependentCount: 0,
  semanticDependentCount: 0,
  hasDynamicImports: true
};

// Resultado:
{
  confidence: 0.2,
  evidence: ['dynamic-imports'],
  decision: { 
    needsLLM: true,
    context: 'Casi sin metadata. Necesito análisis completo.'
  }
}
```

---

## Regla LLM vs No-LLM

### Nivel 1: Determinístico (Confidence = 1.0)

Arquetipos 100% resolubles por metadata:

| Arquetipo | Detector | Evidencia |
|-----------|----------|-----------|
| `facade` | `reExportCount >= 3` | Re-exports son facts del AST |
| `config-hub` | `exportCount >= 5 && dependentCount >= 5 && functionCount <= 2` | Conteos del grafo |
| `entry-point` | `importCount >= 5 && dependentCount === 0` | Conteos del grafo |

**Nunca necesitan LLM.**

### Nivel 2: Confidence-Based (0.5 <= confidence < 1.0)

Arquetipos resolubles con evidencia suficiente:

| Arquetipo | Evidencia para Bypass (confidence >= 0.8) |
|-----------|-------------------------------------------|
| `god-object` | exports > 15 + dependents > 20 + has-god-function |
| `network-hub` | >2 funciones con network calls + endpoints compartidos resueltos |
| `event-hub` | Todos los eventos cruzados con confidence 1.0 |
| `state-manager` | localStorage keys cruzadas con confidence 1.0 |
| `orphan-module` | 0 dependents + 0 semantic connections + 0 exports |

**Bypass automático si evidencia suficiente.**

### Nivel 3: Siempre LLM (confidence < 0.5 o casos especiales)

Arquetipos que requieren entendimiento semántico:

| Arquetipo | Por qué siempre LLM |
|-----------|---------------------|
| `dynamic-importer` | Rutas dinámicas irresolubles estáticamente |
| `api-event-bridge` | Necesita analizar timing y race conditions |
| `storage-sync-manager` | Lógica de sync puede ser compleja |

---

## Pipeline de Decisión LLM

```text
Layer A extrae metadata + átomos
   |
   v
Derivation Engine calcula metadata molecular
   |
   v
detectArchetypes(metadata) -- evalúa TODOS los detectores
   |
   v
Por cada arquetipo detectado:
   |
   ├─ calculateConfidence(metadata)
   |      |
   |      ├─ confidence >= 0.8 → BYPASS (no LLM)
   |      |
   |      ├─ 0.5 <= confidence < 0.8 → CONDITIONAL LLM
   |      |                           (con contexto de evidencia)
   |      |
   |      └─ confidence < 0.5 → FULL LLM
   |
   v
Encolar para LLM (solo los que necesitan)
   |
   v
LLM Analyzer procesa con contexto enriquecido
   |
   v
Merge insights con metadata estática
```

### Métricas de Mejora (v0.6)

| Métrica | Antes (v0.5) | Después (v0.6) | Mejora |
|---------|--------------|----------------|--------|
| LLM Calls | 30% de archivos | 10% de archivos | -66% |
| Tiempo de análisis | ~5s por archivo | ~1s promedio | 5x más rápido |
| Bypass rate | 70% | 90% | +20% |
| False positives | 8% | 3% | -62% |

---

## Arquetipos Atómicos

Los arquetipos también se aplican a **funciones individuales** (átomos):

| Arquetipo | Detector | Evidencia |
|-----------|----------|-----------|
| `god-function` | `complexity > 20 && lines > 100` | Métricas de AST |
| `fragile-network` | `hasNetworkCalls && !hasErrorHandling` | Side effects + error handling |
| `hot-path` | `isExported && calledBy.length > 5` | Call graph |
| `dead-function` | `!isExported && calledBy.length === 0` | Call graph |
| `utility` | `!hasSideEffects && complexity < 5` | Side effects + complexity |
| `standard` | default | Fallback |

Estos arquetipos atómicos alimentan los detectores moleculares (ej: `has-god-function` contribuye a `god-object`).

---

## Referencias

- [development.md](./development.md) - Cómo agregar nuevos arquetipos
- [principles.md](../../01-core/principles.md) - Los 4 Pilares (Box Test)
- [03-ORCHESTRATOR-INTERNO.md](../../03-orchestrator/03-ORCHESTRATOR-INTERNO.md) - Decisión LLM en orchestrator
