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
# Data Flow Fractal Design - El Dato como Ciudadano de Primera Clase

**Version**: v0.7.0 (Design Document)
**Status**: Design Phase - Pre-Implementation
**Date**: 2026-02-08

---

## 1. Vision

### El problema actual

OmnySys tiene ~75-85% de cobertura de conexiones. Sabemos QUE funciones existen, QUIEN llama a quien, y QUE side effects tienen. Pero NO sabemos:

- Como viaja un dato de funcion en funcion
- Que transformaciones sufre en el camino
- Donde nace, como evoluciona, donde muere

### La solucion: A->B->C Fractal aplicado al DATO

El dato tiene su propia vida. Nace (parametro), se transforma (operaciones), y muere o sale (return/side effect). Aplicamos el mismo patron fractal A->B->C a CADA nivel:

```
DATO-ATOMO (valor dentro de una funcion):
  A: Entra como parametro o literal
  B: Se transforma (property access, validacion, merge)
  C: Sale como return o se pasa a otra funcion

DATO-MOLECULA (viaje dentro de un archivo):
  A: Entra por funciones exportadas (params publicos)
  B: Viaja entre funciones internas (cadena de transformaciones)
  C: Sale por returns de funciones exportadas

DATO-MODULO (viaje entre archivos):
  A: Entra por imports del modulo
  B: Viaja entre archivos del modulo
  C: Sale por exports del modulo

DATO-SISTEMA (viaje completo):
  A: Entra por API/UI/CLI (entry points)
  B: Viaja entre modulos
  C: Sale como response/side effect/storage
```

---

## 2. Variable Standardization

### El concepto

DERIVAR una version estandarizada de cada atomo (sin reemplazar la original) para encontrar PATRONES ESTRUCTURALES independientes del negocio.

**IMPORTANTE**: No reemplazamos nada. La version estandarizada es un campo DERIVADO,
igual que la molecula se deriva del atomo. El developer sigue viendo nombres reales.
El sistema usa ambas versiones segun el contexto:
- Nombres reales â†’ ayudar al developer, navegar codigo
- Version estandarizada â†’ pattern matching, training de IA, deteccion cross-project

```javascript
// CODIGO ORIGINAL:
function validateUser(user) {
  const role = user.role;
  if (!checkPermissions(role)) throw new Error('No access');
  return { ...user, validated: true };
}

// ESTANDARIZADO:
function VALIDATE_FUNC(ENTITY_PARAM) {
  const PROP_1 = ENTITY_PARAM.PROP_1;
  if (!CHECK_FUNC(PROP_1)) throw new Error(STRING_1);
  return { ...ENTITY_PARAM, FLAG_1: true };
}
```

### Reglas de estandarizacion

| Tipo | Patron Original | Token Estandar |
|------|----------------|----------------|
| Funcion | `validateUser` | `VALIDATE_FUNC` (verbo se conserva) |
| Parametro entidad | `user`, `order`, `payment` | `ENTITY_PARAM` |
| Property access | `.role`, `.total`, `.email` | `.PROP_N` |
| Funcion auxiliar | `checkPermissions`, `hashPassword` | `CHECK_FUNC`, `HASH_FUNC` |
| Literal string | `'No access'` | `STRING_N` |
| Literal numero | `42`, `100` | `NUMBER_N` |
| Flag booleano | `validated`, `active` | `FLAG_N` |

### Extraccion semantica del nombre

Del nombre de la funcion extraemos:

```javascript
// "validateUserPayment" =>
{
  verb: "validate",          // accion (que hace)
  domain: "user",            // dominio (a que pertenece)
  entity: "payment",         // entidad (sobre que actua)
  operationType: "validation" // clasificacion
}

// Verbos conocidos y su operationType:
const VERB_MAP = {
  // Read operations
  get: 'read', fetch: 'read', load: 'read', find: 'read', query: 'read',
  // Write operations
  create: 'write', add: 'write', save: 'write', store: 'write', insert: 'write',
  // Update operations
  update: 'update', set: 'update', modify: 'update', patch: 'update',
  // Delete operations
  delete: 'delete', remove: 'delete', clear: 'delete', destroy: 'delete',
  // Validation operations
  validate: 'validation', check: 'validation', verify: 'validation', ensure: 'validation',
  // Transformation operations
  transform: 'transformation', convert: 'transformation', map: 'transformation',
  parse: 'transformation', format: 'transformation', normalize: 'transformation',
  // Communication operations
  send: 'communication', emit: 'communication', notify: 'communication',
  publish: 'communication', dispatch: 'communication',
  // Processing operations
  process: 'processing', handle: 'processing', execute: 'processing', run: 'processing',
  // Initialization operations
  init: 'initialization', setup: 'initialization', configure: 'initialization',
  // Calculation operations
  calculate: 'calculation', compute: 'calculation', derive: 'calculation',
  count: 'calculation', sum: 'calculation',
  // Extraction operations
  extract: 'extraction', parse: 'extraction', detect: 'extraction'
};
```

