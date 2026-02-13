# Guía de Uso - Shadow Registry

**Versión**: v0.7.1  
**Tipo**: Guía práctica / API Reference  
**Prerrequisito**: [dna-system.md](./dna-system.md) y [lifecycle.md](./lifecycle.md)

---

## Quick Start

### Setup

El Shadow Registry se activa automáticamente con OmnySys. No requiere configuración.

```bash
# Verificar que OmnySys está corriendo
npm start

# Listar sombras existentes
ls .omnysysdata/shadows/
```

---

## Casos de Uso Comunes

### 1. Ver Ancestry de un Archivo

Cuando creas un archivo nuevo, el sistema automáticamente:
1. Extrae ADN de cada función
2. Busca sombras similares
3. Enriquece con ancestry si encuentra match

**Verificar manualmente:**

```javascript
import { ShadowRegistry } from './src/layer-c-memory/shadow-registry/index.js';

const registry = new ShadowRegistry('.omnysysdata');
await registry.initialize();

// Obtener átomos del archivo
const atoms = await registry.getAtomsForFile('src/api.js');

// Ver ancestry
atoms.forEach(atom => {
  if (atom.ancestry?.replaced) {
    console.log(`🧬 ${atom.name} hereda de: ${atom.ancestry.replaced}`);
    console.log(`📊 Generación: ${atom.ancestry.generation}`);
    console.log(`⚡ Vibración: ${atom.ancestry.vibrationScore}`);
  } else {
    console.log(`⭐ ${atom.name} es GÉNESIS (nueva)`);
  }
});
```

**Output ejemplo:**
```
🧬 processOrder hereda de: shadow_mlfm3gte_fwv7
📊 Generación: 2
⚡ Vibración: 0.73

⭐ validateUser es GÉNESIS (nueva)
```

---

### 2. Buscar Linaje de una Función

```javascript
// Si tienes el shadowId (de un átomo borrado)
const lineage = await registry.getLineage('shadow_mlfm3gte_fwv7');

lineage.forEach((shadow, i) => {
  const status = shadow.status === 'replaced' ? '→' : '✝';
  console.log(`${i}: ${status} ${shadow.originalId} (gen: ${shadow.lineage.generation})`);
});

// Output:
// 0: ✝ src/old.js::validateCart (gen: 0)
// 1: → src/api.js::validateOrder (gen: 1)
// 2: → src/api.js::processOrder (gen: 2)
```

---

### 3. Comparar Dos Funciones

```javascript
import { extractDNA, compareDNA } from './src/layer-a-static/extractors/metadata/dna-extractor.js';

async function compareFunctions(file1, func1, file2, func2) {
  // Obtener átomos
  const atom1 = await getAtom(`${file1}::${func1}`);
  const atom2 = await getAtom(`${file2}::${func2}`);
  
  // Extraer ADN si no lo tienen
  const dna1 = atom1.dna || await extractDNA(atom1);
  const dna2 = atom2.dna || await extractDNA(atom2);
  
  // Comparar
  const similarity = compareDNA(dna1, dna2);
  
  console.log(`\nComparando ${func1} vs ${func2}:`);
  console.log(`Similitud: ${(similarity * 100).toFixed(1)}%`);
  
  if (similarity > 0.85) {
    console.log('✅ Son la misma función evolucionada');
    console.log(`   ADN: ${dna1.structuralHash.substring(0, 8)}... vs ${dna2.structuralHash.substring(0, 8)}...`);
  } else if (similarity > 0.60) {
    console.log('⚠️  Tienen patrón similar');
    console.log(`   Flow: ${dna1.flowType} vs ${dna2.flowType}`);
  } else {
    console.log('❌ Son funciones diferentes');
  }
  
  return similarity;
}

// Uso
await compareFunctions('src/api.js', 'processOrder', 'src/cart.js', 'processCart');
```

---

### 4. Validar Metadatos de un Átomo

