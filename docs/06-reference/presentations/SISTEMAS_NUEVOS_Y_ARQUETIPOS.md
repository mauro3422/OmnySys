# Sistemas Nuevos y Arquetipos: Cómo se Conectan

**Qué hace cada sistema y cómo se ve al levantar un archivo.**

---

## 🎯 Qué Hace Cada Sistema (Concretamente)

### 1. Temporal Connections

**Qué detecta:**
```javascript
// Archivo A: config.js
function initConfig() { ... }  // useEffect, useLayoutEffect, etc.

// Archivo B: api.js  
function fetchData() {
  const config = getConfig();  // asume que initConfig ya corrió
}
```

**Conexión que crea:**
```javascript
{
  type: 'temporal',
  from: 'config.js::initConfig',
  to: 'api.js::fetchData',
  relationship: 'must-run-before',
  confidence: 0.85
}
```

**Para qué sirve:**
- Saber que si movés `initConfig` después de `fetchData`, todo explota
- Detectar race conditions en startup
- Saber el orden de inicialización

---

### 2. Type Contracts

**Qué detecta:**
```javascript
// Archivo A: api.js
/** @returns {User} */
function fetchUser() { ... }

// Archivo B: process.js
/** @param {UserDTO} user */
function processUser(user) { ... }

// PROBLEMA: User ≠ UserDTO
```

**Conexión que crea:**
```javascript
{
  type: 'type-contract',
  from: 'api.js::fetchUser',
  to: 'process.js::processUser',
  outputType: 'User',
  inputType: 'UserDTO',
  compatible: false,  // ⚠️ PROBLEMA
  confidence: 0.9
}
```

**Para qué sirve:**
- Detectar "type mismatch" antes de que rompa en runtime
- Saber dónde necesitás mappers/conversores
- Validar que cambios en tipos no rompen downstream

---

### 3. Error Flow

**Qué detecta:**
```javascript
// Archivo A: validator.js
function validateOrder(order) {
  if (!order.items) throw new ValidationError('Missing items');
}

// Archivo B: controller.js
function handleRequest() {
  validateOrder(order);  // NO hay try-catch
}
```

**Conexión que crea:**
```javascript
{
  type: 'error-flow-unhandled',
  from: 'validator.js::validateOrder',
  to: 'controller.js::handleRequest',
  errorType: 'ValidationError',
  handled: false,  // ⚠️ PROBLEMA
  risk: 'high'
}
```

**Para qué sirve:**
- Saber que si modificás el error que lanzás, el controller crashea
- Detectar errores "silenciosos" que nadie atrapa
- Mapear "cables de error" entre funciones

---

### 4. Performance Impact

**Qué detecta:**
```javascript
// Archivo A: heavy.js
function calculateStats(items) {
  // O(n²) - nested loops
  return items.map(...).filter(...).sort(...);
}

// Archivo B: ui.js
function render() {
  const stats = calculateStats(bigArray);  // Bloquea 200ms
  // UI congela
}
```

**Conexión que crea:**
```javascript
{
  type: 'performance-impact',
  from: 'heavy.js::calculateStats',
  to: 'ui.js::render',
  impact: {
    severity: 'blocking',
    time: '200ms',
    cascade: true  // El impacto se propaga
  }
}
```

**Para qué sirve:**
- Saber que si tocás `calculateStats`, la UI se congela
- Detectar cadenas de funciones lentas
- Priorizar optimizaciones

---

## 🔗 Cómo se Conectan con Arquetipos

Los arquetipos **usan** estos datos para ser más precisos:

### Ejemplo: Archetype "initializer"

**Sin los nuevos sistemas:**
```javascript
archetype: {
  type: 'initializer',
  confidence: 0.6,  // No estoy seguro
  evidence: ['name matches init*']
}
```