### Beneficio: Patrones universales

Con estandarizacion, estos DOS codigos producen el MISMO patron:

```javascript
// Proyecto A:
function validateUser(user) {
  if (!user.email) throw new Error('Missing email');
  return { ...user, validated: true };
}

// Proyecto B:
function validateOrder(order) {
  if (!order.total) throw new Error('Missing total');
  return { ...order, validated: true };
}

// PATRON ESTANDARIZADO (identico):
// VALIDATE_FUNC(ENTITY) { if(!ENTITY.PROP_1) throw; return {...ENTITY, FLAG:true} }
// Tipo: "validation-with-merge"
```

Esto permite:
1. Entrenar modelos en ESTRUCTURA no en nombres
2. Detectar patrones de negocio CROSS-PROJECT
3. Identificar anti-patterns universales

---

## 3. El "Imposible" y Por Que Es Casi 100% Posible

### Principio Fundamental: CABLES, NO SEÃ‘ALES

El objetivo NO es saber que valor tiene una variable en runtime.
El objetivo ES mapear TODOS los cables (conexiones) del sistema.

```
Metafora:
  ARCHIVO = CAJA
  FUNCION = COMPONENTE dentro de la caja
  CONEXION = CABLE entre componentes
  DATO = CORRIENTE que viaja por el cable

  NO nos importa el voltaje (valor del dato).
  SI nos importa que el cable EXISTE y a donde va.
```

Con este enfoque, el "imposible" se reduce drasticamente:

### 3.1 eval() y Codigo Dinamico

**Parece imposible**: No sabemos que ejecuta eval.

**Con enfoque de cables**: No nos importa QUE ejecuta. Nos importa que el CABLE existe.

```javascript
// eval() es un componente OPACO pero con cables mapeados:
{
  name: "executeDynamic",
  dataFlow: {
    inputs: [{ name: "codeString", source: "config.action" }],
    opaqueExecution: {
      type: "eval",
      inputCable: "codeString",    // sabemos QUE entra
      outputCable: "result",        // sabemos QUE sale
      // El cable existe, la seÃ±al es opaca
      // Pero la CONEXION esta mapeada al 100%
    },
    outputs: [{ name: "result", type: "unknown_but_mapped" }]
  }
}

// Ademas: podemos crear metadata de prueba (test probes)
// para verificar que "la corriente pasa por los cables":
{
  testProbe: {
    input: { codeString: "1 + 1" },        // valor de prueba
    expectedOutput: { type: "number" },      // tipo esperado
    cableIntegrity: "VERIFIED"               // el cable funciona
  }
}
```

**Cobertura de cables**: ~90%. El cable esta mapeado. Solo la seÃ±al interna es opaca.

### 3.2 User Input en Runtime

**Parece imposible**: No sabemos que valor ingresa el usuario.

**Con enfoque de cables**: No nos importa el valor. Nos importa el CABLE completo.

```
req.body -> validateUser -> checkPermissions -> saveUser -> response

El cable COMPLETO esta mapeado.
No nos importa si user.name = "Juan" o "Maria".
Nos importa que user.name VIAJA por este camino.
```

Mapeamos:
- DONDE entra el dato (entry point)
- POR DONDE viaja (transformaciones)
- DONDE termina (storage, response, side effect)
- QUE VALIDACIONES pasa (gates)
- QUE PASA SI FALLA (error paths)

**Cobertura de cables**: ~95%. Todos los paths estan mapeados.

### 3.3 Third-Party Library Internals

**Parece imposible**: No sabemos que hace lodash.merge internamente.

**Con enfoque de cables**: Nos importa el cable, no el componente interno.

```javascript
// Lo que sabemos (los cables):
//   objA -> merge() -> result
//   objB -> merge() -> result
//
// Lo que NO sabemos: que hace merge internamente.
// PERO: no nos importa. El cable esta mapeado.
//
// EXTRA: Catalogo de firmas conocidas para librerias comunes:
const KNOWN_SIGNATURES = {
  'lodash.merge':  { in: ['target', 'source'], out: 'merged', mutates: true },
  'lodash.map':    { in: ['collection', 'fn'], out: 'array', mutates: false },
  'express.get':   { in: ['path', 'handler'], out: 'void', type: 'route' },
  'fs.readFile':   { in: ['path', 'callback'], out: 'buffer', type: 'io' },
  'JSON.parse':    { in: ['string'], out: 'object', throws: true },
  'JSON.stringify': { in: ['object'], out: 'string', pure: true }
};
```

