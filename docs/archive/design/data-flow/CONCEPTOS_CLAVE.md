---
?? **DOCUMENTO DE ROADMAP/DISE�O**

Este documento describe fases futuras del sistema Data Flow.
Para documentaci�n actual del Data Flow implementado, ver:
- docs/02-architecture/data-flow/

**Motivo**: Archivado como referencia de dise�o futuro.

---
# Conceptos Clave - DATA FLOW FRACTAL

**Antes de empezar cualquier fase, entiende estos 3 conceptos.**

---

## 1. "Cables, No Señales"

### Analogía

```
Sistema = Casa con electricidad

CABLES (lo que mapeamos):
- Interruptor → Foco (existe conexión)
- Enchufe → Nevera (existe conexión)
- Caja de breakers → Todo

SEÑALES (lo que NO mapeamos):
- ¿Cuántos volts pasan? (el valor)
- ¿Es corriente AC o DC? (el tipo)
- ¿Cuánto consume la nevera? (métricas runtime)
```

### En código

```javascript
// Sabemos QUE existe el cable:
userData → validateUser → saveUser → response

// NO sabemos (y NO nos importa):
- userData.name = "Juan" o "María"
- ¿Es válido el email?
- ¿Existe en la BD?
```

### Ventaja

Con este enfoque pasamos de **0% a 97% cobertura**:

| Caso | Cobertura Cables | Por qué funciona |
|------|------------------|------------------|
| eval() | ~90% | Cable: entrada→eval→salida. Interno opaco, conexión mapeada |
| User input | ~95% | Cable completo mapeado. Valor irrelevante |
| Third-party | ~80% | Cable + catálogo de firmas conocidas |
| Async/Race | ~75% | Todos los orderings posibles |

### Señales de Prueba (Test Probes)

> **Nota**: Aunque el enfoque es "cables", podemos **inyectar señales de prueba** para verificar la salud del cable.

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

### El Patrón

Cada nivel usa EXACTAMENTE la misma estructura:

```
A (Entrada) → B (Transformación) → C (Salida)
```

### Aplicado a cada nivel

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

### Cuándo sí usamos LLM

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

### Beneficio

- **Velocidad**: Análisis en milisegundos, no segundos
- **Costo**: Sin llamadas a API para 95% del código
- **Reproducibilidad**: Mismo código = mismo resultado siempre
- **Escalabilidad**: Funciona offline, sin rate limits

---

## Resumen Visual

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

**Siguiente paso**: [→ Fase 1: Data Flow Atómico](./01_FASE_ATOMO.md)

