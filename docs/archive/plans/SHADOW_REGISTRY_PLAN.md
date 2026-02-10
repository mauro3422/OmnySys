# Plan Maestro: Shadow Registry (Simplificado)

**Fecha**: 2026-02-09  
**Versión**: 2.0 (Simplificado)  
**Alcance**: Solo Fases 0-2 (hasta sistema de herencia)

---

## 🎯 Visión Ejecutiva (Simplificada)

Implementar sistema **Shadow Registry** que:
1. ✅ Preserva ADN de átomos borrados (con IDs de identificación)
2. ✅ Valida que los metadatos extraídos tengan sentido
3. ✅ Enriquece átomos nuevos con herencia de antepasados

**NO incluye**: ML dataset, alertas complejas, predicciones (Fases 3+)

---

## 🏗️ Arquitectura (SSOT + SOLID)

### Layer A (Static): Extracción de ADN
```
src/layer-a-static/extractors/metadata/dna-extractor.js
├── extractDNA(atom)           # Extrae fingerprint estructural
├── compareDNA(dna1, dna2)     # Compara similitud
└── validateDNA(dna)           # Valida estructura
```

**ADN de un átomo**:
```javascript
{
  id: "abc123...",                    # ID único del ADN
  structuralHash: "def456...",        # Hash de estructura (inputs/outputs)
  patternHash: "ghi789...",           # Hash de patrón estandarizado
  flowType: "read-transform-persist", # Tipo de flujo
  operationSequence: ["receive", "read", "transform", "emit"],
  complexityScore: 7,                 # 1-10
  semanticFingerprint: "process:order:order"  # verb:domain:entity
}
```

### Layer B (Semantic): Validación
```
src/layer-b-semantic/validators/lineage-validator.js
├── validateForLineage(atom)   # Valida metadatos completos
├── validateShadow(shadow)     # Valida sombra
└── validateMatch(atom, shadow)# Valida match átomo↔sombra
```

**Validaciones**:
- Estructura completa (data flow válido)
- Coherencia (semantic coincide con transformations)
- DNA válido (todos los campos requeridos)

### Layer C (Memory): Shadow Registry
```
src/layer-c-memory/shadow-registry/
├── types.js                   # Tipos y constantes
├── lineage-tracker.js         # Trazabilidad ADN
└── index.js                   # API principal
```

**Estructura de Sombra**:
```javascript
{
  shadowId: "shadow_xxx",           # ID único de sombra
  originalId: "src/api.js::func",   # ID original del átomo
  status: "deleted" | "replaced",
  diedAt: "2026-02-09T...",
  
  dna: { /* ADN completo */ },      # ← Fingerprint para matching
  
  lineage: {
    parentShadowId: "shadow_abc",   # ← Referencia a antepasado
    generation: 2,                  # ← Número de generación
    evolutionType: "refactor"
  },
  
  inheritance: {
    vibrationScore: 0.73,           # ← Intensidad heredada
    connections: [...]              # ← Conexiones históricas
  }
}
```

---

## 📋 Fases Implementadas

### ✅ FASE 0: Limpieza de Fantasmas (HOY)

**Archivos**: `scripts/cleanup-ghosts.js`

**Tareas**:
- [x] Identificar 6 fantasmas en el índice
- [x] Crear Shadow Registry
- [x] Convertir fantasmas en sombras (preservar ADN)
- [x] Limpiar archivos huérfanos

**Comando**:
```bash
node scripts/cleanup-ghosts.js
```

---

### ✅ FASE 1: Shadow Registry Core (HOY)

**Archivos creados**:
- `src/layer-a-static/extractors/metadata/dna-extractor.js`
- `src/layer-b-semantic/validators/lineage-validator.js`
- `src/layer-c-memory/shadow-registry/types.js`
- `src/layer-c-memory/shadow-registry/lineage-tracker.js`
- `src/layer-c-memory/shadow-registry/index.js`

**Funcionalidad**:
```javascript
// Crear sombra cuando se borra archivo
const shadow = await registry.createShadow(atom, {
  reason: 'file_deleted'
});

// Buscar sombras similares
const matches = await registry.findSimilar(newAtom, {
  minSimilarity: 0.75
});

// Obtener lineage completo
const lineage = await registry.getLineage(shadowId);
// → [genesis, parent, current]
```

**Storage**:
```
.omnysysdata/shadows/
├── index.json              # Índice rápido
├── shadows/
│   ├── shadow_abc123.json  # Sombra individual
│   └── shadow_def456.json
```

---

### ✅ FASE 2: Sistema de Herencia (HOY)

**Integración**: `src/core/file-watcher/handlers.js`

**Flujo cuando se borra archivo**:
```
1. File watcher detecta 'deleted'
2. createShadowsForFile():
   a. Obtiene átomos del archivo
   b. Crea sombra para cada átomo (preserva ADN)
   c. Guarda en .omnysysdata/shadows/
3. Limpia archivos de HOT storage
```

