---
⚠️  DOCUMENTO ARCHIVADO - Ver nueva ubicación
---
Este documento ha sido consolidado en la nueva estructura de documentación.

📍 Nueva ubicación: Ver docs/archive/consolidated/README.md para el mapa completo

🚀 Usar en su lugar:
- docs/01-core/ (fundamentos)
- docs/02-architecture/ (sistemas)
- docs/04-guides/ (guías prácticas)

---
Documento original (mantenido para referencia histórica):
# Shadow Registry System

**Sistema de preservaciÃ³n de ADN evolutivo para Ã¡tomos de cÃ³digo.**

> *"Los Ã¡tomos mueren, pero su ADN persiste para guiar a las futuras generaciones"*

---

## ðŸŽ¯ PropÃ³sito

El Shadow Registry preserva el **ADN estructural** de los Ã¡tomos (funciones) borrados, permitiendo:

1. **Trazabilidad**: Seguir el linaje evolutivo de cualquier funciÃ³n
2. **Herencia**: Nuevas funciones heredan "vibraciÃ³n" de sus antepasadas
3. **ValidaciÃ³n**: Garantizar que los metadatos extraÃ­dos tengan sentido
4. **Conexiones vibrantes**: Conocer la intensidad histÃ³rica de las conexiones

---

## ðŸ—ï¸ Arquitectura (3 Layers)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    LAYER A (Static)                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  DNA Extractor                                      â”‚   â”‚
â”‚  â”‚  â€¢ extractDNA(atom) â†’ ADN estructural              â”‚   â”‚
â”‚  â”‚  â€¢ compareDNA(dna1, dna2) â†’ similitud              â”‚   â”‚
â”‚  â”‚  â€¢ validateDNA(dna) â†’ validaciÃ³n                   â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  LAYER B (Semantic)                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  Lineage Validator                                  â”‚   â”‚
â”‚  â”‚  â€¢ validateForLineage(atom) â†’ validaciÃ³n completa  â”‚   â”‚
â”‚  â”‚  â€¢ validateShadow(shadow) â†’ validar sombra         â”‚   â”‚
â”‚  â”‚  â€¢ validateMatch(atom, shadow) â†’ match vÃ¡lido      â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                   LAYER C (Memory)                          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  Shadow Registry                                    â”‚   â”‚
â”‚  â”‚  â€¢ createShadow(atom) â†’ preservar Ã¡tomo            â”‚   â”‚
â”‚  â”‚  â€¢ findSimilar(atom) â†’ buscar antepasadas          â”‚   â”‚
â”‚  â”‚  â€¢ enrichWithAncestry(atom) â†’ heredar ADN          â”‚   â”‚
â”‚  â”‚  â€¢ getLineage(shadowId) â†’ reconstruir Ã¡rbol        â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ§¬ El ADN (Fingerprint Estructural)

Cada Ã¡tomo tiene un **ADN** que lo identifica independientemente de:
- Cambios de nombre (`processCart` â†’ `processOrder`)
- Movimientos de archivo (`src/old/` â†’ `src/new/`)
- Refactors menores

### Estructura del ADN

```javascript
{
  // Identidad Ãºnica
  id: "9ea059dc130a85da",           // Hash de todo el ADN

  // Estructura (inmutable ante renombres)
  structuralHash: "def456...",       // Hash de inputs/outputs/transformations
  patternHash: "ghi789...",          // Hash de patrÃ³n estandarizado

  // Comportamiento
  flowType: "read-transform-persist", // CategorÃ­a del flujo
  operationSequence: [               // Secuencia de operaciones
    "receive", "read", "transform", "persist", "return"
  ],

  // MÃ©tricas
  complexityScore: 7,                // 1-10
  inputCount: 2,
  outputCount: 2,
  transformationCount: 3,

  // SemÃ¡ntica (para matching aproximado)
  semanticFingerprint: "process:order:order",  // verb:domain:entity

  // Metadatos
  extractedAt: "2026-02-09T20:15:00Z",
  version: "1.0"
}
```

### ComparaciÃ³n de ADN

