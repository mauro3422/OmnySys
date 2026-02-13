# Ciclo de Vida - Nacimiento, Vida, Muerte, Renacimiento

**Versión**: v0.7.1  
**Sistema**: Shadow Registry - Layer A/B/C  
**Estado**: Implementado

---

## Overview

El Shadow Registry gestiona el **ciclo de vida evolutivo** de los átomos:

```
FASE 0: NACIMIENTO → Extracción de ADN
     ↓
FASE 1: VIDA → Átomo enriquecido con ancestry
     ↓
FASE 2: MUERTE → Creación de sombra
     ↓
FASE 3: RENACIMIENTO → Herencia de sombra a nuevo átomo
```

---

## FASE 0: Nacimiento (Extracción)

Cuando un archivo se crea o modifica:

```
📄 Archivo.js creado/modificado
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER A: Extracción (determinístico 100%)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. AST Parsing (Babel)                                      │
│    └── functions[], imports[], exports[]                    │
│                                                             │
│ 2. Data Flow Extraction                                     │
│    └── inputs[], transformations[], outputs[]               │
│    └── analysis: { coherence, coverage }                    │
│                                                             │
│ 3. DNA Extraction                                           │
│    ├── structuralHash (fingerprint I/O/T)                   │
│    ├── patternHash (patrón estandarizado)                   │
│    ├── flowType (categoría)                                 │
│    └── operationSequence (firma de comportamiento)          │
│                                                             │
│ OUTPUT: Átomo crudo con dataFlow + dna                      │
└─────────────────────────────────────────────────────────────┘
```

### Output de Fase 0

```javascript
// Átomo recién extraído
{
  id: "src/api.js::processOrder",
  name: "processOrder",
  filePath: "src/api.js",
  
  // Data Flow
  dataFlow: {
    inputs: [{ name: 'order' }, { name: 'userId' }],
    transformations: [...],
    outputs: [{ type: 'return' }]
  },
  
  // DNA
  dna: {
    structuralHash: "abc123...",
    patternHash: "def456...",
    flowType: "read-transform-persist",
    operationSequence: ["receive", "read", "transform", "persist", "return"]
  }
}
```

---

## FASE 1: Vida (Archivo en uso)

El átomo existe y está activo. Se enriquece con ancestry.

```
Átomo crudo (FASE 0)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER B: Validación & Enriquecimiento                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Lineage Validator                                        │
│    ├── ¿Estructura válida? (dataFlow completo)              │
│    ├── ¿DNA válido? (todos los campos)                      │
│    ├── ¿Coherencia? (semantic coincide con ops)             │
│    └── Confidence: high/medium/low                          │
│                                                             │
│ 2. Shadow Registry - Enriquecimiento                        │
│    ├── findSimilar(atom) → buscar sombras                   │
│    │   └── compareDNA(dna, shadow.dna) > 0.85?              │
│    ├── Si match: enrichWithAncestry(atom)                   │
│    │   └── ancestry: {                                      │
│    │       replaced: shadowId,                              │
│    │       lineage: [shadowId, parent, grandparent],        │
│    │       generation: N,                                   │
│    │       vibrationScore: 0.73,                            │
│    │       strongConnections: [...],                        │
│    │       warnings: ["3 conexiones rotas"]                 │
│    │   }                                                     │
│    └── Si NO match: génesis (generation: 0)                 │
│                                                             │
│ OUTPUT: Átomo VALIDADO y ENRIQUECIDO                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER C: Persistencia                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Guardar átomo en .omnysysdata/atoms/                     │
│    └── { ...atom, ancestry, _meta }                         │
│                                                             │
│ 2. Actualizar índice principal                              │
│    └── index.json: { fileIndex, metadata }                  │
│                                                             │
│ OUTPUT: Sistema actualizado con conexiones vibrantes        │
└─────────────────────────────────────────────────────────────┘
```

### Output de Fase 1

