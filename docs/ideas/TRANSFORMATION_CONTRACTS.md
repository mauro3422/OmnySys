# Transformation Contracts

**Status**: Idea / No implementado
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Alta (habilita Virtual Flow Simulation y modelo de prediccion)

---

## Concepto

Cada atomo (funcion) declara un **contrato de transformacion**: que tipo de dato entra y que tipo sale. No solo "tiene side effects", sino "recibe `UserRaw`, devuelve `UserValidated`".

## Ejemplo

```javascript
// Contrato de transformacion para el atomo validateUser
{
  atomId: "auth/validateUser",
  input: { type: "UserRaw", fields: ["email", "password"] },
  output: { type: "UserValidated", fields: ["id", "email", "token"] },
  sideEffects: ["localStorage.set('session')"],
  throws: ["InvalidCredentials"]
}
```

## Beneficios

1. **Trazabilidad matematica**: Si sabemos que el atomo A produce `UserValidated` y el atomo B consume `UserValidated`, la conexion es un hecho verificable (Confidence 1.0)
2. **Simulacion de flujo**: Podemos trazar el "viaje" de un dato a traves de multiples atomos sin ejecutar codigo
3. **Bypass total del LLM**: El sistema sabe como evoluciona el estado sin necesidad de razonar
4. **Combustible para prediccion**: Los contratos normalizados alimentan el motor de prediccion de patrones

## Implementacion Sugerida

1. Extender `metadata-contract` con campos `inputContract` y `outputContract`
2. Extraer tipos de JSDoc, TypeScript annotations, o inferencia de parametros
3. Para funciones sin tipos explicitos, usar analisis de flujo de datos existente
4. Almacenar en `.omnysysdata/atoms/{file}/{function}.json`

## Conexion con Otras Ideas

- Habilita [Virtual Flow Simulation](VIRTUAL_FLOW_SIMULATION.md)
- Alimenta [Variable Standardization](VARIABLE_STANDARDIZATION.md)
- Reduce aun mas la dependencia del LLM
