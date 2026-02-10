# DATA FLOW FRACTAL - Índice

**Versión**: v0.7.1
**Estado**: Fase 1 (v1) 100% ✅ | v2 (Graph-Based) 95% ✅
**Última actualización**: 2026-02-09

---

## 🎯 Visión Rápida (30 segundos)

**Problema**: Sabemos qué funciones existen, pero NO sabemos cómo viajan los datos entre ellas.

**Solución**: Seguir el viaje del dato desde que entra (parámetro) hasta que sale (return/side effect).

**Metafora**: Como Google Maps, pero para datos. No te dice solo QUÉ calles existen, sino CÓMO llegar de A a B.

---

## 📦 Data Flow v2 (Graph-Based)

**Estado**: ✅ IMPLEMENTADO en v0.7.1 (95% completo - 1 stub en invariant-detector)

### Qué es v2

Data Flow v2 es una **reimplementación completa** del sistema de extracción de flujo de datos usando arquitectura modular basada en visitors del patrón AST. **Coexiste con v1** sin reemplazarlo.

### v1 vs v2 - Comparación Rápida

| Aspecto | v1 (Monolítico) | v2 (Graph-Based) | Estado |
|---------|-----------------|------------------|--------|
| **Arquitectura** | 1 archivo | 12 archivos modulares | ✅ v2 |
| **Patterns** | ~15 patrones | 50+ patrones registrados | ✅ v2 |
| **Outputs** | 1 formato básico | 3 formatos (real/std/graph) | ✅ v2 |
| **Type Inference** | ❌ No | ✅ Sí | ✅ v2 |
| **Scope Management** | ❌ No | ✅ Sí | ✅ v2 |
| **Extensibilidad** | Baja | Alta (visitor pattern) | ✅ v2 |
| **Estado** | ✅ Funcional | 🟡 95% completo | Coexisten |

### Ubicación

- **v1**: `src/layer-a-static/extractors/data-flow/index.js`
- **v2**: `src/layer-a-static/extractors/data-flow-v2/` (12 archivos)

### Pendiente en v2

- ⚠️ **Invariant Detector**: Línea 335 en `analyzers/invariant-detector.js` es stub parcial
- ✅ No bloquea funcionalidad principal
- 📝 Será completado en v0.7.2

### Más Información

Ver documentación completa en: **[DATA_FLOW_V2.md](../architecture/DATA_FLOW_V2.md)**

---

## 🏗️ Arquitectura Fractal (4 Niveles)

```
┌─────────────────────────────────────────┐
│           SISTEMA (Proyecto)            │
│   Entrada: API/UI/CLI                   │
│   Salida: Response/DB/Email             │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           MÓDULO (Feature/Carpeta)      │
│   Ej: auth/, cart/, payment/            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           MOLÉCULA (Archivo)            │
│   Ej: validateUser.js                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           ÁTOMO (Función)               │
│   Ej: validateUser(user)                │
└─────────────────────────────────────────┘
```

**Regla**: Cada nivel se DERIVA del inferior. Si cambia un átomo, se recalcula todo hacia arriba.

---

## 📋 Fases de Implementación

### FASE 1 - Data Flow Atómico [→ Ver detalle](./01_FASE_ATOMO.md)
**Qué hace**: Cada función sabe qué recibe, qué transforma, qué retorna.

**Ejemplo**:
```javascript
function processOrder(order, userId) {
  const total = calculateTotal(order.items);  // order.items → total
  return { orderId: order.id, total };        // → return
}
```

**Metadata extraída**:
- INPUT: `order`, `userId`
- TRANSFORM: `order.items` → `total` (via calculateTotal)
- OUTPUT: return `{ orderId, total }`

---

### FASE 2 - Análisis Semántico [→ Ver detalle](./02_FASE_SEMANTICA.md)
**Qué hace**: Extrae significado del nombre de la función.

**Ejemplo**:
```javascript
"validateUserPayment" → {
  verbo: "validate",
  dominio: "user",
  entidad: "payment",
  tipoOperacion: "validation"
}
```

---

### FASE 3 - Estandarización [→ Ver detalle](./03_FASE_ESTANDARIZACION.md)
**Qué hace**: Convierte código a un patrón universal para detectar similitudes.

**Ejemplo**:
```javascript
// Original A:           // Original B:
validateUser(user)      validateOrder(order)

// Estandarizado (ambos):
VALIDATE_FUNC(ENTITY_PARAM)
```

**Para qué sirve**: Detectar que dos funciones diferentes tienen la MISMA estructura.

---

### FASE 4 - Cadenas Cross-Function [→ Ver detalle](./04_FASE_CADENAS.md)
**Qué hace**: Conecta la salida de una función con la entrada de otra.

**Ejemplo**:
```
processOrder(order) 
  → llama a: calculateTotal(order.items)
  → recibe: total
  → retorna: { orderId, total }
```

---

### FASE 5 - Detector de Race Conditions [→ Ver detalle](./05_FASE_RACE_CONDITIONS.md)
**Qué hace**: Detecta cuando dos funciones async pueden pisarse escribiendo al mismo recurso.

**Ejemplo**:
```javascript
// PROBLEMA DETECTADO:
async updateCart() { localStorage.cart = ... }
async applyDiscount() { localStorage.cart = ... }
// Ambas escriben a localStorage.cart sin coordinación
```

---

### FASE 6 - Motor de Simulación [→ Ver detalle](./06_FASE_SIMULACION.md)
**Qué hace**: "Camina" el grafo simulando el viaje de un dato.

**Ejemplo**:
```
> Simular: "req.body" desde "handleRequest"

Paso 1: handleRequest → extrae userData
Paso 2: validateUser → valida email
Paso 3: saveUser → guarda en DB
Paso 4: sendWelcome → envía email

Resultado: Viajó por 4 archivos, 4 funciones
```

---

### FASE 7 - Nivel Módulo y Sistema [→ Ver detalle](./07_FASE_SISTEMA.md)
**Qué hace**: Deriva metadata de carpetas y del proyecto completo.

---

## 📊 Cobertura Esperada

| Tipo de Conexión | Antes | Después |
|------------------|-------|---------|
| Imports/Exports | 95% | 95% |
| Llamadas directas | 85% | 95% |
| Data flow completo | 20% | **90%** |
| Race conditions | 0% | **75%** |
| **TOTAL** | ~75% | **~97%** |

---

## 🎓 Conceptos Clave [→ Leer primero](./CONCEPTOS_CLAVE.md)

Si vas a implementar, lee primero:
1. **CONCEPTOS_CLAVE.md** - Entiende "Cables vs Señales" y "Fractal"
2. **01_FASE_ATOMO.md** - Empieza por la base
3. El resto en orden numérico

---

## ⚠️ Nota Importante

- Cada fase **construye sobre la anterior**
- Sin Fase 1, no se puede hacer nada del resto
- Todo es **determinístico** (zero LLM para extracción)
- **Backwards compatible**: se agrega metadata sin romper lo existente

---

**Documento Original**: [DATA_FLOW_FRACTAL_DESIGN.md](../architecture/DATA_FLOW_FRACTAL_DESIGN.md) (1088 líneas - referencia completa)