```javascript
import { validateForLineage } from './src/layer-b-semantic/validators/lineage-validator.js';

async function validateAtom(atom) {
  const result = await validateForLineage(atom);
  
  if (!result.valid) {
    console.error('❌ Errores de validación:');
    result.errors.forEach(e => console.error(`   - ${e}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Advertencias:');
    result.warnings.forEach(w => console.warn(`   - ${w}`));
  }
  
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Átomo válido');
  }
  
  console.log(`📊 Confianza: ${result.confidence}`);
  return result;
}
```

---

### 5. Enriquecer Átomo con Ancestry

```javascript
// Automático: El sistema lo hace al analizar
const enriched = await registry.enrichWithAncestry(atom);

// Ver resultado
console.log(enriched.ancestry);
// {
//   replaced: "shadow_abc123",
//   lineage: ["shadow_def456", "shadow_abc123"],
//   generation: 2,
//   vibrationScore: 0.73,
//   strongConnections: [
//     { target: "routes.js", weight: 0.81 }
//   ],
//   warnings: ["3 conexiones históricas no migraron"]
// }
```

---

### 6. Buscar Sombras Similares

```javascript
// Buscar sombras que coincidan con un átomo
const matches = await registry.findSimilar(atom, { minSimilarity: 0.75 });

matches.forEach(match => {
  console.log(`🎯 Match: ${match.shadow.originalId}`);
  console.log(`   Similitud: ${(match.similarity * 100).toFixed(1)}%`);
  console.log(`   Generación: ${match.shadow.lineage.generation}`);
  console.log(`   Estado: ${match.shadow.status}`);
});
```

---

### 7. Crear Sombra Manualmente

```javascript
import { extractDNA } from './src/layer-a-static/extractors/metadata/dna-extractor.js';

// Para casos especiales (ej: migración de sistema)
async function createManualShadow(atomData, reason) {
  const atom = {
    id: atomData.id,
    name: atomData.name,
    filePath: atomData.filePath,
    dataFlow: atomData.dataFlow,
    // ... otros campos
  };
  
  // Extraer ADN
  atom.dna = await extractDNA(atom);
  
  // Crear sombra
  const shadow = await registry.createShadow(atom, {
    reason: reason || 'manual_migration',
    diedAt: new Date()
  });
  
  console.log(`📝 Sombra creada: ${shadow.shadowId}`);
  return shadow;
}
```

---

### 8. Reconstruir Árbol Genealógico

```javascript
// Obtener todo el árbol de un átomo
async function getFullTree(atomId) {
  const atom = await getAtom(atomId);
  
  if (!atom.ancestry?.replaced) {
    console.log('Átomo sin historia (génesis)');
    return [atom];
  }
  
  // Subir por el árbol
  const ancestors = [];
  let currentId = atom.ancestry.replaced;
  
  while (currentId) {
    const shadow = await registry.getShadow(currentId);
    ancestors.unshift(shadow);  // Agregar al inicio
    
    currentId = shadow.lineage?.parentShadowId;
  }
  
  // Agregar átomo actual al final
  ancestors.push(atom);
  
  // Mostrar
  console.log('\n🌳 Árbol genealógico:');
  ancestors.forEach((node, i) => {
    const indent = '  '.repeat(i);
    const name = node.originalId || node.id;
    const gen = node.lineage?.generation || node.ancestry?.generation || 0;
    console.log(`${indent}└── ${name} (gen ${gen})`);
  });
  
  return ancestors;
}
```

---

## API Reference

### ShadowRegistry

```javascript
const registry = new ShadowRegistry('.omnysysdata');
await registry.initialize();
```

#### Métodos Principales

| Método | Descripción | Retorna |
|--------|-------------|---------|
| `getAtomsForFile(filePath)` | Obtener átomos de un archivo | `Atom[]` |
| `findSimilar(atom, options)` | Buscar sombras similares | `{ shadow, similarity }[]` |
| `enrichWithAncestry(atom)` | Agregar ancestry a átomo | `Atom` (enriquecido) |
| `getLineage(shadowId)` | Obtener linaje completo | `Shadow[]` |
| `getShadow(shadowId)` | Obtener sombra por ID | `Shadow` |
| `createShadow(atom, options)` | Crear sombra manual | `Shadow` |

### DNA Extractor

```javascript
import { extractDNA, compareDNA } from './dna-extractor.js';
```

| Función | Descripción | Retorna |
|---------|-------------|---------|
| `extractDNA(atom)` | Extraer ADN de átomo | `DNA` |
| `compareDNA(dna1, dna2)` | Comparar dos ADNs | `number` (0-1) |
| `validateDNA(dna)` | Validar estructura de ADN | `{ valid, errors, warnings }` |

### Lineage Validator

```javascript
import { validateForLineage } from './lineage-validator.js';
```

| Función | Descripción | Retorna |
|---------|-------------|---------|
| `validateForLineage(atom)` | Validar átomo para lineage | `{ valid, confidence, errors, warnings }` |

---

## Ejemplos Completos

### Ejemplo: Detectar Refactor

```javascript
// Detectar si una función fue refactorizada recientemente
async function detectRecentRefactor(filePath, functionName) {
  const atom = await getAtom(`${filePath}::${functionName}`);
  
  if (!atom.ancestry) {
    return { refactored: false, reason: 'No ancestry data' };
  }
  
  const shadow = await registry.getShadow(atom.ancestry.replaced);
  
  if (!shadow) {
    return { refactored: false, reason: 'Shadow not found' };
  }
  
  const daysSinceDeath = (Date.now() - new Date(shadow.diedAt)) / (1000 * 60 * 60 * 24);
  
  return {
    refactored: true,
    previousName: shadow.metadata.name,
    previousLocation: shadow.metadata.filePath,
    daysSinceChange: Math.floor(daysSinceDeath),
    generation: atom.ancestry.generation,
    vibrationPreserved: atom.ancestry.vibrationScore > 0.5
  };
}

