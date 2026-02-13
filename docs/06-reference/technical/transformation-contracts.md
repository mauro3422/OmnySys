# Transformation Contracts

---

## ✅ PARCIALMENTE IMPLEMENTADO en v0.7.1

**Status**: 🟡 Parcialmente implementado (70% completo)
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Alta (habilita Virtual Flow Simulation y modelo de prediccion)

---

## 📋 Implementación Actual

### Type Contracts Extractor

**Ubicación**: `src/layer-a-static/extractors/metadata/type-contracts.js`

Este extractor implementa la **primera parte** del sistema de contratos de transformación: extracción y validación de tipos desde JSDoc y código.

**Características implementadas**:

```javascript
// Extracción de metadata de type contracts
{
  jsdoc: {
    hasJSDoc: true,
    valid: true,
    paramTypes: [
      { name: 'userId', type: 'string', required: true },
      { name: 'options', type: 'Object', required: false }
    ],
    returnType: { type: 'Promise<User>', nullable: false },
    throws: ['ValidationError', 'NotFoundError']
  },
  runtime: {
    hasTypeGuards: true,          // typeof, instanceof checks
    hasValidation: true,           // joi, yup, zod
    validationType: 'zod'
  },
  compatibility: {
    score: 0.95,                   // JSDoc ↔ Runtime agreement
    issues: []
  }
}
```

**Integrado en**:
- `atom-extraction-phase.js` → Campo `atom.typeContracts`
- Connection Enricher → Validación de compatibilidad de tipos entre conexiones
- Metadata Enhancer → Detección de breaking changes

### Pendiente de Implementación

**Runtime Contract Validation** (30% restante):
- ❌ Validación en tiempo de ejecución (auto-instrumentación)
- ❌ Generación automática de type guards
- ❌ Enforcement de contratos en development mode

**Roadmap**: Completar en v0.7.2-0.8.0

---

## 📚 Concepto Original (Diseño)

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
