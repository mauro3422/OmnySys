# Variable Standardization (Normalizacion Estructural)

**Status**: Idea / No implementado
**Origen**: Conversacion con Gemini (2026-02-08)
**Prioridad**: Media-Alta (necesario para entrenar modelos de prediccion)

---

## Concepto

Normalizar nombres de variables, funciones y eventos a formas genericas (`VAR_1`, `FUNC_1`, `EVENT_1`) para que un modelo de prediccion aprenda **patrones estructurales** independientes del naming humano.

## Por Que Funciona

Un sistema de autenticacion en Node.js y uno en Python tienen la **misma forma** de grafo:

```
Entrada → Validacion → Hash → Comparacion → Sesion
```

Si normalizamos:
```
FUNC_1(VAR_1) → FUNC_2(VAR_1) → FUNC_3(VAR_2) → FUNC_4(VAR_3) → ACTION_1(VAR_4)
```

El modelo aprende la "fisica" del patron sin depender de que el programador llamo a la funcion `loginUser` o `autenticarUsuario`.

## Implementacion Sugerida

1. Tomar los metadatos atomicos existentes
2. Reemplazar nombres por tokens genericos manteniendo la estructura
3. Preservar: tipos de conexion, arquetipos, complejidad, side effects
4. Generar pares `{estructura_normalizada} → {impacto_conocido}`
5. Usar estos pares para entrenar el Semantic Pattern Engine (Idea 21)

## Beneficios

- Prediccion cross-language (mismo patron en JS y Python)
- Modelos mas chicos pueden aprender patrones complejos
- Elimina sesgo de naming conventions
- Base para el "lenguaje intermedio" de OmnySys

## Conexion con Otras Ideas

- Alimenta el [Semantic Pattern Engine](../FUTURE_IDEAS.md) (Idea 21)
- Complementa [Semantic Intent Enrichment](SEMANTIC_INTENT_ENRICHMENT.md)
- Necesario para [Data Collection Strategy](DATA_COLLECTION_STRATEGY.md)
