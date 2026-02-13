# Shadow Registry - Memoria Persistente del Código

**Versión**: v0.7.1  
**Componente**: Layer A/B/C - Persistencia y evolución  
**Estado**: Implementado

---

## ¿Qué es el Shadow Registry?

Sistema que gestiona el **ciclo de vida evolutivo** del código:
- **Nacimiento**: Extracción de ADN estructural
- **Vida**: Átomos enriquecidos con ancestry (historia)
- **Muerte**: Preservación como "sombra" cuando se borra
- **Renacimiento**: Herencia de sombra a nuevo código similar

**Analogía**: Es como un "árbol genealógico" del código. Sabemos de dónde viene, qué cambió, y qué aprendimos del pasado.

---

## Parte 1: Sistema ADN - Fingerprint Estructural

### Propósito

El **ADN** identifica una función **independientemente de**:
- Cambios de nombre (`processCart` → `processOrder`)
- Movimientos de archivo (`src/old/` → `src/new/`)
- Refactors menores

> *"El ADN captura la esencia de lo que hace la función, no cómo se llama"*

### Estructura del ADN

```javascript
{
  // Identidad única
  id: "9ea059dc130a85da",
  structuralHash: "def456...",     // Hash de inputs/outputs/transforms
  patternHash: "ghi789...",        // Hash de patrón estandarizado
  
  // Comportamiento
  flowType: "read-transform-persist",
  operationSequence: ["receive", "read", "transform", "persist", "return"],
  
  // Métricas
  complexityScore: 7,
  inputCount: 2, outputCount: 2, transformationCount: 3,
  
  // Semántica
  semanticFingerprint: "process:order:order",  // verb:domain:entity
  
  extractedAt: "2026-02-09T20:15:00Z"
}
```

### Componentes del ADN

| Componente | % Matching | Qué captura |
|------------|------------|-------------|
| **Structural Hash** | 40% | I/O structure (inmutable ante renombres) |
| **Pattern Hash** | 30% | Flow pattern categoría |
| **Operation Sequence** | 20% | Secuencia detallada de operaciones |
| **Semantic Fingerprint** | 10% | verb:domain:entity del nombre |

### Comparación de ADN

**Umbrales de similitud**:
- **1.0**: Idéntico (mismo átomo, diferente nombre/lugar)
- **0.85-1.0**: Muy similar (evolución/renombrado)
- **0.75-0.85**: Similar (mismo patrón, implementación diferente)
- **< 0.50**: Diferente (función distinta)

**Ejemplo: Renombrado detectado**
```javascript
// Antes
function processCart(cart, userId) { /* ... */ }
// ADN: structuralHash="abc123", semantic="process:cart:cart"

// Después  
function processOrder(order, userId) { /* mismo código */ }
// ADN: structuralHash="abc123", semantic="process:order:order"

// Similarity: 0.90 (renombrado detectado)
```

---

## Parte 2: Ciclo de Vida

### FASE 0: Nacimiento (Extracción)

Cuando un archivo se crea/modifica:

```
📄 Archivo.js
    │
    ▼
Layer A: AST Parsing → Data Flow → DNA Extraction
    │
    ▼
Output: Átomo crudo { dataFlow, dna }
```

### FASE 1: Vida (Enriquecimiento)

El átomo se valida y enriquece:

```
Átomo crudo
    │
    ▼
Layer B: 
  1. Validar estructura
  2. Buscar sombras similares (compareDNA > 0.85?)
  3. Si match: enrichWithAncestry()
    │
    ▼
Layer C:
  1. Guardar en .omnysysdata/atoms/
  2. Actualizar índice
```

**Ancestry (historia heredada)**:
```javascript
ancestry: {
  replaced: "shadow_abc",           // Antepasado directo
  lineage: ["shadow_def", "shadow_abc"],  // Árbol genealógico
  generation: 2,
  vibrationScore: 0.73,             // Intensidad heredada
  strongConnections: [              // Conexiones históricas
    { target: "routes.js", weight: 0.9 }
  ],
  warnings: ["3 conexiones del pasado no migraron"]
}
```

### FASE 2: Muerte (Archivo borrado)

Cuando un archivo se elimina:

```
🗑️ Archivo.js borrado
    │
    ▼
Shadow Registry:
  1. Obtener átomos del archivo
  2. Crear Sombra con ADN completo
  3. Guardar en .omnysysdata/shadows/
    │
    ▼
Limpieza: Remover de HOT storage
```

**Estructura de Sombra**:
```javascript
{
  shadowId: "shadow_mlfm3gte_fwv7",
  originalId: "src/api.js::processCart",
  status: "deleted",
  
  bornAt: "2026-01-15T10:00:00Z",
  diedAt: "2026-02-09T20:15:00Z",
  lifespan: 25,
  
  dna: { /* ADN completo */ },
  
  lineage: {
    parentShadowId: "shadow_abc",
    childShadowIds: ["shadow_xyz"],
    generation: 2
  },
  
  inheritance: {
    connections: [{ target: "routes.js", weight: 0.9 }],
    vibrationScore: 0.73
  },
  
  death: {
    reason: "refactor_business_logic",
    riskIntroduced: 0.4
  }
}
```

### FASE 3: Renacimiento (Detección de parentesco)

Cuando se crea código similar a una sombra:

```
📄 Nuevo archivo.js (función similar)
    │
    ▼
Detección:
  1. Extraer ADN
  2. Buscar sombras similares
  3. Si similarity > 0.85:
       - Propagar herencia
       - Marcar sombra como "replaced"
    │
    ▼
Átomo vivo con historia (o génesis nueva)
```

**Ejemplo de renacimiento**:
```javascript
// Sombra existente
const shadow = {
  shadowId: "shadow_old123",
  dna: { structuralHash: "abc..." },
  inheritance: { vibrationScore: 0.73, strongConnections: [...] }
};

// Nuevo átomo detectado
const newAtom = {
  name: "processOrder",
  dna: { structuralHash: "abc..." }  // ¡Match!
};

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
```

---

## API Práctica

### Comparar dos átomos

```javascript
import { compareDNA } from './shadow-registry/dna-comparator.js';

const similarity = compareDNA(atom1.dna, atom2.dna);
// 0.0 - 1.0

if (similarity > 0.85) {
  console.log("Probable evolución del mismo código");
}
```

### Buscar sombras similares

```javascript
import { findSimilarShadows } from './shadow-registry/shadow-store.js';

const matches = await findSimilarShadows(newAtom, { minSimilarity: 0.85 });
// [{ shadow, similarity: 0.92 }, ...]
```

### Enriquecer átomo con ancestry

```javascript
import { enrichWithAncestry } from './shadow-registry/ancestry-enricher.js';

const enrichedAtom = await enrichWithAncestry(newAtom);
// newAtom + ancestry si hay match, o { generation: 0 } si es génesis
```

---

## Diagrama Completo del Ciclo

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
│  └─────────────┘    └──────────────┘    └──────────────┘       │
│       │                    │                                      │
│       │              ┌─────┴─────┐                               │
│       │              ▼           ▼                               │
│       │        [Match > 0.85]  [No match]                        │
│       │              │           │                               │
│       │              ▼           ▼                               │
│       │       Hereda historia   Génesis (gen 0)                 │
│       │                                                         │
│  Guardar en .omnysysdata/atoms/                                │
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
│  Limpiar de HOT storage                                       │
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
└─────────────────────────────────────────────────────────────────┘
```

---

## Relación con Otros Sistemas

```
Data Flow (input/output/transformations)
    ↓
DNA Extractor (fingerprint estructural)
    ↓
Shadow Registry (matching, ancestry, ciclo de vida)
    ↓
MCP Tools: get_function_details, explain_value_flow
```

**Regla**: Sin Data Flow, no hay ADN. Sin ADN, no hay Shadow Registry.

---

**Documentos consolidados:**
- `shadow-registry/dna-system.md` - Fingerprint estructural
- `shadow-registry/lifecycle.md` - Ciclo de vida nacimiento/muerte/renacimiento
- `shadow-registry/usage.md` - API práctica (integrado aquí)

**Código fuente:**
- `src/layer-a-static/extractors/metadata/dna-extractor.js`
- `src/core/shadow-registry/`

**Estado**: ✅ Implementado y operativo