**Cobertura de cables**: ~80%. Cable mapeado + catalogo de firmas para librerias comunes.

### 3.4 Race Conditions y Async Timing

**Parece imposible**: No sabemos el orden de ejecucion.

**Con enfoque de cables + simulacion**: Mapeamos TODOS los orderings posibles.

```javascript
// Si sabemos:
//   updateCart() -> async -> escribe localStorage:cart
//   applyDiscount() -> async -> escribe localStorage:cart
//   checkout() llama a ambas

// La simulacion mapea TODAS las posibilidades:
{
  asyncFlowAnalysis: {
    resource: "localStorage:cart",
    writers: ["updateCart", "applyDiscount"],

    // Todos los orderings posibles:
    possibleOrderings: [
      {
        order: ["updateCart", "applyDiscount"],
        result: "descuento aplicado sobre cart actualizado",
        risk: "LOW"
      },
      {
        order: ["applyDiscount", "updateCart"],
        result: "cart actualizado SOBREESCRIBE descuento",
        risk: "HIGH - descuento perdido"
      }
    ],

    // Deteccion: hay un ordering que causa problema
    raceConditionDetected: true,
    severity: "HIGH",
    recommendation: "Serializar updateCart y applyDiscount con await"
  }
}
```

**Patrones detectables**:

| Patron | Como detectamos | Metadata necesaria |
|--------|----------------|-------------------|
| Shared state mutation | 2+ funciones async escriben mismo recurso | isAsync + stateAccess.writes |
| Missing await | Funcion async llama a otra async sin await | isAsync + calls + awaitPositions |
| Event handler race | 2+ handlers en mismo evento modifican estado | eventHandlers + stateAccess |
| Concurrent fetch | Multiple fetch() al mismo endpoint sin dedup | networkEndpoints + isAsync |
| Read-then-write | Lee estado, opera, escribe sin lock | stateAccess.reads + stateAccess.writes |
| Fork without join | Multiples promises sin Promise.all | asyncPaths + awaitPositions |

**Cobertura de cables**: ~75%. Todos los orderings posibles mapeados.

### 3.5 Runtime Type Coercion

**Parece imposible**: `"5" + 3 = "53"` vs `5 + 3 = 8`.

**Con enfoque de cables**: Detectamos las operaciones mixtas y flaggeamos:

```javascript
{
  typeRisk: {
    line: 15,
    operation: "addition",
    operands: ["total", "discount"],
    risk: "Si uno es string y otro number, resultado inesperado",
    detectable: true,  // Podemos ver si hay typeof checks antes
    recommendation: "Agregar Number() cast o typeof validation"
  }
}
```

**Cobertura de cables**: ~60%. Detectamos DONDE puede pasar, no SI pasara.

### 3.6 Resumen: Cobertura con enfoque de cables

| Tipo | Antes | Con cables | Tecnica |
|------|-------|------------|---------|
| eval/dynamic code | 0% | ~90% | Cable mapeado (entradaâ†’evalâ†’salida) + test probes |
| User input paths | 0% | ~95% | Cable completo, valor irrelevante |
| Third-party internals | 0% | ~80% | Cable + catalogo de firmas conocidas |
| Async timing/race | 0% | ~75% | Simular todos los orderings posibles |
| Type coercion | 0% | ~60% | Detectar operaciones mixtas |
| Computed property | 0% | ~50% | String analysis parcial |

**Cobertura total de CABLES (conexiones): 97-99%**

El 1-2% restante:
- eval() con string construido de API externa (cable opaco end-to-end)
- Reflection con keys computados de runtime data
- WebAssembly internals

Estos son casos extremadamente raros en codigo JS/TS tipico.

---

## 4. Data Flow Tracker - Nivel Atomo

### 4.1 Que necesitamos extraer por funcion

Para cada atomo, necesitamos trackear como cada parametro fluye:

```javascript
// EJEMPLO:
function processOrder(order, userId) {
  const total = calculateTotal(order.items);
  const user = getUser(userId);
  const discount = user.discount || 0;
  const finalTotal = total - (total * discount);
  await saveOrder({ ...order, total: finalTotal, userId });
  return { orderId: order.id, total: finalTotal };
}
```

**Metadata de data flow extraida**:

```javascript
{
  name: "processOrder",
  dataFlow: {
    // A: INPUTS - que entra
    inputs: [
      {
        name: "order",
        position: 0,
        usages: [
          { type: "property_access", property: "items", line: 2, passedTo: "calculateTotal" },
          { type: "spread", line: 5, passedTo: "saveOrder" },
          { type: "property_access", property: "id", line: 6, passedTo: "return" }
        ]
      },
      {
        name: "userId",
        position: 1,
        usages: [
          { type: "direct_pass", line: 3, passedTo: "getUser" },
          { type: "spread_property", line: 5, passedTo: "saveOrder" }
        ]
      }
    ],

    // B: TRANSFORMATIONS - que pasa dentro
    transformations: [
      {
        from: "order.items",
        to: "total",
        via: "calculateTotal",
        operation: "calculation",
        line: 2
      },
      {
        from: "userId",
        to: "user",
        via: "getUser",
        operation: "read",
        line: 3
      },
      {
        from: "user.discount",
        to: "discount",
        operation: "property_access_with_default",
        defaultValue: "0",
        line: 4
      },
      {
        from: ["total", "discount"],
        to: "finalTotal",
        operation: "arithmetic",
        line: 5
      }
    ],

    // C: OUTPUTS - que sale
    outputs: [
      {
        type: "side_effect",
        target: "saveOrder",
        data: "{ ...order, total: finalTotal, userId }",
        operation: "persistence",
        line: 5
      },
      {
        type: "return",
        shape: "{ orderId: order.id, total: finalTotal }",
        properties: ["orderId", "total"],
        line: 6
      }
    ]
  },

  // ESTANDARIZADO (para pattern matching)
  standardized: {
    pattern: "PROCESS_FUNC(ENTITY_1, ID_1) { CALC â†’ READ â†’ TRANSFORM â†’ PERSIST â†’ RETURN }",
    operations: ["calculation", "read", "arithmetic", "persistence"],
    flowType: "read-transform-persist"
  }
}
```

### 4.2 Como extraerlo del AST

Babel ya parsea el AST. Necesitamos un visitor que camine el arbol:

```javascript
// PSEUDO-CODIGO del visitor:
const DataFlowVisitor = {
  // Trackear parametros
  FunctionDeclaration(path) {
    const params = path.node.params.map(p => ({
      name: p.name,
      position: index,
      usages: []   // se llena en los visitors hijos
    }));
    // Registrar en scope
  },

  // Trackear property access: user.role
  MemberExpression(path) {
    const obj = path.node.object.name;  // "user"
    const prop = path.node.property.name; // "role"
    // Si obj es un parametro -> registrar usage
    // usage: { type: "property_access", property: prop }
  },

  // Trackear assignments: const x = ...
  VariableDeclarator(path) {
    const name = path.node.id.name;      // "total"
    const init = path.node.init;          // la expresion de inicializacion
    // Si init es CallExpression -> transformacion via funcion
    // Si init es MemberExpression -> property access
    // Si init es BinaryExpression -> operacion aritmetica
  },

  // Trackear calls: calculateTotal(order.items)
  CallExpression(path) {
    const callee = path.node.callee.name;  // "calculateTotal"
    const args = path.node.arguments;       // [order.items]
    // Registrar: param "order.items" se pasa a "calculateTotal" como arg[0]
  },

  // Trackear returns: return { orderId: order.id }
  ReturnStatement(path) {
    const argument = path.node.argument;
    // Extraer shape del return (properties, tipos)
  }
};
```

**NOTA**: No necesitamos Babel completo. Nuestro sistema ya tiene el AST. Solo necesitamos un visitor adicional dentro de `extractAtomMetadata()`.

### 4.3 Integracion con sistema existente

En `molecular-extractor.js`, la funcion `extractAtomMetadata()` ya llama a:
- `extractSideEffects(functionCode)`
- `extractCallGraph(functionCode)`
- `extractDataFlow(functionCode)` <-- ESTE se reemplaza/mejora
- `extractTypeInference(functionCode)`
- `extractTemporalPatterns(functionCode)`
- `extractPerformanceHints(functionCode)`

**Plan**: Mejorar `extractDataFlow()` para que retorne la estructura nueva. No se rompe nada existente, solo se agrega metadata.

---

## 5. Cross-Function Chaining - Nivel Molecula

### 5.1 Conectar salidas con entradas

Una vez que cada atomo tiene su data flow, podemos ENCADENAR:

```javascript
// Atomo A: processOrder(order) -> calls calculateTotal(order.items) -> returns total
// Atomo B: calculateTotal(items) -> returns sum

// CADENA:
// order.items (param de A, position 0)
//   -> items (param de B, position 0)
//     -> sum (return de B)
//       -> total (variable en A)
//         -> finalTotal (transformacion en A)
//           -> return { total: finalTotal } (salida de A)
```

**Derivation rule nueva**:

```javascript
// En derivation-engine.js:
moleculeDataFlow: (atoms) => {
  const chains = [];

  // Para cada atomo exportado (entry points del archivo)
  const entryAtoms = atoms.filter(a => a.isExported);

  for (const entry of entryAtoms) {
    // Seguir cada parametro a traves de las transformaciones
    for (const input of entry.dataFlow.inputs) {
      const chain = traceDataChain(input, entry, atoms);
      chains.push(chain);
    }
  }

  return {
    // A: Que datos entran al archivo
    inputs: entryAtoms.flatMap(a =>
      a.dataFlow.inputs.map(i => ({
        name: i.name,
        entryFunction: a.name,
        type: inferType(i)
      }))
    ),

    // B: Como se transforman dentro
    internalChains: chains,

    // C: Que datos salen del archivo
    outputs: entryAtoms.flatMap(a =>
      a.dataFlow.outputs.map(o => ({
        ...o,
        exitFunction: a.name
      }))
    ),

    // Flow type derivado
    flowType: classifyFlow(chains)
    // "read-only", "write-only", "read-transform-persist",
    // "validation-gate", "aggregation", "fan-out"
  };
}
```

### 5.2 Flow Types (arquetipos de flujo de datos)

| Flow Type | Patron | Ejemplo |
|-----------|--------|---------|
| `read-only` | ENTITY -> property access -> return | `getUser(id) -> db.find -> return user` |
| `write-only` | ENTITY -> persist | `saveUser(user) -> db.save` |
| `read-transform-persist` | READ -> TRANSFORM -> WRITE | `processOrder -> calculate -> save` |
| `validation-gate` | ENTITY -> validate -> pass/fail | `validateUser -> check -> throw/return` |
| `aggregation` | ENTITIES -> combine -> RESULT | `getReport -> query + query -> merge` |
| `fan-out` | ENTITY -> multiple destinations | `notify -> email + sms + push` |
| `pipeline` | A -> B -> C -> D (cadena lineal) | `parse -> validate -> transform -> save` |
| `fork-join` | Split -> parallel -> merge | `fetchAll -> [fetch, fetch] -> combine` |

---

## 6. Nivel Modulo y Sistema

### 6.1 Modulo (carpeta/feature)

Derivado de moleculas, igual que moleculas se derivan de atomos:

```javascript
// Derivation rule:
moduleDataFlow: (molecules) => {
  return {
    // A: Datos que entran al modulo (imports externos)
    inputs: molecules
      .flatMap(m => m.dataFlow.inputs)
      .filter(i => i.isFromExternalModule),

    // B: Flujo interno entre archivos del modulo
    internalFlows: buildCrossFileFlows(molecules),

    // C: Datos que salen del modulo (exports publicos)
    outputs: molecules
      .filter(m => m.isPublicApi)
      .flatMap(m => m.dataFlow.outputs),

    // Dominio derivado de semantic names
    domain: detectDomain(molecules),

    // Archetype del modulo
    archetype: detectModuleArchetype(molecules)
    // "api-gateway", "data-layer", "business-logic",
    // "utility-belt", "notification-hub", etc.
  };
}
```

### 6.2 Sistema (proyecto completo)

```javascript
// Derivation rule:
systemDataFlow: (modules) => {
  return {
    // Entry points del sistema
    entryPoints: modules
      .filter(m => m.archetype === 'api-gateway' || m.hasHttpHandlers)
      .flatMap(m => m.dataFlow.inputs),

    // Flujos de negocio completos
    businessFlows: detectBusinessFlows(modules),
    // [
    //   { name: "checkout", steps: [cart, payment, notification], type: "transaction" },
    //   { name: "auth", steps: [login, session, permissions], type: "security" }
    // ]

    // Side effects del sistema
    externalEffects: modules.flatMap(m => m.sideEffects),

    // Bottlenecks
    bottlenecks: detectBottlenecks(modules)
  };
}
```

---

## 7. Motor de Simulacion

### 7.1 Concepto

Con toda la metadata de data flow, un script puede "caminar" el grafo simulando el viaje del dato:

