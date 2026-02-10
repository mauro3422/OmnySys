# Estrategia de Integridad y Evolución de Metadatos

**Problema Central**: Los archivos borrados NO deben aparecer en query/memoria activa, PERO contienen **ADN evolutivo** valioso para conexiones vibrantes y ML.

**Solución**: Shadow Registry - Sistema de "sombras" que preservan el linaje evolutivo.

---

## 🧬 Concepto: Metadatos como Entidades Vivas

Los metadatos NO son estáticos. Evolucionan a través de fases, acumulando "experiencia":

```
FASE 1 (Nacimiento)    → Extracción AST
FASE 2 (Infancia)      → Análisis semántico  
FASE 3 (Adolescencia)  → Estandarización
FASE 4 (Adultez)       → Conexiones (cadenas)
FASE 5 (Madurez)       → Detección de riesgos
FASE 6 (Sabiduría)     → Predicción/simulación
[Muerte]               → Shadow Registry (legado)
```

Cada fase genera **nuevos metadatos** y puede usar **metadatos de antepasados**.

---

## 📊 Qué Rescatar de Cada Evolución

### FASE 1 → FASE 2: De Estructura a Significado

**Nuevo**: `semantic.verb`, `semantic.domain`, `semantic.entity`

**De antepasados**:
- Si había `processCart` y ahora hay `processOrder` 
- → Guardar: `domainEvolution: "cart" → "order"`
- → ML aprende: "refactor de dominio de negocio"

### FASE 2 → FASE 3: De Significado a Patrón

**Nuevo**: `standardized.patternHash`, `clan.id`

**De antepasados**:
- Si el patrón cambió de `VALIDATE_FUNC` a `PROCESS_FUNC`
- → Guardar: `patternEvolution: { from: "validate", to: "process" }`
- → ML aprende: "validadores evolucionan a procesadores agregando persistencia"

### FASE 3 → FASE 4: De Patrón a Conexión

**Nuevo**: `chains[]`, `upstream[]`, `downstream[]`

**De antepasados** (CRÍTICO):
- El antepasado tenía 15 conexiones, el nuevo tiene 12
- → Guardar: `connectionRuptures: [3 conexiones perdidas]`
- → El sistema advierte: "⚠️ 3 cables históricos no migraron"

### FASE 4 → FASE 5: De Conexión a Protección

**Nuevo**: `stateAccess`, `conflicts[]`, `riskScore`

**De antepasados**:
- Si el antepasado causó race conditions en el pasado
- → Guardar: `historicalRisks: ["RACE-001", "RACE-003"]`
- → El sistema advierte: "⚠️ Este linaje tiene historial de race conditions"

### FASE 5 → FASE 6: De Protección a Predicción

**Nuevo**: `simulation.paths[]`, `impactPrediction`

**De antepasados**:
- ¿Las predicciones del antepasado fueron acertadas?
- → Guardar: `predictionAccuracy: 0.93`
- → ML ajusta confianza en predicciones de este clan

---

## 🗄️ Arquitectura Dual: HOT vs SHADOW

### HOT STORAGE (`.omnysysdata/`)
**Solo archivos ACTIVOS, con referencias a ancestros**

```javascript
// Átomo vivo
{
  id: "src/api.js::processOrder",
  dataFlow: { ... },
  semantic: { ... },
  standardized: { ... },
  connections: { ... },
  
  // Referencias a sombras (no los datos)
  ancestry: {
    replaced: "shadow_abc123",      // ← ID en Shadow Registry
    inheritedVibration: 0.73,        // ← Score calculado de ancestros
    rupturedConnections: 3           // ← Advertencia
  }
}
```

### SHADOW STORAGE (`.omnysysdata/shadows/`)
**Archivos BORRADOS, con datos heredables comprimidos**

