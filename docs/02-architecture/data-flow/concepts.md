# Conceptos Clave - Data Flow Fractal

**Versión**: v0.9.4  
**Prerrequisito**: Leer antes de entender implementación o roadmap

---

## Los 3 Conceptos Fundamentales

1. **"Cables, Not Signals"** - Mapear conexiones, no valores
2. **Arquitectura Fractal (A→B→C)** - Mismo patrón en 4 escalas
3. **Zero LLM para Extracción** - 100% determinístico

---

## 1. "Cables, Not Signals"

### Analogía: Sistema Eléctrico

```
CASA con electricidad

CABLES (lo que mapeamos):
✅ Interruptor → Foco (existe conexión)
✅ Enchufe → Nevera (existe conexión)
✅ Breaker panel → Toda la casa

SEÑALES (lo que NO mapeamos):
❌ ¿Cuántos volts pasan? (valor runtime)
❌ ¿Es AC o DC? (tipo runtime)
❌ ¿Cuánto consume la nevera? (métricas runtime)
```

### En Código

```javascript
// SABEMOS QUE existe el cable:
userData → validateUser → saveUser → response

// NO sabemos (y NO nos importa):
❌ userData.name = "Juan" o "María"
❌ ¿Es válido el email?
❌ ¿Existe en la BD?
```

### Ventaja: Cobertura 97%

| Caso | Cobertura | Por qué funciona |
|------|-----------|------------------|
| `eval()` | ~90% | Cable: entrada→eval→salida mapeado. Internos opacos pero conexión conocida |
| User input | ~95% | Cable completo mapeado. Valor irrelevante |
| Third-party | ~80% | Cable + catálogo de firmas conocidas |
| Async/Race | ~75% | Todos los orderings posibles |

### Señales de Prueba (Test Probes)

> Aunque el enfoque es "cables", podemos **inyectar señales de prueba** para verificar la salud del cable.

```javascript
// Cable mapeado estáticamente
function executeDynamic(codeString) {
  const result = eval(codeString);
  return result;
}

// Test probe: Verificar que el cable funciona
testProbe: {
  input: { codeString: "1 + 1" },        // Señal de prueba
  expectedOutput: { type: "number" },      // Tipo esperado
  cableIntegrity: "VERIFIED"               // El cable funciona
}
```

Esto convierte el sistema en un **debugger predictivo**.

---

## 2. Arquitectura Fractal (A→B→C)

### El Patrón Universal

Cada nivel usa EXACTAMENTE la misma estructura:

```
A (Entrada) → B (Transformación) → C (Salida)
```

### Aplicado a Cada Nivel

**Átomo (Función):**
```
A: Parámetros que entran
   ↓
B: Transformaciones internas (cálculos, validaciones)
   ↓
C: Return o Side Effect
```

**Molécula (Archivo):**
```
A: Datos que entran por funciones exportadas
   ↓
B: Viaje entre funciones internas
   ↓
C: Datos que salen por returns exportados
```

**Módulo (Carpeta):**
```
A: Imports externos
   ↓
B: Flujo entre archivos
   ↓
C: Exports públicos
```

**Sistema (Proyecto):**
```
A: Entry points (API/UI/CLI)
   ↓
B: Flujo entre módulos
   ↓
C: Responses / Side effects
```

### Derivación

Cada nivel se **DERIVA** del inferior:

```
Átomos → Moléculas → Módulos → Sistema
  ↑          ↑          ↑         ↑
  └──────────┴──────────┴─────────┘
          ¿Cambió un átomo?
     → Invalidar todo hacia arriba
```

**Regla de oro**: Si cambia un electrón (dato), se recalcula todo hacia arriba hasta el sistema.

---

## 3. Zero LLM para Extracción

### Principio

Todo se extrae con **código determinístico** (AST, regex, análisis estático).