```javascript
/**
 * Simula el viaje de un dato a traves del sistema
 *
 * @param {string} startFunction - Funcion de entrada
 * @param {string} paramName - Nombre del parametro a seguir
 * @returns {Object} - Viaje completo del dato
 */
function simulateDataJourney(startFunction, paramName) {
  const visited = new Set();
  const journey = [];

  function walk(functionId, dataName, depth = 0) {
    if (visited.has(`${functionId}:${dataName}`) || depth > 20) return;
    visited.add(`${functionId}:${dataName}`);

    const atom = getAtom(functionId);
    if (!atom || !atom.dataFlow) return;

    // Buscar transformaciones de este dato
    const transforms = atom.dataFlow.transformations
      .filter(t => t.from === dataName || t.from.includes(dataName));

    for (const transform of transforms) {
      journey.push({
        step: journey.length + 1,
        location: `${atom.file}:${atom.name}`,
        line: transform.line,
        dataState: `${dataName} -> ${transform.to}`,
        operation: transform.operation,
        via: transform.via || 'direct',
        depth
      });

      // Si se pasa a otra funcion, seguir el viaje
      if (transform.via && isFunction(transform.via)) {
        walk(transform.via, getParamName(transform.via, transform.to), depth + 1);
      }
    }

    // Seguir outputs
    for (const output of atom.dataFlow.outputs) {
      if (output.type === 'return') {
        // Buscar quien llama a esta funcion y recibe el return
        const callers = atom.calledBy || [];
        for (const callerId of callers) {
          const caller = getAtom(callerId);
          const receiveVar = findReceiveVariable(caller, atom.name);
          if (receiveVar) {
            walk(callerId, receiveVar, depth + 1);
          }
        }
      } else if (output.type === 'side_effect') {
        journey.push({
          step: journey.length + 1,
          location: `${atom.file}:${atom.name}`,
          dataState: `${dataName} -> SIDE_EFFECT(${output.target})`,
          operation: output.operation,
          terminal: true,
          depth
        });
      }
    }
  }

  walk(startFunction, paramName);

  return {
    startFunction,
    paramName,
    journey,
    touchedFiles: [...new Set(journey.map(j => j.location.split(':')[0]))],
    touchedFunctions: [...new Set(journey.map(j => j.location))],
    operations: [...new Set(journey.map(j => j.operation))],
    sideEffects: journey.filter(j => j.terminal),
    depth: Math.max(...journey.map(j => j.depth), 0),

    // Para Tunnel Vision:
    impactMap: journey.map(j => j.location)
  };
}
```

### 7.2 Ejemplo de simulacion

```
> simulate("handleRequest", "req.body")

JOURNEY:
  Step 1: routes/api.js:handleRequest
          req.body -> userData (property_access)

  Step 2: auth/validator.js:validateUser
          userData -> userData.email (property_access)
          userData.email -> isValid (validation via checkEmail)

  Step 3: auth/validator.js:checkEmail
          email -> emailRegex.test(email) (validation)
          -> return boolean

  Step 4: auth/validator.js:validateUser
          isValid == false -> throw Error (error_path)
          isValid == true -> { ...userData, validated: true } (merge)

  Step 5: db/repository.js:saveUser
          validatedUser -> db.insert(validatedUser) (persistence)
          -> return savedUser

  Step 6: notifications/email.js:sendWelcome
          savedUser.email -> emailService.send(email) (communication)
          -> SIDE_EFFECT(email_sent)

SUMMARY:
  Touched: 4 files, 6 functions
  Operations: property_access, validation, merge, persistence, communication
  Side Effects: database_write, email_send

  IF YOU MODIFY: validateUser
  YOU MUST CHECK: saveUser, sendWelcome (downstream)
  YOU MUST CHECK: handleRequest (upstream)
```

### 7.3 Usos del simulador

| Uso | Input | Output |
|-----|-------|--------|
| **Impact Analysis** | "Modifique validateUser" | Lista de funciones afectadas downstream |
| **Test Generation** | "Que paths tiene handleRequest" | Test cases: happy path, error path, edge cases |
| **Security Audit** | "Donde va req.body" | Traza completa del user input hasta storage |
| **Performance Analysis** | "Que pasa con fetchData" | Detecta si pasa por funciones bloqueantes |
| **Refactoring Safety** | "Puedo cambiar el return de getUser" | Muestra todo lo que depende de ese return shape |
| **Tunnel Vision Enhanced** | "Modifique archivo X" | Muestra el viaje del dato, no solo archivos dependientes |

---

## 8. Race Condition Detection

### 8.1 Metadata necesaria (ya la tenemos parcialmente)

```javascript
// Por cada atomo ya sabemos:
{
  isAsync: true,                    // Es asincrono
  hasStorageAccess: true,           // Accede a storage
  hasNetworkCalls: true,            // Hace calls de red
  // Nuevo (de data flow):
  stateAccess: {
    reads: ["localStorage:cart", "this.state"],
    writes: ["localStorage:cart", "database:orders"]
  }
}
```

### 8.2 Patrones detectables

