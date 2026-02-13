# Ejemplos de Presentaciones Contextuales

**Cómo se vería la información según el contexto.**

---

## 🎨 Contexto 1: "Voy a editar esta función"

### ❌ ANTES (Datos crudos)
```
📦 processOrder (api.js:45)
   ├── Complexity: 15
   ├── Lines: 87
   ├── Cyclomatic: 12
   ├── Operation sequence: ['receive', 'read', 'transform', 'persist', 'return']
   ├── DNA: a3f7d29c1b5e...
   ├── Ancestry: gen 3, vibration 0.87
   ├── Connections: 12
   ├── Type confidence: 0.4
   └── Performance: O(n²), 150ms
```

**Problema**: ¿Qué hago con esto? ¿Es bueno? ¿Es malo? ¿Qué debo saber?

---

### ✅ DESPUÉS (Insights accionables)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  ALTO RIESGO: Cambios tendrán efecto en cascada          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔥 POR QUÉ ESTO ES CRÍTICO:                                │
│  • Complejidad 15 + Historial de cambios (gen 3)           │
│  • 12 conexiones dependen de esta función                  │
│  • Vibration Score: 0.87 (muy alta intensidad histórica)   │
│                                                             │
│  📊 DATOS DEL LINAJE (Ancestry):                           │
│  • Reemplaza a: old-processOrder (shadow_abc123)           │
│  • Evolución típica:                                       │
│    Gen 1: validateOrder  →  Gen 2: processOrder            │
│                            →  Gen 3: processOrder (ahora)  │
│  • Patrón detectado: 80% agregó validación en gen 2        │
│                                                             │
│  ⚠️  RIESGOS ESPECÍFICOS:                                   │
│                                                             │
│  1. 💥 TYPE MISMATCH NO RESUELTO                           │
│     └─ Output: Promise<Order>                              │
│     └─ Consumer (saveToDB) espera: OrderDTO                │
│     └─ Conversión manual en 3 lugares (inconsistente)      │
│                                                             │
│  2. 🐌 PERFORMANCE BOTTLENECK                              │
│     └─ O(n²) con nested loops                              │
│     └─ Bloquea render de UI (150ms)                        │
│     └─ 3 componentes esperan esta función                  │
│                                                             │
│  3. 🔥 ERROR NO MANEJADO                                   │
│     └─ Puede lanzar: ValidationError                       │
│     └─ NO atrapado en: api.js, controller.js               │
│     └─ Riesgo: Crash en producción                         │
│                                                             │
│  💡 RECOMENDACIONES BASADAS EN EL CLAN:                    │
│                                                             │
│  Tu función pertenece al clan "read-transform-persist"     │
│  (127 funciones similares en el proyecto)                  │
│                                                             │
│  Funciones de este clan que evolucionaron bien:            │
│  • 67% agregaron validación entre 'read' y 'transform'     │
│  • 45% extrajeron lógica de 'persist' a función separada   │
│  • 80% agregaron tests de integración ANTES de cambiar     │
│                                                             │
│  ✅ ACCIONES SUGERIDAS ANTES DE EDITAR:                    │
│  1. Correr tests de integración (si existen)               │
│  2. Verificar manejo de ValidationError                    │
│  3. Considerar agregar validación de tipos                 │
│                                                             │
│  🔗 IMPACTO DE TUS CAMBIOS:                                │
│  Si modificás el return type, se rompe:                    │
│  • saveToDB.js (línea 23)                                  │
│  • notificationService.js (línea 45)                       │
│  • test-order-flow.js (3 tests)                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Diferencia**: De "datos sueltos" a "narrativa de riesgo con acciones"

---

## 🎨 Contexto 2: "Hay un error en producción"

### ❌ ANTES (Stack trace + código)
```
Error: ValidationError: Invalid order data
    at processOrder (api.js:45)
    at controller.js:23
    
Código:
function processOrder(order) {
  if (!order.items) throw new ValidationError('...');
  // ... 80 líneas más
}
```

