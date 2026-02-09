# FASE 3: Módulo y Sistema (Nivel Macro)

**Versión**: v0.7.0 - Fase 3  
**Estado**: Diseño  
**Dependencias**: Fase 1 y 2 completadas  
**Tiempo estimado**: 4-5 días

---

## 🎯 OBJETIVO

Conectar el **data flow entre archivos** (módulos) y **entre módulos** (sistema completo).

**Jerarquía completa:**
```
SISTEMA (Proyecto)
├── MÓDULO auth/
│   ├── Archivo login.js
│   │   └── Chain: login() → validateUser() → createSession()
│   └── Archivo validate.js
│       └── Chain: validateUser() → checkPassword() → hash()
│   
│   → Cross-file chain: login.js:login() → validate.js:validateUser()
│
├── MÓDULO orders/
│   ├── Archivo create.js
│   │   └── Chain: createOrder() → calculateTotal() → saveOrder()
│   └── Archivo calculate.js
│       └── Chain: calculateTotal() → applyTaxes() → applyDiscounts()
│
│   → Cross-file chain: create.js:createOrder() → calculate.js:calculateTotal()
│
→ Cross-module chain: 
   auth.login() → orders.createOrder() → database.save()
```

**La diferencia clave:**
- **Fase 1**: Flujo DENTRO de una función
- **Fase 2**: Flujo ENTRE funciones de un archivo
- **Fase 3**: Flujo ENTRE archivos y módulos

---

## 📊 ARQUITECTURA DE 3 NIVELES

### Nivel 1: Átomo (Función)

```javascript
// Archivo: auth/login.js

function login(credentials) {
  const user = validateUser(credentials);  // ← Llama a función interna
  const session = createSession(user);      // ← Llama a función interna
  return session;
}

function validateUser(creds) {
  return db.users.findByEmail(creds.email);
}
```

**Data Flow (Fase 1)**:
```
credentials → validateUser() → user → createSession() → session → return
```

### Nivel 2: Molécula (Archivo)

**Chain (Fase 2)**:
```
login(credentials)
  ├── calls validateUser(credentials)
  │     └── returns: user
  └── calls createSession(user)
        └── returns: session
        
Final: session
```

### Nivel 3A: Módulo (Carpeta)

**Cross-file connections**:
```
// auth/login.js exporta login()
// auth/middleware.js importa login()

auth/middleware.js:checkAuth() 
  → import("./login.js").login(token)
  → returns: user
```

**Chain a nivel módulo**:
```
API Request
  → auth/middleware.js:checkAuth()
    → auth/login.js:login()
      → auth/validate.js:validateUser()
    → returns: user
  → auth/permissions.js:checkRole()
    → returns: allowed
  → Next middleware
```

### Nivel 3B: Sistema (Proyecto)

**Cross-module business flow**:
```
Business Flow: "Checkout"
============================

Entry Point: POST /api/checkout
  ↓
Module: auth
  auth.middleware.validateToken()
  → returns: userId
  ↓
Module: cart
  cart.get(userId)
  → returns: items[]
  ↓
Module: pricing
  pricing.calculate(items)
  → returns: total
  ↓
Module: payment
  payment.process(userId, total)
  → returns: transactionId
  ↓
Module: orders
  orders.create(userId, items, transactionId)
  → returns: orderId
  ↓
Module: notification
  notification.send(userId, "Order confirmed: " + orderId)
  → returns: sent
  ↓
Response: { orderId, status: "confirmed" }
```

---

## 🏗️ ESTRUCTURA DE DATOS

### Nivel Módulo

```typescript
interface ModuleDataFlow {
  // Identificación
  modulePath: string;           // "src/auth/"
  moduleName: string;           // "auth"
  
  // Archivos en el módulo
  files: string[];              // ["login.js", "validate.js", ...]
  
  // Chains dentro del módulo
  internalChains: Chain[];      // Chains que no salen del módulo
  
  // Conexiones con otros archivos del mismo módulo
  crossFileConnections: CrossFileConnection[];
  
  // Entry points del módulo
  exports: Export[];
  
  // Qué necesita del exterior
  imports: Import[];
}

interface CrossFileConnection {
  from: {
    file: string;
    function: string;
  };
  to: {
    file: string;
    function: string;
  };
  dataFlow: {
    source: string;
    target: string;
    transform?: string;
  }[];
}
```

### Nivel Sistema