```javascript
const RACE_CONDITION_PATTERNS = {
  // Patron 1: Dos funciones async escriben al mismo recurso
  sharedStateMutation: {
    detect: (atoms) => {
      const asyncWriters = atoms.filter(a => a.isAsync && a.stateAccess?.writes?.length > 0);
      const conflicts = [];

      for (let i = 0; i < asyncWriters.length; i++) {
        for (let j = i + 1; j < asyncWriters.length; j++) {
          const shared = asyncWriters[i].stateAccess.writes
            .filter(w => asyncWriters[j].stateAccess.writes.includes(w));
          if (shared.length > 0) {
            conflicts.push({
              functions: [asyncWriters[i].name, asyncWriters[j].name],
              sharedResources: shared,
              severity: 'HIGH'
            });
          }
        }
      }
      return conflicts;
    }
  },

  // Patron 2: Read-then-write sin lock
  readThenWrite: {
    detect: (atom) => {
      if (!atom.isAsync) return null;
      const reads = atom.stateAccess?.reads || [];
      const writes = atom.stateAccess?.writes || [];
      const overlap = reads.filter(r => writes.includes(r));
      if (overlap.length > 0) {
        return {
          function: atom.name,
          resource: overlap,
          severity: 'MEDIUM',
          reason: 'Reads then writes same resource without lock'
        };
      }
    }
  },

  // Patron 3: Await faltante en cadena async
  missingAwait: {
    detect: (atom) => {
      if (!atom.isAsync) return null;
      const asyncCalls = atom.calls.filter(c => {
        const target = getAtom(c.name);
        return target?.isAsync;
      });
      // Si llama a funciones async sin await antes
      const missingAwaits = asyncCalls.filter(c => {
        // Verificar si hay await antes de la llamada
        return !hasAwaitBefore(atom.code, c.line);
      });
      return missingAwaits.length > 0 ? {
        function: atom.name,
        missingAwaits: missingAwaits.map(c => c.name),
        severity: 'HIGH'
      } : null;
    }
  }
};
```

### 8.3 Derivacion fractal de race conditions

```
ATOMO: "Esta funcion async lee y escribe localStorage:cart"
  -> raceConditionRisk: "read-then-write"

MOLECULA: "Este archivo tiene 3 funciones async que escriben localStorage:cart"
  -> raceConditionRisk: "shared-state-mutation"

MODULO: "El modulo cart/ tiene race conditions entre checkout y discount"
  -> raceConditionRisk: "cross-function-race"

SISTEMA: "El flujo de checkout tiene race condition entre cart update y payment"
  -> raceConditionRisk: "business-flow-race"
```

---

## 9. Cobertura Final Estimada

### Antes vs Despues (enfoque: MAPEO DE CABLES)

| Tipo de Conexion | Antes | Despues | Tecnica |
|------------------|-------|---------|---------|
| Imports/Exports estaticos | 95% | 95% | (sin cambio) |
| Llamadas directas | 85% | 95% | +data flow tracking |
| Callbacks/HOF | 50% | 85% | +callback reference tracking |
| Imports dinamicos | 0% | 70% | +string analysis + cable mapping |
| Llamadas indirectas | 30% | 75% | +variable tracking via AST |
| Event handlers | 30% | 80% | +handler function linking |
| Data flow completo | 20% | 90% | +param->return->param chains |
| Business logic patterns | 0% | 80% | +semantic names + flow types |
| Race conditions | 0% | 75% | +async orderings simulation |
| Cross-service | 0% | 50% | +endpoint mapping + catalogo |
| eval/dynamic code | 0% | 90% | +cable mapping (opaque internals) |
| User input paths | 0% | 95% | +cable completo (valor irrelevante) |
| Third-party | 0% | 80% | +cable + catalogo de firmas |

**Cobertura total de CABLES: 75-85% -> 97-99%**

### Lo que queda realmente imposible (~1-2%)

1. **eval() con string de API externa** - Cable completamente opaco end-to-end
2. **Reflection con keys de runtime data** - `obj[await getKeyFromApi()]`
3. **WebAssembly internals** - Binarios no analizables estaticamente

Estos casos son extremadamente raros en codigo JS/TS tipico.
La mayoria de proyectos NO usan ninguno de estos patrones.

---

## 10. Implementation Roadmap

### Fase 1: Data Flow Tracker Atomico (Fundacion)

**Objetivo**: Cada atomo sabe que recibe, que transforma, que retorna.

**Archivos a crear/modificar**:
- `src/layer-a-static/extractors/metadata/data-flow.js` - REEMPLAZAR con version AST
- `src/layer-a-static/pipeline/molecular-extractor.js` - Integrar nuevo data flow

**Entregable**: Cada atomo tiene `dataFlow: { inputs, transformations, outputs }`

### Fase 2: Semantic Name Analyzer

**Objetivo**: Extraer verbo+dominio+entidad del nombre de cada funcion.

**Archivos a crear**:
- `src/layer-a-static/extractors/metadata/semantic-name.js` - Parser de nombres
- `src/shared/verb-taxonomy.js` - Taxonomia de verbos y operaciones

