# Sistema ADN - Fingerprint Estructural

**Versión**: v0.7.1  
**Componente**: Shadow Registry - Layer A/B  
**Estado**: Implementado

---

## 🎯 Propósito

El **ADN** es un fingerprint estructural que identifica una función **independientemente de**:
- Cambios de nombre (`processCart` → `processOrder`)
- Movimientos de archivo (`src/old/` → `src/new/`)
- Refactors menores

> *"El ADN captura la esencia de lo que hace la función, no cómo se llama"*

---

## 🧬 Estructura del ADN

```javascript
{
  // Identidad única
  id: "9ea059dc130a85da",              // Hash de todo el ADN

  // Estructura (inmutable ante renombres)
  structuralHash: "def456...",          // Hash de inputs/outputs/transformations
  patternHash: "ghi789...",             // Hash de patrón estandarizado

  // Comportamiento
  flowType: "read-transform-persist",   // Categoría del flujo
  operationSequence: [                  // Secuencia de operaciones
    "receive", "read", "transform", "persist", "return"
  ],

  // Métricas
  complexityScore: 7,                   // 1-10
  inputCount: 2,
  outputCount: 2,
  transformationCount: 3,

  // Semántica (para matching aproximado)
  semanticFingerprint: "process:order:order",  // verb:domain:entity

  // Metadatos
  extractedAt: "2026-02-09T20:15:00Z",
  version: "1.0"
}
```

---

## Componentes del ADN

### 1. Structural Hash (40% del matching)

Fingerprint de la **estructura I/O**:

```javascript
// Input: Función
function processOrder(order, userId) {
  const total = calculateTotal(order.items);
  const user = getUser(userId);
  return { total, user };
}

// Structural hash se calcula de:
structuralInput = {
  inputs: [
    { name: 'order', shape: 'object' },
    { name: 'userId', shape: 'unknown' }
  ],
  transformations: [
    { op: 'property_access', from: 'order.items' },
    { op: 'call', to: 'calculateTotal' },
    { op: 'call', to: 'getUser' }
  ],
  outputs: [
    { type: 'return', shape: '{ total, user }' }
  ]
}

structuralHash = hash(structuralInput);
// "abc123..." - Cambia si cambia I/O, no si cambia nombre
```

### 2. Pattern Hash (30% del matching)

Fingerprint del **patrón de flujo**:

```javascript
// Input: operationSequence
operationSequence = [
  "receive",      // Recibe parámetros
  "read",         // Lee de parámetros
  "transform",    // Transforma datos
  "persist",      // Guarda (side effect)
  "return"        // Retorna resultado
]

// Se estandariza a:
pattern = "read-transform-persist-return"

patternHash = hash(pattern);
// "def456..." - Identifica el "tipo" de función
```

### 3. Flow Type (Categoría)

Clasificación de alto nivel:

| Flow Type | Descripción | Ejemplo |
|-----------|-------------|---------|
| `read-transform-return` | Transformación pura | `calculateTotal()` |
| `read-transform-persist` | Write operation | `saveOrder()` |
| `receive-validate-return` | Validación | `validateEmail()` |
| `fetch-transform-return` | Data fetching | `getUser()` |
| `receive-emit` | Event emitter | `notifyUser()` |

### 4. Operation Sequence (20% del matching)

Secuencia detallada de operaciones:

```javascript
// Ejemplo: processOrder
operationSequence = [
  "receive",           // Recibe parámetros
  "read",              // Lee order.items
  "call_external",     // Llama calculateTotal
  "assign",            // Guarda en 'total'
  "call_external",     // Llama getUser
  "assign",            // Guarda en 'user'
  "return"             // Retorna objeto
]

// Esta secuencia es UNICA para cada "tipo" de función
```

### 5. Semantic Fingerprint (10% del matching)

Fingerprint semántico del nombre:

```javascript
// Input: "processOrder"
semanticFingerprint = "process:order:order"
//        verb:domain:entity

// Input: "validateUserEmail"
semanticFingerprint = "validate:user:email"

// Se extrae vía:
// 1. camelCase/Snake split
// 2. Stop word removal (the, a, an)
// 3. Verb detection (process, validate, get, set)
```

---

## Comparación de ADN

### Algoritmo

```javascript
function compareDNA(dna1, dna2) {
  const weights = {
    structuralHash: 0.40,
    patternHash: 0.30,
    operationSequence: 0.20,
    semanticFingerprint: 0.10
  };

  let similarity = 0;

  // 1. Structural Hash (40%)
  if (dna1.structuralHash === dna2.structuralHash) {
    similarity += weights.structuralHash;  // Match exacto
  } else {
    // Comparar estructura I/O componente por componente
    const ioSim = compareIO(dna1, dna2);
    similarity += weights.structuralHash * ioSim;
  }

  // 2. Pattern Hash (30%)
  if (dna1.patternHash === dna2.patternHash) {
    similarity += weights.patternHash;
  }

  // 3. Operation Sequence (20%)
  const seqSim = levenshteinSimilarity(
    dna1.operationSequence.join(','),
    dna2.operationSequence.join(',')
  );
  similarity += weights.operationSequence * seqSim;

  // 4. Semantic Fingerprint (10%)
  if (dna1.semanticFingerprint === dna2.semanticFingerprint) {
    similarity += weights.semanticFingerprint;
  } else {
    // Comparar verb:domain:entity
    const semSim = compareSemantic(
      dna1.semanticFingerprint,
      dna2.semanticFingerprint
    );
    similarity += weights.semanticFingerprint * semSim;
  }

  return similarity;  // 0.0 - 1.0
}
```

