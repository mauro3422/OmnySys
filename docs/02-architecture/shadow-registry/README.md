# Shadow Registry

**Versión**: v0.7.1  
**Estado**: Implementado en producción  
**Filosofía**: *"Los átomos mueren, pero su ADN persiste para guiar a las futuras generaciones"*

---

## 🎯 Qué es Shadow Registry

Sistema que preserva el **ADN estructural** de los átomos (funciones) borrados, permitiendo:

1. **Trazabilidad**: Seguir el linaje evolutivo de cualquier función
2. **Herencia**: Nuevas funciones heredan "vibración" de sus antepasadas
3. **Validación**: Garantizar que los metadatos extraídos tengan sentido
4. **Conexiones vibrantes**: Conocer la intensidad histórica de las conexiones

---

## 📚 Documentos en esta Sección

| Documento | Descripción | Leer primero |
|-----------|-------------|--------------|
| [dna-system.md](./dna-system.md) | **ADN estructural**, extracción, comparación | ✅ Sí |
| [lifecycle.md](./lifecycle.md) | **Ciclo de vida**: Nacimiento, Vida, Muerte, Renacimiento | Después de dna-system |
| [usage.md](./usage.md) | **Guía práctica**: Casos de uso comunes y API | Para desarrollo |

---

## 🧠 Conceptos en 30 Segundos

### El ADN (Fingerprint Estructural)

Identificador único de una función basado en su **estructura**, no en su nombre:

```javascript
{
  structuralHash: "abc123...",      // Hash de inputs/outputs/transforms
  patternHash: "def456...",          // Hash de patrón estandarizado
  flowType: "read-transform-persist", // Categoría
  operationSequence: ["receive", "read", "transform", "persist", "return"]
}
```

**Permite identificar** `processCart` → `processOrder` (misma función, nuevo nombre)

### Las Sombras (Shadows)

Cuando un átomo se borra, se convierte en **sombra**:

```javascript
{
  shadowId: "shadow_mlfm3gte_fwv7",  // ID único permanente
  dna: { /* ADN completo */ },        // Para matching futuro
  lineage: {                         // Genealogía
    generation: 2,
    parentShadowId: "shadow_abc",
    childShadowIds: ["shadow_xyz"]
  },
  inheritance: {                     // Datos heredables
    vibrationScore: 0.73,
    strongConnections: [...]
  }
}
```

### Ciclo de Vida

```
FASE 0: NACIMIENTO (Extracción)
  └── Extraer ADN del átomo
      
FASE 1: VIDA (Archivo en uso)
  └── Átomo enriquecido con ancestry
      
FASE 2: MUERTE (Archivo borrado)
  └── Crear sombra con ADN preservado
      
FASE 3: RENACIMIENTO (Función similar detectada)
  └── Nuevo átomo hereda de sombra
```

---

## 📊 Comparación de ADN

```javascript
import { compareDNA } from './dna-extractor.js';

const similarity = compareDNA(dna1, dna2);
// 0.0 = completamente diferente
// 1.0 = idéntico
// >0.85 = probablemente el mismo átomo evolucionado
```

**Pesos**:
- Structural hash: 40%
- Pattern hash + flow type: 30%
- Operation sequence: 20%
- Semantic fingerprint: 10%

---

## 🔗 Relación con Otros Sistemas

```
01-core/philosophy.md (Física del Software)
    ↓
02-architecture/data-flow/concepts.md (Fractal A→B→C)
    ↓
02-architecture/shadow-registry/ (este directorio)
    ├── ADN se extrae del data flow
    ├── Ancestry enriquece átomos
    └── Shadows preservan historia
        ↓
02-architecture/archetypes/system.md (Herencia afecta confidence)
    ↓
03-orchestrator/ (Vida/Muerte de archivos)
```

---

## 🚀 Uso Rápido

### Ver Ancestry de un Archivo

```javascript
const atoms = await registry.getAtomsForFile('src/api.js');

atoms.forEach(atom => {
  if (atom.ancestry?.replaced) {
    console.log(`${atom.name} es gen ${atom.ancestry.generation}`);
    console.log(`Hereda de: ${atom.ancestry.replaced}`);
  }
});
```

### Buscar Linaje

```javascript
const lineage = await registry.getLineage('shadow_mlfm3gte_fwv7');
// 0: src/old.js::validateCart (gen: 0)
// 1: src/api.js::validateOrder (gen: 1)
// 2: src/api.js::processOrder (gen: 2)
```

---

## 📁 Storage

```
.omnysysdata/
├── shadows/
│   ├── index.json              # Índice rápido
│   └── shadow_{id}.json        # Sombras individuales
│
└── atoms/
    └── {filePath}/
        └── {functionName}.json  # Átomos vivos
```

---

**Siguiente paso**: Lee [dna-system.md](./dna-system.md) para entender el ADN estructural.
