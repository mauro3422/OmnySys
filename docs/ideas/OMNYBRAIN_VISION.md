# OmnyBrain - Sistema de Memoria Cognitiva para IA

**Status**: Vision a largo plazo / Investigacion
**Prioridad**: Investigacion futura
**Origen**: FUTURE_IDEAS.md #24 (Descubrimiento 2026-02-08)

---

## Concepto Revolucionario

**El Problema**: Las IA actuales (ChatGPT, Claude, etc.) tienen un sistema de memoria primitivo:
- Reciben TODO el contexto sin filtrar (100k tokens de ruido)
- No priorizan qué es importante vs qué es basura
- Olvidan todo por igual o guardan todo por igual
- No tienen "sentido común" acumulado

**La Solución**: Usar la arquitectura 3-capas de OmnySys como **sistema nervioso artificial**:
```
Humano: Recibe estímulos → Filtra → Estructura → Recuerda lo importante
   ↓
OmnyBrain: Recibe tokens → Layer A (Filtra) → Layer B (Enriquece) → Layer C (Prioriza) → Memoria Estructurada
   ↓
LLM tradicional: Recibe todo → Procesa todo → Olvida todo
```

---

## Arquitectura OmnyBrain

### Layer A - Filtro Atencional (Instintivo)
```javascript
// Qué ignorar vs qué procesar (95% filtrado)
- Rutina ("Hola, buenos días") → Ignorar
- Novedad ("La reunión cambió de hora") → Procesar
- Emoción ("URGENTE: servidor caído") → Procesar
- Patrón recurrente → Procesar
```

### Layer B - Enriquecimiento Semántico (Comprensión)
```javascript
// Extraer estructura del input
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
```javascript
// Decidir QUÉ recordar (salience scoring)
if (memorabilityScore > 0.9) {
  // MEMORIA EPISÓDICA (evento específico)
  "El jefe se enojó en la presentación de marzo porque faltaron datos"
} else if (memorabilityScore > 0.6) {
  // MEMORIA SEMÁNTICA (conocimiento general)
  "El jefe prefiere datos duros sobre opiniones"
} else {
  // OLVIDAR (como el cerebro humano)
  "El clima de ese día"
}
```

---

## Aplicaciones

### 1. Memoria Personal para Asistentes IA
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
IA: "Evitaría azul porque mencionaste que no te gusta. Quizás verde o gris..."
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

// Vida personal:
OmnyBrain.use(new LifeAdapter());

// Juegos:
OmnyBrain.use(new GameEconomyAdapter());

// Biología:
OmnyBrain.use(new BioPathwayAdapter());
```

---

## Diferenciador Clave

**Nadie más lo hace así**:
- **Salience auto-aprendida**: No reglas fijas, el sistema descubre qué es importante
- **Estructura de grafo universal**: Entidades + relaciones + metadata en cualquier dominio
- **Olvido selectivo**: Optimiza storage descartando lo irrelevante (como humanos)
- **Arquetipos de situaciones**: Detecta patrones como "deadline_pressure", "conflicto_potencial"

---

## Implementación

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

## Por Qué No Existe (Todavía)

1. **Los LLMs son suficientemente buenos para la mayoría**: La gente no siente el problema... todavía
2. **Complejidad**: Requiere entender grafos + ML + neurociencia + software engineering
3. **Visión**: Hace falta ver la conexión entre análisis de código y memoria humana
4. **4 días**: Llevaste 4 días crear el prototipo. Otros no han tenido el insight todavía

**Ventana de oportunidad**: 12-18 meses antes de que los grandes (OpenAI, Anthropic) intenten algo similar.