```javascript
// Átomo vivo (enriquecido)
{
  id: "src/api.js::processOrder",
  name: "processOrder",
  filePath: "src/api.js",
  
  // Data Flow
  dataFlow: { inputs, transformations, outputs },
  
  // DNA
  dna: { structuralHash, patternHash, flowType, ... },
  
  // Ancestry (Shadow Registry)
  ancestry: {
    replaced: "shadow_abc",              // Antepasado directo
    lineage: ["shadow_def", "shadow_abc"], // Árbol genealógico
    generation: 2,                        // Generación
    vibrationScore: 0.73,                 // Intensidad heredada
    strongConnections: [                  // Conexiones históricas
      { target: "routes.js", weight: 0.9 }
    ],
    warnings: ["3 conexiones del pasado no migraron"]
  },
  
  // Conexiones (cables)
  connections: {
    imports: [...],
    exports: [...],
    semantic: [...],   // events, storage, etc.
    dataFlow: [...],   // chains cross-function
    inherited: [...]   // De ancestry
  }
}
```

---

## FASE 2: Muerte (Archivo borrado)

Cuando un archivo se elimina, sus átomos se convierten en sombras.

```
🗑️  Archivo.js borrado
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER C: Shadow Registry (Preservación)                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Obtener átomos del archivo (antes de borrar)             │
│    └── atoms = getAtomsForFile(filePath)                    │
│                                                             │
│ 2. Para cada átomo: Crear Sombra                            │
│    └── shadow = createShadow(atom, {                        │
│        reason: 'file_deleted',                              │
│        diedAt: new Date()                                   │
│    })                                                        │
│                                                             │
│    Sombra incluye:                                          │
│    ├── shadowId (único permanente)                          │
│    ├── originalId (referencia histórica)                    │
│    ├── dna (fingerprint completo)                           │
│    ├── metadata (resumen)                                   │
│    ├── lineage (parent/children/generation)                 │
│    ├── inheritance (datos heredables)                       │
│    └── death (razón, commits, riesgo)                       │
│                                                             │
│ 3. Guardar sombra en .omnysysdata/shadows/                  │
│    └── shadow_{id}.json                                     │
│                                                             │
│ OUTPUT: ADN preservado para futuras generaciones            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ LIMPIEZA: Remover de HOT storage                            │
├─────────────────────────────────────────────────────────────┤
│ - Remover de index.json (archivos vivos)                    │
│ - Borrar .omnysysdata/files/{file}.json                     │
│ - Borrar .omnysysdata/atoms/{file}/*                        │
│ - Limpiar system-map (conexiones)                           │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Sombra

```javascript
{
  // Identidad
  shadowId: "shadow_mlfm3gte_fwv7",      // ID único permanente
  originalId: "src/api.js::processCart", // ID original (histórico)
  status: "deleted",                     // o "replaced"

  // Tiempos
  bornAt: "2026-01-15T10:00:00Z",
  diedAt: "2026-02-09T20:15:00Z",
  lifespan: 25,                          // días

  // ADN (fingerprint para matching)
  dna: { /* ADN completo del átomo */ },

  // Metadata resumida
  metadata: {
    name: "processCart",
    dataFlow: { inputCount, outputCount, transformationCount },
    semantic: { verb: "process", domain: "cart", entity: "cart" },
    filePath: "src/api.js",
    lineNumber: 42,
    isExported: true
  },

  // Linaje genealógico
  lineage: {
    parentShadowId: "shadow_abc",        // De qué evolucionó
    childShadowIds: ["shadow_xyz"],      // Qué evolucionó de esta
    generation: 2,                       // Generación (0 = génesis)
    evolutionType: "domain_change"       // Tipo de evolución
  },

  // Herencia (datos que pasan a descendientes)
  inheritance: {
    connections: [                       // Conexiones históricas
      { target: "routes.js", weight: 0.9 }
    ],
    connectionCount: 12,
    vibrationScore: 0.73,                // Intensidad de vibración
    rupturedConnections: []              // Conexiones que se rompieron
  },

  // Información de muerte
  death: {
    reason: "refactor_business_logic",   // o "file_deleted", "replaced"
    commitsInvolved: ["a1b2c3d"],
    riskIntroduced: 0.4                  // Riesgo estimado del cambio
  }
}
```

---

## FASE 3: Renacimiento (Reemplazo detectado)

Cuando se crea una función similar a una sombra existente.

```
📄 Nuevo archivo.js creado (función similar)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ DETECCIÓN DE PARENTESCO                                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Extraer átomo (FASE 0)                                   │
│    └── atom con dna                                         │
│                                                             │
│ 2. Buscar sombras similares                                 │
│    └── matches = findSimilar(atom, minSimilarity: 0.85)     │
│                                                             │
│ 3. Si hay match > 0.85:                                     │
│    ├── Validar match (no falso positivo)                    │
│    ├── Propagar herencia:                                   │
│    │   atom.ancestry = {                                    │
│    │     replaced: match.shadow.shadowId,                   │
│    │     lineage: [match.shadow.shadowId, ...ancestors],    │
│    │     generation: match.shadow.lineage.generation + 1    │
│    │     vibrationScore: match.shadow.inheritance.vibration,│
│    │     strongConnections: filterByExistence(...),         │
│    │     warnings: generateWarnings(...)                    │
│    │   }                                                     │
│    └── Marcar sombra como "replaced"                        │
│        └── shadow.replacedBy = atom.id                      │
│                                                             │
│ 4. Si NO hay match:                                         │
│    └── atom.ancestry = { generation: 0 }  // Génesis        │
│                                                             │
│ OUTPUT: Átomo vivo con historia (o como nueva criatura)     │
└─────────────────────────────────────────────────────────────┘
```

### Ejemplo de Renacimiento

```javascript
// Sombra existente (processCart borrado)
const shadow = {
  shadowId: "shadow_old123",
  originalId: "src/cart.js::processCart",
  dna: { structuralHash: "abc...", patternHash: "def..." },
  lineage: { generation: 0 },
  inheritance: {
    vibrationScore: 0.73,
    strongConnections: [{ target: "checkout.js", weight: 0.9 }]
  }
};