```javascript
import { compareDNA } from './src/layer-a-static/extractors/metadata/dna-extractor.js';

const similarity = compareDNA(dna1, dna2);
// 0.0 = completamente diferente
// 1.0 = idÃ©ntico
// >0.75 = probablemente el mismo Ã¡tomo evolucionado
```

**Pesos de comparaciÃ³n**:
- Structural hash: 40%
- Pattern hash + flow type: 30%
- Operation sequence: 20%
- Semantic fingerprint: 10%

---

## ðŸŽ­ Las Sombras (Shadows)

Cuando un Ã¡tomo se borra, se convierte en una **sombra**:

### Estructura de Sombra

```javascript
{
  // Identidad
  shadowId: "shadow_mlfm3gte_fwv7",      // ID Ãºnico permanente
  originalId: "src/api.js::processCart", // ID original (histÃ³rico)
  status: "deleted" | "replaced",

  // Tiempos
  bornAt: "2026-01-15T10:00:00Z",
  diedAt: "2026-02-09T20:15:00Z",
  lifespan: 25,                          // dÃ­as

  // ADN (fingerprint para matching)
  dna: { /* ADN completo */ },

  // Metadata resumida
  metadata: {
    name: "processCart",
    dataFlow: { inputCount, outputCount, transformationCount },
    semantic: { verb, domain, entity },
    filePath: "src/api.js",
    lineNumber: 42,
    isExported: true
  },

  // Linaje genealÃ³gico
  lineage: {
    parentShadowId: "shadow_abc",        // De quÃ© evolucionÃ³
    childShadowIds: ["shadow_xyz"],      // QuÃ© evolucionÃ³ de esta
    generation: 2,                       // GeneraciÃ³n (0 = gÃ©nesis)
    evolutionType: "domain_change"       // Tipo de evoluciÃ³n
  },

  // Herencia (datos que pasan a descendientes)
  inheritance: {
    connections: [                       // Conexiones histÃ³ricas
      { target: "routes.js", weight: 0.9 }
    ],
    connectionCount: 12,
    vibrationScore: 0.73,                // Intensidad de vibraciÃ³n
    rupturedConnections: []              // Conexiones que se rompieron
  },

  // InformaciÃ³n de muerte
  death: {
    reason: "refactor_business_logic",
    commitsInvolved: ["a1b2c3d"],
    riskIntroduced: 0.4
  }
}
```

### Storage

```
.omnysysdata/shadows/
â”œâ”€â”€ index.json                    # Ãndice rÃ¡pido (bÃºsquedas)
â””â”€â”€ shadow_{id}.json              # Sombras individuales
```

---

## ðŸ”„ Flujo de Vida del Dato

### FASE 0: Nacimiento (Archivo Creado)

