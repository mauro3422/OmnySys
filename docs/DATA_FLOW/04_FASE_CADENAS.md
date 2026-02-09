# FASE 4: Cadenas Cross-Function

**Estado**: Pre-implementación  
**Dependencias**: Fases 1, 2, 3 (necesita átomos completos)  
**Tiempo estimado**: 2-3 días

---

## 🎯 Objetivo

Conectar la **salida** de una función con la **entrada** de otra dentro del mismo archivo.

**Ejemplo**: `processOrder` llama a `calculateTotal` pasando `order.items`, y recibe `total`.

---

## 📊 Ejemplo Real

### Código

```javascript
// Archivo: orderProcessor.js

export function processOrder(order) {
  const total = calculateTotal(order.items);
  const tax = calculateTax(total);
  return { total: total + tax };
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function calculateTax(amount) {
  return amount * 0.16; // 16% IVA
}
```

### Cadenas Detectadas

```
Cadena 1: processOrder → calculateTotal
  order.items (input de processOrder)
    → items (param de calculateTotal)
      → return total (output de calculateTotal)
        → total (variable en processOrder)

Cadena 2: processOrder → calculateTax
  total (variable en processOrder)
    → amount (param de calculateTax)
      → return tax (output de calculateTax)
        → tax (variable en processOrder)

Cadena 3: Resultado final
  order.items → total → amount → tax → return { total + tax }
```

---

## 🔧 Implementación

### Paso 1: Conectar Atómos

```javascript
// En derivation-engine.js, agregar nueva regla:

moleculeDataFlow: (atoms) => {
  const chains = [];
  
  // Para cada átomo exportado (entry points)
  const entryAtoms = atoms.filter(a => a.isExported);
  
  for (const entry of entryAtoms) {
    for (const input of entry.dataFlow.inputs) {
      const chain = traceDataChain(input, entry, atoms);
      if (chain.steps.length > 0) {
        chains.push(chain);
      }
    }
  }
  
  return {
    // A: Qué datos entran al archivo
    inputs: entryAtoms.flatMap(a => 
      a.dataFlow.inputs.map(i => ({
        name: i.name,
        entryFunction: a.name,
        type: inferType(i)
      }))
    ),
    
    // B: Cómo se transforman dentro
    internalChains: chains,
    
    // C: Qué datos salen del archivo
    outputs: entryAtoms.flatMap(a =>
      a.dataFlow.outputs.map(o => ({
        ...o,
        exitFunction: a.name
      }))
    ),
    
    // Tipo de flujo derivado
    flowType: classifyFlow(chains)
  };
}
```

### Paso 2: Trazar Cadena

```javascript
function traceDataChain(input, startAtom, allAtoms) {
  const steps = [];
  const visited = new Set();
  
  function walk(currentAtom, dataName, depth = 0) {
    if (depth > 10 || visited.has(`${currentAtom.id}:${dataName}`)) return;
    visited.add(`${currentAtom.id}:${dataName}`);
    
    // Buscar transformaciones de este dato
    const transforms = currentAtom.dataFlow.transformations
      .filter(t => t.from === dataName || t.from.includes(dataName));
    
    for (const transform of transforms) {
      steps.push({
        function: currentAtom.name,
        from: dataName,
        to: transform.to,
        operation: transform.operation,
        via: transform.via,
        depth
      });
      
      // Si se pasa a otra función, seguir
      if (transform.via) {
        const targetAtom = allAtoms.find(a => a.name === transform.via);
        if (targetAtom) {
          // Encontrar qué parámetro recibe este dato
          const targetParam = findTargetParam(targetAtom, transform.to);
          walk(targetAtom, targetParam, depth + 1);
        }
      }
    }
    
    // Seguir returns
    for (const output of currentAtom.dataFlow.outputs) {
      if (output.type === 'return') {
        // Buscar quién llama a esta función
        for (const caller of currentAtom.calledBy) {
          const callerAtom = allAtoms.find(a => a.id === caller);
          if (callerAtom) {
            const receiveVar = findReceiveVariable(callerAtom, currentAtom.name);
            walk(callerAtom, receiveVar, depth + 1);
          }
        }
      }
    }
  }
  
  walk(startAtom, input.name);
  
  return {
    input: input.name,
    steps,
    touchedFunctions: [...new Set(steps.map(s => s.function))]
  };
}
```

---

## 📊 Flow Types Detectables

| Flow Type | Patrón | Ejemplo |
|-----------|--------|---------|
| **read-only** | ENTITY → property access → return | `getUser(id) → db.find → return user` |
| **write-only** | ENTITY → persist | `saveUser(user) → db.save` |
| **read-transform-persist** | READ → TRANSFORM → WRITE | `processOrder → calculate → save` |
| **validation-gate** | ENTITY → validate → pass/fail | `validateUser → check → throw/return` |
| **aggregation** | ENTITIES → combine → RESULT | `getReport → query + query → merge` |
| **fan-out** | ENTITY → multiple destinations | `notify → email + sms + push` |
| **pipeline** | A → B → C → D | `parse → validate → transform → save` |
| **fork-join** | Split → parallel → merge | `fetchAll → [fetch, fetch] → combine` |

---

## 🎁 Beneficios

1. **Entender flujos de negocio**: "El checkout es: cart → validation → payment → notification"
2. **Detectar bottlenecks**: "Todas las requests pasan por validateToken"
3. **Optimizar**: "Podemos paralelizar fetchUser y fetchCart"
4. **Documentación automática**: El código se auto-documenta su flujo

---

## ✅ Checklist de Implementación

- [ ] Implementar `traceDataChain()` para seguir un dato
- [ ] Conectar outputs con inputs entre funciones
- [ ] Detectar flowType automáticamente
- [ ] Manejar recursiones y ciclos
- [ ] Agregar `dataFlow` a cada molécula
- [ ] Tests con archivos reales
- [ ] Visualizar cadenas (opcional)

---

## 📚 Referencias

- [Documento Original - Sección 5](../architecture/DATA_FLOW_FRACTAL_DESIGN.md#5-cross-function-chaining---nivel-molecula)

---

**Siguiente**: [→ Fase 5: Detector de Race Conditions](./05_FASE_RACE_CONDITIONS.md)