### Umbrales de Decisión

| Similitud | Interpretación | Acción |
|-----------|----------------|--------|
| **1.0** | Idéntico | Mismo átomo (diferente nombre/lugar) |
| **0.85 - 1.0** | Muy similar | Probable evolución (renombrado/refactor) |
| **0.75 - 0.85** | Similar | Mismo patrón, implementación diferente |
| **0.50 - 0.75** | Patrón relacionado | Mismo dominio, función diferente |
| **< 0.50** | Diferente | Función distinta |

### Ejemplos

#### Ejemplo 1: Renombrado Simple

```javascript
// Antes
function processCart(cart, userId) { /* ... */ }

// Después
function processOrder(order, userId) { /* mismo código */ }

// ADN comparison:
{
  structuralHash: "abc123",    // ✅ IGUAL (misma I/O)
  patternHash: "def456",       // ✅ IGUAL
  operationSequence: [...],    // ✅ IGUAL
  semanticFingerprint:        // ⚠️ DIFERENTE
    "process:cart:cart" vs "process:order:order"
}

// Similarity: 0.90 (renombrado detectado)
```

#### Ejemplo 2: Refactor Significativo

```javascript
// Antes
function getUser(id) {
  return db.query('SELECT * FROM users WHERE id = ?', [id]);
}

// Después
function getUser(id) {
  // Ahora con caché
  if (cache.has(id)) return cache.get(id);
  const user = db.query('SELECT * FROM users WHERE id = ?', [id]);
  cache.set(id, user);
  return user;
}

// ADN comparison:
{
  structuralHash: "abc123" vs "xyz789",  // ⚠️ DIFERENTE (caché añadido)
  patternHash: "def456",                 // ✅ IGUAL (fetch-transform-return)
  operationSequence: [...],              // ⚠️ DIFERENTE (caché ops)
  semanticFingerprint: "get:user:user"   // ✅ IGUAL
}

// Similarity: 0.75 (mismo propósito, implementación evolucionada)
```

#### Ejemplo 3: Función Diferente

```javascript
// Función A
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Función B
function sendEmail(user, message) {
  return api.post('/email', { to: user.email, body: message });
}

// ADN comparison:
// TODO: Diferentes en TODOS los aspectos
// Similarity: 0.15 (funciones completamente diferentes)
```

---

## Extracción de ADN

### Pipeline

```javascript
async function extractDNA(atom) {
  // 1. Extraer de data flow
  const structuralHash = extractStructuralHash(atom.dataFlow);
  
  // 2. Extraer de operation sequence
  const patternHash = extractPatternHash(atom.operationSequence);
  const flowType = categorizeFlowType(atom.operationSequence);
  
  // 3. Extraer de nombre
  const semanticFingerprint = extractSemantic(atom.name);
  
  // 4. Calcular métricas
  const complexityScore = calculateComplexity(atom);
  
  // 5. Calcular ID único
  const id = hashAllComponents({
    structuralHash,
    patternHash,
    flowType,
    operationSequence: atom.operationSequence
  });

  return {
    id,
    structuralHash,
    patternHash,
    flowType,
    operationSequence: atom.operationSequence,
    complexityScore,
    inputCount: atom.dataFlow.inputs.length,
    outputCount: atom.dataFlow.outputs.length,
    transformationCount: atom.dataFlow.transformations.length,
    semanticFingerprint,
    extractedAt: new Date().toISOString(),
    version: "1.0"
  };
}
```

### Código Fuente

```
src/layer-a-static/extractors/metadata/dna-extractor.js
```

---

## Validación de ADN

### Checks

```javascript
function validateDNA(dna) {
  const errors = [];
  const warnings = [];

  // 1. Campos requeridos
  const required = ['id', 'structuralHash', 'patternHash', 'flowType'];
  for (const field of required) {
    if (!dna[field]) errors.push(`Missing: ${field}`);
  }

  // 2. Coherencia
  if (dna.flowType.includes('read') && dna.inputCount === 0) {
    warnings.push('Flow type says "read" but no inputs');
  }

  if (dna.flowType.includes('persist') && dna.outputCount === 0) {
    warnings.push('Flow type says "persist" but no outputs');
  }

  // 3. Rango válido
  if (dna.complexityScore < 1 || dna.complexityScore > 10) {
    errors.push('complexityScore out of range');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## Relación con Data Flow

El ADN se **deriva** del Data Flow:

```
Data Flow (input/output/transformations)
    ↓
DNA Extractor
    ↓
ADN Estructural (hash, pattern, flowType)
    ↓
Shadow Registry (matching, ancestry)
```

**Regla**: Sin Data Flow, no hay ADN. Sin ADN, no hay Shadow Registry.

---

## Referencias

- [lifecycle.md](./lifecycle.md) - Cómo se usa el ADN en el ciclo de vida
- [usage.md](./usage.md) - API práctica para comparar ADN
- [../data-flow/concepts.md](../data-flow/concepts.md) - Fundamentos de Data Flow