```
ðŸ“„ Archivo.js creado
    â”‚
    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LAYER A: ExtracciÃ³n (determinÃ­stico 100%)                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 1. AST Parsing (Babel)                                      â”‚
â”‚    â””â”€â”€ functions[], imports[], exports[]                    â”‚
â”‚                                                              â”‚
â”‚ 2. Data Flow Extraction                                     â”‚
â”‚    â””â”€â”€ inputs[], transformations[], outputs[]               â”‚
â”‚    â””â”€â”€ analysis: { coherence, coverage }                    â”‚
â”‚                                                              â”‚
â”‚ 3. DNA Extraction (Shadow Registry)                         â”‚
â”‚    â”œâ”€â”€ structuralHash (fingerprint I/O/T)                   â”‚
â”‚    â”œâ”€â”€ patternHash (patrÃ³n estandarizado)                   â”‚
â”‚    â”œâ”€â”€ flowType (categorÃ­a)                                 â”‚
â”‚    â””â”€â”€ operationSequence (firma de comportamiento)          â”‚
â”‚                                                              â”‚
â”‚ OUTPUT: Ãtomo crudo con dataFlow + dna                      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”‚
    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LAYER B: ValidaciÃ³n & Enriquecimiento                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 1. Lineage Validator                                        â”‚
â”‚    â”œâ”€â”€ Â¿Estructura vÃ¡lida? (dataFlow completo)              â”‚
â”‚    â”œâ”€â”€ Â¿DNA vÃ¡lido? (todos los campos)                      â”‚
â”‚    â”œâ”€â”€ Â¿Coherencia? (semantic coincide con ops)             â”‚
â”‚    â””â”€â”€ Confidence: high/medium/low                          â”‚
â”‚                                                              â”‚
â”‚ 2. Shadow Registry - Enriquecimiento                        â”‚
â”‚    â”œâ”€â”€ findSimilar(atom) â†’ buscar sombras                   â”‚
â”‚    â”‚   â””â”€â”€ compareDNA(dna, shadow.dna) > 0.85?              â”‚
â”‚    â”œâ”€â”€ Si match: enrichWithAncestry(atom)                   â”‚
â”‚    â”‚   â””â”€â”€ ancestry: {                                      â”‚
â”‚    â”‚       replaced: shadowId,                              â”‚
â”‚    â”‚       lineage: [shadowId, parent, grandparent],        â”‚
â”‚    â”‚       generation: N,                                   â”‚
â”‚    â”‚       vibrationScore: 0.73,                            â”‚
â”‚    â”‚       strongConnections: [...],                        â”‚
â”‚    â”‚       warnings: ["3 conexiones rotas"]                 â”‚
â”‚    â”‚   }                                                     â”‚
â”‚    â””â”€â”€ Si NO match: gÃ©nesis (generation: 0)                 â”‚
â”‚                                                              â”‚
â”‚ OUTPUT: Ãtomo VALIDADO y ENRIQUECIDO                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”‚
    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LAYER C: Persistencia                                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 1. Guardar Ã¡tomo en .omnysysdata/atoms/                     â”‚
â”‚    â””â”€â”€ { ...atom, ancestry, _meta }                         â”‚
â”‚                                                              â”‚
â”‚ 2. Actualizar Ã­ndice principal                              â”‚
â”‚    â””â”€â”€ index.json: { fileIndex, metadata }                  â”‚
â”‚                                                              â”‚
â”‚ OUTPUT: Sistema actualizado con conexiones vibrantes        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### FASE 1: Vida (Archivo en uso)

**Metadatos disponibles en HOT storage**:
```javascript
// Ãtomo vivo (enriquecido)
{
  id: "src/api.js::processOrder",
  name: "processOrder",

  // Data Flow
  dataFlow: { inputs, transformations, outputs },

  // DNA (Shadow Registry)
  dna: { structuralHash, patternHash, flowType, ... },

  // Ancestry (Shadow Registry)
  ancestry: {
    replaced: "shadow_abc",        // Antepasado directo
    lineage: ["shadow_def", "shadow_abc"],  // Ãrbol
    generation: 2,
    vibrationScore: 0.73,          // Intensidad heredada
    strongConnections: [           // Conexiones histÃ³ricas
      { target: "routes.js", weight: 0.9 }
    ],
    warnings: ["3 conexiones del pasado no migraron"]
  },

  // Conexiones (cables)
  connections: {
    imports: [...],
    exports: [...],
    semantic: [...],  // events, storage, etc.
    dataFlow: [...],  // chains cross-function
    inherited: [...]  // De ancestry
  }
}
```

### FASE 2: Muerte (Archivo Borrado)

```
ðŸ—‘ï¸  Archivo.js borrado
    â”‚
    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LAYER C: Shadow Registry (PreservaciÃ³n)                    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 1. Obtener Ã¡tomos del archivo (antes de borrar)             â”‚
â”‚    â””â”€â”€ atoms = getAtomsForFile(filePath)                    â”‚
â”‚                                                              â”‚
â”‚ 2. Para cada Ã¡tomo: Crear Sombra                            â”‚
â”‚    â””â”€â”€ shadow = createShadow(atom, {                        â”‚
â”‚        reason: 'file_deleted',                              â”‚
â”‚        diedAt: new Date()                                   â”‚
â”‚    })                                                        â”‚
â”‚                                                              â”‚
â”‚    Sombra incluye:                                          â”‚
â”‚    â”œâ”€â”€ shadowId (Ãºnico permanente)                          â”‚
â”‚    â”œâ”€â”€ originalId (referencia histÃ³rica)                    â”‚
â”‚    â”œâ”€â”€ dna (fingerprint completo)                           â”‚
â”‚    â”œâ”€â”€ metadata (resumen)                                   â”‚
â”‚    â”œâ”€â”€ lineage (parent/children/generation)                 â”‚
â”‚    â”œâ”€â”€ inheritance (datos heredables)                       â”‚
â”‚    â””â”€â”€ death (razÃ³n, commits, riesgo)                       â”‚
â”‚                                                              â”‚
â”‚ 3. Guardar sombra en .omnysysdata/shadows/                  â”‚
â”‚    â””â”€â”€ shadow_{id}.json                                     â”‚
â”‚                                                              â”‚
â”‚ OUTPUT: ADN preservado para futuras generaciones            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”‚
    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LIMPIEZA: Remover de HOT storage                            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ - Remover de index.json (archivos vivos)                    â”‚
