---
?? **DOCUMENTO DE IDEAS / REFERENCIA**

Este documento contiene ideas exploratorias o material de referencia.
Para documentación actual, ver docs/01-core/, docs/04-guides/, o docs/05-roadmap/

---
# Semantic Intent Enrichment

**Status**: Idea / No implementado
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Media (mejora calidad de metadatos para prediccion)

---

## Concepto

Cambiar el rol del LLM: de **analista de codigo en tiempo real** a **generador de etiquetas semanticas una sola vez** durante el indexado.

En vez de pedirle al LLM que "entienda" una funcion cada vez que se consulta, se le pide UNA VEZ que etiquete el **business intent** del atomo. Ese metadato queda almacenado y nunca mas se necesita el LLM para esa funcion.

## Ejemplo

```javascript
// Durante indexado, el LLM analiza el atomo UNA vez:
{
  atomId: "auth/validateUser",
  // Metadatos estaticos (Layer A, Confidence 1.0):
  complexity: 12,
  hasSideEffects: true,
  calledBy: ["routes/login.js:handlePost"],

  // Metadatos de intent (Layer B, generados una vez por LLM):
  businessIntent: "auth_validation",
  logicPattern: "input_sanitization_then_verification",
  domainCategory: "security",
  riskLevel: "high"
}
```

## Beneficios

1. **Uso de LLM baja a ~0% en tiempo real**: Todo se pre-calcula durante indexado
2. **Modelos chicos heredan sabiduria**: Un modelo de 7B con metadatos de intent opera como uno de 70B
3. **Combustible para prediccion**: Los intent tags permiten al motor de prediccion aprender "siempre que hay `auth_validation` seguido de `state_synchronizer`, hay riesgo de..."
4. **Contratos de transformacion enriquecidos**: Saber "para que" sirve una funcion, no solo "que" hace

## Implementacion Sugerida

1. Crear prompt especializado para extraccion de intent (una pasada por atomo)
2. Almacenar en `.omnysysdata/atoms/` junto a metadatos estaticos
3. Invalidar solo cuando el atomo cambia (no en cada consulta)
4. Definir taxonomia de intents: `auth_*`, `data_*`, `ui_*`, `sync_*`, etc.

