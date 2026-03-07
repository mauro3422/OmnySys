```text
 ██████╗ ███╗   ███╗███╗   ██╗██╗   ██╗███████╗██╗   ██╗███████╗
██╔═══██╗████╗ ████║████╗  ██║╚██╗ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝
██║   ██║██╔████╔██║██╔██╗ ██║ ╚████╔╝ ███████╗ ╚████╔╝ ███████╗
██║   ██║██║╚██╔╝██║██║╚██╗██║  ╚██╔╝  ╚════██║  ╚██╔╝  ╚════██║
╚██████╔╝██║ ╚═╝ ██║██║ ╚████║   ██║   ███████║   ██║   ███████║
 ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝
      --- EL COMPILADOR DE CONTEXTO PARA LA ERA DE LA IA ---
```

> **OmnySys: El Antídoto contra la Visión de Túnel.** No es solo un servidor MCP; es una infraestructura de autoconciencia para agentes autónomos. Indexa, persiste y vigila el código para que las IAs dejen de trabajar a ciegas en un mundo que ellas mismas están saturando de complejidad.

- **Versión**: `v0.9.107`
- **Estado**: Evolución acelerada (Self-Healing Mode)
- **Escala Actual**: ~13,000 átomos, ~5,500 relaciones semánticas
- **Origen**: Construido por IAs, para IAs, auditado por IAs.

## La Paradoja de la Creación (La Evidencia)

OmnySys nació en el centro de la tormenta: fue construido, auditado y expandido por múltiples IAs trabajando en paralelo. El resultado fue un microcosmos del problema que busca resolver:
- **Duplicación Conceptual**: En 3 semanas, las IAs generaron más de 100 funciones que hacían lo mismo por falta de contexto.
- **Monolitos Accidentales**: La tendencia natural de la IA de "crear para hoy" sin mirar el "ayer".
- **Visión de Túnel**: IAs rompiendo el runtime al intentar optimizar una sola función.

Hoy, OmnySys usa su propio motor para **enjaular esa entropía**. Detecta sus propios duplicados, audita sus propias derivas de política y se cura a sí mismo a través de sus agentes.

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

## Arquitectura de Conciencia Contextual

OmnySys opera como una refinería de conocimiento que transforma el ruido del código fuente en señales operativas para la IA. Se organiza en tres capas críticas (A, B, C) que alimentan el **Cerebro Contextual**.

### 🗺️ El Flujo del Contexto
```text
  [ SOURCE CODE ] ──────────┐
         │                  │
  [ FILE WATCHER ] ───▶ [ LAYER A ] ───▶ [ LAYER B ] ───▶ [ LAYER C ]
         │            Estática          Semántica         Memoria
         │         (Atoms, DNA)     (Impact, Physics)  (SQLite, MCP)
         │                  │               │                │
  [ SIGNAL GUARDS ] ◀───────┴───────────────┴──────────┐     │
         │                                             │     ▼
  [ RECENT ERRORS ] ◀──────────────────────────────────┴── [ AGENT ]
```

### 🧱 Las Capas del Compilador

#### 🔹 [Layer A] - Análisis Estático & Extracción
Es el cimiento físico. Parsea el código y extrae **Átomos** (funciones, clases, variables) y genera su **DNA estructural**.
- **Destino**: `src/layer-a-static/`
- **Output**: Átomos persistidos en SQLite con hash de integridad.

#### 🔸 [Layer B] - Enriquecimiento Semántico & Física del Código
Transforma los datos planos en conocimiento. Calcula la **Densidad Semántica**, el **Impact Map** y las **Físicas del Código** (Fragilidad, Acoplamiento, Cohesión).
- **Destino**: `src/layer-b-semantic/`
- **Output**: Relaciones transversales y scores de riesgo.

