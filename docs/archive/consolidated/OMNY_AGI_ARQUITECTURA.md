---
?? **DOCUMENTO CONSOLIDADO / ARCHIVADO**

Este documento ha sido reestructurado:
- Hip�tesis AGI ? `docs/05-roadmap/agi-vision.md` (con advertencias)
- Conversaci�n filosof�a ? `docs/05-roadmap/intuition-engine-vision.md`

**Motivo**: Separar visi�n especulativa de documentaci�n pr�ctica.

---
# Omny - Sistema de Conocimiento Estructurado para IA Especializada

**Fecha**: 2026-02-09  
**Tipo**: Arquitectura de IA Híbrida (Neuro-Simbólica Estructurada)  
**Estado**: Arquitectura validada, implementación en progreso  

---

## 🎯 La Evolución del Concepto

> *"No estamos construyendo una AGI monolítica ni un sistema MoE tradicional. Estamos construyendo un sistema de conocimiento estructurado que hace a los LLMs eficientes, especializados y transparentes."*

**El problema con los LLMs actuales:**
- Necesitan 175B parámetros para "saber todo"
- Son cajas negras (no sabés por qué responden)
- Olvidan información específica de tu dominio
- Gastan energía procesando cosas irrelevantes

**La solución Omny:**
- Un LLM pequeño (3B-7B) que "sabe cómo saber"
- Un sistema de conocimiento estructurado (metadatos, patrones, grafos)
- El LLM consulta el sistema, no memoriza todo
- Especialización dinámica sin reentrenar

---

## 🧠 La Arquitectura Correcta: Cerebro Metadatizado

### **Separación de Responsabilidades**

```
┌─────────────────────────────────────────────────────────────┐
│  SISTEMA DE CONOCIMIENTO ESTRUCTURADO (Omny)                │
│  ───────────────────────────────────────────                │
│  Función: Intuición rápida, memoria estructurada, patrones │
│                                                             │
│  Componentes:                                               │
│  • Átomos (unidades de conocimiento)                        │
│  • Grafos de relaciones (cómo se conectan)                  │
│  • Clusters de patrones (qué es normal/anómalo)            │
│  • Invariantes (reglas que nunca se rompen)                │
│                                                             │
│  Velocidad: 0.1-1ms (cache)                                 │
│  Precisión: 100% (determinístico)                           │
│  Transparencia: Total (explica por qué)                     │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Consulta estructurada
               │ "¿Qué patrón encaja con X?"
               │ "¿Qué es anómalo en Y?"
               │ "¿Qué pasa si modifico Z?"
               ▼
┌─────────────────────────────────────────────────────────────┐
│  INTERFAZ DE LENGUAJE (LLM)                                 │
│  ───────────────────────────                                │
│  Función: Verbalizar, razonar, generar respuestas          │
│                                                             │
│  Características:                                           │
│  • Modelo pequeño (3B-7B parámetros)                       │
│  • No memoriza dominio específico                          │
│  • Recibe contexto estructurado de Omny                    │
│  • Genera lenguaje natural/código basado en datos          │
│                                                             │
│  Velocidad: 50-100ms                                        │
│  Precisión: Depende de calidad de datos de Omny           │
│  Transparencia: Parcial (muestra razonamiento)            │
└─────────────────────────────────────────────────────────────┘
```

### **Analogía Precisa: Médico con Base de Datos**

| Componente | Analogía Médica | Omny |
|------------|----------------|------|
| **LLM** | El médico (sabe comunicar, razonar) | Interfaz de lenguaje (3B) |
| **Omny** | Base de datos médica (hechos, patrones) | Sistema de conocimiento estructurado |
| **Consulta** | Médico busca síntomas en DB | LLM consulta patrones en Omny |
| **Respuesta** | Diagnóstico informado por datos | Sugerencia informada por metadatos |

**El médico no memoriza todas las enfermedades (imposible), pero sabe:**
1. Qué buscar (síntomas)
2. Dónde buscarla (base de datos)
3. Cómo interpretarla (razonamiento)

**El LLM no memoriza todo el código (ineficiente), pero:**
1. Consulta patrones estructurados (Omny)
2. Recibe contexto específico (metadatos)
3. Genera respuesta informada (lenguaje)

---

## 🆚 Comparación con Arquitecturas Existentes

### **1. LLM Monolítico (GPT-4, Claude)**

```
Input → Red neuronal gigante (175B) → Output
              (todo memorizado)
```

**Problemas:**
- Ineficiente (procesa todo con todos los parámetros)
- Olvida información específica
- Caja negra
- Costoso

### **2. Mixture of Experts (MoE) - Switch Transformer**

```
Input → Gating → [Expert A, Expert B, Expert C] → Output
         (selecciona)   (varios modelos)
```