â”‚ - Borrar .omnysysdata/files/{file}.json                     â”‚
â”‚ - Borrar .omnysysdata/atoms/{file}/*                        â”‚
â”‚ - Limpiar system-map (conexiones)                           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### FASE 3: Renacimiento (Reemplazo Detectado)

```
ðŸ“„ Nuevo archivo.js creado (funciÃ³n similar)
    â”‚
    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ DETECCIÃ“N DE PARENTESCO                                     â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 1. Extraer Ã¡tomo (FASE 0)                                   â”‚
â”‚    â””â”€â”€ atom con dna                                         â”‚
â”‚                                                              â”‚
â”‚ 2. Buscar sombras similares                                 â”‚
â”‚    â””â”€â”€ matches = findSimilar(atom, minSimilarity: 0.85)     â”‚
â”‚                                                              â”‚
â”‚ 3. Si hay match > 0.85:                                     â”‚
â”‚    â”œâ”€â”€ Validar match (no falso positivo)                    â”‚
â”‚    â”œâ”€â”€ Propagar herencia:                                   â”‚
â”‚    â”‚   atom.ancestry = {                                    â”‚
â”‚    â”‚     replaced: match.shadow.shadowId,                   â”‚
â”‚    â”‚     lineage: [match.shadow.shadowId, ...ancestors],    â”‚
â”‚    â”‚     generation: match.shadow.lineage.generation + 1    â”‚
â”‚    â”‚     vibrationScore: match.shadow.inheritance.vibration,â”‚
â”‚    â”‚     strongConnections: filterByExistence(...),         â”‚
â”‚    â”‚     warnings: generateWarnings(...)                    â”‚
â”‚    â”‚   }                                                     â”‚
â”‚    â””â”€â”€ Marcar sombra como "replaced"                        â”‚
â”‚        â””â”€â”€ shadow.replacedBy = atom.id                      â”‚
â”‚                                                              â”‚
â”‚ 4. Si NO hay match:                                         â”‚
â”‚    â””â”€â”€ atom.ancestry = { generation: 0 }  // GÃ©nesis        â”‚
â”‚                                                              â”‚
â”‚ OUTPUT: Ãtomo vivo con historia (o como nueva criatura)     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## âœ… ValidaciÃ³n de Metadatos

### QuÃ© se valida:

1. **Estructura completa**
   - Tiene `dataFlow` con `inputs`, `outputs`, `transformations`
   - DNA extraÃ­do correctamente (todos los campos)
   - Metadata mÃ­nima presente (id, name, filePath)

2. **Coherencia interna**
   ```javascript
   // Si semantic dice "validate", debe tener validaciÃ³n
   if (semantic.verb === 'validate') {
     assert(transformations.some(t => t.operation === 'validation'));
   }

   // Si flowType incluye "read", debe leer
   if (flowType.includes('read')) {
     assert(transformations.some(t => ['read', 'fetch'].includes(t.operation)));
   }
   ```

3. **Match vÃ¡lido** (cuando se compara con sombra)
   - Similitud > 0.75
   - No es falso positivo (misma estructura, semÃ¡ntica muy diferente)
   - Consistencia de generaciÃ³n

### Resultado de validaciÃ³n:

```javascript
{
  valid: true | false,
  confidence: 'high' | 'medium' | 'low',
  errors: ['DNA missing', 'Invalid flow type'],
  warnings: ['Missing semantic analysis'],
  metadata: { /* datos validados */ }
}
```

---

## ðŸ“Š API Reference

### DNA Extractor (Layer A)

```javascript
import {
  extractDNA,
  compareDNA,
  validateDNA
} from './src/layer-a-static/extractors/metadata/dna-extractor.js';

