# Roadmap: Fases 2-5 (Planificado)

**Versión**: v0.7.1+  
**Estado**: 🟡 Diseñado, no implementado  
**Propósito**: Roadmap de desarrollo futuro

---

## Resumen de Fases

| Fase | Nombre | Nivel | Estado | Cobertura Est.
|------|--------|-------|--------|----------------
| 1 | Extracción Atómica | Función | ✅ v2 (95%) | ~85%
| **2** | **Cross-Function Chains** | Inter-función | 🟡 Diseñado | ~92%
| **3** | **Módulo & Sistema** | Feature/Proyecto | 🟡 Diseñado | ~94%
| **4** | **Race Conditions** | Async/Concurrency | 🟡 Diseñado | ~96%
| **5** | **Simulation Engine** | Virtual execution | 🟡 Diseñado | ~97%

---

## Fase 2: Cross-Function Chains

**Status**: 🟡 Diseñado  
**Target**: v0.8.0  
**Depende de**: Fase 1 completa

### Objetivo

Conectar la salida de una función con la entrada de otra:

```javascript
// processOrder llama a calculateTotal
processOrder(order)
  → calls: calculateTotal(order.items)
  → receives: total
  → returns: { orderId, total }

// Cadena completa mapeada:
order.items → calculateTotal → total → processOrder → saveOrder
```

### Caso de Uso

```
Simular: "¿Qué pasa con req.body en handleRequest()?"

Journey:
  Step 1: handleRequest → extrae userData
  Step 2: validateUser → valida email
  Step 3: saveUser → guarda en DB
  Step 4: sendWelcome → envía email

Resultado: Viajó por 4 archivos, 4 funciones
Impacto: Modificar validateUser afecta a saveUser y sendWelcome
```

### Implementación Propuesta

```javascript
// Extender el grafo atómico a cross-function
const crossFunctionChain = {
  start: {
    function: 'processOrder',
    file: 'src/orders.js',
    input: 'order'
  },
  chain: [
    { 
      step: 1,
      function: 'calculateTotal',
      file: 'src/pricing.js',
      input: 'order.items',
      output: 'total'
    },
    {
      step: 2,
      function: 'saveOrder',
      file: 'src/db.js',
      input: { order, total },
      output: 'savedOrder',
      sideEffect: 'database_write'
    }
  ],
  end: {
    output: 'savedOrder',
    sideEffects: ['database_write', 'event_emit']
  }
};
```

### Documentos de Diseño

- `docs/DATA_FLOW/FASE_2_CROSS_FUNCTION_CHAINS.md` - Diseño original
- `docs/DATA_FLOW/04_FASE_CADENAS.md` - Enfoque alternativo

---

## Fase 3: Módulo & Sistema

**Status**: 🟡 Diseñado  
**Target**: v0.9.0  
**Depende de**: Fase 2 (cadenas cross-function)

### Objetivo

Derivar metadata a nivel de módulo (feature/folder) y sistema (proyecto completo):

```
auth/ (Módulo)
├── login.js
│   └── login() → [data flow atómico]
├── register.js
│   └── register() → [data flow atómico]
└── validate.js
    └── validateToken() → [data flow atómico]
    
Data Flow a nivel módulo:
- Input: { email, password } vía login.js
- Flow: login() → validateToken() → user
- Output: { user, token } vía login.js
```

### Derivación Jerárquica

```
Sistema (Proyecto)
├── auth/ (Módulo)
│   ├── login.js (Molécula)
│   │   └── login() (Átomo)
│   └── validate.js (Molécula)
│       └── validateToken() (Átomo)
├── orders/ (Módulo)
│   └── ...
└── users/ (Módulo)
    └── ...

Cada nivel DERIVA del inferior:
- Átomo → extraído vía AST
- Molécula → compone átomos del archivo
- Módulo → compone moléculas del folder
- Sistema → compone módulos del proyecto
```

### Documentos de Diseño

- `docs/DATA_FLOW/FASE_3_MODULO_SISTEMA.md`
- `docs/DATA_FLOW/07_FASE_SISTEMA.md`

---

## Fase 4: Race Condition Detection

**Status**: 🟡 Diseñado  
**Target**: v0.8.x (después de Fase 2)  
**Depende de**: Fase 2 (cross-function chains)

### Objetivo

Detectar conflictos entre operaciones async:

```javascript
// Función A
async function updateBalance(userId, amount) {
  const user = await db.users.find(userId);
  user.balance += amount;
  await user.save();  // ⚠️ Write
}

// Función B
async function deductFee(userId, fee) {
  const user = await db.users.find(userId);
  user.balance -= fee;
  await user.save();  // ⚠️ Write
}

// Race condition detectada:
// Ambas leen → modifican → escriben el mismo campo
// Si ejecutan concurrentemente, se pierde un update
```