**Flujo cuando se crea archivo**:
```
1. File watcher detecta 'created'
2. analyzeAndIndex() crea átomos
3. enrichAtomsWithAncestry():
   a. Busca sombras similares (compareDNA > 0.85)
   b. Si match: propaga herencia
      - lineage.generation++
      - inheritance.vibrationScore
      - strongConnections
   c. Guarda átomo enriquecido
```

**Ejemplo de átomo enriquecido**:
```javascript
{
  id: "src/api.js::processOrder",
  name: "processOrder",
  dna: { /* ADN actual */ },
  
  ancestry: {                      # ← NUEVO
    replaced: "shadow_abc123",     # ID de sombra antepasada
    lineage: ["shadow_def", "shadow_abc"],  # Árbol genealógico
    generation: 3,                 # 3ra generación
    vibrationScore: 0.73,          # Heredado
    strongConnections: [           # Conexiones que sobrevivieron
      { target: "routes.js", weight: 0.9 }
    ],
    warnings: [                    # Alertas del linaje
      "2 conexiones históricas no migraron"
    ]
  }
}
```

---

## 🧬 El ADN como Identificador

El ADN permite identificar un átomo a través de:
- **Cambios de nombre**: `processCart` → `processOrder` (mismo structuralHash)
- **Refactors**: Extracción de función (patternHash similar)
- **Movimientos**: Mover archivo (mismo DNA, diferente path)

**ID de trazabilidad**:
```javascript
// Cada átomo tiene:
atom.id           // "src/api.js::processOrder" (cambia si se mueve/renombra)
atom.dna.id       // "abc123..." (cambia si cambia estructura)
atom.dna.structuralHash  // "def456..." (cambia si cambia I/O)

// Cada sombra tiene:
shadow.shadowId   // "shadow_abc123" (único, permanente)
shadow.originalId // "src/api.js::processCart" (referencia histórica)
shadow.dna.id     // "abc123..." (para matching)

// Linaje:
shadow.lineage.parentShadowId  // "shadow_parent" (referencia a antepasado)
```

---

## 📊 Validación de Metadatos

### Qué validamos:

1. **Estructura completa**:
   - Tiene `dataFlow` con `inputs`, `outputs`, `transformations`
   - DNA extraído correctamente
   - Semantic analysis presente

2. **Coherencia interna**:
   - Si semantic.verb = "validate", debe tener operación de validación
   - Si flowType incluye "read", debe tener operación de lectura
   - Complejidad score entre 1-10

3. **Match válido**:
   - Similitud DNA > 0.75
   - No es falso positivo (misma estructura, semántica diferente)
   - Consistencia de generación

### Resultados de validación:

```javascript
{
  valid: true | false,
  confidence: 'high' | 'medium' | 'low',
  errors: ['...'],      // Críticos (bloquean)
  warnings: ['...']     // No críticos (loguean)
}
```

---

## 🎯 Comandos

```bash
# 1. Limpiar fantasmas existentes
node scripts/cleanup-ghosts.js

# 2. Ver shadows creadas
ls .omnysysdata/shadows/shadows/

# 3. Inspeccionar sombra
node -e "import('./src/layer-c-memory/shadow-registry/index.js').then(async ({ShadowRegistry}) => { const r = new ShadowRegistry('.omnysysdata'); await r.initialize(); const s = await r.listShadows(); console.log(s); })"

# 4. Test integración
npm test -- shadow-registry/
```

---

## ✅ Checklist de Implementación

- [x] DNA Extractor (Layer A)
- [x] Lineage Validator (Layer B)
- [x] Shadow Registry (Layer C)
- [x] Lineage Tracker
- [x] Integración File Watcher (on deleted)
- [x] Integración File Watcher (on created)
- [x] Script de limpieza de fantasmas
- [x] Extracción de DNA en pipeline de átomos
- [x] Validación automática de metadatos
- [x] Documentación completa (3 documentos)
- [ ] Tests unitarios (pendiente)
- [ ] Tests de integración (pendiente)

---

## 🚀 Próximos Pasos

1. **Ejecutar FASE 0**: `node scripts/cleanup-ghosts.js`
2. **Verificar integridad**: Validar que no queden fantasmas
3. **Test manual**: Crear/borrar archivo y verificar sombras
4. **Documentar**: Guía de uso del Shadow Registry

**Después de esto, el sistema tendrá**:
- ✅ Validación de metadatos en cada extracción
- ✅ ADN con IDs de identificación para trazabilidad
- ✅ Sombras de átomos borrados
- ✅ Herencia de antepasados en átomos nuevos
- ✅ "Conexiones vibrantes" (herencia de vibrationScore)
