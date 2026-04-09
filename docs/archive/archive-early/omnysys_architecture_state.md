# OmnySys Architectural Documentation & Current State (Mar 2026)

Este documento detalla el estado arquitectónico de OmnySys, específicamente la "Layer A" (Análisis Estático), cómo interactúa con Tree-sitter, la base de datos (SQLite), el manejo de la memoria y la historia/estado de la paralelizacion.

## 1. Core Architecture: Layers

OMNYSYS está compuesto por capas especializadas:

*   **Layer A (Static):** Se encarga de leer archivos, parsear el Abstract Syntax Tree (AST) de cada archivo usando la librería nativa `tree-sitter` (C++ via bindings a Node) y extraer hasta 28 métricas (complejidad, flujo de datos, tipos de retorno, accesos a estado global).
*   **Layer B (Graph):** Interconecta los "átomos" (funciones) extraídos por la Capa A. Arma el `callGraph` verificando quién llama a quién, y detecta qué exportaciones se cruzan entre archivos.
*   **Layer C (Memory):** Contiene la Base de Datos SQLite, donde la "verdad" del proyecto finalmente reside. Es el sistema central de almacenamiento unificado.

## 2. El Pipeline de Análisis (Layer A)

El pipeline de extracción y análisis está diseñado en fases estrictas. Recientemente fue optimizado en el **True Turbo Mode** que unificó las antiguas Fases 4 y 5 en un solo pase de O(1).

### Flow del Pipeline

1.  **File Scan:** Descubre todos los archivos del proyecto (p. ej., `2067 archivos`).
2.  **Unified Analysis (Phase 4):**
    *   Fase O(1) masiva que procesa cada archivo de a bloques (actualmente de 60 en 60 usando promesas concurrentes).
    *   **Turbo Mode:** Lee el archivo y saca un hash (SHA-256). Si el hash coincide con uno en SQLite y el archivo existe (`hashed_by_json`), salta el parseo.
    *   **Parseo:** Si el archivo es nuevo o cambió, `parser-pool.js` se encarga de entregar un parser de Tree-sitter. Pasa el código entero y devuelve un AST gigante en C++.
    *   **Atomización:** Por cada función (`function_declaration`, `arrow_function`, método), se corta el string del código fuente y se pasa con su mini-AST a docenas de detectores semánticos en `src/layer-a-static/extractors/metadata`.
    *   **Persistencia (Batching):** Guarda los resultados de la información de los átomos (`Atom`) directamente a SQLite utilizando guardado en bulk (transacciones masivas usando un JSON temporal) en chunks de 60 archivos.
3.  **Build Links (Phase 6):** Lee los átomos y arma grafos locales y cros-archivos cruzando Regex compilados de forma global.

### Metadatos Extraídos por Átomo
Cada función en el proyecto es transformada a un objeto gigante que dice todo lo que hay que saber sin tener que preguntarle a un LLM:
*   Datos puros (`linesOfCode`, `complexity`).
*   Data Flow V2 (cuántos condicionales, mutaciones, `this.context`, etc.).
*   Tree-sitter Integration (`event-detector`, `state-parser` donde miramos accesos directos al closure de forma estricta).
*   Architype / Purpose (`Helper`, `Controller`, `Data Access`).

## 3. Optimizaciones Críticas Implementadas

Durante las últimas sesiones, el pipeline colapsaba con archivos masivos crasheando por "Out of Memory" (~2GB) y tiempos de ejecución de ~300 segundos, principalmente en Windows y proyectos grandes (2000+ archivos). 