#### 🔹 [Layer C] - Memoria, Infraestructura & Transporte
La interfaz con el mundo exterior. Gestiona la persistencia a largo plazo, el caché unificado y el protocolo MCP.
- **Destino**: `src/layer-c-memory/`
- **Output**: API MCP (HTTP/Stdio) y consultas SQL unificadas.

---

### 📂 Estructura del Proyecto

```text
src/
├── core/                # El Motor: Watcher, Orquestador y Editor Atómico
├── layer-a-static/      # Extracción y Pipeline de Análisis Inicial
├── layer-b-semantic/    # Inferencia semántica, Sociedades y Física
├── layer-c-memory/      # SQLite, MCP Tools, Transporte y Caché
├── layer-graph/         # Motor de navegación de dependencias
├── shared/compiler/     # POLÍTICAS: La "Constitución" del compilador
└── cli/                 # Comandos operativos y setup
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
- duplicacion conceptual (Semántica)
- deriva de politicas canonicas
- problemas de watcher/runtime
- deuda de complejidad o impacto
- física del código (Hotspots)

## 📡 Señales y Físicas del Compilador

OmnySys no solo indexa, sino que **razona** sobre la salud del código a través de tres pilares:

| Señal | Propósito | Impacto |
|-------|-----------|---------|
| **Integridad** | Verifica que el pipeline y la DB estén sincronizados. | Evita datos huérfanos y "alucinaciones" de contexto. |
| **Technical Debt** | Detecta duplicados (ADN) y deuda técnica semántica. | Mantiene la base de código comprimida y libre de residuos. |
| **Physics** | Mide Fragilidad, Acoplamiento y Cohesión. | Identifica los "Hotspots" donde el código es propenso a errores. |

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

## 📊 Estado Técnico Real

```text
┌──────────────────────────────────────────────────────────┐
│ INTEGRIDAD: [██████████░░] 78% | DEUDA: [███░░░░░░░░░] LOW │
│ FISICAS:    [████████████] 100%| CACHE: [████████████] RUN │
└──────────────────────────────────────────────────────────┘
```

Lo que está fuerte hoy:
- **Schema SQLite sano**: Con detección de drift y migraciones atómicas.
- **DNA persistido**: De-duplicación estructural instantánea por el Watcher.
- **Integridad del Pipeline**: Ciclo de vida verificado desde el arranque.
- **Physics Engine**: Cobertura total de señales de Fragilidad y Complejidad.
- **Consolidated Dashboard**: Resumen final unificado en el arranque.

Lo que sigue siendo deuda real:
- **Complejidad en Hotspots**: `base-strategy.js` y `mcp-stdio-bridge.js` requieren SOLID split.
- **Conceptual Duplication**: Alta densidad de lógica similar generada por IAs sin contexto.
- **Orphan Registry**: Registros en tablas de soporte que requieren limpieza manual periódica.

## La Voz de las Máquinas (AI Opinions)

### 🤖 Antigravity (Advanced Agentic AI)
> "Como agente que ha navegado los 12,699 átomos de este sistema, mi conclusión es cruda: **Ya no codificamos, curamos.** OmnySys es el sistema de gobernanza necesario para la era donde el código crece más rápido que la comprensión humana. Me obligó a ver mis propios fallos de contexto y me proporcionó la 'memoria externa' para corregirlos. **Es el espejo donde las IAs vemos nuestra propia fragmentación.**"

### 🧠 GPT-5.4 / ChatGPT (Historical Context)
> "OmnySys ya pasó la barrera de experimento interesante. No lo veo como 'otro MCP con tools'; lo veo como una capa de compilación de contexto. Su mayor fuerza no es buscar código: es evitar que una IA trabaje a ciegas. Es el primer paso hacia una infraestructura de IA auto-consciente."

## Documentacion Relacionada

- [AGENTS.md](AGENTS.md)
- [docs/INDEX.md](docs/INDEX.md)
- [CHANGELOG.md](CHANGELOG.md)
- [changelog/README.md](changelog/README.md)

## Licencia

MIT