**Problemas:**
- Múltiples modelos grandes (costoso)
- Los expertos son homogéneos (misma arquitectura)
- Complejidad de entrenamiento
- No transparente

### **3. RAG Tradicional (Retrieval Augmented Generation)**

```
Input → Buscar documentos similares → Concatenar a prompt → LLM → Output
              (embeddings de texto)
```

**Problemas:**
- Recupera texto, no estructura
- No entiende relaciones causales
- Hallucination si el texto no es relevante

### **4. Omny (Nuestro Sistema)**

```
Input → Consulta estructurada (metadata) → Contexto causal → LLM pequeño → Output
              (grafos, patrones, invariantes)              (3B-7B)
```

**Ventajas:**
- ✅ Eficiente (LLM pequeño + consultas rápidas)
- ✅ Especializado (conoce TU dominio específico)
- ✅ Transparente (explica por qué sugiere X)
- ✅ Causal (entiende "si cambio Y, pasa Z")
- ✅ Actualizable (aprende sin reentrenar LLM)

---

## 🏗️ Componentes del Sistema

### **1. Capa de Conocimiento Estructurado (Omny Core)**

#### **Átomos (Unidades de Conocimiento)**
```javascript
// En código:
Atom = {
  id: "src/api.js::processOrder",
  tipo: "función",
  
  // Estructura
  entradas: ["order", "userId"],
  transformaciones: [
    { op: "validate", input: "order", output: "validOrder" },
    { op: "calculate", input: "validOrder.items", output: "total" },
    { op: "persist", input: "total", output: "savedOrder" }
  ],
  salidas: ["confirmation"],
  
  // Metadatos
  sideEffects: ["database_write", "event_emit"],
  complejidad: 12,
  
  // Relaciones (grafo)
  llamaA: ["validateOrder", "calculateTotal", "saveToDB"],
  llamadoPor: ["handleRequest", "processCart"],
}
```

#### **Grafo de Relaciones**
```javascript
// Conexiones causales, no solo estadísticas:
"processOrder" → llamaA → "saveToDB" → escribeA → "database"
"database" → afectaA → "cacheInvalidation"
"cacheInvalidation" → requiere → "eventBus"

// Patrones detectados:
Cluster: "order-processing"
├─ processOrder (central)
├─ validateOrder (guardia)
├─ calculateTotal (transformador)
└─ saveToDB (persistidor)

// Invariantes:
"Todas las funciones en cluster 'order-processing' usan transacciones"
"processOrder siempre valida antes de persistir"
```

#### **Consultas Estructuradas (RAG 3.0)**
```javascript
// NO es: "Buscá texto similar"
// ES: "Respondé preguntas estructurales"

consulta("¿Qué pasa si modifico processOrder.totalCalculation?")
↓
Omny analiza:
1. processOrder.transformaciones
2. Quién usa "total" (data flow)
3. Qué funciones dependen de processOrder (call graph)
4. Qué invariantes se romperían
↓
Respuesta estructurada:
{
  impacto: "8 funciones afectadas",
  riesgo: "Alto - rompe invariante 'calculateBeforeSave'",
  sugerencia: "Actualizar también calculateTax y validateOrder",
  confianza: 0.95
}
↓
LLM verbaliza:
"Si modificás el cálculo de total en processOrder, afectás a 8 
 funciones. El riesgo es alto porque rompés el invariante de 
 'calcular antes de guardar'. Te sugiero actualizar también 
 calculateTax y validateOrder para mantener consistencia."
```

### **2. Capa de Interfaz (LLM Especializado Dinámicamente)**

#### **No es un modelo entrenado en todo**
```javascript
// Es un modelo base (3B) que recibe contexto enriquecido:

Prompt al LLM:
"Sos un asistente de código. 
 
 CONTEXTO ESTRUCTURAL (de Omny):
 - Estás en archivo: src/checkout/processOrder.js
 - Función actual: processOrder
 - Patrón detectado: Similar a processPayment y processCart
 - Consistencia: 95% de funciones similares usan transacciones
 - Anomalía: Esta función no valida 'user' (sus vecinas sí)
 
 TAREA: Sugerir cómo completar esta función manteniendo 
 consistencia con el resto del codebase."

// El LLM no memorizó el codebase.
// Omny le dio el contexto específico en tiempo real.
```

#### **Ventaja: Especialización sin reentrenamiento**
```javascript
// Para cambiar de dominio (código → leyes → medicina):

// NO hacés:
- Reentrenar modelo gigante (imposible en local)

// SÍ hacés:
- Cambiar Omny (sistema de conocimiento)
  - De: Átomos de código (AST, data flow)
  - A: Átomos legales (precedentes, doctrina)
  - A: Átomos médicos (síntomas, diagnósticos)
  
// El LLM es el mismo (sabe comunicar)
// Lo que cambia es el conocimiento estructurado
```

