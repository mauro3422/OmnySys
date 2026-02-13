# 🧪 Omny AGI - Arquitectura de Conocimiento Estructurado

**⚠️ ADVERTENCIA: ESTE DOCUMENTO ES UNA HIPÓTESIS/ESPECULACIÓN**

> **Estado**: Visión a largo plazo | **Confianza**: Experimental | **Prioridad**: Baja
> 
> Este documento describe una visión ambiciosa y especulativa sobre cómo podría evolucionar OmnySys hacia un sistema de "Inteligencia Especializada Transparente". NO es el core funcional actual.
> 
> **Para el sistema práctico actual, ver**: [01-core/](../01-core/)

---

## Resumen Ejecutivo (TL;DR)

**La hipótesis central**: En lugar de usar LLMs gigantes (175B parámetros) que memorizan todo, podemos usar:
1. **Sistema de conocimiento estructurado** (Omny) - guarda metadatos, patrones, grafos
2. **LLM pequeño** (3B-7B parámetros) - solo verbaliza lo que el sistema le provee

**Analogía**: Un médico no memoriza todas las enfermedades, pero sabe consultar la base de datos médica y razonar sobre los resultados.

---

## La Arquitectura Propuesta

### Separación de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│  SISTEMA DE CONOCIMIENTO ESTRUCTURADO (Omny)                │
│  ───────────────────────────────────────────                │
│  Función: Intuición rápida, memoria estructurada, patrones │
│                                                             │
│  • Átomos (unidades de conocimiento)                        │
│  • Grafos de relaciones (cómo se conectan)                  │
│  • Clusters de patrones (qué es normal/anómalo)            │
│  • Invariantes (reglas que nunca se rompen)                │
│                                                             │
│  Velocidad: 0.1-1ms (cache)                                 │
│  Precisión: 100% (determinístico)                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Consulta estructurada
               ▼
┌─────────────────────────────────────────────────────────────┐
│  INTERFAZ DE LENGUAJE (LLM pequeño)                         │
│  ─────────────────────────────────                          │
│  Función: Verbalizar, razonar, generar respuestas          │
│                                                             │
│  • Modelo base (3B-7B parámetros)                          │
│  • No memoriza dominio específico                          │
│  • Recibe contexto estructurado de Omny                    │
│                                                             │
│  Velocidad: 50-100ms                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Comparación con Arquitecturas Existentes

| Arquitectura | Problema | Nuestra Propuesta |
|--------------|----------|-------------------|
| **LLM Monolítico** (GPT-4, Claude) | 175B params, caja negra, olvida contexto específico | LLM pequeño + conocimiento estructurado |
| **MoE** (Mixture of Experts) | Múltiples modelos grandes, complejo de entrenar | Un solo LLM pequeño, conocimiento externo |
| **RAG Tradicional** | Recupera texto, no entiende relaciones causales | Recupera estructura + causalidad |

---

## Componentes de la Hipótesis

### 1. Capa de Conocimiento (Omny Core)

```javascript
// Átomo de conocimiento
Atom = {
  id: "src/api.js::processOrder",
  tipo: "función",
  
  // Estructura
  entradas: ["order", "userId"],
  transformaciones: [
    { op: "validate", input: "order", output: "validOrder" },
    { op: "calculate", input: "validOrder.items", output: "total" },
  ],
  salidas: ["confirmation"],
  
  // Relaciones (grafo)
  llamaA: ["validateOrder", "saveToDB"],
  llamadoPor: ["handleRequest"],
}
```

### 2. Consultas Estructurales (RAG 3.0)

```javascript
// NO es: "Buscá texto similar"
// ES: "Respondé preguntas estructurales"

consulta("¿Qué pasa si modifico processOrder.totalCalculation?")
↓
Respuesta estructurada:
{
  impacto: "8 funciones afectadas",
  riesgo: "Alto - rompe invariante",
  sugerencia: "Actualizar también calculateTax",
  confianza: 0.95
}
↓
LLM verbaliza: "Si modificás el cálculo de total..."
```

---

## Ventajas Propuestas

### 1. Eficiencia Energética (Teórica)

```
LLM tradicional (175B):  100% energía
Omny + LLM pequeño (7B):   4% energía (24x más eficiente)
```

### 2. Transparencia Total

```javascript
// LLM tradicional:
"¿Por qué sugeriste esto?" → "No sé, así lo aprendí"

// Omny (hipotético):
"¿Por qué sugeriste esto?" → "Porque:
   1. 8 funciones similares hacen X (evidencia)
   2. Tu patrón histórico es Y (consistencia)
   3. Romper Z causa error W (causalidad)"
```

### 3. Especialización Sin Reentrenamiento

Para cambiar de dominio (código → leyes → medicina):
- **NO**: Reentrenar modelo gigante
- **SÍ**: Cambiar la estructura de conocimiento externa

---

## ¿Es esto AGI?

**Respuesta honesta: No.**

| Característica | AGI Teórica | Omny (Propuesta) |
|----------------|-------------|------------------|
| Generalidad universal | ✅ Todo | ❌ Dominios específicos |
| Conciencia de sí | ✅ Sí | ❌ No |
| Aprendizaje autónomo | ✅ Sí | 🔧 Con asistencia |
| Eficiencia energética | ❌ Baja | ✅ Alta |
| Transparencia | ❌ Caja negra | ✅ Total |
| Especialización profunda | 🔧 Media | ✅ Extrema |

**Omny no sería AGI. Sería "Inteligencia Especializada Transparente y Eficiente" (IETE).**

---

## Roadmap Especulativo

### Fase 1: Sistema de Conocimiento (Teórica)
- Parser AST exhaustivo
- Data flow analysis
- Clustering de patrones
- Graph database

### Fase 2: Integración con LLM (Teórica)
- Setup LLM local (3B-7B)
- Prompt engineering con contexto Omny
- Plugin IDE

### Fase 3: Evolución (Muy Teórica)
- File watcher para cambios
- "Sueño": consolidación offline
- Detección de nuevos patrones

---

## Por Qué Esto es Especulativo

⚠️ **Advertencias importantes:**

1. **No está implementado**: Esto es visión, no código funcional
2. **Requiere LLMs locales**: Que funcionen bien con contexto estructurado
3. **Problemas sin resolver**: 
   - Cómo representar todo conocimiento como "átomos"
   - Cómo hacer consultas estructurales en <10ms
   - Cómo mantener el grafo actualizado en tiempo real
4. **Podría no funcionar**: Es una hipótesis, no una garantía

---

## Conclusión

**El descubrimiento real (si funciona):**

No necesitamos LLMs gigantes que memoricen todo.
Necesitamos:
1. **Sistemas de conocimiento estructurado** que organicen información
2. **LLMs pequeños** que sepan consultar esos sistemas
3. **Integración eficiente** entre ambos

**Es la diferencia entre:**
- **Memorizar todo** (ineficiente, imposible)
- **Saber dónde buscar** (eficiente, escalable)

---

**Documento fuente**: `OMNY_AGI_ARQUITECTURA.md`  
**Fecha**: 2026-02-09  
**Estado**: 🧪 Hipótesis / Visión futura  
**Para el sistema real**: Ver [docs/01-core/](../01-core/)