// Extraer ADN de un Ã¡tomo
const dna = extractDNA(atom);

// Comparar dos ADNs
const similarity = compareDNA(dna1, dna2); // 0.0 - 1.0

// Validar estructura de ADN
const { valid, errors } = validateDNA(dna);
```

### Lineage Validator (Layer B)

```javascript
import {
  validateForLineage,
  validateShadow,
  validateMatch
} from './src/layer-b-semantic/validators/lineage-validator.js';

// Validar Ã¡tomo completo
const result = validateForLineage(atom, { strict: false });

// Validar sombra
const result = validateShadow(shadow);

// Validar match Ã¡tomo â†” sombra
const { valid, similarity } = validateMatch(atom, shadow);
```

### Shadow Registry (Layer C)

```javascript
import {
  ShadowRegistry,
  getShadowRegistry
} from './src/layer-c-memory/shadow-registry/index.js';

// Crear instancia (o usar singleton)
const registry = new ShadowRegistry('.omnysysdata');
await registry.initialize();

// Crear sombra
const shadow = await registry.createShadow(atom, {
  reason: 'file_deleted',
  replacementId: 'new-atom-id'
});

// Buscar sombras similares
const matches = await registry.findSimilar(atom, {
  minSimilarity: 0.75,
  limit: 5
});
// â†’ [{ shadow, similarity }, ...]

// Enriquecer Ã¡tomo con ancestry
const enriched = await registry.enrichWithAncestry(atom);
// â†’ atom con ancestry: { replaced, lineage, vibrationScore, ... }

// Obtener sombra por ID
const shadow = await registry.getShadow(shadowId);

// Reconstruir linaje completo
const lineage = await registry.getLineage(shadowId);
// â†’ [ancestor1, ancestor2, ..., shadow]

// Listar todas las sombras
const shadows = await registry.listShadows({
  status: 'deleted',
  flowType: 'read-transform-persist'
});

// Marcar como reemplazada
await registry.markReplaced(shadowId, replacementId);
```

---

## ðŸ”Œ IntegraciÃ³n con File Watcher

El Shadow Registry se integra automÃ¡ticamente con el file watcher:

```javascript
// src/core/file-watcher/handlers.js

// Cuando se BORRA un archivo:
export async function handleFileDeleted(filePath) {
  // 1. Crear sombras de los Ã¡tomos (preservar ADN)
  await this.createShadowsForFile(filePath);

  // 2. Limpiar HOT storage
  await this.removeFileMetadata(filePath);
  await this.removeAtomMetadata(filePath);
}

// Cuando se CREA un archivo:
export async function handleFileCreated(filePath, fullPath) {
  // 1. Analizar y extraer Ã¡tomos
  await this.analyzeAndIndex(filePath, fullPath);

  // 2. Enriquecer con ancestry (herencia de sombras)
  await this.enrichAtomsWithAncestry(filePath);
}
```

---

## ðŸŽ“ Conceptos Clave

### ADN (Fingerprint Estructural)
Identidad Ãºnica basada en la **estructura** del Ã¡tomo (inputs, outputs, transformations), no en su nombre o ubicaciÃ³n. Permite identificar un Ã¡tomo aunque se renombre o mueva.

### Sombra (Shadow)
Snapshot de un Ã¡tomo borrado, preservando su ADN y metadata relevante. Las sombras viven en `.omnysysdata/shadows/`.

### Linaje (Lineage)
Ãrbol genealÃ³gico de un Ã¡tomo. Cada sombra puede tener:
- **Parent**: De quÃ© sombra evolucionÃ³
- **Children**: QuÃ© sombras evolucionaron de ella
- **Generation**: NÃºmero de generaciÃ³n (0 = gÃ©nesis)

### VibraciÃ³n (Vibration Score)
Medida de la intensidad histÃ³rica de las conexiones de un Ã¡tomo. Se calcula como:
```
vibration = (conexiones_actuales * 0.6) + (conexiones_ancestrales * 0.4)
```

Una vibraciÃ³n alta indica que este Ã¡tomo (o sus antepasados) tienen muchas conexiones fuertes.

### Herencia (Inheritance)
Proceso por el cual un Ã¡tomo nuevo recibe datos de sus antepasados:
- `vibrationScore`: Intensidad de conexiones histÃ³ricas
- `strongConnections`: Conexiones que sobrevivieron de generaciones pasadas
- `warnings`: Alertas sobre rupturas o cambios significativos

---

## ðŸŽ¯ Beneficios del Sistema

### 1. Determinismo Incremental
```javascript
// Sin sombras
"Esta funciÃ³n tiene 3 conexiones"