```javascript
// Sombra (antepasado)
{
  shadowId: "shadow_abc123",
  id: "src/api.js::processCart",
  status: "replaced_by:processOrder",
  
  // Snapshot final comprimido
  finalSnapshot: {
    patternHash: "abc123...",
    connectionCount: 15,
    semanticHash: "def456..."
  },
  
  // Datos heredables
  inheritance: {
    strongConnections: [
      { target: "routes.js::handle", weight: 0.95 }
    ],
    vibration: 0.73,
    mlFingerprint: {
      flowType: "read-transform-persist",
      modificationFrequency: 2.3
    }
  },
  
  // Análisis de muerte
  deathAnalysis: {
    reason: "refactor_business_logic",
    riskIntroduced: 0.4,
    commitsInvolved: ["a1b2c3"]
  }
}
```

---

## 🔄 Flujo de Vida, Muerte y Renacimiento

### 1. NACIMIENTO (Archivo Creado)
```
1. File watcher: created
2. Extraer metadata (Fase 1)
3. Enriquecer (Fase 2-6 según disponible)
4. Guardar en HOT storage
5. NO hay antepasado → ancestry vacío
```

### 2. VIDA (Archivo Modificado)
```
1. File watcher: modified
2. Re-extraer metadata
3. Comparar con versión anterior
4. Si cambió semántica: crear entry en evolution log
5. Actualizar HOT storage
```

### 3. MUERTE (Archivo Borrado) ⭐ CRÍTICO
```
1. File watcher: deleted
2. SNAPSHOT FINAL (estado completo al morir)
3. EXTRAER ADN:
   - patternHash (estructura)
   - connectionGraph (conexiones)
   - semanticProfile (significado)
   - modificationHistory (cambios)
4. GUARDAR SOMBRA:
   - Escribir en .omnysysdata/shadows/{shadowId}.json
   - Comprimir metadata (solo lo heredable)
5. ACTUALIZAR HEREDEROS:
   - Buscar función que reemplaza a esta
   - Agregar: `replaces: "shadowId"`
   - Inherit: vibration score, connection weights
6. GENERAR ML DATA:
   - Crear entry: "file_deleted", "function_replaced", etc.
   - Guardar en ml-dataset/
7. LIMPIAR HOT:
   - Remover de files/, atoms/, molecules/
   - Actualizar index.json
```

### 4. RENACIMIENTO (Reemplazo Detectado)
```
1. Nuevo archivo creado
2. Análisis de similitud: ¿Es reemplazo de sombra existente?
3. Si match > 0.85:
   - Agregar `ancestry.replaced: "shadowId"`
   - Inherit: connection weights, risk history
   - Marcar sombra: `replacedBy: "newId"`
4. Heredar "vibración" (intensidad de conexiones)
```

---

## 🎯 Conexiones Vibrantes: El Valor Real

La metáfora "cables que vibran" se refiere a:

```javascript
// Conexión simple (sin historia)
{
  from: "processOrder",
  to: "saveOrder",
  type: "calls",
  weight: 1.0  // ← Estático
}

// Conexión VIBRANTE (con historia de ancestros)
{
  from: "processOrder",
  to: "saveOrder", 
  type: "calls",
  weight: 1.0,
  
  // Heredado de sombras
  ancestralWeight: 0.95,           // ← De antepasados
  vibration: 0.98,                  // ← Intensidad combinada
  
  // Contexto evolutivo
  history: {
    survivedRefactors: 3,           // ← "Resistencia"
    lastRuptured: null,
    typicalChange: "adds_field"
  },
  
  // Alertas
  warnings: [
    "Conexión crítica - 3 antepasados dependían de ella"
  ]
}
```

### Cálculo de Vibración

```javascript
function calculateVibration(connection, shadows) {
  const currentWeight = connection.weight;  // 0-1
  const ancestors = shadows.filter(s => 
    s.inheritance.strongConnections.some(c => 
      c.target === connection.to
    )
  );
  
  const ancestralScore = ancestors.reduce((sum, s) => 
    sum + s.inheritance.vibration, 0
  ) / ancestors.length;
  
  // Vibración = combinación de peso actual + herencia
  return {
    score: (currentWeight * 0.7) + (ancestralScore * 0.3),
    sources: ancestors.map(a => a.shadowId),
    ruptures: ancestors.flatMap(a => 
      a.inheritance.rupturedConnections
    )
  };
}
```

---

## 📊 Formatos de Almacenamiento

