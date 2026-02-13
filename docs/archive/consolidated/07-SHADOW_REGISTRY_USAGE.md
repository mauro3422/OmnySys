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
# GuÃ­a de Uso: Shadow Registry

GuÃ­a prÃ¡ctica para usar el sistema de Shadow Registry en el dÃ­a a dÃ­a.

> Ver [arquitectura completa del Shadow Registry](../architecture/SHADOW_REGISTRY.md)

---

## ðŸš€ Quick Start

### InstalaciÃ³n y Setup

El Shadow Registry se activa automÃ¡ticamente cuando OmnySys detecta cambios en archivos:

```bash
# El sistema ya estÃ¡ activo si OmnySys estÃ¡ instalado
# No requiere configuraciÃ³n adicional
```

### Ver Sombras Existentes

```bash
# Listar sombras
ls .omnysysdata/shadows/

# Inspeccionar una sombra
cat .omnysysdata/shadows/shadow_xxx.json | jq '.dna'
```

---

## ðŸŽ¯ Casos de Uso Comunes

### 1. Verificar Ancestry de un Archivo Nuevo

Cuando creas un archivo nuevo, el sistema automÃ¡ticamente:
1. Extrae ADN de cada funciÃ³n
2. Busca sombras similares
3. Enriquece con ancestry si encuentra match

**Verificar manualmente:**
```javascript
import { ShadowRegistry } from './src/layer-c-memory/shadow-registry/index.js';

const registry = new ShadowRegistry('.omnysysdata');
await registry.initialize();

// Obtener Ã¡tomos del archivo
const atoms = await registry.getAtomsForFile('src/api.js');

// Ver ancestry
atoms.forEach(atom => {
  if (atom.ancestry?.replaced) {
    console.log(`${atom.name} hereda de: ${atom.ancestry.replaced}`);
    console.log(`GeneraciÃ³n: ${atom.ancestry.generation}`);
    console.log(`VibraciÃ³n: ${atom.ancestry.vibrationScore}`);
  }
});
```

---

### 2. Buscar el Linaje de una FunciÃ³n

```javascript
// Si tienes el shadowId (de un Ã¡tomo borrado)
const lineage = await registry.getLineage('shadow_mlfm3gte_fwv7');

lineage.forEach((shadow, i) => {
  console.log(`${i}: ${shadow.originalId} (gen: ${shadow.lineage.generation})`);
});

// Output ejemplo:
// 0: src/old.js::validateCart (gen: 0)
// 1: src/api.js::validateOrder (gen: 1)
// 2: src/api.js::processOrder (gen: 2)
```

---

### 3. Comparar Dos Funciones

```javascript
import { extractDNA, compareDNA } from './src/layer-a-static/extractors/metadata/dna-extractor.js';

const atom1 = await getAtom('src/api.js::processOrder');
const atom2 = await getAtom('src/cart.js::processCart');

const similarity = compareDNA(atom1.dna, atom2.dna);

if (similarity > 0.85) {
  console.log('Son la misma funciÃ³n evolucionada');
} else if (similarity > 0.60) {
  console.log('Tienen patrÃ³n similar');
} else {
  console.log('Son funciones diferentes');
}
```

---

### 4. Validar Metadatos de un Ãtomo

```javascript
import { validateForLineage } from './src/layer-b-semantic/validators/lineage-validator.js';

const result = validateForLineage(atom);

if (!result.valid) {
  console.error('Errores:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Advertencias:', result.warnings);
}

console.log('Confianza:', result.confidence);
```

---

### 5. Enriquecer Ãtomo Manualmente

```javascript
const enriched = await registry.enrichWithAncestry(atom);
console.log(enriched.ancestry);

// Output:
// {
//   replaced: "shadow_abc123",
//   lineage: ["shadow_def", "shadow_abc"],
//   generation: 2,
//   vibrationScore: 0.73,
//   strongConnections: [...],
//   warnings: [...]
// }
```

---

### 6. Crear Sombra Manualmente

```javascript
import { extractDNA } from './src/layer-a-static/extractors/metadata/dna-extractor.js';

const atom = {
  id: 'src/temp.js::testFunc',
  name: 'testFunc',
  filePath: 'src/temp.js',
  dataFlow: { /* ... */ },
  semantic: { verb: 'test', domain: 'test' }
};

// Extraer DNA primero
atom.dna = extractDNA(atom);

// Crear sombra
const shadow = await registry.createShadow(atom, {
  reason: 'manual_cleanup',
  risk: 0.1
});

console.log('Sombra creada:', shadow.shadowId);
```

---

## ðŸ“Š InterpretaciÃ³n de MÃ©tricas

### Vibration Score

