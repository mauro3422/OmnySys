---
?? **DOCUMENTO CONSOLIDADO**

Este documento ha sido integrado en:
- docs/02-architecture/data-flow/ (conceptos de extracción atómica)
- docs/06-reference/technical/ (detalles de implementación)

**Motivo**: Consolidación de documentación de arquitectura molecular.

---
# Arquitectura Molecular: OmnySys v0.6.0

**Fecha**: 2026-02-08
**Version**: v0.6.0
**Estado**: IMPLEMENTADO Y ESTABLE
**Guia**: Este documento describe los conceptos fundamentales de la arquitectura molecular. Para detalles de implementacion, ver `ARCHITECTURE_MOLECULAR_IMPLEMENTATION.md`.

---

## Resumen Ejecutivo

Este documento captura la evolucion arquitectonica de OmnySys hacia un modelo **molecular** donde las funciones (atomos) son la unidad primaria de analisis y los archivos (moleculas) son composiciones derivadas de sus atomos.

**Principio Fundamental**: *"Los archivos no tienen metadata propia, se COMPONEN de la metadata de sus funciones"*

---

## Problema Original

### La Dilema: Archivo o Funcion como Unidad Atomica?

**Opcion 1 - Archivo-only (sistema actual)**
- Simple, rapido, escala bien
- Pierde granularidad (que funcion especifica rompe?)

**Opcion 2 - Funcion-full LLM**
- Maxima precision
- Explosion de datos: 100 archivos x 5 funciones = 500 entidades
- Complejidad del grafo enorme
- Overhead de LLM imposible

**Solucion - Enfoque Hibrido Molecular**
- Precision de funcion cuando se necesita
- Escala como archivo (mismo costo proporcional)
- Zero duplicacion de datos/logica
- Mismo principio: metadata estatica + detectores + LLM selectivo

---

## Arquitectura Molecular

### Conceptos Clave

| Concepto | Definicion | Analogia |
|----------|------------|----------|
| **Atomo** | Funcion individual | Un atomo quimico |
| **Molecula** | Archivo (composicion de atomos) | Una molecula (H2O = 2H + 1O) |
| **Derivacion** | Metadata de molecula calculada desde atomos | Propiedades emergentes |

### Estructura de Datos (SSOT)

```javascript
// Estructura molecular - Single Source of Truth
{
  // =============================================
  // NIVEL ATOMICO (SSOT - Donde vive la verdad)
  // =============================================
  "atoms": {
    "src/api.js::fetchUser": {
      "id": "src/api.js::fetchUser",
      "type": "atom",
      "parentMolecule": "src/api.js",

      // SSOT: Metadata atomica (solo existe aqui)
      "line": 15,
      "complexity": 35,
      "isExported": true,
      "hasNetworkCalls": true,
      "hasErrorHandling": false,
      "calls": ["validateToken"],
      "calledBy": ["UserCard.jsx::loadUser", "ProfilePage.jsx::init"],

      // Archetype atomico (detectado estaticamente)
      "archetype": {
        "type": "fragile-gateway",
        "severity": 8,
        "confidence": 1.0
      }
    },

    "src/api.js::internalHelper": {
      "id": "src/api.js::internalHelper",
      "type": "atom",
      "parentMolecule": "src/api.js",

      "line": 45,
      "complexity": 8,
      "isExported": false,
      "hasNetworkCalls": false,
      "calledBy": ["src/api.js::fetchUser"],

      "archetype": {
        "type": "private-utility",
        "severity": 2,
        "confidence": 1.0
      }
    }
  },

  // =============================================
  // NIVEL MOLECULAR (Derivado de atomos)
  // =============================================
  "molecules": {
    "src/api.js": {
      "id": "src/api.js",
      "type": "molecule",

      // Solo referencias a atomos
      "atoms": [
        "src/api.js::fetchUser",
        "src/api.js::internalHelper"
      ],

      // Metadata DERIVADA (computed, no almacenada duplicada)
      // Se calcula en tiempo de consulta desde los atomos
      "derived": {
        "archetype": "network-hub",           // <- Inferido de atomos
        "totalComplexity": 43,                 // <- Sumado de atomos
        "exportCount": 1,                      // <- Contado de atomos exportados
        "hasNetworkCalls": true,               // <- OR de atomos
        "riskScore": 8.0                       // <- MAX de atomos
      }
    }
  }
}
```

### Reglas de Derivacion

```javascript
// src/shared/derivation-engine.js
// Ningun dato se duplica, todo se deriva de atomos

export const DerivationRules = {
  // Regla 1: Archetype molecular se infiere de atomos
  moleculeArchetype: (atoms) => {
    const atomArchetypes = atoms.map(a => a.archetype?.type);

    if (atomArchetypes.includes('fragile-gateway') &&
        atoms.filter(a => a.hasNetworkCalls).length >= 2) {
      return { type: 'network-hub', severity: 8 };
    }
    if (atoms.every(a => !a.isExported)) {
      return { type: 'internal-module', severity: 3 };
    }
    // ... more rules
  },

  // Regla 2: Complejidad molecular = suma de atomos
  moleculeComplexity: (atoms) => {
    return atoms.reduce((sum, atom) => sum + (atom.complexity || 0), 0);
  },

  // Regla 3: Riesgo molecular = maximo riesgo atomico
  moleculeRisk: (atoms) => {
    return Math.max(...atoms.map(a => a.archetype?.severity || 0));
  },

  // Regla 4: Exports molecular = atomos exportados
  moleculeExports: (atoms) => {
    return atoms.filter(a => a.isExported).map(a => a.name);
  },

  // Regla 5: Network calls = OR de atomos
  moleculeHasNetworkCalls: (atoms) => {
    return atoms.some(a => a.hasNetworkCalls);
  }
};
```

