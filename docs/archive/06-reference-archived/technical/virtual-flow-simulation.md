# Virtual Flow Simulation (Ejecucion Simbolica)

---

## 🔄 EN PROGRESO - Base implementada en v0.7.1

**Status**: 🟡 **PARCIALMENTE IMPLEMENTADO** (Base completa, simulación pendiente)
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Alta (siguiente nivel de determinismo)

---

## 📋 Implementación Actual

### Foundation: Data Flow v2 Graph Builder

**Ubicación**: `src/layer-a-static/extractors/data-flow-v2/core/graph-builder.js`

La **base para la simulación** está implementada: un grafo completo de transformaciones de datos con nodos y edges.

**Estructura del grafo implementada**:

```javascript
{
  nodes: Map {
    'n1' => {
      id: 'n1',
      type: 'INPUT',
      output: { name: 'userId', type: 'string' }
    },
    'n2' => {
      id: 'n2',
      type: 'TRANSFORM',
      category: 'read',
      standardToken: 'READ_FUNC',
      inputs: [{ name: 'userId', type: 'string' }],
      output: { name: 'user', type: 'User' }
    },
    'n3' => {
      id: 'n3',
      type: 'OUTPUT',
      input: { name: 'user', type: 'User' },
      destination: 'return'
    }
  },
  edges: [
    { from: 'n1', to: 'n2', type: 'data-flow', variable: 'userId' },
    { from: 'n2', to: 'n3', type: 'data-flow', variable: 'user' }
  ]
}
```

**Capacidades actuales**:
- ✅ Construcción de grafo completo de transformaciones
- ✅ Nodos tipados (INPUT, TRANSFORM, OUTPUT, SIDE_EFFECT)
- ✅ Edges con metadata (tipo de conexión, variable transportada)
- ✅ Detección de side effects y async operations
- ✅ Scope tracking para variables disponibles

### Pending: Simulation Engine

**Lo que falta** (30% restante):
- ❌ Walker que recorre el grafo simulando ejecución
- ❌ Estado virtual de variables en cada paso
- ❌ Detección de ciclos y dead code
- ❌ Predicción de outputs basado en inputs

**Roadmap**: Completar en v0.8.0 (Data Flow Fase 2)

---

## 📚 Concepto Original (Diseño)

Usar los metadatos existentes de OmnySys para **simular la ejecucion del codigo sin correrlo**. Trazar como una variable viaja a traves del grafo de atomos/moleculas para predecir que pasa cuando se activa una funcion.

## Analogia

Como los cables bajo el concreto de una casa: OmnySys es el plano electrico. La simulacion de flujo es "encender un interruptor" en el plano y ver que luces se prenden, sin tocar la casa real.

## Ejemplo

```
Input: "Que pasa si llamo a loginUser()?"

Simulacion:
  1. loginUser() → llama validateCredentials() [atomo auth/validate]
  2. validateCredentials() → escribe en localStorage('session') [side effect]
  3. localStorage('session') → leido por checkAuth() [atomo middleware/check]
  4. checkAuth() → emite evento 'auth:changed' [side effect]
  5. evento 'auth:changed' → escuchado por Dashboard.mount() [atomo ui/dashboard]

Resultado: "loginUser() activa una cascada que llega hasta Dashboard.mount()
           a traves de 3 moleculas y 2 tipos de conexion (state + event)"
```

## Implementacion Sugerida

1. Crear script que tome un atomo de entrada
2. Recorrer el grafo de `function-links.js` siguiendo los enlaces
3. En cada nodo, consultar `Transformation Contracts` para saber que dato sale
4. Construir la "linea de tiempo virtual" del flujo
5. Reportar el camino completo con tipos de conexion

## Prerequisitos

- [Transformation Contracts](TRANSFORMATION_CONTRACTS.md) implementados
- Grafo de llamadas (`get_call_graph`) funcionando
- Flujo de valores (`explain_value_flow`) funcionando

## Beneficios

- Fidelidad que ningun LLM puede alcanzar (es determinista, no probabilistico)
- Permite validar si un flujo es posible antes de ejecutar
- Funciona como un "debugger preventivo" para IAs
