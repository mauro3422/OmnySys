# OmnySys - Fundamentos

**Versión**: v0.9.4  
**Estado**: Documentación consolidada  
**Última actualización**: 2026-02-12

---

## 🎯 Qué es OmnySys

OmnySys es un **sistema de física del software** que modela cómo fluye la información a través de un programa, desde el nivel macro (arquitectura) hasta el nivel cuántico (transformaciones de datos individuales).

**Principio fundamental**: *"El software es un sistema físico observable. Al igual que la física modela partículas y fuerzas, OmnySys modela funciones y flujos de datos."*

**Meta final**: **Omnisciencia** = conciencia completa del contexto, dependencias, impacto y flujo de datos a través del reconocimiento de patrones estructurales (similar a la intuición humana).

---

## 📚 Documentos en esta Sección

### 1. [problem.md](./problem.md) - El Problema: Visión de Túnel
Por qué las IAs causan bugs colaterales al editar código:

- **El síntoma**: Bugs recurrentes en modificaciones complejas
- **Las causas**: Límite de contexto + conexiones implícitas invisibles
- **El dilema**: Archivos grandes (no funcionan) vs pequeños (no se ven conexiones)

**Cuándo leer**: Primero. Para entender por qué OmnySys existe.

---

### 2. [principles.md](./principles.md) - Los 4 Pilares
Los principios fundamentales que guían todo el desarrollo:

| Pilar | Concepto Clave |
|-------|----------------|
| **Box Test** | Un arquetipo debe revelar CONEXIONES invisibles entre archivos |
| **Metadata Insights** | Combinar metadata para descubrir patrones emergentes |
| **Atomic Composition** | Los archivos (moléculas) se componen de funciones (átomos) |
| **Fractal A→B→C** | El mismo patrón se repite en todas las escalas |

**Cuándo leer**: Antes de contribuir código, agregar extractores o crear arquetipos.

---

### 2. [philosophy.md](./philosophy.md) - Física del Software + Omnisciencia
La visión filosófica y científica del sistema:

- **Metáfora física**: Cajas → Átomos → Electrones
- **Evolución**: v0.5 (Box Test) → v0.6 (Molecular) → v0.7 (Data Flow)
- **Intuición Artificial**: Pattern recognition sin razonamiento explícito
- **Zero LLM**: 97% análisis determinístico, 3% IA

**Cuándo leer**: Para entender el "por qué" detrás del diseño.

---

## 🗺️ Mapa Conceptual

```
FUNDAMENTOS (01-core/)
    │
    ├── problem.md ─────────┐
    │   Visión de Túnel     │
    │                       │
    ├── principles.md ──────┤
    │   Los 4 Pilares       │
    │   • Box Test          │
    │   • Metadata Insights │
    │   • Atomic Comp       │
    │   • Fractal A→B→C     │
    │                       │
    └── philosophy.md ──────┘
        Visión Física + AGI
        • Cajas → Átomos → Electrones
        • Intuición Artificial
        • Zero LLM
                │
                ▼
    ARQUITECTURA (02-architecture/)
        • Data Flow Fractal
        • Arquetipos
        • Shadow Registry
        • Ecosistema
                │
                ▼
    ORCHESTRATOR (03-orchestrator/)
        • Flujo de vida de archivos
        • Sistema de caché
        • Colas y workers
                │
                ▼
    GUÍAS (04-guides/)
        • Cómo usar las tools
        • Desarrollo
        • Setup
```

---

## 🧬 La Evolución en 3 Niveles

### v0.5 - Cajas con Cables (Arquetipos)
Cada archivo es una caja. Al levantarla, ves cables que la conectan con otras cajas.

**Qué revela**: God-objects, orphans, conexiones entre archivos.

### v0.6 - Dentro de la Caja (Arquitectura Molecular)
Dentro de cada caja hay átomos (funciones) que se conectan entre sí.

**Qué revela**: God-functions, dead code, call graphs internos.

### v0.7 - Electrones Orbitando (Data Flow Fractal)
Dentro de cada átomo, los datos fluyen como electrones: entran, se transforman, salen.

**Qué revela**: Cómo viaja un dato, transformaciones, race conditions, simulación de impacto.

---

## ⚡ Reglas de Oro

1. **Focus on connections, not attributes** → Box Test
2. **Maximize insights from existing data** → Metadata Verification
3. **Scale gracefully** → Atomic Composition
4. **Apply consistently at all levels** → Fractal Architecture
5. **97% deterministic, 3% AI** → Zero LLM

---

## 🎓 Para Quién es esta Documentación

| Perfil | Documento prioritario |
|--------|----------------------|
| **Nuevo contribuidor** | problem.md → principles.md → philosophy.md |
| **Arquitecto evaluando el sistema** | philosophy.md → principles.md |
| **Desarrollador agregando features** | principles.md (sección Application Guidelines) |
| **Investigador AI/ML** | philosophy.md (sección Artificial Intuition) |

---

## 🔗 Referencias Rápidas

### Documentos Relacionados
- [Arquitectura de 3 Capas](../architecture/ARCHITECTURE_LAYER_A_B.md) - Implementación técnica
- [Sistema de Arquetipos](../architecture/ARCHETYPE_SYSTEM.md) - Catálogo completo
- [Data Flow Fractal](../architecture/DATA_FLOW.md) - Extracción de flujo de datos

### Código Fuente Clave
- `src/layer-a-static/` - Extracción estática (Pilar 3-4)
- `src/layer-b-semantic/` - Detección de arquetipos (Pilar 1-2)
- `src/layer-c-memory/` - Sistema de memoria y queries

---

## 📝 Notas para Mantenedores

Si modificas los fundamentos del sistema:
1. Actualizar este README
2. Actualizar principles.md (si cambian los pilares)
3. Actualizar philosophy.md (si cambia la visión)
4. Propagar cambios a documentación técnica en 02-architecture/

---

**Siguiente paso**: Lee [problem.md](./problem.md) para entender el problema que resuelve OmnySys, luego [principles.md](./principles.md) para los 4 pilares.
