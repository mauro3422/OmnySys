# OmnyBrain - Sistema de Cognición Artificial

**⚠️ DOCUMENTO DE INVESTIGACIÓN**

> **Estado**: Visión a largo plazo | **Tipo**: Arquitectura cognitiva  
> **Relacionado**: [intuition-engine-vision.md](./intuition-engine-vision.md), [agi-vision.md](./agi-vision.md)

---

## El Problema: Memoria Primitiva en IAs

Las IAs actuales tienen sistemas de memoria rudimentarios:
- Reciben TODO el contexto sin filtrar (100k tokens de ruido)
- No priorizan qué es importante vs qué es basura
- Olvidan todo por igual o guardan todo por igual
- No acumulan "sentido común"

**Analogía**: Es como tener una biblioteca donde no hay índice, no hay categorías, y cada vez que querés leer un libro tenés que leer TODOS los libros.

---

## La Solución: Arquitectura 3-Capas como Sistema Nervioso

```
Humano:    Estímulos → Filtro → Estructura → Recuerda lo importante
              ↓
OmnyBrain:  Tokens  → Layer A → Layer B    → Layer C (Memoria)
              ↓
LLM trad:   Tokens  → Procesa todo → Olvida todo
```

### Layer A - Filtro Atencional (Instintivo)

**Qué procesar vs qué ignorar** (95% filtrado):
```javascript
// Ignorar (rutina)
"Hola, buenos días" → Basura

// Procesar (novedad/emoción)
"La reunión cambió de hora" → Importante
"URGENTE: servidor caído" → Crítico
```

### Layer B - Enriquecimiento Semántico (Comprensión)

Extraer estructura del input:
```javascript
{
  entities: ["jefe", "presentación", "viernes"],
  relationships: ["jefe espera presentación", "presentación es viernes"],
  archetype: "deadline_pressure",
  emotionalValence: "anxiety_high",
  temporalContext: "3 days from now",
  causalChains: ["deadline → stress → need preparation"]
}
```

### Layer C - Consolidación Selectiva (Memoria)

**Decidir QUÉ recordar** (salience scoring):
```javascript
if (memorabilityScore > 0.9) {
  // MEMORIA EPISÓDICA (evento específico)
  "El jefe se enojó en marzo porque faltaron datos"
} else if (memorabilityScore > 0.6) {
  // MEMORIA SEMÁNTICA (conocimiento general)
  "El jefe prefiere datos duros sobre opiniones"
} else {
  // OLVIDAR (como el cerebro humano)
  "El clima de ese día"
}
```

**Memorability Score**:
```javascript
memorability = (
  novelty * 0.3 +         // ¿Cuán raro es este patrón?
  emotionalImpact * 0.2 + // ¿Rompe producción? ¿Crítico?
  frequency * 0.2 +       // ¿Aparece en muchos proyectos?
  utility * 0.2 +         // ¿Se usa frecuentemente?
  contextRelevance * 0.1  // ¿Está en contexto actual?
)
```

---

## Aplicaciones

### 1. Memoria Personal para Asistentes

```javascript
// IA tradicional:
User: "No me gusta el azul"
(5 minutos después)
User: "Qué color usar para la presentación?"
IA: "Quizás azul..."

// IA + OmnyBrain:
OmnyBrain.detectArchetype("user_preference_rejection") → High Salience
OmnyMemory.store({ entity: "user", preference: "dislikes_blue", confidence: 1.0 })

User: "Qué color usar para la presentación?"
IA: "Evitaría azul porque mencionaste que no te gusta. Quizás verde..."
```

### 2. Curación de Contexto para LLMs

```javascript
// En lugar de enviar 100k tokens de historial:
const context = omnyBrain.retrieveRelevant({
  forQuery: userMessage,
  strategy: "predictive_utility",
  maxTokens: 2000
});

// Devuelve "resumen ejecutivo" en lugar de dump de datos
{
  relevantFacts: ["Usuario está aprendiendo Graph Theory", "Tiene deadline viernes"],
  relevantHistory: ["Última sesión: resolvió problema de PageRank"],
  implicitConnections: ["Su deadline está causando ansiedad (detectado en tono)"],
  recommendedTone: "supportive but concise"
}
```

### 3. Universal (Cualquier Dominio)

