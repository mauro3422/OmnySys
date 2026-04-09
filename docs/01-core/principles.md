# Los 4 Pilares de OmnySys

**Documento**: principles.md
**Versión**: v0.9.434
**Estado**: ✅ Fundamentos activos - **100% Estático, 0% LLM**
**Última actualización**: 2026-04-09

---

## 🎯 Resumen Ejecutivo

OmnySys se basa en **4 pilares fundamentales** que guían cada decisión de diseño:

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

**IMPORTANTE**: Todos los pilares se implementan con **análisis estático** (AST + regex + álgebra de grafos). **CERO uso de LLM**.

---

## Pilar 1: The Box Test (Archetype Validation)

### Principio
> *"Un arquetipo debe revelar CONEXIONES invisibles entre archivos"*

### El Test

Antes de agregar cualquier arquetipo, pregúntate:

> **"¿Esto me dice algo sobre cómo este archivo se CONECTA con otros archivos?"**

- ✅ **SÍ** → Candidato válido a arquetipo
- ❌ **NO** → Metadata informativa, NO un arquetipo

### Ejemplos Reales (v0.9.61)

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

**NOTA**: No usamos LLM. Los arquetipos se detectan con reglas estáticas (AST + regex).

---

## Pilar 2: Metadata Insights Verification

### Principio
> *"Cada nuevo extractor de metadata debe ser verificado contra metadata existente para descubrir patrones emergentes"*

### El Proceso de Verificación

**Al agregar un nuevo extractor** (ej: `temporal-patterns.js`):

**1. Documentar nuevos campos**:
```javascript
// temporal-patterns.js produce:
- hasLifecycleHooks: boolean
- hasCleanupPatterns: boolean
- temporalComplexity: number
```

**2. Cross-referenciar con TODA la metadata existente**:
```javascript
// Matrix check:
hasLifecycleHooks + hasNetworkCalls → ?
hasLifecycleHooks + hasEventListeners → ?
hasLifecycleHooks + definesGlobalState → ?
// ... para TODOS los 57+ campos de metadata
```

**3. Identificar patrones emergentes**:
```javascript
// Ejemplo de descubrimiento:
hasLifecycleHooks + hasEventListeners + !hasCleanupPatterns
= "memory-leak-risk" pattern!

// Por qué importa:
// Event listeners sin cleanup en lifecycle hooks
// → Alto riesgo de memory leaks
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

**Con verificación**: Patrones encontrados inmediatamente, agregados al registry (detección gratis), 0% uso de LLM.

---

## Pilar 3: Atomic Composition (Molecular Architecture)

### Principio
> *"Los archivos (moléculas) NO tienen metadata propia - se COMPONE de la metadata de sus funciones (átomos)"*

### El Modelo Molecular (v0.9.61)

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

- `god-function`: complexity > 20 && linesOfCode > 100
- `fragile-network`: fetch/axios sin try/catch
- `hot-path`: exported && calledBy.length > 5
- `dead-function`: !exported && calledBy.length === 0
- `utility`: !hasSideEffects && complexity < 5

**Todos detectados con AST + regex, SIN LLM.**

---

## Pilar 4: Fractal Architecture (Recursive A→B→C)

### Principio
> *"El patrón A→B→C se repite en cada escala del sistema"*

### El Patrón Recursivo

La misma arquitectura de tres capas aplica a funciones, archivos, módulos y sistemas:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCALE 1: FUNCTIONS (Atoms)                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer A (Static): Parse functions, extract calls, complexity   │
│       ↓                                                         │
│  Layer B (Detection): Atomic archetypes (100% estático)         │
│       ↓                                                         │
│  Layer C (Decision): Need more analysis? Add extractors         │
│           → 100% bypass, 0% LLM                                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ DERIVES
┌─────────────────────────────────────────────────────────────────┐
│                    SCALE 2: FILES (Molecules)                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer A (Static): Compose atoms → exports, imports, conns      │
│       ↓                                                         │
│  Layer B (Detection): Molecular archetypes (100% estático)      │
│       ↓                                                         │
│  Layer C (Decision): Need more analysis? Add extractors         │
│           → 100% bypass, 0% LLM                                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ DERIVES
┌─────────────────────────────────────────────────────────────────┐
│                    SCALE 3: MODULES/CLUSTERS                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer A (Static): Graph of files → clusters, cycles, APIs      │
│       ↓                                                         │
│  Layer B (Detection): Architecture patterns (100% estático)     │
│       ↓                                                         │
│  Layer C (Decision): Need more analysis? Add extractors         │
│           → 100% bypass, 0% LLM                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Function (100% Estática)

```javascript
// Universal decision function (works at any scale)
function shouldUseLLM(entity, metadata, confidenceThreshold = 0.8) {
  // NOTA: Esta función es HISTÓRICA.
  // En v0.9.61+, NUNCA usamos LLM.
  // Si hay incertidumbre, agregamos más extractores estáticos.
  
  return {
    needsLLM: false,
    reason: 'LLM deprecated since v0.9.61',
    suggestion: 'Add more static extractors or improve patterns'
  };
}
```

### Beneficios del Diseño Fractal

| Aspecto | Antes (Single Scale) | Después (Fractal) |
|---------|---------------------|---------------------|
| LLM Usage | 30% de archivos | 0% - DEPRECATED |
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

| Versión | Pilares | Innovación Clave | LLM Usage |
|---------|---------|------------------|-----------|
| v0.5.0 | 1-2 | Box Test + Metadata Insights | 30% |
| v0.6.0 | 1-4 | Molecular architecture + Fractal A→B→C | 10% |
| v0.9.0 | 1-4 | SQLite migration + bulk operations | 5% |
| v0.9.61 | 1-4 | **Dead Code Detection 85% preciso** | **0%** ✅ |
| v0.9.285+ | 1-4 | Propagation Engine + Control Plane + 45 MCP Tools | **0%** ✅ |
| v0.9.434 | 1-4 | **14,241 átomos · 2,813 archivos · 45 tools** | **0%** ✅ |

---

## 🎓 Guías de Aplicación

### Para Agregar Nuevos Extractores

**SIEMPRE seguir este checklist**:

1. ✅ Implementar lógica del extractor (AST + regex)
2. ✅ Correr Metadata Insights Verification (cross-reference TODOS los campos existentes)
3. ✅ Documentar patrones descubiertos
4. ✅ Para cada patrón, aplicar Box Test
5. ✅ Agregar arquetipos válidos al registry
6. ✅ Actualizar constantes con nuevos campos opcionales
7. ✅ Actualizar derivation engine para exponer campos

**NOTA**: NO usar LLM. Si hay incertidumbre, mejorar los extractores estáticos.

### Para Agregar Nuevos Arquetipos

**SIEMPRE aplicar Box Test primero**:

```javascript
// Arquetipo propuesto: "uses-lodash"
detector: (metadata) => metadata.imports.includes('lodash')