### a) Zero-Allocation TreeCursor (El Agujero Negro)
**Problema:** En detectores de la Fase 9 y Tree-sitter Integration, los recorridos recursivos se hacían con `for (const child of node.namedChildren)`. Cada vez que esta propiedad era invocada, los bindings de Node rebanaban el árbol C/C++ y creaban un gran Array alojando millones de envolventes inútiles en JavaScript. Causaba estragos masivos de recolección de basura (GC).
**Solución:** Pasamos a emplear cursores ligeros **nativo `TreeCursor`** (`node.walk()`) y leemos `.nodeType`. Solo invocamos `cursor.currentNode` explícitamente cuando encontramos justo el nodo que buscamos (`call_expression`, `function`, `member_expression`).
**Impacto:** El pipeline pasó de 300+ segundos a **solo ~3.8 segundos en la Fase Extensiva**, analizando 2000 archivos usando apenas ~260MB de memoria en el pico.

### b) Database Transaction Batching
Para evitar ralentizaciones por locks en el I/O de SQLite (y evitar cuellos de botella FS en Windows Sync IO), configuramos que `unified-analysis.js` agrupara guardados en lotes `saveManyBulk`. La base de datos asimila 60 archivos y casi ~3000 átomos a la vez por transacción rápida y atómica usando un temporal `json_tree`.

### c) RegExp Pools Caching
En `variable-linker.js` y `js-analyzer.js` los motores de expresiones regulares se recompilaban por cada pasada de un ciclo for en 18,000 átomos de función. Ahora estas macros son globales. 

---

## 4. El Estado de la "Paralelización" (Threads vs. Concurrency)

Observaste justamente que el sistema _parecía_ paralelizado antes. Esto es lo que se detectó tras examinar la historia y el código base:

1.  **¿Están usando Node.js Worker Threads o multi-núcleo hoy?**
    **No.** Al buscar `worker_threads` o `workerpool` a través de toda la rama principal, se observa que no existe clusterizado a nivel CPU para el Layer A.
    Hay indicios en los logs viejos de git de que el sistema fue víctima de un _"massive refactoring of 5 monolithic files into 56 specialized modules"_. Durante esta reescritura, y la migración a Base de Datos en Memoria y SQLite crudo, el multi-thread pudo haberse abandonado a favor de concurrencia base (que tiene sentido en Node.js, ya que la concurrencia JS asíncrona usando promesas no bloquea el hilo cuando habla con la I/O).

2.  **¿Cómo funciona la paralelización "Single-Threaded" actual?**
    Actualmente usa exclusividad concurrente usando `p-map` u `Promise.all` manejados con un Límite de Concurrencia duro (`CONCURRENCY_LIMIT = 60`).
    Es decir: 60 archivos mandan comandos de parseo al motor asincrono a la vez, y una vez listos lo envían de a 60 en Batch al DB de SQLite.
    
    *Debido a la migración C++ de `web-tree-sitter` a `tree-sitter` (nativo binding directo de C a V8)*, un **sólo hilo Node ahora corre a velocidades bestiales (~132 funciones enteras evaluadas por segundo)**.

3.  **¿Por qué es malo agregar Worker Threads AHORA?**
    Aunque la Ley de Amdahl indica que multi CPU mejoraría los 140s de cold-start:
    * El puente RPC (IPC o compartir buffers) con Workers para enviar datos masivos entre núcleos consume altísimos recursos de `structuredClone()`, frecuentemente anulando la ganancia. 
    * El SQLite single thread file writer haría cuello de botella (Database locks: SQLITE_BUSY error).
    * Al ser muy veloz (menos de 4s a max velocidad si el SO lo permite en disco NVME), al hacer Hot-Reload usando la DB Hasheada saltamos de 140 segundos a milisegundos. Solo hay carga inicial.

## 5. Próximos Pasos Posibles

Si decides pasar este documento a un Agent Arquitecto IA de primer nivel para re-estructuras masivas, los siguientes enfoques estresarian aún más el rendimiento:
- `SharedArrayBuffer`: Transformar la matriz JSON central a binario para mandarla por Workers Threads nativos. 
- WAL Mode: Habilitar SQLite en modalidad Write-Ahead-Logging nativa y compilar con `-DSQLITE_THREADSAFE=1`.
- Sustitución de Regex: Remover las 5 capas que aún usan Text `RegExp` y delegarlas explícitamente al nativo TreeCursor.