| Operación | Técnica | Determinístico |
|-----------|---------|----------------|
| Extraer data flow | AST visitor | ✅ Sí |
| Parsear nombres | String splitting | ✅ Sí |
| Estandarizar código | Rule-based tokens | ✅ Sí |
| Simular viaje | Graph walking | ✅ Sí |
| Detectar races | Pattern matching | ✅ Sí |

### Cuándo SÍ Usamos LLM

Solo cuando `confidence < 0.8`:

```javascript
function needsLLM(atom) {
  return (
    atom.semantic.confidence < 0.8 ||        // No entendimos el nombre
    atom.dataFlow.isOpaque === true ||       // Tiene eval() o similar
    atom.archetype.confidence < 0.8          // No detectamos el patrón
  );
}

// Estimación: ~2-5% de funciones necesitan LLM
```

### Beneficios

| Aspecto | Con LLM | Zero LLM |
|---------|---------|----------|
| **Velocidad** | Segundos | Milisegundos |
| **Costo** | API calls | Gratis |
| **Reproducibilidad** | Variable | Determinística |
| **Escalabilidad** | Rate limits | Offline, ilimitado |

---

## Visualización Completa

```
┌─────────────────────────────────────────────┐
│           SISTEMA (Entry → Modules → Exit)  │
│  "El dato entra por API, viaja, sale"      │
└───────────────────┬─────────────────────────┘
                    │ DERIVA
┌───────────────────▼─────────────────────────┐
│         MÓDULO (Imports → Files → Exports) │
│  "El dato entra al auth/, viaja, sale"     │
└───────────────────┬─────────────────────────┘
                    │ DERIVA
┌───────────────────▼─────────────────────────┐
│       MOLÉCULA (Exports → Chains → Returns)│
│  "El dato entra por validateUser, viaja"   │
└───────────────────┬─────────────────────────┘
                    │ DERIVA
┌───────────────────▼─────────────────────────┐
│           ÁTOMO (Params → Transform → Out) │
│  "El dato entra como 'user', se valida"    │
└─────────────────────────────────────────────┘
        ↑
        └── EXTRAÍDO vía AST (determinístico)

CABLES: Mapeamos todas las conexiones (97%)
SEÑALES: Inyectamos de prueba para verificar
```

---

## Analogía Física

| Física Real | Data Flow | Qué modela |
|-------------|-----------|------------|
| **Universo** | Sistema | Todo el código |
| **Galaxia** | Módulo | Feature/folder |
| **Planeta** | Molécula | Archivo |
| **Átomo** | Función | Unidad de ejecución |
| **Electrones** | Datos fluyendo | Params → transforms → returns |
| **Orbitales** | Conexiones | Cómo viajan los datos |

---

## Relación con los 4 Pilares

Este sistema implementa los [4 Pilares](../../01-core/principles.md):

| Pilar | Implementación en Data Flow |
|-------|----------------------------|
| **Box Test** | Cables revelan conexiones entre funciones |
| **Metadata Insights** | Data flow se combina con side effects, types |
| **Atomic Composition** | Átomo → Molécula → Módulo → Sistema |
| **Fractal A→B→C** | Mismo patrón en los 4 niveles |

---

## Cheatsheet Rápido

```
┌────────────────────────────────────────┐
│ "Cables, Not Signals"                  │
│ • Mapear: user → validate → save      │
│ • No mapear: user.name = "Juan"       │
├────────────────────────────────────────┤
│ Fractal A→B→C                          │
│ • Átomo: Params → Transform → Return  │
│ • Molécula: Inputs → Chains → Outputs │
│ • Módulo: Imports → Internal → Exports│
│ • Sistema: Entry → Business → Exit    │
├────────────────────────────────────────┤
│ Zero LLM                               │
│ • Extracción: AST + regex (100%)      │
│ • Solo LLM: confidence < 0.8 (~2-5%)  │
└────────────────────────────────────────┘
```

---

**Siguiente paso**: [atom-extraction.md](./atom-extraction.md) para ver la implementación de Fase 1.
