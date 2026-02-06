# Arquitectura Unificada - OmnySystem (Layer A + Orchestrator)

Documento canonico. Define la vision y el contrato del sistema. Si el codigo difiere, este documento marca el destino.

## Vision
Resolver la "vision de tunel" cuando una IA edita codigo modular. El sistema construye un mapa de dependencias y conexiones semanticas y lo expone via MCP para que la IA edite con contexto real.

Principios:
- Local primero. Todo corre offline.
- Layer A solo estatico. Orchestrator solo LLM.
- `.OmnySysData/` es la fuente de verdad.
- Iteraciones controladas hasta convergencia.

## Diagrama (alto nivel)
```text
Project Source
   |
   v
Layer A (Static Analysis)
   |
   v
.OmnySysData/ (index, files, connections, risks)
   |
   v
Orchestrator (LLM + iteraciones)
   |
   v
llmInsights + semantic-issues.json
   |
   v
MCP Server (tools)
```

## Capa A (src/layer-a-static)
Responsabilidad:
- Scanner, parser, resolver, grafo.
- Extractores estaticos y metadatos.
- Detectores y risk scoring.

Salida:
- `.OmnySysData/system-map.json`
- `.OmnySysData/system-map-enhanced.json`
- `.OmnySysData/index.json`
- `.OmnySysData/files/**`
- `.OmnySysData/connections/**`
- `.OmnySysData/risks/**`

Regla:
- No usa LLM. Todo es determinista.

## Orchestrator (src/core)
Responsabilidad:
- Lee metadatos y decide que archivos requieren LLM.
- Cola de prioridad (CRITICAL > HIGH > MEDIUM > LOW).
- Workers paralelos para LLM.
- Modo iterativo (refinamiento por confianza).
- Deteccion de issues semanticos.

Salida:
- `llmInsights` por archivo.
- `.OmnySysData/semantic-issues.json`.

Reglas:
- No re-extrae datos estaticos.
- No sobrescribe metadata estatica. Solo agrega `llmInsights`.

## MCP Server
Responsabilidad:
- Lee `.OmnySysData/`.
- Expone tools para la IA (impact map, risks, conexiones).

## CLI (contrato)
- `omnysystem analyze <project>` ejecuta Layer A.
- `omnysystem consolidate <project>` ejecuta Orchestrator.
- `omnysystem serve <project>` prepara analisis y expone MCP.

Ultima actualizacion: 2026-02-05

**Estado De Implementacion**
- Contrato: Define el comportamiento esperado.
- Realidad: Puede estar parcial. Validar con ejecuciones reales.
- Prioridad: Alinear codigo con este documento.