```javascript
// 0.0 - 0.3: Baja vibraciÃ³n (pocas conexiones)
// 0.3 - 0.6: Media vibraciÃ³n
// 0.6 - 0.8: Alta vibraciÃ³n (conexiones fuertes)
// 0.8 - 1.0: Muy alta (cambios impactarÃ¡n mucho)

const vib = atom.ancestry?.vibrationScore || 0;

if (vib > 0.8) {
  console.warn('âš ï¸ Cambios en este Ã¡tomo impactarÃ¡n muchos archivos');
}
```

### GeneraciÃ³n

```javascript
// 0: FunciÃ³n completamente nueva
// 1-2: Reemplazo de funciÃ³n anterior
// 3+: Linaje largo (mucha historia)

const gen = atom.ancestry?.generation || 0;

if (gen > 2) {
  console.log('Esta funciÃ³n tiene historia (gen:', gen, ')');
}
```

### Similitud

```javascript
// > 0.85: Mismo Ã¡tomo evolucionado
// 0.60 - 0.85: PatrÃ³n similar
// < 0.60: Diferentes

const sim = await registry.findSimilar(atom, { limit: 1 });
if (sim.length > 0 && sim[0].similarity > 0.85) {
  console.log('Reemplaza a:', sim[0].shadow.originalId);
}
```

---

## ðŸŽ­ Flujos TÃ­picos

### Caso 1: Refactor de FunciÃ³n

```
1. Borrar archivo original â†’ Se crea sombra automÃ¡ticamente
2. Crear nuevo archivo con funciÃ³n refactorizada
3. Sistema detecta similitud > 0.85
4. Nueva funciÃ³n hereda ancestry (vibration, connections)
5. Se marca sombra como "replaced"
```

### Caso 2: Renombrar FunciÃ³n

```
1. Renombrar processCart â†’ processOrder
2. File watcher detecta como: borrado + creado
3. DNA idÃ©ntico â†’ similarity = 1.0
4. Herencia automÃ¡tica con evolutionType: "renamed"
```

### Caso 3: Mover Archivo

```
1. Mover src/old/api.js â†’ src/new/api.js
2. File watcher: borrado en old + creado en new
3. DNA estructural idÃ©ntico
4. Herencia con advertencia de cambio de path
```

---

## âš ï¸ Advertencias Comunes

### `ruptured_connections`

```javascript
// Significa que el antepasado tenÃ­a conexiones que no se migraron
{
  type: 'ruptured_lineage',
  count: 3,
  connections: ['auth.js', 'db.js']
}
```
**AcciÃ³n**: Revisar si esas conexiones deben recrearse.

### `complexity_drop`

```javascript
// La funciÃ³n se simplificÃ³ mucho respecto al antepasado
{
  type: 'complexity_drop',
  message: 'Complexity dropped from 8 to 3'
}
```
**AcciÃ³n**: Verificar que no se perdiÃ³ funcionalidad.

### `flow_type_change`

```javascript
// CambiÃ³ el tipo de flujo fundamental
{
  type: 'flow_type_change',
  from: 'read-transform-persist',
  to: 'read-return'
}
```
**AcciÃ³n**: Confirmar que el cambio es intencional.

---

## ðŸ”§ Comandos Ãštiles

### Limpiar Fantasmas

```bash
# Si aparecen nuevos fantasmas en el sistema
node scripts/cleanup-ghosts.js
```

### Buscar Similares

```bash
node -e "
import { ShadowRegistry } from './src/layer-c-memory/shadow-registry/index.js';

const r = new ShadowRegistry('.omnysysdata');
await r.initialize();

const atom = { /* tu Ã¡tomo */ };
const matches = await r.findSimilar(atom, { limit: 3 });

matches.forEach(m => {
  console.log(m.similarity.toFixed(2), m.shadow.originalId);
});
"
```

### Listar Todas las Sombras

```bash
node -e "
import { ShadowRegistry } from './src/layer-c-memory/shadow-registry/index.js';

const r = new ShadowRegistry('.omnysysdata');
await r.initialize();

const shadows = await r.listShadows();
shadows.forEach(s => {
  console.log(\`\${s.shadowId}: \${s.originalId} (\${s.status})\`);
});
"
```

---

## ðŸ› Debugging

### Verificar ExtracciÃ³n de DNA

```javascript
// En el Ã¡tomo guardado
const atom = await loadAtom('src/api.js::processOrder');

if (!atom.dna) {
  console.error('ADN no extraÃ­do');
} else {
  console.log('ADN ID:', atom.dna.id);
  console.log('Hash estructural:', atom.dna.structuralHash);
}
```

### Verificar ValidaciÃ³n

