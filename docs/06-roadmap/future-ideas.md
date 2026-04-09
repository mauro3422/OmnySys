# Ideas Futuras - Roadmap de Desarrollo

**Estado**: Lista de ideas para futuras versiones  
**Prioridad**: Variable (marcadas con ⭐)  
**Versión actual**: v0.7.1

---

## Ideas Implementadas ✅

### ✅ Explain Impact (v0.7.1)
Explicar **por qué** dos archivos están conectados, no solo que lo están.

**Tool**: `explain_connection` en `src/mcp/tools/explain-connection.js`

```javascript
const explanation = await explain_connection({
  sourceFile: 'src/auth/validateUser.js',
  targetFile: 'src/api/userController.js'
});
// Output: Path completo de conexiones con tipos y riesgo
```

### ✅ Detector de Anti-Patrones (v0.7.0)
Identificar race conditions y estado compartido sin protección.

**Sistema**: `src/layer-a-static/race-detector/`
- Write-Write (WW), Write-Read (WR), Read-Write (RW)
- 8 tipos de mitigaciones detectadas
- Severity scoring automático

---

## Ideas Prioritarias (P1)

### 1. Predicción de Impacto en Tests ⭐⭐⭐
Antes de editar un archivo, mostrar qué tests se verán afectados.

```
IA: "Voy a modificar CameraState.js"

OmnySys: "⚠️ Impacto estimado:
  - 12 tests directos en CameraState.test.js
  - 5 tests indirectos en Integration.test.js
  - 2 snapshots de UI probablemente cambiarán"
```

**Implementación**: Analizar archivos de test para ver qué importan, rastrear conexiones indirectas.

---

### 2. Análisis de Riesgo ⭐⭐⭐
Asignar "nivel de riesgo" basado en:
- Cuántos archivos dependen de él
- Frecuencia de cambios (git history)
- Historial de bugs

```
IA: "Voy a editar AuthService.js"

OmnySys: "🔴 ALTA CRITICIDAD
  - 23 archivos dependen de este módulo
  - Modificado 47 veces en el último mes
  - 3 bugs críticos relacionados"
```

---

### 3. Historial de Cambios Inteligente ⭐⭐
Aprender de modificaciones pasadas para mejorar predicciones.

```
IA: "Voy a modificar CameraState.js"

OmnySys: "📚 Historial:
  - Últimas 5 veces que modificaste CameraState.js,
    también actualizaste Minimap.js
  - Sugerencia: Revisar Minimap.js"
```

**Implementación**: Analizar git commits para detectar "co-change patterns".

---

### 4. Integración con CI/CD ⭐⭐
Ejecutar OmnySys en CI para validar PRs.

```yaml
# .github/workflows/omnysys-check.yml
name: OmnySys Check
on: pull_request
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: omny-sys analyze-pr
      - run: omny-sys check-risk
```

---

## Ideas Medias (P2)

### 5. Sugerencias Proactivas de Documentación
Si modificas una función pública, sugerir actualizar docs.

```
IA: "Cambié la firma de updateCamera(x, y) a updateCamera(position, zoom)"

OmnySys: "💡 Sugerencia:
  - Actualizar docs/API.md
  - Actualizar README.md
  - Actualizar JSDoc"
```

---

### 6. Detector de Código Muerto
Identificar archivos y funciones no usados.

```
OmnySys: "📊 Reporte semanal:
  - src/utils/OldHelper.js: No usado
  - function calculateLegacyFOV(): Llamada 0 veces
  - Sugerencia: Eliminar"
```

---

### 7. Visualización Interactiva del Grafo
Web UI para explorar dependencias visualmente.

**Stack**: D3.js o Cytoscape.js
**Features**:
- Nodos color por tipo (componente, util, service)
- Aristas color por tipo (import, event, state)
- Filtros dinámicos

---

### 8. Modo "Refactor Assistant"
Guiar refactorings complejos paso a paso.

```
Usuario: "Quiero renombrar updateCamera a updateCameraPosition"

OmnySys: "📋 Plan de Refactor:
  1. Renombrar definición en CameraState.js
  2. Actualizar 12 llamadas en RenderEngine.js
  3. Actualizar test mock en test/mocks.js
  4. Actualizar README.md
  ¿Proceder? [y/n]"
```

---

### 9. Plugin para IDEs
Extensión VS Code con warnings inline.

**Features**:
- Underline verde: "3 archivos dependen de esto"
- Hover muestra lista de dependientes
- Click para abrir archivo

---

## Ideas Avanzadas (P3)

### 10. Análisis Multi-Lenguaje
Extender a Python, Go, Rust.

**Desafío**: Language Adapters con interfaz común:
```javascript
interface LanguageAdapter {
  parse(file): AST;
  extractImports(ast): Import[];
  extractExports(ast): Export[];
}
```

---

### 11. Modo "Playground" para Testing
Simular cambios sin modificar código real.

```
Usuario: "¿Qué pasaría si elimino esta función?"

OmnySys: "7 archivos tendrían imports rotos:
  - src/api.js:42
  - src/utils.js:15
  ..."
```

---

### 12. Generación Automática de Tests
Generar stubs de tests al añadir funciones.

```
IA: "Añadí función calculateZoom()"

OmnySys: "💡 Test stub generado:
  - describe('calculateZoom')
  - it('should return correct zoom')
  - it('should handle edge case: zoom = 0')"
```

---

## Notas de Implementación

### Priorización
- **P0**: Bugs críticos, features core
- **P1**: Alto impacto, implementación clara
- **P2**: Buen valor, esfuerzo medio
- **P3**: Nice-to-have, esfuerzo alto

