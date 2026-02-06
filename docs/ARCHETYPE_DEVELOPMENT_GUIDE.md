# Guia de Desarrollo - Sistema de Arquetipos

Esta guia define como agregar nuevos arquetipos al sistema de forma consistente.

## Diagrama
```text
Layer A (metadata)
   |
   v
PROMPT_REGISTRY
   |
   v
Prompt Engine
   |
   v
LLM -> llmInsights
```

## Pasos
1. Asegurar metadatos en Layer A.
2. Crear template en `prompt-templates/`.
3. Registrar en `PROMPT_REGISTRY.js`.
4. Agregar schema JSON si es necesario.
5. Validar con un caso de prueba.

## Reglas
- El detector usa metadata, no regex en el Orchestrator.
- El LLM devuelve JSON puro (sin wrappers).
- El merge no debe borrar datos estaticos.

Ultima actualizacion: 2026-02-05

**Estado De Implementacion**
- Contrato: Define el proceso esperado.
- Realidad: Puede estar parcial. Validar arquetipos en `PROMPT_REGISTRY`.
- Prioridad: Alinear codigo con este documento.
