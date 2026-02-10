# Guía de Uso: Shadow Registry

Guía práctica para usar el sistema de Shadow Registry en el día a día.

> Ver [arquitectura completa del Shadow Registry](../architecture/SHADOW_REGISTRY.md)

---

## 🚀 Quick Start

### Instalación y Setup

El Shadow Registry se activa automáticamente cuando OmnySys detecta cambios en archivos:

```bash
# El sistema ya está activo si OmnySys está instalado
# No requiere configuración adicional
```

### Ver Sombras Existentes

```bash
# Listar sombras
ls .omnysysdata/shadows/

# Inspeccionar una sombra
cat .omnysysdata/shadows/shadow_xxx.json | jq '.dna'
```

---

## 🎯 Casos de Uso Comunes

### 1. Verificar Ancestry de un Archivo Nuevo

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
    console.log(`${atom.name} hereda de: ${atom.ancestry.replaced}`);
    console.log(`Generación: ${atom.ancestry.generation}`);
    console.log(`Vibración: ${atom.ancestry.vibrationScore}`);
  }
});
```

---

### 2. Buscar el Linaje de una Función

```javascript
// Si tienes el shadowId (de un átomo borrado)
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
  console.log('Son la misma función evolucionada');
} else if (similarity > 0.60) {
  console.log('Tienen patrón similar');
} else {
  console.log('Son funciones diferentes');
}
```

---

### 4. Validar Metadatos de un Átomo

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

### 5. Enriquecer Átomo Manualmente

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

## 📊 Interpretación de Métricas

### Vibration Score

```javascript
// 0.0 - 0.3: Baja vibración (pocas conexiones)
// 0.3 - 0.6: Media vibración
// 0.6 - 0.8: Alta vibración (conexiones fuertes)
// 0.8 - 1.0: Muy alta (cambios impactarán mucho)

const vib = atom.ancestry?.vibrationScore || 0;

if (vib > 0.8) {
  console.warn('⚠️ Cambios en este átomo impactarán muchos archivos');
}
```

### Generación

```javascript
// 0: Función completamente nueva
// 1-2: Reemplazo de función anterior
// 3+: Linaje largo (mucha historia)

const gen = atom.ancestry?.generation || 0;

if (gen > 2) {
  console.log('Esta función tiene historia (gen:', gen, ')');
}
```

### Similitud

```javascript
// > 0.85: Mismo átomo evolucionado
// 0.60 - 0.85: Patrón similar
// < 0.60: Diferentes

const sim = await registry.findSimilar(atom, { limit: 1 });
if (sim.length > 0 && sim[0].similarity > 0.85) {
  console.log('Reemplaza a:', sim[0].shadow.originalId);
}
```

---

## 🎭 Flujos Típicos

### Caso 1: Refactor de Función

```
1. Borrar archivo original → Se crea sombra automáticamente
2. Crear nuevo archivo con función refactorizada
3. Sistema detecta similitud > 0.85
4. Nueva función hereda ancestry (vibration, connections)
5. Se marca sombra como "replaced"
```

### Caso 2: Renombrar Función

```
1. Renombrar processCart → processOrder
2. File watcher detecta como: borrado + creado
3. DNA idéntico → similarity = 1.0
4. Herencia automática con evolutionType: "renamed"
```

### Caso 3: Mover Archivo

```
1. Mover src/old/api.js → src/new/api.js
2. File watcher: borrado en old + creado en new
3. DNA estructural idéntico
4. Herencia con advertencia de cambio de path
```

---

## ⚠️ Advertencias Comunes

### `ruptured_connections`

```javascript
// Significa que el antepasado tenía conexiones que no se migraron
{
  type: 'ruptured_lineage',
  count: 3,
  connections: ['auth.js', 'db.js']
}
```
**Acción**: Revisar si esas conexiones deben recrearse.

### `complexity_drop`

```javascript
// La función se simplificó mucho respecto al antepasado
{
  type: 'complexity_drop',
  message: 'Complexity dropped from 8 to 3'
}
```
**Acción**: Verificar que no se perdió funcionalidad.

### `flow_type_change`

```javascript
// Cambió el tipo de flujo fundamental
{
  type: 'flow_type_change',
  from: 'read-transform-persist',
  to: 'read-return'
}
```
**Acción**: Confirmar que el cambio es intencional.

---

## 🔧 Comandos Útiles

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

const atom = { /* tu átomo */ };
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

## 🐛 Debugging

### Verificar Extracción de DNA

```javascript
// En el átomo guardado
const atom = await loadAtom('src/api.js::processOrder');