// Con sombras
"Esta funciÃ³n tiene 3 conexiones (+ 12 heredadas de 2 antepasados)"
"Intensidad vibratoria: 0.78 (alta - historial de uso intenso)"
```

### 2. DetecciÃ³n de Riesgo Evolutivo
```javascript
// El sistema detecta patrones peligrosos
"âš ï¸ Alerta: Este patrÃ³n de refactor ya causÃ³ 3 rupturas en el pasado"
"ðŸ’¡ Sugerencia: Considerar migrar las 4 conexiones faltantes"
```

### 3. Trazabilidad Completa
- Cada funciÃ³n conoce su historia evolutiva
- Detecta renombres, movimientos y refactors
- Mantiene conexiones histÃ³ricas

### 4. VisiÃ³n 4D del CÃ³digo

**Cuatro dimensiones de los "cables"**:

1. **DimensiÃ³n Espacial**: Cables entre archivos
2. **DimensiÃ³n Molecular**: Cables entre funciones
3. **DimensiÃ³n AtÃ³mica**: Cables de datos (data flow)
4. **DimensiÃ³n Temporal**: Cables a travÃ©s del tiempo (ancestry)

**Cada cable ahora tiene**:
- Identidad (ADN - no depende del nombre)
- Historia (de dÃ³nde viene, cuÃ¡ntas generaciones)
- Intensidad (vibrationScore basado en uso histÃ³rico)
- ValidaciÃ³n (coherencia semÃ¡ntica verificada)

---

## ðŸ“ Archivos del Sistema

```
src/
â”œâ”€â”€ layer-a-static/
â”‚   â””â”€â”€ extractors/
â”‚       â””â”€â”€ metadata/
â”‚           â””â”€â”€ dna-extractor.js          # ExtracciÃ³n de ADN
â”‚
â”œâ”€â”€ layer-b-semantic/
â”‚   â””â”€â”€ validators/
â”‚       â””â”€â”€ lineage-validator.js          # ValidaciÃ³n de lineage
â”‚
â”œâ”€â”€ layer-c-memory/
â”‚   â””â”€â”€ shadow-registry/
â”‚       â”œâ”€â”€ types.js                      # Tipos y constantes
â”‚       â”œâ”€â”€ lineage-tracker.js            # Trazabilidad
â”‚       â””â”€â”€ index.js                      # API principal
â”‚
â””â”€â”€ core/
    â””â”€â”€ file-watcher/
        â””â”€â”€ handlers.js                   # IntegraciÃ³n (onDeleted/onCreated)

scripts/
â””â”€â”€ cleanup-ghosts.js                     # Limpieza inicial de fantasmas
```

---

## ðŸ“ˆ MÃ©tricas del Sistema

| MÃ©trica | Estado |
|---------|--------|
| Shadows creadas | 6 (fantasmas iniciales) |
| ADNs extraÃ­dos | AutomÃ¡tico en pipeline |
| Validaciones | AutomÃ¡tico con confianza |
| Herencia | Activa en creaciÃ³n de archivos |

---

## ðŸ“š Referencias

- [GuÃ­a de Uso del Shadow Registry](../guides/SHADOW_REGISTRY_USAGE.md) - GuÃ­a prÃ¡ctica de uso
- [Data Flow System](DATA_FLOW_V2.md) - Sistema de flujo de datos
- [Metadata Extractors](METADATA_EXTRACTORS.md) - GuÃ­a de extractores

---

**VersiÃ³n**: 1.0
**Fecha**: 2026-02-10
**Estado**: âœ… Implementado y operativo

