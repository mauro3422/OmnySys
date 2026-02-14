# Los 4 Pilares de OmnySys

**Documento**: principles.md  
**Versión**: v0.9.4  
**Estado**: Fundamentos activos - Toda contribución debe seguir estos pilares

---

## 🎯 Resumen de los 4 Pilares

```
Pilar 1: Box Test
    ↓
    "Focus on connections, not attributes"
    ↓
Pilar 2: Metadata Insights Verification
    ↓
    "Combine metadata to find patterns"
    ↓
Pilar 3: Atomic Composition
    ↓
    "Apply pillars 1-2 at function level"
    ↓
Pilar 4: Fractal Architecture
    ↓
    "Apply pillars 1-3 recursively at all scales"
```

---

## Pilar 1: The Box Test (Archetype Validation)

### Principio
> *"An archetype must reveal invisible CONNECTIONS between files"*

### El Test

Antes de agregar cualquier arquetipo, pregúntate:

> **"Does this tell me something about how this file CONNECTS with other files?"**

- ✅ **YES** → Valid archetype candidate
- ❌ **NO** → Informative metadata, NOT an archetype

### Ejemplos

**✅ Arquetipos Válidos (Pasan Box Test)**:

```javascript
// Revela conexión a través de API endpoint compartido
hasNetworkCalls + endpoint == '/api/users'
→ "network-hub": Archivos acoplados por contrato backend

// Revela conexión a través de sistema de eventos
hasEventEmitters + eventName == 'data-loaded'
→ "event-hub": Archivos acoplados por pub/sub

// Revela conexión a través de estado global
definesGlobalState + globalVar == 'currentUser'
→ "state-manager": Archivos acoplados por memoria compartida
```

**❌ Arquetipos Inválidos (Fallan Box Test)**:

```javascript
// NO revela conexiones
hasTypeScript == true
→ Elección de lenguaje, no info de coupling

// NO revela conexiones
hasCSSInJS == true
→ Approach de styling, no coupling

// NO revela conexiones
complexity > 100
→ Propiedad interna, no impacto cross-file
```

### Por qué Importa

| Sin Box Test | Con Box Test |
|--------------|--------------|
| 50+ "arquetipos" que son solo flags de metadata | ~15 arquetipos de alta señal |
| LLM desperdicia tokens en "este archivo usa TypeScript" | Cada uno revela ACOPLAMIENTO arquitectónico REAL |
| Usuario abrumado con patrones irrelevantes | Usuario ve SOLO patrones que importan para refactoring |

---

## Pilar 2: Metadata Insights Verification

### Principio
> *"Every new metadata extractor must be verified against existing metadata to discover emergent patterns"*

### El Proceso de Verificación

**Al agregar un nuevo extractor** (ej: `foo-extractor.js`):

**1. Documentar nuevos campos**:
```javascript
// foo-extractor.js produce:
- hasFoo: boolean
- fooItems: array
- fooComplexity: number
```

**2. Cross-referenciar con TODA la metadata existente**:
```javascript
// Matrix check:
hasFoo + hasNetworkCalls → ?
hasFoo + hasLifecycleHooks → ?
hasFoo + definesGlobalState → ?
hasFoo + gitHotspotScore → ?
// ... para TODOS los 57+ campos de metadata
```

**3. Identificar patrones emergentes**:
```javascript
// Ejemplo de descubrimiento:
hasFoo + hasNetworkCalls + eventEmitters
= "foo-network-coordinator" pattern!

// Por qué importa:
// Archivos haciendo network calls con foo + emitiendo eventos
// están coordinando operaciones async entre componentes
// → Alto riesgo de race conditions
```

**4. Validar con Box Test**:
- ¿El patrón emergente revela CONEXIONES?
- Si SÍ → Agregar arquetipo
- Si NO → Solo metadata informativa

**5. Documentar en Metadata Insights Guide**:
- Agregar al catálogo de patrones
- Especificar criterios de detección
- Proveer código de ejemplo
- Estimar significancia

### Ejemplo Real: Temporal Patterns Extractor

Cuando agregamos `temporal-patterns.js`, descubrimos:

```javascript
// NUEVA METADATA:
- hasLifecycleHooks (de temporal-patterns.js)
- hasCleanupPatterns (de temporal-patterns.js)

// CROSS-REFERENCE:
hasLifecycleHooks + definesGlobalState
= "state-lifecycle-manager" pattern
→ Componentes inicializando estado en lifecycle hooks

hasLifecycleHooks + hasEventListeners + !hasCleanupPatterns
= "memory-leak-risk" pattern
→ Event listeners sin cleanup en lifecycle

hasLifecycleHooks + hasNetworkCalls + hasEventEmitters
= "data-fetching-component" pattern
→ Componente fetcheando y broadcasteando datos
```

**Sin verificación**: Perderíamos estos 3 patrones, solo descubiertos por LLM (caro) o peor, nunca (bugs en producción).

**Con verificación**: Patrones encontrados inmediatamente, agregados al registry (detección gratis), uso de LLM reducido 15-20%.

### La Insight Matrix

Mantener una matriz de combinaciones de metadata:

```
                | hasNetwork | hasEvents | definesState | hasLifecycle | gitHotspot
----------------|------------|-----------|--------------|--------------|------------
hasSideEffects  | network-hub| event-hub | state-mgr    | lifecycle-io | hotspot-io
hasComplexity   | api-heavy  | event-ord | complex-state| lifecycle-cmplx | critical-bottleneck
hasErrorHandling| resilient  | event-err | state-err    | lifecycle-err| battle-tested
hasCleanup      | -          | safe-evt  | safe-state   | safe-lifecycle| -
```

Cada celda es un **patrón potencial** para investigar.

---

## Pilar 3: Atomic Composition (Molecular Architecture)

### Principio
> *"Files (molecules) have NO metadata of their own - they are COMPOSED from the metadata of their functions (atoms)"*

### El Modelo Molecular (v0.6+)

```javascript
// SSOT: Single Source of Truth at Function Level
{
  "atoms": {
    "src/api.js::fetchUser": {
      "id": "src/api.js::fetchUser",
      "type": "atom",
      "parentMolecule": "src/api.js",
      
      // Atomic metadata (SSOT)
      "line": 15,
      "complexity": 35,
      "isExported": true,
      "hasNetworkCalls": true,
      "hasErrorHandling": false,
      "calls": ["validateToken"],
      "calledBy": ["UserCard.jsx::loadUser", "ProfilePage.jsx::init"],
      
      // Atomic archetype (detected statically)
      "archetype": {
        "type": "fragile-network",
        "severity": 8,
        "confidence": 1.0
      }
    }
  },
  
  "molecules": {
    "src/api.js": {
      "id": "src/api.js",
      "type": "molecule",
      "atoms": ["src/api.js::fetchUser", "src/api.js::validateToken"],
      
      // DERIVED (not stored - calculated from atoms):
      // "hasNetworkCalls": OR(atoms.hasNetworkCalls)
      // "totalComplexity": SUM(atoms.complexity)
      // "exportCount": COUNT(atoms.isExported)
      // "riskScore": MAX(atoms.archetype.severity)
    }
  }
}
```

### Derivation Rules

```javascript
// src/shared/derivation-engine.js
// No data duplication - everything derived from atoms

export const DerivationRules = {
  // Regla 1: Arquetipo molecular inferido de átomos
  moleculeArchetype: (atoms) => {
    const atomArchetypes = atoms.map(a => a.archetype?.type);
    
    if (atomArchetypes.includes('fragile-network') && 
        atoms.filter(a => a.hasNetworkCalls).length >= 2) {
      return { type: 'network-hub', severity: 8 };
    }
    if (atoms.every(a => !a.isExported)) {
      return { type: 'internal-module', severity: 3 };
    }
    // ... más reglas
  },
  
  // Regla 2: Complejidad molecular = suma de átomos
  moleculeComplexity: (atoms) => {
    return atoms.reduce((sum, atom) => sum + (atom.complexity || 0), 0);
  },
  
  // Regla 3: Riesgo molecular = máximo riesgo atómico
  moleculeRisk: (atoms) => {
    return Math.max(...atoms.map(a => a.archetype?.severity || 0));
  }
};
```

### Por qué es Poderoso

| Aspecto | Antes (Single Scale) | Después (Molecular) |
|---------|---------------------|---------------------|
| **Precisión** | "Archivo api.js afecta 30 imports" | "Función fetchUser afecta 12 call sites" |
| **Eficiencia** | Modificar función → invalidar cache de archivo | Modificar función → invalidar SOLO cache de función |
| **Composability** | Detectores solo funcionan a nivel archivo | Mismo detector funciona en átomos Y moléculas |
| **Escalabilidad** | Clases, módulos, packages no tienen patrón | Todos siguen el mismo patrón |