### Shadow Registry (SQLite recomendado)

```sql
-- Tabla shadows
CREATE TABLE shadows (
  shadow_id TEXT PRIMARY KEY,
  original_id TEXT NOT NULL,        -- ej: "src/api.js::processCart"
  status TEXT,                      -- "deleted", "replaced"
  replaced_by TEXT,                 -- shadow_id del reemplazo
  born_at TIMESTAMP,
  died_at TIMESTAMP,
  lifespan_days INTEGER,
  
  -- Snapshots comprimidos (JSON)
  final_snapshot BLOB,              -- gzip(JSON)
  inheritance BLOB,                 -- gzip(JSON)
  ml_fingerprint BLOB,              -- gzip(JSON)
  
  -- Búsqueda rápida
  pattern_hash TEXT,
  flow_type TEXT,
  connection_count INTEGER
);

-- Tabla lineage (árbol genealógico)
CREATE TABLE lineage (
  ancestor_id TEXT REFERENCES shadows(shadow_id),
  descendant_id TEXT REFERENCES shadows(shadow_id),
  evolution_type TEXT,              -- "refactor", "merge", "split"
  similarity_score REAL
);

-- Tabla ml_dataset (para entrenamiento)
CREATE TABLE ml_evolutions (
  id INTEGER PRIMARY KEY,
  event_type TEXT,                  -- "file_deleted", "function_replaced"
  before_pattern TEXT,
  after_pattern TEXT,
  context BLOB,                     -- JSON con features
  validated BOOLEAN                 -- ¿El ML confirmó el patrón?
);
```

### ML Dataset Export (JSONL)

```javascript
// ml-dataset/pattern-evolutions.jsonl
{"event": "function_replaced", "from": "processCart", "to": "processOrder", "type": "domain_refactor", "features": {"semantic_change": "cart→order", "pattern_stable": true, "connections_migrated": 0.8}}
{"event": "file_deleted", "file": "old-auth.js", "impact": {"ruptured_connections": 4, "risk_score": 0.7}, "replacement": "auth-v2.js"}
```

---

## 🚀 Plan de Implementación

### FASE A: Shadow Registry Básico (1-2 días)

**Objetivo**: Guardar sombras cuando se borran archivos

```javascript
// src/core/shadow-registry/index.js

export class ShadowRegistry {
  constructor(dataPath) {
    this.db = new SQLite(path.join(dataPath, 'shadows.db'));
  }
  
  async createShadow(atom, reason) {
    const shadow = {
      shadowId: generateId(),
      originalId: atom.id,
      status: 'deleted',
      diedAt: new Date(),
      finalSnapshot: compress(extractSnapshot(atom)),
      inheritance: extractInheritableData(atom)
    };
    
    await this.db.insert('shadows', shadow);
    return shadow.shadowId;
  }
  
  async findReplacements(newAtom) {
    // Buscar sombras similares
    const candidates = await this.db.query(`
      SELECT * FROM shadows 
      WHERE pattern_hash = ? 
      AND died_at > datetime('now', '-7 days')
    `, [newAtom.standardized.patternHash]);
    
    return candidates.filter(c => 
      similarity(c, newAtom) > 0.85
    );
  }
}
```

**Tareas**:
- [ ] Crear schema SQLite
- [ ] Implementar `createShadow()`
- [ ] Integrar con file watcher (on deleted)
- [ ] Test: borrar archivo, verificar shadow creada

### FASE B: Herencia de Vibración (1 día)

**Objetivo**: Nuevos átomos heredan conexiones de antepasados

```javascript
// Cuando se crea un nuevo átomo
async function enrichWithAncestry(newAtom) {
  const ancestors = await shadowRegistry.findReplacements(newAtom);
  
  if (ancestors.length > 0) {
    const primary = ancestors[0];
    
    newAtom.ancestry = {
      replaced: primary.shadowId,
      inheritedVibration: primary.inheritance.vibration,
      strongConnections: primary.inheritance.strongConnections,
      historicalRisks: primary.inheritance.historicalRisks
    };
    
    // Actualizar sombra
    await shadowRegistry.markReplaced(primary.shadowId, newAtom.id);
  }
  
  return newAtom;
}
```