### Algoritmo

```javascript
function detectRaceCondition(funcA, funcB) {
  // 1. Identificar recursos compartidos
  const sharedResources = intersection(
    funcA.dataFlow.writes,
    funcB.dataFlow.reads
  );
  
  // 2. Verificar orden de operaciones
  if (sharedResources.length > 0 && 
      funcA.isAsync && funcB.isAsync) {
    return {
      type: 'read-modify-write',
      severity: 'high',
      resources: sharedResources,
      mitigation: 'Use transactions or locks'
    };
  }
}
```

### Documentos de Diseño

- `docs/DATA_FLOW/04_FASE_CADENAS.md` (sección race conditions)

---

## Fase 5: Simulation Engine

**Status**: 🟡 Diseñado  
**Target**: v0.9.x  
**Depende de**: Fases 2, 3 (grafos completos)

### Objetivo

"Walk" virtual del grafo simulando el viaje de datos:

```
> simulateJourney({ 
>   variable: 'req.body.userId',
>   from: 'handleRequest',
>   project: 'my-app'
> })

Step 1: handleRequest (src/api.js:42)
  → Extrae userId de req.body
  → Calls: validateUser(userId)

Step 2: validateUser (src/auth.js:15)
  → Valida formato
  → Calls: getUser(userId)

Step 3: getUser (src/db.js:88)
  → Query: SELECT * FROM users WHERE id = ?
  → Side effect: database_read
  → Returns: user object

Step 4: handleRequest (continúa)
  → Calls: sendWelcomeEmail(user)

Step 5: sendWelcomeEmail (src/email.js:23)
  → Side effect: email_send

Resultado:
  - Viaje: 3 archivos, 5 funciones
  - Side effects: database_read, email_send
  - Tiempo estimado: ~150ms
  - Riesgo: LOW (solo reads y email)
```

### Casos de Uso

1. **Impact Analysis**: "¿Qué se rompe si cambio X?"
2. **Root Cause**: "¿De dónde viene este valor?"
3. **Performance**: "¿Cuánto tarda este flujo?"
4. **Security**: "¿Este dato llega a la DB sin sanitizar?"

### Documentos de Diseño

- `docs/DATA_FLOW/06_FASE_SIMULACION.md`

---

## Prioridad de Implementación

```
v0.7.2 (Próximo)
└── Completar Fase 1
    ├── Terminar invariant-detector.js stub
    └── Agregar unit tests

v0.8.0
└── Fase 2: Cross-Function Chains
    ├── Conectar funciones vía call graph
    └── Mapear flujo de datos entre funciones

v0.8.x
└── Fase 4: Race Condition Detection
    ├── Detectar recursos compartidos
    └── Analizar orderings async

v0.9.0
└── Fase 3: Module & System Level
    ├── Agregar nivel módulo (feature/folder)
    └── Agregar nivel sistema (proyecto)

v0.9.x
└── Fase 5: Simulation Engine
    ├── Implementar graph walking
    └── Agregar virtual execution
```

---

## Documentos Archivados

Los siguientes documentos de diseño pre-implementación han sido archivados a `docs/archive/`:

- `01_FASE_ATOMO.md` - Diseño original Fase 1 (reemplazado por v2)
- `02_FASE_SEMANTICA.md` - Análisis semántico
- `03_FASE_ESTANDARIZACION.md` - Estandarización (implementado en v2)
- `05_FASE_RACE_CONDITIONS.md` - Race conditions (duplicado)
- `08_FASE_4_RACE_CONDITIONS.md` - Race conditions (duplicado)
- `09_FASE_5_SIMULATION.md` - Simulación (duplicado)
- `PLAN_FASE_1_IMPLEMENTADO.md` - Plan implementación
- `PLAN_FASE_1_REVISADO.md` - Plan revisado

**Nota**: Estos documentos fueron diseños pre-v2. La implementación actual está en `atom-extraction.md`.

---

## Relación con Documentos Legacy

| Documento Legacy | Estado | Reemplazado por |
|------------------|--------|-----------------|
| `docs/architecture/DATA_FLOW_FRACTAL_DESIGN.md` | ℹ️ Referencia | Este directorio |
| `docs/DATA_FLOW/CONCEPTOS_CLAVE.md` | ℹ️ Referencia | [concepts.md](./concepts.md) |
| `docs/DATA_FLOW/README.md` | ℹ️ Referencia | Este archivo |
| `docs/architecture/DATA_FLOW.md` | ✅ Activo | [atom-extraction.md](./atom-extraction.md) + secciones |

---

**Nota**: Este es un roadmap. Las fechas y versiones son estimaciones sujetas a cambio.