**Con los nuevos sistemas:**
```javascript
archetype: {
  type: 'initializer',
  confidence: 0.95,  // Muy seguro
  evidence: [
    'name matches init*',
    'temporal.patterns.initialization: true',
    'temporal.executionOrder.mustRunBefore: 12 funciones',
    'typeContracts.returns: Config',
    'errorFlow.throws: InitError'
  ]
},
connections: {
  temporal: [
    { to: 'api.js::fetchData', relationship: 'must-run-before' },
    { to: 'db.js::connect', relationship: 'must-run-before' }
  ]
}
```

**Diferencia:** El arquetipo ahora SABE que es inicializador porque:
1. El nombre empieza con "init"
2. Tiene patrones temporales de inicialización
3. Otras 12 funciones dependen de que corra primero
4. Retorna un objeto Config
5. Puede lanzar InitError

---

### Ejemplo: Archetype "api-boundary"

```javascript
// Función que expone API externa
function createOrder(orderData) {
  validateOrder(orderData);        // Type contract
  const order = await saveOrder(); // Error flow
  return order;                    // Type contract
}

archetype: {
  type: 'api-boundary',
  confidence: 0.92,
  evidence: [
    'isExported: true',
    'typeContracts.params: defined',
    'typeContracts.returns: defined',
    'errorFlow.throws: [ValidationError, DatabaseError]',
    'performance.impactScore: 0.4'
  ]
},
contracts: {
  input: 'OrderData',
  output: 'Order',
  errors: ['ValidationError', 'DatabaseError'],
  performance: 'async, ~50ms'
}
```

---

## 🧬 Cómo Evoluciona la Información

### Fase 1: Extracción (Ahora)
```javascript
// Solo datos sueltos
{
  name: 'processOrder',
  temporal: { isAsync: true },
  typeContracts: { returns: 'Order' },
  errorFlow: { throws: ['ValidationError'] },
  performance: { impactScore: 0.4 }
}
```

### Fase 2: Conexión (Ahora)
```javascript
// Datos conectados
{
  ...datos,
  connections: [
    { type: 'temporal', to: 'db.js', ... },
    { type: 'type-contract', to: 'saveOrder', ... },
    { type: 'error-flow', to: 'controller', ... }
  ]
}
```

### Fase 3: Arquetipo Enriquecido (Ahora)
```javascript
// Arquetipo con contexto
{
  archetype: {
    type: 'business-logic',
    confidence: 0.9,
    // Usa TODOS los datos para determinar el arquetipo
  },
  connections: [...],
  context: {
    riskLevel: 'medium',
    stability: 'stable', // o 'unstable'
    testPriority: 'high'
  }
}
```

### Fase 4: Presentación (Ahora)
```
📦 processOrder (business-logic)

⚠️  RIESGOS:
   • Lanza ValidationError → NO manejado en controller.js
   • Type mismatch: retorna Order, saveOrder espera OrderDTO
   • Performance: 40% del tiempo total de request

🔗 CONEXIONES CRÍTICAS:
   → db.js::saveOrder (type mismatch, temporal dependency)
   → controller.js (unhandled error)
   → validate.js (error source)
```

---

## 🖥️ Cómo se Vería al Levantar el Archivo

### Antes (v0.6 - Solo arquetipos básicos)
```
📦 api.js

⚛️ processOrder
   Archetype: business-logic (confidence: 0.7)
   Complexity: 12
   Lines: 85
   
   Connections:
   → auth.js
   → db.js
   → email.js
```

**Problema:** No sabés POR QUÉ es business-logic ni QUÉ TAN crítico es.

---