---

## Detectores de Patrones (Reutilizables)

### Principio: Una Logica, Dos Niveles

```javascript
// src/shared/detectors/pattern-detectors.js
// Detectores que funcionan para atomos Y moleculas

export const PatternDetectors = {
  // Detector generico de complejidad
  complexity: (entity) => {
    if (entity.type === 'atom') {
      // Es funcion: cyclomatic complexity del AST
      return calculateCyclomatic(entity.ast);
    } else {
      // Es archivo: derivado de atomos
      return entity.atoms.reduce((sum, atom) => sum + atom.complexity, 0);
    }
  },

  // Detector generico de network calls
  networkUsage: (entity) => {
    if (entity.type === 'atom') {
      // Es funcion: buscar fetch/axios en su AST
      return detectNetworkInFunction(entity.ast);
    } else {
      // Es archivo: OR logico de atomos
      return entity.atoms.some(atom => atom.hasNetworkCalls);
    }
  },

  // Detector generico de dead code
  deadCode: (entity, context) => {
    if (entity.type === 'atom') {
      // Funcion no exportada y no llamada -> dead
      return !entity.isExported && entity.calledBy.length === 0;
    } else {
      // Archivo: ningun atomo exportado es usado externamente
      const exportedAtoms = entity.atoms.filter(a => a.isExported);
      return exportedAtoms.every(atom =>
        atom.calledBy.every(caller => caller.startsWith(entity.id))
      );
    }
  },

  // Detector de god-entity (mismo algoritmo, diferente threshold)
  godEntity: (entity) => {
    const threshold = entity.type === 'atom' ? 50 : 500;
    const connections = entity.type === 'atom'
      ? entity.calledBy.length + entity.calls.length
      : entity.atoms.reduce((sum, a) => sum + a.calledBy.length, 0);

    return connections > threshold || entity.complexity > (threshold / 2);
  }
};
```

### Detectores Especificos de Funcion (100% Estaticos)

```javascript
// Detectores de arquetipos a nivel funcion (sin LLM)

function detectFunctionArchetype(func) {
  // 1. God Function
  if (func.complexity > 20 && func.lines > 100) {
    return {
      type: 'god-function',
      severity: 9,
      confidence: 1.0,
      reason: `${func.lines} lines, complexity ${func.complexity}`
    };
  }

  // 2. Dead Function
  if (!func.isExported && func.callers.length === 0) {
    return {
      type: 'dead-function',
      severity: 5,
      confidence: 1.0,
      reason: 'Not exported and nobody calls it'
    };
  }

  // 3. IO-Heavy without error handling
  if (func.externalCalls.includes('fetch') && !func.hasErrorHandling) {
    return {
      type: 'fragile-network',
      severity: 8,
      confidence: 1.0,
      reason: 'Makes fetch without try/catch'
    };
  }

  // 4. Hot Path
  if (func.callers.length > 20 && func.isExported) {
    return {
      type: 'hot-path',
      severity: 6,
      confidence: 1.0,
      reason: `Called from ${func.callers.length} places`
    };
  }

  // 5. Recursive
  if (func.calls.includes(func.name)) {
    return {
      type: 'recursive',
      severity: 4,
      confidence: 1.0
    };
  }

  return { type: 'standard', severity: 1, confidence: 1.0 };
}
```

### When to use LLM at Function Level?

```javascript
// Only when static detectors CANNOT determine

function needsLLMForFunction(func, fileContext) {
  return (
    // Case 1: Complex business semantics
    (func.archetype?.type === 'recursive' && func.complexity > 50) ||

    // Case 2: Non-obvious side effects
    (func.hasNetworkCalls && func.hasSideEffects === 'unknown') ||

    // Case 3: Semantic coupling (same logic, different code)
    (fileContext.archetype === 'potential-duplicate-code') ||

    // Case 4: Security-critical
    (func.handlesAuthentication === true && func.complexity > 30) ||

    // Case 5: Low confidence in static detector
    (func.archetype?.confidence < 0.8)
  );
}

// Estimate: Only ~2-5% of functions would need LLM
```

---

## Principios de Diseno

### 1. Single Source of Truth (SSOT)
- Metadata exists ONCE: in the atom
- Molecules are indexes, they don't duplicate data

### 2. Pure Derivation
- All molecule metadata is calculated from atoms
- No "hardcoding" of molecular metadata

### 3. Composition over Inheritance
- Molecule = Composition of atoms
- Class = Composition of methods (atoms)

### 4. Lazy Evaluation
- Derivations are calculated on demand
- Cache to avoid recomputation

### 5. Uniformity
- Same detector works for atom or molecule
- Same hybrid principle at both levels

---

## References

- `docs/ARCHITECTURE.md` - Base architecture of OmnySys
- `docs/FUTURE_IDEAS.md` - Future ideas including Semantic Pattern Engine
- `src/layer-b-semantic/prompt-engine/PROMPT_REGISTRY.js` - Existing archetypes
- `src/layer-a-static/extractors/metadata/call-graph.js` - Current function extraction
- `docs/ARCHITECTURE_MOLECULAR_IMPLEMENTATION.md` - Implementation details, pipeline, roadmap

---

**Autor**: Claude + Mauro (discussion 2026-02-08)