```typescript
interface SystemDataFlow {
  // Entry points globales
  entryPoints: EntryPoint[];
  // Ej: { type: "api", path: "/api/checkout", handler: "checkout.js:create" }
  
  // Flujos de negocio completos
  businessFlows: BusinessFlow[];
  
  // Conexiones entre módulos
  moduleConnections: ModuleConnection[];
  
  // Grafo completo del sistema
  systemGraph: SystemGraph;
}

interface BusinessFlow {
  name: string;                 // "checkout", "login", "resetPassword"
  type: string;                 // "transaction", "query", "async"
  
  entryPoint: {
    module: string;
    file: string;
    function: string;
  };
  
  steps: BusinessFlowStep[];
  
  sideEffects: SideEffect[];
  
  // Análisis
  totalSteps: number;
  modulesInvolved: string[];
  hasAsync: boolean;
  hasCompensation: boolean;     // ¿Tiene rollback?
}

interface BusinessFlowStep {
  order: number;
  module: string;
  file: string;
  function: string;
  
  input: string[];              // Qué recibe
  output: string[];             // Qué produce
  
  async: boolean;
  sideEffects: string[];
  
  // Conexión con siguiente paso
  next: {
    function: string;
    dataMapping: DataMapping[];
  }[];
}

interface ModuleConnection {
  from: string;                 // "auth"
  to: string;                   // "orders"
  
  // Qué datos fluyen
  dataFlow: {
    exports: string[];          // auth exporta: validateToken, requireAuth
    imports: string[];          // orders importa: validateToken
  };
  
  // Frecuencia estimada (para priorizar optimización)
  callFrequency: "high" | "medium" | "low";
}
```

---

## 🔧 IMPLEMENTACIÓN

### Componentes a Crear

```
src/layer-a-static/module-system/
├── index.js                          ← Entry point
├── module-analyzer.js                ← Analiza un módulo (carpeta)
├── module-graph-builder.js           ← Grafo de conexiones entre archivos
├── system-analyzer.js                ← Analiza todo el proyecto
├── business-flow-detector.js         ← Detecta flujos de negocio
└── cross-module-analyzer.js          ← Conecta módulos

src/layer-a-static/pipeline/
└── module-system-integrator.js       ← Integra en el pipeline
```

### Algoritmo Principal

```javascript
// module-analyzer.js

export function analyzeModule(modulePath, molecules) {
  // PASO 1: Filtrar moléculas de este módulo
  const moduleMolecules = molecules.filter(m => 
    m.filePath.startsWith(modulePath)
  );
  
  // PASO 2: Encontrar conexiones entre archivos
  const crossFileConnections = findCrossFileConnections(moduleMolecules);
  
  // PASO 3: Identificar entry points del módulo
  const exports = findModuleExports(moduleMolecules);
  
  // PASO 4: Identificar dependencias externas
  const imports = findModuleImports(moduleMolecules);
  
  // PASO 5: Construir chains internas del módulo
  const internalChains = buildInternalModuleChains(
    moduleMolecules, 
    crossFileConnections
  );
  
  return {
    modulePath,
    moduleName: path.basename(modulePath),
    files: moduleMolecules.map(m => m.filePath),
    internalChains,
    crossFileConnections,
    exports,
    imports,
    meta: {
      totalFiles: moduleMolecules.length,
      totalFunctions: moduleMolecules.reduce((sum, m) => sum + m.atomCount, 0),
      totalChains: internalChains.length
    }
  };
}
```

```javascript
// system-analyzer.js

export function analyzeSystem(projectRoot, modules) {
  // PASO 1: Encontrar entry points globales
  const entryPoints = findSystemEntryPoints(projectRoot);
  // API routes, CLI commands, event handlers, etc.
  
  // PASO 2: Detectar flujos de negocio
  const businessFlows = detectBusinessFlows(entryPoints, modules);
  
  // PASO 3: Mapear conexiones entre módulos
  const moduleConnections = mapModuleConnections(modules);
  
  // PASO 4: Construir grafo completo del sistema
  const systemGraph = buildSystemGraph(modules, moduleConnections);
  
  return {
    entryPoints,
    businessFlows,
    moduleConnections,
    systemGraph,
    meta: {
      totalModules: modules.length,
      totalBusinessFlows: businessFlows.length,
      totalEntryPoints: entryPoints.length
    }
  };
}
```

---

## 📋 EJEMPLOS DETALLADOS

### Ejemplo 1: E-commerce Checkout

