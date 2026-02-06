# Sistema de Arquetipos (Resumen)

Resumen corto. La guia completa esta en `ARCHETYPE_DEVELOPMENT_GUIDE.md`.

## Idea central
Los arquetipos definen tipos de analisis semantico por metadata. El Orchestrator selecciona el arquetipo mas relevante y genera prompts especificos.

## Diagrama
```text
Metadata -> PROMPT_REGISTRY -> Prompt Engine -> LLM -> llmInsights
```

Ultima actualizacion: 2026-02-05