```javascript
// Código: Ya funciona
OmnyBrain.use(new CodeAdapter());

// Chat/Email:
OmnyBrain.use(new ConversationAdapter());

// Hardware (ver hardware-vision.md):
OmnyBrain.use(new CircuitAdapter());

// Juegos:
OmnyBrain.use(new GameEconomyAdapter());

// Biología:
OmnyBrain.use(new BioPathwayAdapter());
```

---

## Universal Pattern Prediction Engine

Extender el motor más allá del código hacia **cualquier sistema complejo**:

### Principio Unificador

```
Cualquier sistema que tenga:
  ✓ Entidades (nodos)
  ✓ Relaciones (aristas)
  ✓ Metadata (atributos)
  ✓ Evolución temporal (cambios)

Puede ser analizado por el motor:
  → Extraer patrones estructurales
  → Aprender de consecuencias pasadas
  → Predecir impacto de cambios
  → Generar "instintos" del sistema
```

### Ejemplo: Economía de MMORPG

```
Sistema: Economía virtual
Entidades: Jugadores, items, NPCs, quests
Relaciones: trades, craftings, loots
Metadata: precios, rarezas, frecuencias

Predicción:
  "Si aumenta drop rate de 'Espada Legendaria' 2x"
  → "Precio caerá 60% en 3 días"
  → "Farmers cambiarán a 'Escudo Legendario'"
  → "Inflación general +15%"

IA del juego actúa proactivamente:
  Ajusta otros drops automáticamente
  Mantiene balance económico
```

### Ejemplo: Biología

```
Sistema: Regulación génica
Entidades: Genes, proteínas, metabolitos
Relaciones: Activación, inhibición, expresión
Metadata: Niveles de expresión, condiciones

Predicción:
  "Si el gen TP53 se muta"
  → "Probablemente afecte p21 (conexión conocida)"
  → "Puede alterar ciclo celular"
  → "Riesgo: proliferación cancerosa"
```

---

## Arquitectura Plug-and-Play

```
OmnySys Core (Universal):
  ├─ Entity Extractor (adaptable)
  ├─ Relationship Mapper (adaptable)
  ├─ Pattern Learning Engine (genérico)
  ├─ Prediction Engine (genérico)
  └─ Memory Consolidation (genérico)

Adaptadores de Dominio:
  ├─ CodeAdapter (actual)
  ├─ CircuitAdapter (hardware) - ver hardware-vision.md
  ├─ GameAdapter (MMORPGs)
  ├─ BioAdapter (genómica)
  ├─ TrafficAdapter (urbano)
  └─ FinanceAdapter (económico)
```

---

## Implementación Propuesta

```javascript
class OmnyBrain {
  constructor() {
    this.core = new OmnyCore();  // Mismo motor de grafo
    this.adapters = new Map();
  }

  processExperience(rawInput) {
    // Mismo pipeline que OmnySys para código
    const filtered = this.core.layerA.filter(rawInput);
    const enriched = this.core.layerB.enrich(filtered);
    const prioritized = this.core.layerC.prioritize(enriched);
    
    this.memory.consolidate(prioritized);
  }

  retrieveContext(query) {
    // No buscar por similitud textual
    // Buscar por "utilidad predictiva"
    return this.memory.find({
      explains: query,
      predictiveOf: query.intent,
      emotionallyRelevant: query.urgency
    });
  }
}
```

---

## Visión a Largo Plazo

**OmnyBrain como estándar de facto para memoria de IA**:
```
ChatGPT + OmnyBrain = Mejor contexto personalizado
Claude + OmnyBrain = Memoria estructurada y curada
Copilot + OmnyBrain = Comprensión profunda del proyecto
```

**El primer sistema de cognición artificial verdaderamente inspirado en neurociencia**.

---

## Diferenciador Clave

1. **Salience auto-aprendida**: No reglas fijas, el sistema descubre qué es importante
2. **Estructura de grafo universal**: Entidades + relaciones + metadata en cualquier dominio
3. **Olvido selectivo**: Optimiza storage descartando lo irrelevante (como humanos)
4. **Arquetipos de situaciones**: Detecta patrones como "deadline_pressure", "conflicto_potencial"
5. **Adaptadores plug-and-play**: Mismo motor, diferentes dominios

---

**Documento consolidado desde**: `ideas/OMNYBRAIN_VISION.md` + `ideas/UNIVERSAL_PATTERN_ENGINE.md`  
**Fecha**: 2026-02-12
