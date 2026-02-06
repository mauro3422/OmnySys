# AI Consolidation Mode (Orchestrator)

Documento canonico del comando `omnysys consolidate`.

## Objetivo
Consolidar el analisis semantico con LLM a partir de la base estatica. El resultado final agrega `llmInsights` por archivo y genera `semantic-issues.json`.

## Diagrama
```text
Layer A (.omnysysdata/)
   |
   v
Orchestrator
   - detecta arquetipos
   - cola de prioridad
   - LLM workers
   - iteraciones
   - issues
   |
   v
llmInsights + semantic-issues.json
```

## Flujo Canonico
1. Verificar analisis estatico (`.omnysysdata/`).
2. Inicializar Orchestrator.
3. Detectar arquetipos segun metadatos.
4. Encolar archivos con prioridad.
5. Ejecutar LLM en workers paralelos.
6. Ejecutar modo iterativo hasta convergencia.
7. Detectar issues semanticos.
8. Guardar resultados en `.omnysysdata/`.

## Entradas
- `.omnysysdata/index.json`
- `.omnysysdata/files/**`
- Metadata y conexiones estaticas

## Salidas
- `llmInsights` en archivos analizados
- `.omnysysdata/semantic-issues.json`

Ultima actualizacion: 2026-02-05

**Estado De Implementacion**
- Contrato: Define el comportamiento esperado.
- Realidad: Puede estar parcial. Validar con `omnysys consolidate`.
- Prioridad: Alinear codigo con este documento.