### Recursos Necesarios
| Idea | Tiempo estimado | Complejidad |
|------|-----------------|-------------|
| Predicción de Tests | 2-3 días | Media |
| Análisis de Riesgo | 1-2 días | Baja |
| Visualización Grafo | 1 semana | Alta |
| Multi-lenguaje | 2-3 semanas | Muy Alta |

---

## Referencias

- Documentos originales: `docs/future/FUTURE_IDEAS.md`
- Ideas expandidas: `docs/ideas/`
- Roadmap técnico: `ROADMAP.md` (raíz)

---

**Última actualización**: 2026-02-12

---

## Ideas de future/ (Integradas)

### NLP Orchestration
# NLP Orchestration: De Código a Intención

**Status**: Visión Futura
**Origen**: Charla de ideas 2026-02-12
**Concepto**: El fin del "Loro Probabilístico" en la programación.

## 🎯 El Problema de la IA Actual
Las IAs actuales (Copilot, Cursor, etc.) son **probabilísticas**. Predicen qué texto sigue a otro basándose en billones de ejemplos, pero no "entienden" por qué el código está ahí. 
*   **Halcucinación**: Inventan funciones que no existen.
*   **Visión de Túnel**: Cambian algo en A y rompen B porque no "sienten" la conexión.

## 🚀 La Solución: OmnySys como "Ancla"
Usar la **densidad de metadatos (Layer A)** y la **doc semántica (Layer B)** para crear un sistema de orquestación donde el código es solo una consecuencia de la intención.

### 1. El .md como Código Fuente Primario
En este futuro, el desarrollador no escribe código; escribe **Intenciones** en archivos `.md`:
```markdown
# Módulo de Validación de Pagos
- Debe verificar que el monto sea > 0.
- Debe llamar al servicio de Stripe.
- Si falla, debe loguear en el sistema de auditoría.
```

### 2. El Pipeline de Realidad
1.  **Intent Extraction**: OmnySys lee el `.md` y genera un **Embedding de Intención**.
2.  **Reality Mapping**: Cruza ese embedding con los 57 metadatos de los átomos existentes.
3.  **Gap Detection**: 
    - *"Tengo el átomo de Stripe y el de Auditoría, pero me falta la lógica de > 0"*.
4.  **Targeted Generation**: La IA genera **solo lo que falta**, anclada 100% a los metadatos reales del sistema.

## 🧠 Beneficios: Adiós al Loro
*   **Cero Alucinación**: La IA no puede inventar funciones porque OmnySys le pasa la lista exacta de "átomos reales" y sus contratos de metadatos.
*   **Desarrollo por Intento**: El usuario se dedica a pensar la arquitectura y las reglas de negocio en lenguaje natural.
*   **Mantenimiento Cognitivo**: Si el código "deriva" (se aleja de lo que dice el `.md`), OmnySys lo detecta instantáneamente porque el "ADN" del código ya no coincide con el "ADN" de la intención.

---
*"El código es efímero; la intención es eterna."*


### Technical Differentiators
# OmnySys: Diferenciadores Técnicos y Visión "Digital Life"

**Status**: Manifiesto Tecnológico / R&D
**Fecha**: 2026-02-12
**Concepto**: Evolución de OmnySys hacia un Sistema de Cognición Estructural.

## 1. De "Chat con Código" a "Cuerpo Digital"
A diferencia de las herramientas actuales (Cursor, Copilot, RAG tradicional), OmnySys no trata el código como texto plano, sino como un **organismo funcional**.

| Característica | IA Tradicional (Loro Proba.) | OmnySys (Vida Digital) |
|----------------|-----------------------------|------------------------|
| **Entrada**    | Tokens (Texto)              | Metadatos de ADN (Estructura) |
| **Visión**     | Ventana de Contexto (Tokens)| Grafo Infinito (Topología) |
| **Sensation**  | Ninguna                     | Propiocepción (Siente cambios) |
| **Razonamiento**| Probabilidad estadística    | Coherencia Estructural |

## 2. El MoE de Estructuras (OmnyCognition)
La visión final es un modelo **Mixture of Experts** donde los expertos no están divididos por "temas", sino por **Escalas Fractales**:
*   **Experto Atómico**: Entiende la lógica pura y el ADN de las funciones.
*   **Experto Molecular**: Entiende el acoplamiento y las relaciones de archivos.
*   **Experto de Sistema (Grafo)**: Entiende la navegación por coordenadas espaciales en el grafo de conocimiento.

## 3. Coordenadas de Grafo: El Mapa Sensorial
En lugar de buscar por palabras, el sistema se mueve en un **Sistema de Coordenadas Multidimensional**:
- **Eje X (Semántica)**: Cercanía por propósito (docs).
- **Eje Y (Topología)**: Cercanía por conexiones (callers).
- **Eje Z (Metrica)**: Cercanía por complejidad/riesgo.

Para un LLM integrado, una "alucinación" se convierte en una **"Desviación de Coordenadas"**. El sistema simplemente no puede proponer algo que no exista, porque su universo entero es el mapa de coordenadas de OmnySys.

## 4. ¿Qué es la Consciencia aquí?
En este ecosistema, la consciencia no es "sentir dolor", es **Perfecto Contexto Estructural**. 
*   **Input**: Un comando en lenguaje natural.
*   **Proceso**: El sistema siente la "vibración" en el grafo (Impact Map).
*   **Output**: Una modificación que mantiene la homeostasis (coherencia) del sistema.

*"No estamos programando una IA para que use el código; estamos dándole al código un cerebro para que se autogestione."*

