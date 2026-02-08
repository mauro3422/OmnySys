# Modo Iterativo (Refinamiento)

El modo iterativo refina resultados del LLM con pasadas adicionales hasta convergencia.

## Diagrama
```text
Iteracion 1: LLM base
   |
   v
Detectar sugerencias con alta confianza
   |
   v
Re-analizar archivos seleccionados
   |
   v
Iteracion N hasta convergencia
```

## Reglas
- Se activa cuando la cola principal queda vacia.
- Solo re-analiza archivos con `suggestedConnections` de confianza >= umbral.
- No re-analiza archivos ya refinados en esa iteracion.
- Se detiene cuando no hay mejoras o se alcanza `maxIterations`.

## Parametros
- `confidenceThreshold` (default 0.9)
- `maxIterations` (default 10)

## Salida
- `llmInsights.iterationRefined = true` cuando un archivo fue refinado.
- Evento `analysis:complete` al terminar la consolidacion.

Ultima actualizacion: 2026-02-05

**Estado De Implementacion**
- Contrato: Define el comportamiento esperado.
- Realidad: Puede estar parcial. Validar con logs de iteraciones.
- Prioridad: Alinear codigo con este documento.