**Entregable**: Cada atomo tiene `semantic: { verb, domain, entity, operationType }`

### Fase 3: Variable Standardization

**Objetivo**: Generar version estandarizada de cada atomo para pattern matching.

**Archivos a crear**:
- `src/layer-b-semantic/standardizer/index.js` - Motor de estandarizacion
- `src/layer-b-semantic/standardizer/token-rules.js` - Reglas de tokenizacion

**Entregable**: Cada atomo tiene `standardized: { pattern, tokens }`

### Fase 4: Cross-Function Chaining (Molecular Data Flow)

**Objetivo**: Conectar salidas de funciones con entradas de otras.

**Archivos a modificar**:
- `src/shared/derivation-engine.js` - Agregar `moleculeDataFlow` derivation rule
- `src/layer-a-static/pipeline/molecular-extractor.js` - 4ta pasada para data chains

**Entregable**: Cada molecula tiene `dataFlow: { inputs, internalChains, outputs, flowType }`

### Fase 5: Race Condition Detector

**Objetivo**: Detectar patrones de race condition desde metadata.

**Archivos a crear**:
- `src/layer-b-semantic/detectors/race-conditions.js` - Detector de patrones

**Entregable**: Nuevo archetype `race-condition-risk` con patterns detectados.

### Fase 6: Simulation Engine

**Objetivo**: Caminar el grafo de metadata simulando el viaje del dato.

**Archivos a crear**:
- `src/core/simulation-engine.js` - Motor de simulacion
- `src/layer-c-memory/mcp/tools/simulate-data-flow.js` - MCP tool

**Entregable**: Tool MCP `simulate_data_flow(startFunction, paramName)` que retorna viaje completo.

### Fase 7: Module & System Level

**Objetivo**: Derivar metadata de modulos y sistema desde moleculas.

**Archivos a crear**:
- `src/shared/module-derivation.js` - Derivation rules para modulos
- `src/shared/system-derivation.js` - Derivation rules para sistema

**Entregable**: Cada modulo y el sistema completo tienen metadata derivada.

---

## 11. Principios de Diseno

### 11.1 Fractal Puro

Cada nivel usa EXACTAMENTE el mismo patron:
- **A (Static)**: Extraer datos crudos
- **B (Semantic)**: Enriquecer con significado
- **C (Memory)**: Recordar patrones y evoluciones

### 11.2 SSOT (Single Source of Truth)

- Los ATOMOS son la unica fuente de verdad
- Las MOLECULAS se DERIVAN de atomos (nunca tienen metadata propia)
- Los MODULOS se DERIVAN de moleculas
- El SISTEMA se DERIVA de modulos

Si un atomo cambia, se invalida y recalcula en cascada.

### 11.3 Zero LLM para extraccion

- Todo el data flow se extrae con AST (deterministic)
- Los semantic names se extraen con string parsing (deterministic)
- La estandarizacion es rule-based (deterministic)
- La simulacion es graph walking (deterministic)

LLM solo se usa si confidence < 0.8 (bypass fractal).

### 11.4 Backwards Compatible

- Cada fase AGREGA metadata sin romper la existente
- Los atomos actuales siguen funcionando
- Las derivation rules nuevas se agregan al engine existente
- Los MCP tools nuevos se registran sin afectar los existentes

---

## 12. Resumen Visual

```
                    SISTEMA
                   /       \
                MODULE     MODULE
               / | \       / | \
            MOL  MOL  MOL  MOL  MOL  MOL    <- Archivos
           /|\   /|\   /\   /\   /|\  /|\
          A A A A A A  A A  A A A A A A A A  <- Funciones

          Cada ATOMO tiene:
          â”œâ”€â”€ Estructura (nombre, params, complexity)
          â”œâ”€â”€ Conexiones (calls, calledBy)
          â”œâ”€â”€ Side Effects (network, DOM, storage)
          â”œâ”€â”€ Archetype (god-function, hot-path, etc.)
          â”œâ”€â”€ Data Flow (inputs -> transformations -> outputs)  <- NUEVO
          â”œâ”€â”€ Semantic (verb, domain, entity)                   <- NUEVO
          â”œâ”€â”€ Standardized (patron universal)                   <- NUEVO
          â””â”€â”€ Race Condition Risk                               <- NUEVO

          Cada nivel SUPERIOR se DERIVA del inferior.
          El DATO viaja por las conexiones y podemos SIMULARLO.
```

---

**Este documento es la base para la implementacion. Cada fase construye sobre la anterior. El orden es critico: sin Fase 1 (data flow atomico) no se puede hacer nada de lo demas.**

