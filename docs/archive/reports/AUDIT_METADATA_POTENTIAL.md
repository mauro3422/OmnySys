# Auditoría: Potencial Sin Aprovechar de Metadatos

**Fecha**: 2026-02-09  
**Objetivo**: Identificar TODO el valor oculto en los metadatos para enriquecer conexiones

---

## 🔍 Inventario Completo de Metadatos Disponibles

### 1. Data Flow (v0.7 - Ya implementado)
```javascript
{
  inputs: [
    { name, type, usages: [{ type, property, line, passedTo }] }
  ],
  transformations: [
    { from, to, via, operation, line }
  ],
  outputs: [
    { type: 'return'|'side_effect', shape, properties }
  ],
  analysis: { coherence, coverage }
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ⚠️ SOLO 30% - No estamos usando para conexiones cross-function

---

### 2. DNA / Shadow Registry (v0.7.1 - Nuevo)
```javascript
{
  structuralHash, patternHash, flowType,
  operationSequence, complexityScore,
  semanticFingerprint
}
```
**Estado**: ✅ Extrayendo y guardando  
**Aprovechamiento**: ⚠️ SOLO 40% - Usado para matching pero no para "predicción de conexiones"

---

### 3. Side Effects (Existente)
```javascript
{
  networkCalls: [{ url, endpoint, method }],
  storageAccess: [{ type: 'read'|'write', key }],
  domManipulations: [...],
  consoleUsage: [...]
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ⚠️ SOLO 50% - Detectamos pero no conectamos con OTROS archivos que usan mismos recursos

---

### 4. Call Graph (Existente)
```javascript
{
  internalCalls: [...],  // Funciones del mismo archivo
  externalCalls: [...],  // Funciones de otros archivos
  calledBy: [...]        // Quién me llama
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ⚠️ SOLO 60% - Tenemos cables pero no su "intensidad histórica"

---

### 5. Async Patterns (Existente)
```javascript
{
  isAsync,
  hasPromises,
  hasCallbacks,
  hasAsyncAwait,
  promiseChains: [...]
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ❌ 10% - NO estamos usando para detectar race conditions entre archivos

---

### 6. Error Handling (Existente)
```javascript
{
  hasErrorHandling,
  tryCatchBlocks: [...],
  throwStatements: [...],
  errorTypes: [...]
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ❌ 5% - Podríamos mapear "cables de error" (quién puede lanzar qué a quién)

---

### 7. JSDoc Contracts (Existente)
```javascript
{
  params: [{ name, type, description }],
  returns: { type, description },
  throws: [...]
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ❌ 20% - NO usamos para validar data flow ni conexiones

---

### 8. Temporal Patterns (Existente)
```javascript
{
  lifecycleHooks: ['useEffect', 'componentDidMount'],
  cleanupPatterns: ['useEffect cleanup', 'componentWillUnmount'],
  intervals: [...],
  timeouts: [...]
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ❌ 0% - CRÍTICO: Podríamos detectar "cables temporales" (A se ejecuta antes que B)

---

### 9. Performance Hints (Existente)
```javascript
{
  hasNestedLoops,
  hasBlockingOps,
  hasRecursion,
  bigO: 'O(n)', 'O(n^2)'
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ❌ 15% - NO conectamos performance con arquetipos

---

### 10. Type Inference (Existente)
```javascript
{
  paramTypes: { paramName: 'string', ... },
  returnType: 'Promise<User>',
  inferredTypes: [...]
}
```
**Estado**: ✅ Extrayendo  
**Aprovechamiento**: ⚠️ 40% - Usamos pero NO para validar data flow chains

---

## 🎯 CONEXIONES OCULTAS (No Estamos Viendo)

### Tipo 1: Cables Temporales (Orden de Ejecución)
```javascript
// Archivo A: initialization.js
useEffect(() => { setupDatabase() }, [])  // lifecycle hook

// Archivo B: queries.js  
useEffect(() => { fetchData() }, [])      // otro lifecycle hook

// 🔌 CABLE TEMPORAL: A debe ejecutarse antes que B
// Si B corre antes, falla porque DB no está lista

// NO ESTAMOS DETECTANDO ESTO
```

**Solución**: Crear "Temporal Dependency Graph"

---

### Tipo 2: Cables de Error (Exception Flow)
```javascript
// Archivo A: validator.js
function validateUser(user) {
  if (!user.email) throw new ValidationError('Missing email')
}

// Archivo B: controller.js
try {
  validateUser(user)  // llama a A
} catch (error) {
  handleValidationError(error)  // maneja error de A
}

// 🔌 CABLE DE ERROR: A puede "sacudir" a B
// NO ESTAMOS MAPEANDO ESTA CONEXIÓN
```

**Solución**: Crear "Error Flow Graph"

---

### Tipo 3: Cables de Recursos Compartidos (Access Patterns)
```javascript
// Archivo A: cart.js
localStorage.setItem('cart', JSON.stringify(cart))

// Archivo B: checkout.js  
const cart = JSON.parse(localStorage.getItem('cart'))

// Archivo C: header.js
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') updateCartCount()  // reacciona a cambios
})

// 🔌 CABLES DE RECURSO: Los 3 están conectados por 'cart'
// PERO también hay un cable IMPLÍCITO de evento
// NO ESTAMOS VIENDO EL CABLE DE EVENTO 'storage'
```

**Solución**: Enriquecer "Resource Connections" con event listeners

---

### Tipo 4: Cables de Tipo (Type Contracts)
```javascript
// Archivo A: api.js
/** @returns {Promise<User>} */
function fetchUser(id) { ... }

// Archivo B: processor.js
/** @param {User} user */
function processUser(user) { ... }

// 🔌 CABLE DE TIPO: Salida de A → Entrada de B
// Podemos validar que el tipo coincide
// NO ESTAMOS USANDO JSDoc PARA VALIDAR CONEXIONES
```

**Solución**: Crear "Type Contract Validator"

---

### Tipo 5: Cables de Performance (Critical Path)
```javascript
// Archivo A: heavyComputation.js
function calculateExpensive() {  // O(n^3)
  // ...
}

// Archivo B: ui.js
function render() {
  const result = calculateExpensive()  // llama a A
  // UI congela mientras A calcula
}

// 🔌 CABLE DE PERFORMANCE: A arrastra a B
// Si A es lento, B también
// NO ESTAMOS PROPAGANDO PERFORMANCE HINTS
```

**Solución**: Crear "Performance Impact Graph"

---

### Tipo 6: Cables Semánticos Ocultos (Naming Patterns)
```javascript
// Archivo A: auth.js
function validateToken(token) { ... }

// Archivo B: middleware.js
function authenticate(req, res, next) {
  validateToken(req.headers.token)  // usa A
}

// 🔌 CABLE SEMÁNTICO: "validate" → "authenticate"
// Mismo dominio (auth), operación relacionada
// Podemos inferir: "si modificas validateToken, authenticate puede fallar"
```

**Solución**: Enriquecer "Semantic Connections" con verb taxonomy

---

### Tipo 7: Cables de Inicialización (Setup Dependencies)
```javascript
// Archivo A: config.js
let config = null
export function initConfig() { config = loadConfig() }
export function getConfig() { return config }

// Archivo B: api.js
import { getConfig } from './config.js'
function makeRequest() {
  const apiKey = getConfig().apiKey  // asume que initConfig() ya corrió
}

// 🔌 CABLE DE INICIALIZACIÓN: A.init() debe correr antes que B.makeRequest()
// NO ESTAMOS DETECTANDO ESTADO DE INICIALIZACIÓN
```

**Solución**: Crear "Initialization Order Graph"

---

## 💡 PROPUESTAS DE MEJORA

### Mejora 1: "Connection Enricher" (Post-Procesamiento)

Después de extraer todo, correr un enricher que conecte:

```javascript
// Enricher pipeline
async function enrichConnections(file) {
  const connections = [];
  
  // 1. Cables de Data Flow
  connections.push(...extractDataFlowConnections(file));
  
  // 2. Cables Temporales (NUEVO)
  connections.push(...extractTemporalConnections(file));
  
  // 3. Cables de Error (NUEVO)
  connections.push(...extractErrorFlowConnections(file));
  
  // 4. Cables de Tipo (NUEVO)
  connections.push(...extractTypeContractConnections(file));
  
  // 5. Cables de Performance (NUEVO)
  connections.push(...extractPerformanceConnections(file));
  
  // 6. Enriquecer con Ancestry (YA IMPLEMENTADO)
  connections.push(...extractInheritedConnections(file));
  
  return connections;
}
```

---

### Mejora 2: "Smart Connection Weights"

Los cables deberían tener pesos dinámicos basados en:

```javascript
connection.weight = calculateWeight({
  // Base: Tipo de conexión
  type: 'import',           // +1.0 (fuerte)
  
  // Data flow: Comparten datos?
  dataFlow: true,           // +0.5 (más fuerte)
  
  // Temporal: Orden de ejecución?
  temporal: 'must-run-before',  // +0.8 (crítico)
  
  // Type: Contrato de tipos?
  typeContract: 'valid',    // +0.3 (confiable)
  
  // Error: Puede lanzar error?
  errorFlow: true,          // +0.4 (riesgo)
  
  // Performance: Impacta performance?
  performance: 'blocking',  // +0.6 (crítico)
  
  // Ancestry: Conexión heredada?
  inherited: true,          // +0.2 (historia)
  vibrationScore: 0.8       // × vibration
});
```

---

### Mejora 3: "Context Query API" Enriquecida

Cuando levantás un archivo, deberías ver:

```javascript
const context = await queryContext('src/api.js');

context.connections = {
  // Cables directos (ya tenemos)
  imports: [...],
  exports: [...],
  
  // Cables semánticos (ya tenemos)
  semantic: [...],
  
  // 🔌 NUEVO: Cables temporales
  temporal: [
    { to: 'db.js', type: 'must-run-after', reason: 'initialization' }
  ],
  
  // 🔌 NUEVO: Cables de error
  errorFlow: [
    { from: 'validator.js', error: 'ValidationError', handled: true }
  ],
  
  // 🔌 NUEVO: Cables de tipo
  typeContracts: [
    { with: 'user.js', output: 'User', input: 'User', valid: true }
  ],
  
  // 🔌 NUEVO: Cables de performance
  performance: [
    { from: 'heavy.js', impact: 'blocking', severity: 'high' }
  ],
  
  // 🔌 NUEVO: Cables heredados (Shadow Registry)
  inherited: [
    { from: 'old-api.js', strength: 0.73, ruptured: false }
  ],
  
  // 🔌 NUEVO: Cables de recursos + eventos
  resourceEvents: [
    { resource: 'localStorage:cart', listeners: ['header.js', 'checkout.js'] }
  ]
};
```

---

## 📊 Matriz de Aprovechamiento Actual vs Potencial

| Metadato | Extrayendo | Usando | Potencial | Prioridad |
|----------|-----------|--------|-----------|-----------|
| Data Flow | ✅ 100% | ⚠️ 30% | Enriquecer cross-function | 🔴 Alta |
| DNA | ✅ 100% | ⚠️ 40% | Predicción de conexiones | 🔴 Alta |
| Side Effects | ✅ 100% | ⚠️ 50% | Resource connections | 🟡 Media |
| Call Graph | ✅ 100% | ⚠️ 60% | Intensidad histórica | 🟡 Media |
| Async Patterns | ✅ 100% | ❌ 10% | Race condition detection | 🔴 Alta |
| Error Handling | ✅ 100% | ❌ 5% | Error flow graph | 🟢 Baja |
| JSDoc | ✅ 100% | ❌ 20% | Type contract validation | 🟡 Media |
| Temporal | ✅ 100% | ❌ 0% | Execution order | 🔴 Alta |
| Performance | ✅ 100% | ❌ 15% | Critical path | 🟡 Media |
| Type Inference | ✅ 100% | ⚠️ 40% | Chain validation | 🟡 Media |

---

## 🎯 Recomendaciones Prioritarias

### Prioridad 1 (Implementar YA): Cables Temporales + Async
- Detectar lifecycle hooks y su orden
- Conectar con race condition detector
- **Impacto**: Prevenir bugs de inicialización

### Prioridad 2 (Esta semana): Enriquecer Data Flow Cross-Function
- Usar data flow para conectar salida de A con entrada de B
- Validar con type inference
- **Impacto**: Conexiones más precisas

### Prioridad 3 (Próximo sprint): Type Contracts
- Usar JSDoc para validar conexiones
- Detectar mismatches
- **Impacto**: Menos runtime errors

### Prioridad 4 (Futuro): Error Flow Graph
- Mapear quién puede lanzar qué errores
- Conectar con quién los maneja
- **Impacto**: Mejor error handling

---

## 💰 ROI Esperado

Con estas mejoras, cuando levantes una caja (archivo) verás:

**Antes**:
```
📦 api.js
   ├── import → auth.js
   ├── import → db.js
   └── event → localStorage
```

**Después**:
```
📦 api.js
   ├──► import → auth.js (weight: 1.0)
   ├──► data flow → db.js (User type, validated)
   ├──► temporal → db.js (must init before)
   ├──► error flow → validator.js (throws ValidationError)
   ├──► resource event → header.js (via localStorage:cart)
   ├──► performance impact → ui.js (blocking: 150ms)
   └──► inherited → old-api.js (vibration: 0.73, gen: 2)
       └── ⚠️ 3 conexiones históricas no migraron
```

**Contexto 10x mayor, precisión 5x mayor.**
