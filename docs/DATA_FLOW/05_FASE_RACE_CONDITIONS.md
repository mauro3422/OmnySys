# FASE 5: Detector de Race Conditions

**Estado**: Pre-implementación  
**Dependencias**: Fase 4 (necesita cadenas de data flow)  
**Tiempo estimado**: 1-2 días

---

## 🎯 Objetivo

Detectar **race conditions estáticamente** analizando el patrón de acceso a recursos compartidos entre funciones async.

**Concepto clave**: No simulamos el runtime. Analizamos los "cables" de acceso a recursos y detectamos conflictos potenciales.

---

## 📊 Ejemplo de Problema

### Código Problemático

```javascript
// cart.js

async function updateCart(cartId, item) {
  const cart = await getCart(cartId);
  cart.items.push(item);
  await saveCart(cartId, cart);  // ESCRIBE a localStorage:cart
}

async function applyDiscount(cartId, code) {
  const cart = await getCart(cartId);
  cart.discount = await validateCode(code);
  await saveCart(cartId, cart);  // ESCRIBE a localStorage:cart
}

// checkout() llama a ambas sin coordinación
async function checkout(cartId, item, code) {
  await updateCart(cartId, item);
  await applyDiscount(cartId, code);  // ¡Posible race condition!
  // Si applyDiscount lee antes de que updateCart escriba,
  // el descuento se aplica sobre el cart anterior
}
```

### Metadata Necesaria

```javascript
// Ya la tenemos de fases anteriores:
{
  name: "updateCart",
  isAsync: true,
  stateAccess: {
    reads: ["localStorage:cart"],
    writes: ["localStorage:cart"]
  }
}

{
  name: "applyDiscount",
  isAsync: true,
  stateAccess: {
    reads: ["localStorage:cart"],
    writes: ["localStorage:cart"]
  }
}
```

### Detección

```
RACE CONDITION DETECTADA:
  Recurso: localStorage:cart
  Funciones conflictivas:
    - updateCart (read → write)
    - applyDiscount (read → write)
  
  Posibles orderings:
    1. updateCart → applyDiscount (correcto)
    2. applyDiscount → updateCart (¡descuento perdido!)
  
  Severidad: HIGH
  Recomendación: Serializar con await o usar locks
```

---

## 🔧 Implementación

### Paso 1: Detectar Patrones

```javascript
// src/layer-b-semantic/detectors/race-conditions.js

export const RACE_CONDITION_PATTERNS = {
  // Patrón 1: Shared State Mutation
  // Dos funciones async escriben al mismo recurso
  sharedStateMutation: {
    detect: (atoms) => {
      const conflicts = [];
      
      // Encontrar funciones async que escriben a recursos
      const asyncWriters = atoms.filter(a => 
        a.isAsync && 
        a.stateAccess?.writes?.length > 0
      );
      
      // Comparar todas las parejas
      for (let i = 0; i < asyncWriters.length; i++) {
        for (let j = i + 1; j < asyncWriters.length; j++) {
          const a = asyncWriters[i];
          const b = asyncWriters[j];
          
          // Ver si escriben al mismo recurso
          const shared = a.stateAccess.writes
            .filter(w => b.stateAccess.writes.includes(w));
          
          if (shared.length > 0) {
            conflicts.push({
              type: 'shared-state-mutation',
              functions: [a.name, b.name],
              sharedResources: shared,
              severity: 'HIGH',
              reason: 'Ambas funciones async escriben al mismo recurso'
            });
          }
        }
      }
      
      return conflicts;
    }
  },

  // Patrón 2: Read-Then-Write sin Lock
  // Lee un recurso, opera, y escribe al mismo sin coordinación
  readThenWrite: {
    detect: (atom) => {
      if (!atom.isAsync) return null;
      
      const reads = atom.stateAccess?.reads || [];
      const writes = atom.stateAccess?.writes || [];
      
      // Si lee y escribe el mismo recurso
      const overlap = reads.filter(r => writes.includes(r));
      
      if (overlap.length > 0) {
        return {
          type: 'read-then-write',
          function: atom.name,
          resource: overlap,
          severity: 'MEDIUM',
          reason: 'Lee estado, opera, y escribe sin lock'
        };
      }
    }
  },

  // Patrón 3: Missing Await
  // Llama a función async sin await
  missingAwait: {
    detect: (atom) => {
      if (!atom.isAsync) return null;
      
      // Buscar llamadas a funciones async
      const asyncCalls = atom.calls.filter(c => {
        const target = getAtom(c.name);
        return target?.isAsync;
      });
      
      // Verificar si hay await antes de cada llamada
      const missingAwaits = asyncCalls.filter(c => {
        return !hasAwaitBefore(atom.code, c.line);
      });
      
      if (missingAwaits.length > 0) {
        return {
          type: 'missing-await',
          function: atom.name,
          missingAwaits: missingAwaits.map(c => c.name),
          severity: 'HIGH',
          reason: 'Llama a función async sin await'
        };
      }
    }
  },

  // Patrón 4: Event Handler Race
  // Dos handlers en el mismo evento modifican estado
  eventHandlerRace: {
    detect: (atoms) => {
      const handlers = atoms.filter(a => 
        a.temporal?.eventHandlers?.length > 0 &&
        a.stateAccess?.writes?.length > 0
      );
      
      const conflicts = [];
      
      for (let i = 0; i < handlers.length; i++) {
        for (let j = i + 1; j < handlers.length; j++) {
          const a = handlers[i];
          const b = handlers[j];
          
          // Ver si escuchan el mismo evento
          const sharedEvents = a.temporal.eventHandlers
            .filter(e => b.temporal.eventHandlers.includes(e));
          
          if (sharedEvents.length > 0) {
            conflicts.push({
              type: 'event-handler-race',
              functions: [a.name, b.name],
              events: sharedEvents,
              severity: 'MEDIUM'
            });
          }
        }
      }
      
      return conflicts;
    }
  }
};
```