**Tareas**:
- [ ] Implementar `findReplacements()` con similitud
- [ ] Agregar `ancestry` field a átomos
- [ ] Calcular vibration score
- [ ] UI: mostrar "heredado de X" en queries

### FASE C: ML Dataset Generation (1 día)

**Objetivo**: Exportar automáticamente datos de entrenamiento

```javascript
// src/core/ml-dataset/generator.js

export class MLDatasetGenerator {
  async generateEvolutionEntry(shadow) {
    if (!shadow.replacedBy) return;
    
    const entry = {
      event: 'function_replaced',
      from: shadow.originalId,
      to: shadow.replacedBy,
      evolutionType: this.classifyEvolution(shadow),
      features: {
        patternChanged: shadow.finalSnapshot.patternHash !== newAtom.patternHash,
        semanticChanged: this.compareSemantic(shadow, newAtom),
        connectionMigrationRate: this.calculateMigration(shadow, newAtom),
        riskIntroduced: shadow.deathAnalysis.riskIntroduced
      }
    };
    
    await this.appendToDataset('evolutions', entry);
  }
}
```

**Tareas**:
- [ ] Detectar tipos de evolución (refactor, merge, split)
- [ ] Calcular métricas de migración
- [ ] Exportar a JSONL
- [ ] Rotación automática (>100MB)

### FASE D: Sistema de Alertas (1 día)

**Objetivo**: Usar sombras para advertir de riesgos

```javascript
// En el query service
function getAtomWithWarnings(atomId) {
  const atom = getAtom(atomId);
  
  // Buscar advertencias de antepasados
  if (atom.ancestry?.replaced) {
    const shadow = shadowRegistry.get(atom.ancestry.replaced);
    
    atom.warnings = [];
    
    // Alerta: conexiones rotas
    if (shadow.inheritance.rupturedConnections.length > 0) {
      atom.warnings.push({
        type: 'ruptured_connections',
        message: `${shadow.inheritance.rupturedConnections.length} conexiones históricas no migraron`,
        details: shadow.inheritance.rupturedConnections
      });
    }
    
    // Alerta: riesgos históricos
    if (shadow.inheritance.historicalRisks?.length > 0) {
      atom.warnings.push({
        type: 'historical_risks',
        message: `Este linaje tiene ${shadow.inheritance.historicalRisks.length} riesgos históricos`
      });
    }
  }
  
  return atom;
}
```

**Tareas**:
- [ ] Sistema de alertas basado en sombras
- [ ] UI para mostrar warnings
- [ ] Configuración de umbrales

---

## 📈 Métricas de Éxito

| Métrica | Target | Cómo medir |
|---------|--------|------------|
| Shadows creadas | 100% de archivos borrados | Count shadows / deleted files |
| Herencia detectada | >80% de reemplazos | Manual review de sample |
| Vibration accuracy | Predicciones mejoran 20% | Compare con/sin ancestry |
| ML dataset size | >1000 evolutions | Count ml_dataset entries |
| Query performance | <50ms overhead | Benchmark query con shadows |

---

## 🎓 Lecciones Clave

1. **Las sombras son features, no basura**: Cada archivo borrado es una lección de arquitectura.

2. **Vibración = Confianza heredada**: Las conexiones con historia son más "fuertes" que las nuevas.

3. **ML necesita contexto**: Un patrón aislado vale poco. Un patrón con linaje vale oro.

4. **Determinismo incremental**: Cada generación de metadatos aumenta el determinismo del sistema.

5. **La muerte es parte del ciclo**: Un archivo bien muerto (con shadow completa) enseña más que uno vivo pero no entendido.

---

## ✅ Próximos Pasos

1. **Aprobar arquitectura**: ¿Este diseño de sombras cumple con la visión?
2. **Priorizar**: ¿Empezamos con FASE A (Shadow Registry básico)?
3. **Definir similitud**: ¿Cómo determinamos que un átomo "reemplaza" a otro?
4. **Integrar**: ¿Shadow Registry es parte del file watcher o servicio separado?