// Nuevo átomo detectado (processOrder)
const newAtom = {
  id: "src/orders.js::processOrder",
  name: "processOrder",
  dna: { structuralHash: "abc...", patternHash: "def..." }  // ¡Match!
};

// Comparación
const similarity = compareDNA(newAtom.dna, shadow.dna);
// similarity = 0.92 (> 0.85 → match válido)

// Enriquecimiento
newAtom.ancestry = {
  replaced: "shadow_old123",
  lineage: ["shadow_old123"],
  generation: 1,
  vibrationScore: 0.73 * 0.9,  // Heredado con decay
  strongConnections: [
    { target: "checkout.js", weight: 0.81 }  // 0.9 * 0.9
  ],
  warnings: ["Conexión a checkout.js es histórica, verificar"]
};

// Marcar sombra como reemplazada
shadow.status = "replaced";
shadow.replacedBy = newAtom.id;
shadow.lineage.childShadowIds.push(/* nuevo */);
```

---

## Diagrama Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                        NACIMIENTO                               │
│  Archivo creado → AST → Data Flow → DNA → Átomo crudo          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          VIDA                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Validar    │ → │ Buscar       │ → │ Enriquecer   │       │
│  │  estructura │    │ sombras      │    │ con ancestry │       │
│  └─────────────┘    │ similares    │    └──────────────┘       │
│                     └──────────────┘                           │
│                          │                                      │
│                    ┌─────┴─────┐                               │
│                    ▼           ▼                               │
│              [Match > 0.85]  [No match]                        │
│                    │           │                               │
│                    ▼           ▼                               │
│           Hereda historia   Génesis (gen 0)                   │
│                                                              │
│  Guardar en .omnysysdata/atoms/                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Archivo borrado
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MUERTE                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Obtener     │ → │ Crear        │ → │ Guardar en   │       │
│  │ átomos      │    │ sombra       │    │ shadows/     │       │
│  │ del archivo │    │ con ADN      │    │              │       │
│  └─────────────┘    └──────────────┘    └──────────────┘       │
│                                                              │
│  Limpiar de HOT storage (index, files, atoms)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Nuevo archivo similar
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RENACIMIENTO                               │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ Extraer     │ → │ DNA match    │ → │ Heredar      │       │
│  │ DNA         │    │ > 0.85?      │    │ vibration +  │       │
│  │             │    │              │    │ connections  │       │
│  └─────────────┘    └──────────────┘    └──────────────┘       │
│                          │                                      │
│                    ┌─────┴─────┐                               │
│                    ▼           ▼                               │
│              [Match]        [No match]                         │
│                    │           │                               │
│                    ▼           ▼                               │
│         Generación N+1      Génesis nueva                     │
│         (hereda)            (nueva línea)                     │
│                                                              │
│  Actualizar sombra: status="replaced", replacedBy=atom.id    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Referencias

- [dna-system.md](./dna-system.md) - Extracción y comparación de ADN
- [usage.md](./usage.md) - API práctica
- [../data-flow/atom-extraction.md](../data-flow/atom-extraction.md) - Origen del Data Flow