```javascript
const validation = atom._meta?.lineageValidation;

if (validation) {
  console.log('VÃ¡lido:', validation.valid);
  console.log('Confianza:', validation.confidence);
  console.log('Errores:', validation.errors);
}
```

### Verificar Ancestry

```javascript
if (atom.ancestry) {
  console.log('Reemplaza a:', atom.ancestry.replaced);
  console.log('GeneraciÃ³n:', atom.ancestry.generation);
  console.log('VibraciÃ³n:', atom.ancestry.vibrationScore);
  console.log('Warnings:', atom.ancestry.warnings);
} else {
  console.log('Sin ancestry (gÃ©nesis)');
}
```

---

## ðŸ”— IntegraciÃ³n con Queries

### Query con Awareness de Lineage

```javascript
// En tu query service
async function getAtomWithLineage(atomId) {
  const atom = await getAtom(atomId);

  if (atom.ancestry?.replaced) {
    const registry = await getShadowRegistry();
    const lineage = await registry.getLineage(atom.ancestry.replaced);

    return {
      ...atom,
      fullLineage: lineage
    };
  }

  return atom;
}
```

### Query de Impacto con VibraciÃ³n

```javascript
async function getImpactWithVibration(atomId) {
  const atom = await getAtom(atomId);
  const impacts = await calculateImpact(atom);

  // Ajustar por vibraciÃ³n
  const vibration = atom.ancestry?.vibrationScore || 0;
  const adjustedImpacts = impacts.map(imp => ({
    ...imp,
    riskScore: imp.riskScore * (1 + vibration * 0.5)
  }));

  return adjustedImpacts;
}
```

---

## ðŸ“š API Reference RÃ¡pida

| Tarea | Comando/MÃ³dulo |
|-------|---------------|
| Extraer DNA | `extractDNA(atom)` |
| Validar Ã¡tomo | `validateForLineage(atom)` |
| Crear sombra | `registry.createShadow(atom)` |
| Buscar similares | `registry.findSimilar(atom)` |
| Enriquecer | `registry.enrichWithAncestry(atom)` |
| Ver linaje | `registry.getLineage(shadowId)` |
| Comparar ADN | `compareDNA(dna1, dna2)` |

---

## ðŸŽ“ Ejemplos PrÃ¡cticos

### Ejemplo 1: Detectar FunciÃ³n Renombrada

```javascript
// Cuando sospechas que una funciÃ³n fue renombrada
const newAtom = await getAtom('src/api.js::processOrder');
const matches = await registry.findSimilar(newAtom, { limit: 1 });

if (matches.length > 0 && matches[0].similarity > 0.95) {
  console.log('Esta funciÃ³n probablemente es:', matches[0].shadow.originalId);
  console.log('Similitud:', matches[0].similarity);
}
```

### Ejemplo 2: Auditar Conexiones Perdidas

```javascript
const atom = await getAtom('src/api.js::processOrder');

if (atom.ancestry?.warnings?.length > 0) {
  console.log('âš ï¸ Advertencias de linaje:');
  atom.ancestry.warnings.forEach(w => console.log('-', w));

  // Ver quÃ© conexiones se perdieron
  const shadow = await registry.getShadow(atom.ancestry.replaced);
  const lostConnections = shadow.inheritance.rupturedConnections;

  console.log('\nðŸ“Š Conexiones perdidas:');
  lostConnections.forEach(c => {
    console.log(`- ${c.target} (razÃ³n: ${c.reason})`);
  });
}
```

### Ejemplo 3: Rastrear EvoluciÃ³n de un PatrÃ³n

```javascript
// Obtener linaje completo
const lineage = await registry.getLineage('shadow_current');

console.log('EvoluciÃ³n del patrÃ³n:');
lineage.forEach((shadow, i) => {
  console.log(`Gen ${shadow.lineage.generation}: ${shadow.metadata.name}`);
  console.log(`  Flow type: ${shadow.dna.flowType}`);
  console.log(`  Complexity: ${shadow.dna.complexityScore}`);
  if (i > 0) {
    console.log(`  Evolution: ${shadow.lineage.evolutionType}`);
  }
});
```

---

## ðŸ“– Referencias

- [Arquitectura del Shadow Registry](../architecture/SHADOW_REGISTRY.md) - DocumentaciÃ³n completa
- [Data Flow System](../architecture/DATA_FLOW_V2.md) - Sistema de flujo de datos
- [Metadata Extractors](../architecture/METADATA_EXTRACTORS.md) - GuÃ­a de extractores

---

**VersiÃ³n**: 1.0
**Fecha**: 2026-02-10
**Estado**: âœ… Operativo