**Problema**: ¿Por qué falló? ¿Qué más se rompe? ¿Quién debería manejarlo?

---

### ✅ DESPUÉS (Análisis de impacto del error)

```
┌─────────────────────────────────────────────────────────────┐
│  🔥 ERROR: ValidationError en processOrder                   │
│  📍 api.js:45                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🕵️  ANÁLISIS DEL ERROR:                                    │
│                                                             │
│  Este error es lanzado cuando:                             │
│  └─ `order.items` es falsy (null, undefined, [])           │
│                                                             │
│  📊 FRECUENCIA HISTÓRICA (basado en sombras):              │
│  • old-processOrder (gen 1): 12 incidentes/mes             │
│  • processOrder (gen 2): 8 incidentes/mes                  │
│  • processOrder (gen 3, actual): 3 incidentes/mes          │
│                                                             │
│  ✅ TENDENCIA: Mejorando con cada generación               │
│                                                             │
│  🔗 IMPACTO DEL ERROR (Error Flow Analysis):               │
│                                                             │
│  El error NO es manejado en:                               │
│  ❌ api.js (línea 45) - donde se lanza                     │
│  ❌ controller.js (línea 23) - donde se llama              │
│  ❌ middleware.js - no hay try-catch global                │
│                                                             │
│  ⚠️  RESULTADO: Error expuesto al usuario final            │
│                                                             │
│  🔧 ARBOL DE DECISIONES (dónde agregar handler):           │
│                                                             │
│  Opción A: Agregar en controller.js (RECOMENDADO)          │
│  ├─ Pros: Cerca del origen, fácil de testear              │
│  ├─ Cons: Solo cubre este endpoint                         │
│  └─ Pattern match: 80% de handlers del clan están aquí     │
│                                                             │
│  Opción B: Agregar middleware global                       │
│  ├─ Pros: Cubre todos los casos                            │
│  ├─ Cons: Puede ocultar otros errores                      │
│  └─ Pattern match: 20% del clan usa esto (edge cases)      │
│                                                             │
│  💡 FIX SUGERIDO (basado en clan "read-transform-persist"):│
│                                                             │
│  ```javascript                                              │
│  // En controller.js, línea 23                             │
│  try {                                                      │
│    const result = await processOrder(order);               │
│  } catch (error) {                                         │
│    if (error instanceof ValidationError) {                 │
│      // 67% del clan usa este approach                     │
│      return res.status(400).json({                         │
│        error: 'Invalid order data',                        │
│        details: error.condition // "order.items missing"   │
│      });                                                   │
│    }                                                        │
│    throw; // Re-lanzar errores inesperados                 │
│  }                                                          │
│  ```                                                        │
│                                                             │
│  📈 POST-FIX PREDICCIÓN:                                   │
│  Basado en funciones similares del clan:                   │
│  • Incidentes esperados: ~0.5/mes (83% reducción)          │
│  • Tiempo de implementación: 15 min                        │
│  • Tests necesarios: 2 casos (happy path + error)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Diferencia**: De "error desconocido" a "patrón histórico con solución validada"

---

## 🎨 Contexto 3: "Code Review de un PR"

### ❌ ANTES (Diff + comentarios manuales)
```diff
function processOrder(order) {
+  const validated = validateOrder(order);
   const total = calculateTotal(order.items);
   // ...
}
```

**Comentario**: "¿Esto no afecta performance?"

---

### ✅ DESPUÉS (Análisis automático del cambio)

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 CODE REVIEW: PR #123 - Refactor processOrder            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 CAMBIO DETECTADO:                                       │
│  + Agregado: validateOrder(order)                          │
│  + Posición: Antes de calculateTotal                       │
│                                                             │
│  🎯 ANÁLISIS DE IMPACTO:                                   │
│                                                             │
│  1. 📈 COMPLEJIDAD                                          │
│     Antes: 15 → Después: 16 (+6.7%)                        │
│     Estado: Aceptable (dentro del rango del clan)          │
│                                                             │
│  2. ⚡ PERFORMANCE                                          │
│     ⚠️  ATENCIÓN: validateOrder tiene O(n) complexity      │
│     Impacto estimado: +20-40ms (basado en promedio del     │
│     clan "validation-functions")                           │
│                                                             │
│     Contexto:                                              │
│     • Función actual: 150ms total                          │
│     • Con validateOrder: 170-190ms estimado                │
│     • Threshold UI blocking: 100ms                         │
│     • Estado: 🔴 SIGUE SIENDO PROBLEMA (ya era >100ms)     │
│                                                             │
│  3. 🔒 TYPE SAFETY                                          │
│     ✅ MEJORA: validateOrder retorna ValidatedOrder        │
│     ✅ processOrder ahora tiene contrato más fuerte        │
│     ✅ Confidence sube: 0.4 → 0.7                          │
│                                                             │
│  4. 🧪 TEST COVERAGE                                        │
│     ⚠️  validateOrder tiene 67% coverage                   │
│     Casos no cubiertos:                                    │
│     • order.items = [] (vacío)                             │
│     • order.items con items sin precio                     │
│                                                             │
│  💡 RECOMENDACIONES DEL SISTEMA:                           │
│                                                             │
│  Opción A: ACEPTAR (con observaciones)  ← RECOMENDADO      │
│  ├─ El cambio mejora type safety                           │
│  ├─ Performance ya era problema, no empeora                │
│  └─ Sugerir: Agregar tests para casos edge                 │
│                                                             │
│  Opción B: SOLICITAR CAMBIOS                               │
│  ├─ Extraer validateOrder a Web Worker                     │
│  ├─ O agregar caching de validación                        │
│  └─ Pattern: 30% del clan usa esta optimización            │
│                                                             │
│  👥 REVIEWERS SUGERIDOS:                                   │
│  Basado en quién editó archivos similares:                 │
│  • @sarah (reviewed 3 PRs de este clan)                    │
│  • @mike (autor de validation-utils)                       │
│                                                             │
│  📚 DOCUMENTACIÓN RELACIONADA:                             │
│  • "Validation Patterns in Order Processing"               │
│  • "Performance Budgets: UI Thread"                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Diferencia**: De "¿esto está bien?" a "análisis multi-dimensional con recomendación"

---

## 🎨 Contexto 4: "Soy nuevo en el proyecto"

### ❌ ANTES (README + explorar código)
```
# Proyecto API