### Después (v0.7 - Con sistemas nuevos)
```
📦 api.js (processOrder: línea 45)

🏷️  ARQUETIPO: business-logic-v2 (confidence: 0.94)
    └─ Por: type contracts definidos + manejo de errores + async

⚠️  RIESGOS DETECTADOS (basado en conexiones):

   1. 🔥 TYPE MISMATCH
      └─ Retorna: Order
      └─ db.js::saveOrder espera: OrderDTO
      └─ Solución: Agregar mapper o cambiar contrato
      
   2. 💥 ERROR NO MANEJADO
      └─ Lanza: ValidationError
      └─ NO atrapado en: controller.js (línea 23)
      └─ Riesgo: Crash en producción
      
   3. ⏱️  PERFORMANCE CHAIN
      └─ Tiempo: 150ms (blocking)
      └─ Bloquea: render() en ui.js
      └─ Causa: O(n²) en calculateStats

🔗 CONEXIONES TEMPORALES:
   → config.js::initConfig (DEBE correr antes)
   → db.js::connect (DEBE estar listo)

🔗 CONEXIONES DE ERROR:
   → validator.js::validateOrder (source de error)
   → controller.js (NO maneja el error)

🔗 CONEXIONES DE TIPO:
   → db.js::saveOrder (INCOMPATIBLE: Order vs OrderDTO)

📊 CONTEXTO DEL CLAN:
   Tu función pertenece al clan "business-logic-async"
   (45 funciones similares)
   
   Patrón del clan:
   • 80% tienen try-catch en controller
   • 60% usan DTOs para DB
   • 40% tienen performance issues (como el tuyo)

✅ ACCIONES SUGERIDAS:
   1. Agregar try-catch en controller.js
   2. Crear OrderDTO mapper
   3. Optimizar calculateStats (ver ejemplo en #2345)
```

**Diferencia:** Ahora sabés EXACTAMENTE qué puede romper y por qué.

---

## 🎯 Ejemplo Completo de Evolución

### Paso 1: Archivo simple
```javascript
// api.js
function processOrder(order) {
  const saved = await saveOrder(order);
  return saved;
}
```

### Paso 2: Extracción de datos
```javascript
{
  name: 'processOrder',
  dataFlow: { inputs: ['order'], outputs: ['saved'] },
  temporal: { isAsync: true },
  typeContracts: { returns: 'Order' },
  errorFlow: { throws: [] },
  performance: { impactScore: 0.2 }
}
```

### Paso 3: Detección de conexiones
```javascript
// Conecta con saveOrder
{
  type: 'type-contract',
  from: 'api.js::processOrder',
  to: 'db.js::saveOrder',
  outputType: 'Order',
  inputType: 'OrderDTO',  // ⚠️ INCOMPATIBLE
  compatible: false
}

// Conecta temporalmente con init
{
  type: 'temporal',
  from: 'config.js::initConfig',
  to: 'api.js::processOrder',
  relationship: 'must-run-before'
}
```

### Paso 4: Arquetipo enriquecido
```javascript
{
  name: 'processOrder',
  archetype: {
    type: 'api-boundary-unstable',
    confidence: 0.88,
    reason: 'type-mismatch + temporal-dependency'
  },
  riskScore: 0.75,  // Alto riesgo
  connections: [...]
}
```

### Paso 5: Presentación
```
📦 api.js::processOrder

🔴 ARQUETIPO: api-boundary-unstable
   └─ Type mismatch detectado + dependencia temporal

⚠️  RIESGOS:
   • Type: Order → OrderDTO (incompatible)
   • Temporal: requiere config inicializada
   • Performance: puede ser lento (no medido aún)

💡 FIXES:
   1. Mapper Order→OrderDTO
   2. Verificar config antes de llamar
```

---

## 🚀 Resumen

| Sistema | Qué aporta al arquetipo | Qué conexiones crea | Cómo se ve |
|---------|------------------------|-------------------|------------|
| **Temporal** | "Es initializer" / "Tiene orden específico" | must-run-before | ⚠️ Dependencia de inicialización |
| **Type Contracts** | "Tiene contratos fuertes" / "Es API" | type-compatibility | 🔥 Type mismatch |
| **Error Flow** | "Maneja errores" / "Es peligroso" | throws/catches | 💥 Error no manejado |
| **Performance** | "Es rápido/lento" / "Es bottleneck" | performance-chain | ⏱️ Bloquea UI |

**Al levantar el archivo, ves el arquetipo + TODAS las conexiones concretas que justifican ese arquetipo.**