// Box Test Question:
"¿Saber que un archivo usa lodash me dice cómo se CONECTA con otros archivos?"

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
"¿Saber que un archivo coordina lodash chains con network calls me dice sobre conexiones?"

// Respuesta: MAYBE
- Si múltiples archivos usan lodash chains sobre datos compartidos → YES
- Si solo un archivo usando lodash internamente → NO
- Need more static analysis to determine
- → Agregar más extractores estáticos, NO LLM
```

### Para Code Reviews

**Checklist para reviewers**:

- [ ] Si se agrega extractor: ¿Corrieron Metadata Insights Verification?
- [ ] Si se agrega arquetipo: ¿Aplicaron Box Test? (debe estar en commit message)
- [ ] Si se modifica detector: ¿Chequearon impacto en patrones derivados?
- [ ] ¿Nuevos campos de metadata documentados?
- [ ] ¿Nuevos patrones documentados?
- [ ] ¿El cambio sigue el patrón Fractal A→B→C?
- [ ] **¿Hay algún uso de LLM?** (debe ser ❌ NO)

---

## 📈 Métricas de Éxito

### Salud del Sistema

**Buenos indicadores**:
- Count de arquetipos estable o creciendo lentamente (~1-2 por quarter)
- Uso de LLM: **0%** (DEPRECATED desde v0.9.61)
- Catálogo de patrones creciendo más rápido que count de arquetipos
- Tasa de falsos positivos < 5%
- Confidence scores > 0.8 para 90% de detecciones

**Malos indicadores**:
- Explosión de arquetipos (>30 arquetipos)
- Muchos arquetipos con `requiresLLM: true` (DEBE SER 0)
- Campos de metadata no siendo cross-referenciados
- Catálogo de patrones estancado
- Confidence scores bajos (<0.5) comunes

---

## 🔗 Documentación Relacionada

- [philosophy.md](./philosophy.md) - Visión física y AGI (100% estático)
- [Arquitectura de 3 Capas](../02-architecture/core.md) - Implementación (SIN LLM)
- [Sistema de Arquetipos](../02-architecture/archetypes.md) - Catálogo completo (DETECTADO ESTÁTICAMENTE)
- [Guía de Desarrollo de Arquetipos](../06-reference/development/modular-architecture-guide.md) - Paso a paso (SIN LLM)

---

**Última actualización**: 2026-04-09 (v0.9.434)
**Maintainer**: OmnySys Team
**Status**: Active - **100% Estático, 0% LLM**