### Arquetipos Atómicos (detectados 100% estáticamente)

- `god-function`: complexity > 20 && lines > 100
- `fragile-network`: fetch/axios sin try/catch
- `hot-path`: exported && calledBy.length > 5
- `dead-function`: !exported && calledBy.length === 0
- `utility`: !hasSideEffects && complexity < 5

---

## Pilar 4: Fractal Architecture (Recursive A→B→C)

### Principio
> *"The A→B→C pattern repeats at every scale of the system"*

### El Patrón Recursivo

La misma arquitectura de tres capas aplica a funciones, archivos, módulos y sistemas:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCALE 1: FUNCTIONS (Atoms)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer A (Static): Parse functions, extract calls, calculate complexity │
│       ↓                                                                 │
│  Layer B (Detection): Atomic archetypes (god-function, dead-code)       │
│       ↓                                                                 │
│  Layer C (Decision): Need LLM? Only if metadata insufficient            │
│           → 98% bypass, 2% LLM                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ DERIVES
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCALE 2: FILES (Molecules)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer A (Static): Compose atoms → exports, imports, connections        │
│       ↓                                                                 │
│  Layer B (Detection): Molecular archetypes (network-hub, god-object)    │
│       ↓                                                                 │
│  Layer C (Decision): Need LLM? Only if metadata insufficient            │
│           → 90% bypass, 10% LLM                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ DERIVES  
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCALE 3: MODULES/CLUSTERS                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Layer A (Static): Graph of files → clusters, cycles, APIs              │
│       ↓                                                                 │
│  Layer B (Detection): Architecture patterns (monolith, microservices)   │
│       ↓                                                                 │
│  Layer C (Decision): Need LLM? Only if patterns ambiguous               │
│           → 95% bypass, 5% LLM                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Confidence-Based Bypass en Cada Nivel

Cada nivel implementa la misma lógica de decisión:

```javascript
// Universal decision function (works at any scale)
function shouldUseLLM(entity, metadata, confidenceThreshold = 0.8) {
  // Layer A: ¿Tenemos suficiente metadata?
  if (!metadata || metadata.quality < confidenceThreshold) {
    return { needsLLM: true, reason: 'insufficient_metadata' };
  }
  
  // Layer B: ¿Podemos determinar el patrón con confianza?
  const { confidence, evidence } = calculateConfidence(metadata);
  
  if (confidence >= confidenceThreshold) {
    return { 
      needsLLM: false, 
      reason: 'sufficient_evidence',
      confidence,
      evidence
    };
  }
  
  // Layer C: Necesitamos análisis más profundo
  return { 
    needsLLM: true, 
    reason: 'low_confidence',
    confidence,
    evidence
  };
}
```

### Ejemplo: Cálculo de Confianza

```javascript
// Para arquetipo god-object a nivel archivo
const calculateConfidence = (metadata) => {
  let confidence = 0;
  const evidence = [];
  
  // Evidencia de exports
  if (metadata.exportCount > 15) {
    confidence += 0.3;
    evidence.push(`exports:${metadata.exportCount}`);
  }
  
  // Evidencia de dependencias
  const totalDeps = (metadata.dependentCount || 0) + 
                    (metadata.semanticDependentCount || 0);
  if (totalDeps > 20) {
    confidence += 0.3;
    evidence.push(`dependents:${totalDeps}`);
  }
  
  // Evidencia de composición atómica
  const hasGodFunction = metadata.atoms?.some(
    a => a.archetype?.type === 'god-function'
  );
  if (hasGodFunction) {
    confidence += 0.4;
    evidence.push('has-god-function');
  }
  
  return { confidence, evidence };
};

// Decisión:
// confidence >= 0.8 → Bypass LLM (estamos seguros es god-object)
// confidence < 0.8 → Usar LLM (necesitamos verificar)
```

### Beneficios del Diseño Fractal

| Aspecto | Antes (Single Scale) | Después (Fractal) |
|---------|---------------------|---------------------|
| LLM Usage | 30% de archivos | 10% de archivos |
| Precisión | File-level | Function-level |
| Cache Invalidation | Archivo completo | Función individual |
| Pattern Detection | 11 arquetipos | 11 + 7 atómicos = 18 |
| Explanations | "LLM dice..." | "Evidence: X, Y, Z" |

---

## 📊 Evolución del Sistema

### Los 4 Pilares se Construyen Uno sobre Otro