// Uso
const refactor = await detectRecentRefactor('src/api.js', 'processOrder');
if (refactor.refactored) {
  console.log(`⚠️  Función refactorizada hace ${refactor.daysSinceChange} días`);
  console.log(`   Antes: ${refactor.previousLocation}::${refactor.previousName}`);
}
```

### Ejemplo: Alertar sobre Conexiones Rotas

```javascript
// Alertar si una función hereda conexiones que ya no existen
async function checkBrokenConnections(filePath) {
  const atoms = await registry.getAtomsForFile(filePath);
  const alerts = [];
  
  for (const atom of atoms) {
    if (!atom.ancestry?.strongConnections) continue;
    
    for (const conn of atom.ancestry.strongConnections) {
      const targetExists = await fileExists(conn.target);
      
      if (!targetExists) {
        alerts.push({
          atom: atom.name,
          connection: conn.target,
          weight: conn.weight,
          warning: 'Conexión histórica ya no existe'
        });
      }
    }
  }
  
  if (alerts.length > 0) {
    console.log('\n⚠️  Conexiones históricas rotas:');
    alerts.forEach(a => {
      console.log(`   ${a.atom} → ${a.connection} (peso: ${a.weight})`);
    });
  }
  
  return alerts;
}
```

---

## Troubleshooting

### "No ancestry data"

**Causa**: El átomo no tiene ancestros (génesis) o el Shadow Registry no procesó el archivo.

**Solución**:
```javascript
// Forzar re-análisis
await registry.enrichWithAncestry(atom);
```

### "Shadow not found"

**Causa**: El shadowId referenciado no existe en `.omnysysdata/shadows/`.

**Solución**: Verificar que el shadow no fue borrado manualmente.

### Similitud siempre 0

**Causa**: Los átomos no tienen Data Flow extraído.

**Solución**:
```javascript
// Asegurar que el átomo tiene dataFlow
if (!atom.dataFlow) {
  // Re-extraer con Data Flow v2
  atom.dataFlow = await extractDataFlow(ast, code, atom.name, atom.filePath);
}
```

---

## Referencias

- [dna-system.md](./dna-system.md) - Extracción de ADN
- [lifecycle.md](./lifecycle.md) - Ciclo de vida completo
- [../data-flow/atom-extraction.md](../data-flow/atom-extraction.md) - Extracción de Data Flow