### Paso 2: Derivación Fractal

```javascript
// Los race conditions también derivan fractalmente:

// Átomo: "Esta función async lee y escribe localStorage:cart"
//   → raceConditionRisk: "read-then-write"

// Molécula: "Este archivo tiene 3 funciones async que escriben localStorage:cart"
//   → raceConditionRisk: "shared-state-mutation"

// Módulo: "El módulo cart/ tiene race conditions entre checkout y discount"
//   → raceConditionRisk: "cross-function-race"

// Sistema: "El flujo de checkout tiene race condition entre cart update y payment"
//   → raceConditionRisk: "business-flow-race"
```

---

## 📊 Tipos de Race Conditions Detectables

| Patrón | Cómo detectamos | Metadata necesaria |
|--------|----------------|-------------------|
| Shared state mutation | 2+ funciones async escriben mismo recurso | isAsync + stateAccess.writes |
| Missing await | Función async llama a otra async sin await | isAsync + calls + awaitPositions |
| Event handler race | 2+ handlers en mismo evento modifican estado | eventHandlers + stateAccess |
| Concurrent fetch | Múltiple fetch() al mismo endpoint sin dedup | networkEndpoints + isAsync |
| Read-then-write | Lee estado, opera, escribe sin lock | stateAccess.reads + stateAccess.writes |
| Fork without join | Múltiples promises sin Promise.all | asyncPaths + awaitPositions |

---

## 🎁 Beneficios

1. **Detectar bugs antes de producción**: Státicamente, sin ejecutar
2. **Entender dependencias async**: Saber qué funciones no pueden correr en paralelo
3. **Recomendaciones automáticas**: "Usa await o Promise.all"
4. **Documentación de threading**: El código revela sus propios riesgos de concurrencia

---

## ✅ Checklist de Implementación

- [ ] Implementar detector `sharedStateMutation`
- [ ] Implementar detector `readThenWrite`
- [ ] Implementar detector `missingAwait`
- [ ] Implementar detector `eventHandlerRace`
- [ ] Agregar campo `raceConditionRisk` a átomos
- [ ] Derivar riesgo a nivel molécula y módulo
- [ ] Tests con código que tiene races conocidos
- [ ] Tests con código async correcto (sin falsos positivos)

---

## 📚 Referencias

- [Documento Original - Sección 8](../architecture/DATA_FLOW_FRACTAL_DESIGN.md#8-race-condition-detection)

---

**Siguiente**: [→ Fase 6: Motor de Simulación](./06_FASE_SIMULACION.md)