```
Pilar 1: Box Test
    ↓
    "Focus on connections, not attributes"
    ↓
Pilar 2: Metadata Insights Verification
    ↓
    "Combine metadata to find patterns"
    ↓
Pilar 3: Atomic Composition
    ↓
    "Apply pillars 1-2 at function level"
    ↓
Pilar 4: Fractal Architecture
    ↓
    "Apply pillars 1-3 recursively at all scales"
```

### Evolución por Versión

| Versión | Pilares | Innovación Clave | LLM Bypass |
|---------|---------|------------------|------------|
| v0.5.0 | 1-2 | Box Test + Metadata Insights | 70% |
| v0.5.4 | 1-2 | 8 nuevos extractores, 57 campos metadata | 85% |
| v0.6.0 | 1-4 | Molecular architecture + Fractal A→B→C | 90% |

---

## 🎓 Guías de Aplicación

### Para Agregar Nuevos Extractores

**SIEMPRE seguir este checklist**:

1. ✅ Implementar lógica del extractor
2. ✅ Correr Metadata Insights Verification (cross-reference TODOS los campos existentes)
3. ✅ Documentar patrones descubiertos en `METADATA-INSIGHTS-GUIDE.md`
4. ✅ Para cada patrón, aplicar Box Test
5. ✅ Agregar arquetipos válidos a `PROMPT_REGISTRY.js`
6. ✅ Actualizar `constants.js` con nuevos campos opcionales
7. ✅ Actualizar `prompt-builder.js` para exponer campos al LLM

### Para Agregar Nuevos Arquetipos

**SIEMPRE aplicar Box Test primero**:

```javascript
// Arquetipo propuesto: "uses-lodash"
detector: (metadata) => metadata.imports.includes('lodash')

// Box Test Question:
"Does knowing a file uses lodash tell me how it CONNECTS to other files?"

// Respuesta: NO
- Lodash es detalle de implementación interno
- No revela coupling entre archivos
- ❌ RECHAZAR arquetipo

// Counter-example: "lodash-chain-coordinator"
detector: (metadata) =>
  metadata.imports.includes('lodash') &&
  metadata.hasNetworkCalls &&
  metadata.externalCallCount > 5

// Box Test Question:
"Does knowing a file coordinates lodash chains with network calls tell me about connections?"

// Respuesta: MAYBE
- Si múltiples archivos usan lodash chains sobre datos compartidos → YES
- Si solo un archivo usando lodash internamente → NO
- Need semantic analysis to determine
- → Hacer requiresLLM: 'conditional'
```

### Para Code Reviews

**Checklist para reviewers**:

- [ ] Si se agrega extractor: ¿Corrieron Metadata Insights Verification?
- [ ] Si se agrega arquetipo: ¿Aplicaron Box Test? (debe estar en commit message)
- [ ] Si se modifica detector: ¿Chequearon impacto en patrones derivados?
- [ ] ¿Nuevos campos de metadata documentados en `constants.js`?
- [ ] ¿Nuevos patrones documentados en `METADATA-INSIGHTS-GUIDE.md`?
- [ ] ¿El cambio sigue el patrón Fractal A→B→C?

---

## 📈 Métricas de Éxito

### Salud del Sistema

**Buenos indicadores**:
- Count de arquetipos estable o creciendo lentamente (~1-2 por quarter)
- Uso de LLM decreciendo a medida que mejora metadata
- Catálogo de patrones creciendo más rápido que count de arquetipos
- Tasa de falsos positivos < 5%
- Confidence scores > 0.8 para 90% de detecciones

**Malos indicadores**:
- Explosión de arquetipos (>30 arquetipos)
- Muchos arquetipos con requiresLLM: true (deberían ser conditional)
- Campos de metadata no siendo cross-referenciados
- Catálogo de patrones estancado
- Confidence scores bajos (<0.5) comunes

---

## 🔗 Documentación Relacionada

- [philosophy.md](./philosophy.md) - Visión física y AGI
- [Arquitectura de 3 Capas](../architecture/ARCHITECTURE_LAYER_A_B.md) - Implementación
- [Sistema de Arquetipos](../architecture/ARCHETYPE_SYSTEM.md) - Catálogo completo
- [Guía de Desarrollo de Arquetipos](../architecture/ARCHETYPE_DEVELOPMENT_GUIDE.md) - Paso a paso

---

**Última actualización**: 2026-02-12  
**Maintainer**: OmnySys Team  
**Status**: Active - Foundation of all development