**Estructura del proyecto**:
```
src/
├── api/
│   └── routes.js          # Entry points
├── auth/
│   ├── login.js
│   ├── middleware.js      # Exporta: requireAuth
│   └── validate.js
├── cart/
│   ├── get.js             # Exporta: getCart
│   └── update.js
├── pricing/
│   ├── calculate.js       # Exporta: calculateTotal
│   └── discounts.js
├── payment/
│   ├── process.js         # Exporta: processPayment
│   └── validate.js
├── orders/
│   ├── create.js          # Exporta: createOrder
│   └── status.js
└── notification/
    └── send.js            # Exporta: sendNotification
```

**Entry Point**: `POST /api/checkout`
```javascript
// api/routes.js
app.post('/api/checkout', 
  auth.middleware.requireAuth,      // ← Module: auth
  async (req, res) => {
    const user = req.user;
    
    // Step 1: Get cart
    const cart = await cart.get(user.id);                    // ← Module: cart
    
    // Step 2: Calculate pricing
    const total = pricing.calculate(cart.items);             // ← Module: pricing
    const finalTotal = pricing.applyDiscounts(total, user);  // ← Module: pricing
    
    // Step 3: Process payment
    const payment = await payment.process(user.id, finalTotal); // ← Module: payment
    
    // Step 4: Create order
    const order = await orders.create({                     // ← Module: orders
      userId: user.id,
      items: cart.items,
      total: finalTotal,
      paymentId: payment.id
    });
    
    // Step 5: Notify
    await notification.send(user.id, {                      // ← Module: notification
      type: 'ORDER_CONFIRMED',
      orderId: order.id
    });
    
    res.json({ orderId: order.id });
  }
);
```

**Business Flow Detectado**:
```javascript
{
  name: "checkout",
  type: "transaction",
  entryPoint: {
    module: "api",
    file: "routes.js",
    function: "POST /api/checkout"
  },
  steps: [
    {
      order: 1,
      module: "auth",
      file: "middleware.js",
      function: "requireAuth",
      input: ["req.headers.authorization"],
      output: ["req.user"],
      async: false
    },
    {
      order: 2,
      module: "cart",
      file: "get.js",
      function: "get",
      input: ["user.id"],
      output: ["cart.items"],
      async: true,
      sideEffects: ["DB_READ"]
    },
    {
      order: 3,
      module: "pricing",
      file: "calculate.js",
      function: "calculate",
      input: ["cart.items"],
      output: ["total"],
      async: false
    },
    {
      order: 4,
      module: "pricing",
      file: "discounts.js",
      function: "applyDiscounts",
      input: ["total", "user"],
      output: ["finalTotal"],
      async: false
    },
    {
      order: 5,
      module: "payment",
      file: "process.js",
      function: "process",
      input: ["user.id", "finalTotal"],
      output: ["payment.id", "payment.status"],
      async: true,
      sideEffects: ["PAYMENT_PROCESSING"]
    },
    {
      order: 6,
      module: "orders",
      file: "create.js",
      function: "create",
      input: ["user.id", "cart.items", "finalTotal", "payment.id"],
      output: ["order.id"],
      async: true,
      sideEffects: ["DB_WRITE"]
    },
    {
      order: 7,
      module: "notification",
      file: "send.js",
      function: "send",
      input: ["user.id", "order.id"],
      output: ["sent"],
      async: true,
      sideEffects: ["EMAIL_SEND", "PUSH_NOTIFICATION"]
    }
  ],
  sideEffects: [
    { type: "DB_READ", modules: ["cart"] },
    { type: "DB_WRITE", modules: ["orders"] },
    { type: "PAYMENT", modules: ["payment"] },
    { type: "NOTIFICATION", modules: ["notification"] }
  ],
  modulesInvolved: ["auth", "cart", "pricing", "payment", "orders", "notification"],
  totalSteps: 7,
  hasAsync: true,
  hasCompensation: true,  // Podría tener rollback
  estimatedDuration: "2000ms"
}
```

---

## 🎯 CASOS DE USO

### 1. Arquitectura del Sistema

**Query**: "¿Qué módulos dependen de auth?"

**Respuesta**:
```
Módulo auth exporta:
  - requireAuth (usado por 12 archivos)
  - validateToken (usado por 8 archivos)
  - generateToken (usado por 3 archivos)

Dependientes directos:
  - orders (5 funciones)
  - cart (3 funciones)
  - payment (2 funciones)
  - admin (8 funciones)

Gráfico de dependencias:
  auth ← orders ← payment
   ↓      ↓
   ← cart ← notification
   ↓
   ← admin
```

### 2. Impacto de Cambios

**Query**: "¿Qué pasa si cambio pricing.calculate()?"