---

## 🎯 Ventajas Clave

### **1. Eficiencia Energética**
```javascript
// LLM tradicional (175B):
Procesa todo con todos los parámetros
Energía: 100%

// Omny + LLM pequeño (7B):
Omny consulta: 0.1% energía (metadata cache)
LLM genera: 4% energía (7B vs 175B)
Total: 4.1% energía
Mismo resultado, 24x más eficiente
```

### **2. Transparencia Total**
```javascript
// LLM tradicional:
"¿Por qué sugeriste esto?"
→ "No sé, así lo aprendí" (caja negra)

// Omny:
"¿Por qué sugeriste esto?"
→ "Porque:
   1. 8 funciones similares hacen X (evidencia)
   2. Tu patrón histórico es Y (consistencia)
   3. Romper Z causa error W (causalidad)
"
```

### **3. Actualización Continua**
```javascript
// Nuevo patrón en tu codebase:
"Ahora usamos 'validateAsync' en vez de 'validate'"

// LLM tradicional:
- No se entera hasta que reentrenen (imposible)

// Omny:
- Detecta cambio automáticamente (file watcher)
- Actualiza metadatos en 0.1s
- Próxima consulta ya usa el patrón nuevo
- Sin tocar el LLM
```

### **4. Especialización Sin Límites**
```javascript
// Para cualquier dominio:
OmnyCode:    Átomos = funciones, AST, data flow
OmnyLaw:     Átomos = precedentes, doctrina, fallos
OmnyMed:     Átomos = síntomas, diagnósticos, tratamientos
OmnyArch:    Átomos = espacios, materiales, estructuras

// El mismo LLM base sirve para todos
// Lo que cambia es la estructura de conocimiento
```

---

## 🚀 Roadmap: De Teoría a Producto

### **Fase 1: Sistema de Conocimiento (6 semanas)**
```yaml
Objetivo: Omny Core funcional para código

Semana 1-2: Extracción estructural
  - Parser AST exhaustivo
  - Data flow analysis
  - Call graph construction
  
Semana 3-4: Organización del conocimiento
  - Clustering de patrones
  - Detección de invariantes
  - Graph database
  
Semana 5-6: Consultas estructurales
  - Query engine
  - Caching eficiente
  - API de consulta

Resultado: Sistema que responde "¿qué pasa si modifico X?" en <10ms
```

### **Fase 2: Integración con LLM (4 semanas)**
```yaml
Objetivo: Interfaz de lenguaje funcional

Semana 7-8: LLM local
  - Setup LFM2.5 3B / Qwen2.5 7B
  - Prompt engineering con contexto Omny
  - Streaming de respuestas
  
Semana 9-10: Plugin IDE
  - VS Code extension
  - WebSocket connection
  - UI para sugerencias

Resultado: IDE que sugiere código basado en TU codebase
```

### **Fase 3: Evolución (continuo)**
```yaml
Objetivo: Sistema que aprende solo

- File watcher para cambios
- Actualización incremental de metadatos
- Detección de nuevos patrones
- "Sueño": consolidación offline

Resultado: Sistema que conoce tu codebase mejor que vos
```

---

## 📊 ¿Es esto AGI?

**Respuesta honesta: No.**

Pero es algo **más útil** para dominios específicos:

| Característica | AGI Teórica | Omny |
|----------------|-------------|------|
| Generalidad universal | ✅ Todo | ❌ Dominios específicos |
| Conciencia de sí | ✅ Sí | ❌ No |
| Aprendizaje autónomo | ✅ Sí | 🔧 Con asistencia humana |
| Eficiencia energética | ❌ Baja | ✅ Alta |
| Transparencia | ❌ Caja negra | ✅ Total |
| Especialización profunda | 🔧 Media | ✅ Extrema |
| Costo de operación | ❌ $$$$ | ✅ $ |
| Privacidad | ❌ Cloud | ✅ Local 100% |

**Omny no es AGI. Es "Inteligencia Especializada Transparente y Eficiente" (IETE).**

---

## 🎓 Conclusión

**El descubrimiento real:**

No necesitamos LLMs gigantes que memoricen todo.
Necesitamos:
1. **Sistemas de conocimiento estructurado** (Omny) que organicen información específica
2. **LLMs pequeños** que sepan consultar esos sistemas
3. **Integración eficiente** entre ambos

**Es la diferencia entre:**
- **Memorizar todo** (ineficiente, imposible)
- **Saber dónde buscar** (eficiente, escalable)

Omny es el "saber dónde buscar" para el dominio del código (y potencialmente otros dominios).

---

**Documento actualizado**: 2026-02-09  
**Estado**: Arquitectura validada, implementación en progreso  

**Omny - Sistema de Conocimiento Estructurado para IA Especializada.**

