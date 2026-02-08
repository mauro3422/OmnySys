# Virtual Flow Simulation (Ejecucion Simbolica)

**Status**: Idea / No implementado
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Alta (siguiente nivel de determinismo)

---

## Concepto

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