**Respuesta**:
```
Impacto de cambiar pricing.calculate():

Upstream (quienes llaman):
  - orders/create.js (2 funciones)
  - cart/preview.js (1 función)
  - api/routes.js: checkout endpoint

Downstream (quienes usan el resultado):
  - payment/process.js usa el total
  - orders/create.js guarda el total
  - notification incluye el total en el email

Flujos de negocio afectados:
  ✓ checkout
  ✓ cart-preview
  ✓ order-history

Riesgo: ALTO
Afecta: 3 módulos, 6 funciones, 3 flujos de negocio
Recomendación: Mantener contrato de entrada/salida
```

### 3. Optimización

**Detección automática**:
```
Optimización detectada en flujo "checkout":

Problema: N+1 queries
  - cart.get() hace 1 query
  - Luego pricing.calculate() itera items y hace N queries de precios

Solución propuesta:
  - Mover precios a cache Redis
  - O batch queries en pricing.calculate()

Impacto estimado:
  - Actual: 1 + N queries
  - Optimizado: 1 + 1 query
  - Mejora: ~60% en tiempo de respuesta
```

### 4. Documentación Automática

**Genera**:
```markdown
# Flujo: Checkout

## Resumen
Procesa una orden de compra desde el carrito hasta la confirmación.

## Secuencia
1. **Autenticación** (`auth.middleware`)
   - Valida JWT token
   - Retorna: user object

2. **Obtener Carrito** (`cart.get`)
   - Recupera items del usuario
   - Retorna: cart.items[]

3. **Cálculo de Precios** (`pricing.calculate`)
   - Suma precios base
   - Aplica impuestos
   - Aplica descuentos
   - Retorna: finalTotal

4. **Procesamiento de Pago** (`payment.process`)
   - Cobra al cliente
   - Retorna: payment confirmation

5. **Creación de Orden** (`orders.create`)
   - Persiste orden en DB
   - Retorna: orderId

6. **Notificación** (`notification.send`)
   - Envía email de confirmación
   - Retorna: delivery status

## Side Effects
- Database: READ (cart), WRITE (orders)
- External: Payment gateway, Email service

## Módulos Involucrados
auth, cart, pricing, payment, orders, notification
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Semana 1: Nivel Módulo ✅
- [x] Crear `module-system/module-analyzer.js`
- [x] Crear `module-system/module-graph-builder.js`
- [x] Detectar conexiones cross-file
- [x] Identificar exports/imports de módulo

### Semana 2: Nivel Sistema ✅
- [x] Crear `module-system/system-analyzer.js`
- [x] Detectar entry points (API routes, CLI, etc.)
- [x] Crear `module-system/business-flow-detector.js`
- [x] Mapear conexiones entre módulos

### Semana 3: Integración y Testing
- [x] Integrar en pipeline principal
- [ ] Test con proyecto pequeño (3-4 módulos)
- [ ] Test con proyecto mediano (10+ módulos)
- [ ] Validar detección de business flows

---

## 📊 OUTPUT ESPERADO

### Molécula enriquecida (Fase 3):

```javascript
{
  // ... campos Fase 1 y 2 ...
  
  // NUEVO Fase 3A: Nivel Módulo
  moduleContext: {
    moduleName: "auth",
    modulePath: "src/auth/",
    
    // Conexiones con otros archivos del módulo
    connectedFiles: [
      {
        file: "validate.js",
        connections: [
          {
            from: "login.js:validateUser",
            to: "validate.js:checkPassword",
            dataFlow: ["credentials.password → password"]
          }
        ]
      }
    ],
    
    // Qué exporta este archivo al módulo
    moduleExports: ["login", "logout", "requireAuth"],
    
    // Qué importa de otros módulos
    externalImports: [
      { from: "database", imports: ["db"] },
      { from: "config", imports: ["JWT_SECRET"] }
    ]
  },
  
  // NUEVO Fase 3B: Nivel Sistema
  systemContext: {
    // Business flows donde participa
    businessFlows: [
      {
        flow: "checkout",
        step: 1,
        role: "authentication"
      },
      {
        flow: "admin-access",
        step: 1,
        role: "authorization"
      }
    ],
    
    // Dependencias globales
    dependents: ["orders", "cart", "payment", "admin"],
    dependencies: ["database", "config", "redis"],
    
    // Entry points que usan este archivo
    entryPoints: [
      { type: "api", path: "/api/login", handler: "login" },
      { type: "middleware", name: "requireAuth" }
    ]
  }
}
```

---

**¿Empezamos con la implementación de la Fase 3?**