## Estructura
- api/        # Endpoints
- models/     # Database models
- utils/      # Utilities

## Cómo empezar
1. npm install
2. npm run dev
```

**Problema**: ¿Qué archivo toco? ¿Qué debo evitar? ¿Dónde está la lógica crítica?

---

### ✅ DESPUÉS (Mapa de navegación contextual)

```
┌─────────────────────────────────────────────────────────────┐
│  🗺️  MAPA DEL PROYECTO PARA NUEVOS DESARROLLADORES          │
│  Generado basado en tu rol: Backend Developer               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 EMPIEZA AQUÍ (Seguro para modificar):                  │
│                                                             │
│  📁 src/features/new/                                      │
│  └─ 🟢 ZONA SEGURA: Patrón del clan "new-features"         │
│     • Baja complejidad (avg 5)                             │
│     • Alto test coverage (85%)                             │
│     • Pocas dependencias                                   │
│     • Ejemplos de referencia: [3 archivos]                 │
│                                                             │
│  🔥 ZONAS CRÍTICAS (Tocar con cuidado):                    │
│                                                             │
│  📁 src/api/auth.js                                        │
│  ├─ ⚠️  CRÍTICO: Vibration Score 0.92 (muy alta)          │
│  ├─ 🔗 89 conexiones dependen de este archivo              │
│  ├─ 📜 Historia: 5 generaciones, último refactor hace 2d   │
│  ├─ 👥 Solo @sarah y @mike deberían modificar              │
│  └─ 📚 Leer primero: "Auth Flow Architecture"              │
│                                                             │
│  📁 src/core/order-processing.js                           │
│  ├─ ⚠️  CRÍTICO: Clan "business-logic" (alto crecimiento)  │
│  ├─ 🐌 Performance: O(n²) - ya identificado como deuda     │
│  ├─ 🧪 Tests: 45% coverage (necesita mejora)               │
│  └─ 💡 Oportunidad: Equipo busca voluntarios para refactor │
│                                                             │
│  🧩 PATRONES COMUNES DEL PROYECTO:                         │
│                                                             │
│  1. "read-transform-persist" (127 funciones)               │
│     ├─ Estructura típica: fetch → validate → save          │
│     ├─ Dónde ver ejemplos: [lista de archivos]             │
│     └─ Errores comunes: Olvidar validación (40% de bugs)   │
│                                                             │
│  2. "API Boundary Functions" (34 funciones)                │
│     ├─ Patrón: Validación de entrada + manejo de errores   │
│     ├─ Ubicación: src/api/*                                │
│     └─ Standard: Siempre usar try-catch + log              │
│                                                             │
│  📊 MI PRIMER TICKET IDEAL:                                │
│                                                             │
│  Basado en funciones del clan "read-transform-persist"     │
│  con baja complejidad y buen test coverage:                │
│                                                             │
│  1. #2345: Agregar validación de email en registro         │
│     ├─ Complejidad: 3/10                                   │
│     ├─ Similar a: 5 funciones existentes                   │
│     └─ Estimación: 2h (basado en historial del clan)       │
│                                                             │
│  2. #2356: Agregar campo "phone" a UserDTO                 │
│     ├─ Type-safe: Sí                                       │
│     ├─ Impacto: 2 archivos                                 │
│     └─ Estimación: 1h                                      │
│                                                             │
│  👥 QUIÉN SABE QUÉ:                                        │
│                                                             │
│  • @sarah: Conoce auth.js (la escribió)                    │
│  • @mike: Experto en performance (te ayuda con O(n²))      │
│  • @alex: Clan "read-transform-persist" (referente)        │
│                                                             │
│  📚 CURACIÓN DE DOCUMENTACIÓN:                             │
│                                                             │
│  En lugar de leer TODO, lee esto primero:                  │
│  1. "Onboarding: Primeros 3 archivos"                      │
│  2. "Patrones del proyecto: read-transform-persist"        │
│  3. "Cómo no romper auth.js" (war stories)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Diferencia**: De "explora y averigua" a "mapa personalizado con ruta segura"

---

## 🎨 Contexto 5: "Optimizar performance"

### ❌ ANTES (Profiler + intuición)
```
Chrome DevTools:
- Scripting: 450ms
- Rendering: 120ms
- Painting: 30ms

processOrder: 150ms (self)
```

**Problema**: ¿Por dónde empiezo? ¿Qué cambia primero? ¿Cómo sé si mejora?

---

### ✅ DESPUÉS (Análisis de performance conectado)

```
┌─────────────────────────────────────────────────────────────┐
│  🐌 ANÁLISIS DE PERFORMANCE: processOrder                    │
│  Objetivo: < 100ms (actual: 150ms)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 DESGLOSE DEL TIEMPO (150ms total):                     │
│                                                             │
│  calculateTotal(items)        ████████████████ 80ms (53%)  │
│  ├─ Loop anidado O(n²) detectado                          │
│  └─ items.length promedio: 250 (del telemetry)            │
│                                                             │
│  validateOrder(order)         ████████ 40ms (27%)          │
│  ├─ Síncrono, bloquea thread                              │
│  └─ Podría paralelizarse con calculateTotal               │
│                                                             │
│  saveOrder(order)             ████ 20ms (13%)              │
│  ├─ I/O async, no bloquea                                 │
│  └─ ✅ Ya optimizado (usa batching)                       │
│                                                             │
│  Overhead (resto)             ██ 10ms (7%)                 │
│                                                             │
│  🔗 IMPACTO EN CADENA:                                     │
│                                                             │
│  processOrder (150ms)                                      │
│     ↓ llama a                                              │
│  formatResponse (30ms) ← bloqueado por processOrder       │
│     ↓ llama a                                              │
│  render() ← Total: 180ms de blocking                       │
│                                                             │
│  📈 HISTORIA DE OPTIMIZACIONES (Clan similar):            │
│                                                             │
│  Funciones del clan "read-transform-persist" que          │
│  tenían O(n²) y fueron optimizadas:                       │
│                                                             │
│  1. processPayment (optimizado por @mike)                  │
│     ├─ Antes: 120ms O(n²)                                  │
│     ├─ Después: 25ms O(n)                                  │
│     └─ Estrategia: Usar Map() en lugar de find()          │
│     └─ Código: [link al diff]                              │
│                                                             │
│  2. calculateDiscount (optimizado por @sarah)              │
│     ├─ Antes: 90ms O(n²)                                   │
│     ├─ Después: 15ms O(n)                                  │
│     └─ Estrategia: Pre-calcular en init()                 │
│                                                             │
│  💡 ESTRATEGIAS SUGERIDAS (ordenadas por impacto):        │
│                                                             │
│  Opción 1: OPTIMIZAR calculateTotal (ALTO IMPACTO)         │
│  ├─ Cambio: O(n²) → O(n) usando Map                       │
│  ├─ Tiempo estimado después: 15-20ms                      │
│  ├─ Total función: 150ms → 85ms ✅ Meta alcanzada         │
│  ├─ Esfuerzo: Medio (2-4 horas)                           │
│  ├─ Riesgo: Bajo (misma lógica, estructura diferente)     │
│  └─ Ejemplo: Ver processPayment @mike                     │
│                                                             │
│  Opción 2: PARALELIZAR validateOrder (MEDIO IMPACTO)       │
│  ├─ Cambio: Mover a Web Worker o hacer async              │
│  ├─ Tiempo en thread principal: 40ms → 5ms                │
│  ├─ Total función: 150ms → 115ms (parcial)                │
│  ├─ Esfuerzo: Medio-Alto (cambio de arquitectura)         │
│  ├─ Riesgo: Medio (manejo de async)                       │
│  └─ Pattern: 20% del clan usa esto                        │
│                                                             │
│  Opción 3: CACHE (BAJO IMPACTO, rápido)                    │
│  ├─ Cambio: Cachear resultado si items no cambia          │
│  ├─ Tiempo (cache hit): 150ms → 2ms                       │
│  ├─ Hit rate estimado: 40% (basado en telemetry)          │
│  ├─ Tiempo promedio: 150ms → 91ms ✅ Meta alcanzada       │
│  ├─ Esfuerzo: Bajo (1 hora)                                │
│  ├─ Riesgo: Bajo                                           │
│  └─ Trade-off: Memoria extra                               │
│                                                             │
│  🎯 PLAN RECOMENDADO:                                       │
│                                                             │
│  Fase 1 (Esta semana): Implementar Opción 3 (Cache)        │
│  ├─ Rápida victoria, reduce 40% de casos                  │
│  └─ Aprendemos sobre el comportamiento de los datos       │
│                                                             │
│  Fase 2 (Próxima sprint): Implementar Opción 1 (O(n))      │
│  ├─ Solución definitiva                                    │
│  └─ Basado en éxito de @mike en función similar           │
│                                                             │
│  📊 MÉTRICAS A SEGUIR:                                     │
│  • Tiempo p95 de processOrder (target: <100ms)             │
│  • Cache hit rate (target: >50%)                           │
│  • Error rate (no debe aumentar)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Diferencia**: De "150ms es lento" a "plan de optimización con ejemplos del pasado"

---

## 🎯 Patrones Comunes

Todas estas presentaciones siguen el patrón:

```
1. 🚨 SITUACIÓN (qué está pasando)
2. 🔍 ANÁLISIS (por qué está pasando, conectando datos)
3. 📊 CONTEXTO (historia, patrones, clan)
4. 💡 INSIGHTS (qué significa)
5. ✅ ACCIONES (qué hacer, con prioridades)
```

**Los datos crudos están ahí, pero transformados en narrativa útil.**
