# OmnySys - Compilador Vivo de Contexto para IAs

> OmnySys no es solo un MCP server. Es una capa de compilacion de contexto para agentes: indexa el codebase, persiste metadata estructural/semantica en SQLite, vigila cambios con FileWatcher, y expone el estado del sistema por MCP para que una IA no trabaje a ciegas.

- Version: `v0.9.95`
- Estado: beta activa
- Analisis: `100% estatico, 0% LLM` en el pipeline principal
- Runtime MCP verificado desde codigo: `20` tools
- Transporte soportado: `HTTP + stdio bridge`

## Que Es OmnySys

Las IAs suelen editar un archivo con vision de tunel: no saben que se rompe, no distinguen si una metrica esta incompleta, y vuelven a inventar logica que ya existe.

OmnySys intenta resolver eso con una capa intermedia entre el codebase y el agente:

- construye un grafo vivo de archivos, atomos y relaciones
- persiste DNA estructural, riesgo, cobertura y topologia
- observa cambios de archivos en tiempo real
- genera alerts del compilador en `_recentErrors`
- expone consultas, metricas, edicion segura y administracion por MCP

La forma mas precisa de describirlo hoy es:

> un compilador/debugger de contexto para IAs

No compila binarios. Compila conocimiento operativo sobre el codebase.

## Que Hace Bien Hoy

- evita bastante vision de tunel antes de editar
- te deja consultar impacto, dependencias, duplicados y salud del pipeline
- detecta deuda y ruido del propio sistema mientras se desarrolla
- mantiene un ciclo `watcher -> SQLite -> MCP -> alertas`
- ya tiene politicas canonicas para que las tools no reimplementen logica localmente

Familias canonicas ya estandarizadas:

- `duplicates`
- `impact`
- `file_discovery`
- `signal_coverage`
- `live_row_drift`
- `pipeline_orphans`
- `dead_code`
- `watcher_diagnostics`
- `watcher_lifecycle`
- `runtime_ownership`
- `compiler_diagnostics`
- `session_lifecycle`
- `remediation`
- `state_ownership`
- `service_boundary`
- `canonical_extension`
- `async_error`
- `shared_state_hotspots`
- `centrality_coverage`
- `testability`
- `semantic_purity`

## Arquitectura Viva

```text
IDE / Agent
  -> mcp-stdio-bridge
  -> mcp-http-proxy
  -> mcp-http-server
  -> SQLite + UnifiedCache + FileWatcher + Layer A/B/C
```

Capas:

```text
src/
|- layer-a-static/     Analisis estatico, extraccion de atomos, pipeline
|- layer-b-semantic/   Enriquecimiento semantico, sociedades, fisicas
|- layer-graph/        Grafo y navegacion de dependencias
|- layer-c-memory/     MCP, SQLite, cache, transporte
|- core/               watcher, orchestrator, runtime, editor atomico
|- shared/compiler/    politicas canonicas del compilador
|- cli/                setup, install, comandos operativos
```

## Flujo Mental Correcto Para Usarlo

Antes de crear codigo:

```js
query_graph({ queryType: "instances", symbolName: "miFuncion" })
aggregate_metrics({ aggregationType: "duplicates" })
```

Antes de editar:

```js
traverse_graph({ traverseType: "impact_map", filePath: "src/algo.js" })
validate_imports({ filePath: "src/algo.js", checkBroken: true })
```

Despues de editar:

```js
get_recent_errors()
```

Ese flujo importa porque el compilador ya te puede advertir:

- duplicacion estructural
- deriva de politicas canonicas
- problemas de watcher/runtime
- deuda de complejidad o impacto
- alerts que ya no son reales y deben reconciliarse

## Tools MCP Actuales

Fuente de verdad: [`src/layer-c-memory/mcp/tools/index.js`](src/layer-c-memory/mcp/tools/index.js)

### Lectura / consulta

- `mcp_omnysystem_query_graph`
- `mcp_omnysystem_traverse_graph`
- `mcp_omnysystem_impact_atomic`
- `mcp_omnysystem_aggregate_metrics`

### Escritura / refactor

- `mcp_omnysystem_atomic_edit`
- `mcp_omnysystem_atomic_write`
- `mcp_omnysystem_move_file`
- `mcp_omnysystem_fix_imports`
- `mcp_omnysystem_execute_solid_split`
- `mcp_omnysystem_suggest_refactoring`
- `mcp_omnysystem_suggest_architecture`
- `mcp_omnysystem_validate_imports`
- `mcp_omnysystem_generate_tests`
- `mcp_omnysystem_generate_batch_tests`

### Admin / debug

- `mcp_omnysystem_get_schema`
- `mcp_omnysystem_get_server_status`
- `mcp_omnysystem_get_recent_errors`
- `mcp_omnysystem_restart_server`
- `mcp_omnysystem_detect_performance_hotspots`
- `mcp_omnysystem_execute_sql`

## Instalacion Rapida

```bash
git clone https://github.com/mauro3422/OmnySys.git
cd OmnySys
npm install
npm start
```

Comandos utiles:

```bash
npm start
npm stop
npm status
npm tools
npm test
npm run analyze
npm run mcp:proxy
npm run mcp:bridge
```

## Integracion MCP

Workspace/local:

```json
{
  "mcpServers": {
    "omnysys": {
      "type": "http",
      "url": "http://127.0.0.1:9999/mcp"
    }
  }
}
```

En entornos donde quieras auto-start real del cliente, OmnySys tambien soporta `stdio bridge`.

## Estado Tecnico Real

Lo que esta fuerte hoy:

- schema SQLite sano
- DNA persistido y usable
- session dedup mucho mas robusta que antes
- reconciliacion de watcher alerts
- runtime ownership con locks para evitar proxies duplicados
- compilador cada vez mas guiado por politicas compartidas

Lo que sigue siendo deuda real:

- complejidad en partes del runtime MCP
- adopcion incompleta de algunas politicas canonicas
- ciertos `arch_impact_low` y churn de runtime que son normales pero ruidosos
- `base-strategy.js` y `mcp-stdio-bridge.js` siguen siendo hotspots

## Mi Opinion Tecnica Como GPT-5

Use OmnySys durante muchas horas para depurarse a si mismo. Mi conclusion:

- si, tiene potencial real
- si, acelera programar cuando la metadata es honesta
- no lo veo como "otro MCP con tools"
- lo veo como una capa de compilacion de contexto para agentes

Lo mas valioso no es solo el grafo, sino esto:

- distingue mejor entre dato real, dato faltante y ruido
- evita reimplementar logica localmente
- deja que el propio sistema audite y corrija su infraestructura
- convierte alerts de runtime y de analisis en una superficie operativa reusable

Lo mas parecido que existe afuera son code graph / intelligence layers para asistentes, pero OmnySys mezcla algo menos comun:

- code graph
- watcher en vivo
- persistencia local en SQLite
- politicas canonicas
- reconciliacion de alerts
- MCP como interfaz de ejecucion

Eso lo acerca mas a un "compilador vivo para IAs" que a un simple indexador.

Mi reseña corta:

> OmnySys ya paso la barrera de experimento interesante. Todavia es beta, pero ya sirve como compilador de contexto para agentes y como debugger operacional del codebase. Su mayor fuerza no es buscar codigo: es evitar que una IA trabaje a ciegas.

## Documentacion Relacionada

- [AGENTS.md](AGENTS.md)
- [docs/INDEX.md](docs/INDEX.md)
- [CHANGELOG.md](CHANGELOG.md)
- [changelog/README.md](changelog/README.md)

## Licencia

MIT