if (!atom.dna) {
  console.error('ADN no extraído');
} else {
  console.log('ADN ID:', atom.dna.id);
  console.log('Hash estructural:', atom.dna.structuralHash);
}
```

### Verificar Validación

```javascript
const validation = atom._meta?.lineageValidation;

if (validation) {
  console.log('Válido:', validation.valid);
  console.log('Confianza:', validation.confidence);
  console.log('Errores:', validation.errors);
}
```

### Verificar Ancestry

```javascript
if (atom.ancestry) {
  console.log('Reemplaza a:', atom.ancestry.replaced);
  console.log('Generación:', atom.ancestry.generation);
  console.log('Vibración:', atom.ancestry.vibrationScore);
  console.log('Warnings:', atom.ancestry.warnings);
} else {
  console.log('Sin ancestry (génesis)');
}
```

---

## 🔗 Integración con Queries

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

### Query de Impacto con Vibración

```javascript
async function getImpactWithVibration(atomId) {
  const atom = await getAtom(atomId);
  const impacts = await calculateImpact(atom);

  // Ajustar por vibración
  const vibration = atom.ancestry?.vibrationScore || 0;
  const adjustedImpacts = impacts.map(imp => ({
    ...imp,
    riskScore: imp.riskScore * (1 + vibration * 0.5)
  }));

  return adjustedImpacts;
}
```

---

## 📚 API Reference Rápida

| Tarea | Comando/Módulo |
|-------|---------------|
| Extraer DNA | `extractDNA(atom)` |
| Validar átomo | `validateForLineage(atom)` |
| Crear sombra | `registry.createShadow(atom)` |
| Buscar similares | `registry.findSimilar(atom)` |
| Enriquecer | `registry.enrichWithAncestry(atom)` |
| Ver linaje | `registry.getLineage(shadowId)` |
| Comparar ADN | `compareDNA(dna1, dna2)` |

---

## 🎓 Ejemplos Prácticos

### Ejemplo 1: Detectar Función Renombrada

```javascript
// Cuando sospechas que una función fue renombrada
const newAtom = await getAtom('src/api.js::processOrder');
const matches = await registry.findSimilar(newAtom, { limit: 1 });

if (matches.length > 0 && matches[0].similarity > 0.95) {
  console.log('Esta función probablemente es:', matches[0].shadow.originalId);
  console.log('Similitud:', matches[0].similarity);
}
```

### Ejemplo 2: Auditar Conexiones Perdidas

```javascript
const atom = await getAtom('src/api.js::processOrder');

if (atom.ancestry?.warnings?.length > 0) {
  console.log('⚠️ Advertencias de linaje:');
  atom.ancestry.warnings.forEach(w => console.log('-', w));

  // Ver qué conexiones se perdieron
  const shadow = await registry.getShadow(atom.ancestry.replaced);
  const lostConnections = shadow.inheritance.rupturedConnections;

  console.log('\n📊 Conexiones perdidas:');
  lostConnections.forEach(c => {
    console.log(`- ${c.target} (razón: ${c.reason})`);
  });
}
```

### Ejemplo 3: Rastrear Evolución de un Patrón

```javascript
// Obtener linaje completo
const lineage = await registry.getLineage('shadow_current');

console.log('Evolución del patrón:');
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

## 📖 Referencias

- [Arquitectura del Shadow Registry](../architecture/SHADOW_REGISTRY.md) - Documentación completa
- [Data Flow System](../architecture/DATA_FLOW_V2.md) - Sistema de flujo de datos
- [Metadata Extractors](../architecture/METADATA_EXTRACTORS.md) - Guía de extractores

---

**Versión**: 1.0
**Fecha**: 2026-02-10
**Estado**: ✅ Operativo
