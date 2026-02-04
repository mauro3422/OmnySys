# ADR 001: Type-Based Prompt Selection

## Status
Accepted

## Context

El sistema de Prompt Selector originalmente usaba una jerarquía de prioridades fija:
1. Dynamic Imports
2. God Object
3. Semantic Connections
4. CSS-in-JS
5. TypeScript

Este enfoque tiene problemas:
- **Rigidez**: No permite análisis combinados
- **Acoplamiento**: Prioridades hardcodeadas
- **Escalabilidad**: Difícil agregar nuevos tipos
- **Falsos positivos**: Un archivo puede ser God Object Y tener dynamic imports

## Decision

Usar **Type-Based Selection** donde los metadatos determinan el tipo de archivo, y cada tipo tiene su prompt especializado.

## Concepto: "File Archetypes" (Arquetipos de Archivo)

Cada archivo puede ser clasificado en uno o más arquetipos basado en sus metadatos:

| Archetype | Metadatos Clave | Prompt Especializado |
|-----------|----------------|---------------------|
| `dynamic-importer` | `hasDynamicImports: true` | Analiza conexiones dinámicas ocultas |
| `god-object` | `dependentCount >= 10` | Analiza acoplamiento arquitectónico |
| `event-hub` | `eventNames.length > 0` | Analiza patrones de eventos |
| `state-manager` | `localStorageKeys.length > 0` | Analiza estado compartido |
| `styled-component` | `cssInJS.components.length > 0` | Analiza CSS-in-JS |
| `type-definer` | `typescript.interfaces.length > 0` | Analiza tipos TypeScript |
| `utility-module` | `dependentCount > 5 && exportCount < 3` | Analiza si es utilidad legítima |
| `orphan-module` | `dependentCount == 0 && importCount == 0` | Analiza código muerto potencial |

## Problemática: Múltiples Arquetipos

### Escenario
Un archivo puede ser:
- `god-object` (alto acoplamiento) 
- `dynamic-importer` (tiene `import()`)
- `event-hub` (emite eventos)

### Opciones de Solución

#### Opción A: Análisis Único (Selección por Severidad)
Elegir el arquetipo con mayor "severidad arquitectónica":
```javascript
const severityScores = {
  'god-object': 10,        // Máximo impacto arquitectónico
  'orphan-module': 8,      // Potencial código muerto
  'dynamic-importer': 7,   // Conexiones ocultas
  'event-hub': 6,          // Acoplamiento por eventos
  'state-manager': 6,      // Acoplamiento por estado
  'styled-component': 3,   // Bajo impacto arquitectónico
  'type-definer': 2,       // Bajo impacto
  'utility-module': 1      // Normalmente OK
};

// Seleccionar el de mayor severidad
const selectedType = detectedTypes.sort((a, b) => 
  severityScores[b] - severityScores[a]
)[0];
```

**Pros**: Simple, enfoca en el problema más grave
**Cons**: Pierde información de otros arquetipos

#### Opción B: Análisis Combinado (Multi-Prompt)
Crear un prompt híbrido que combine análisis:
```javascript
// Si es God Object + Dynamic Imports
const combinedPrompt = {
  systemPrompt: `${godObjectPrompt.systemPrompt}\n\n${dynamicImportsPrompt.systemPrompt}`,
  userPrompt: `ANALYZE AS BOTH:\n1. God Object (coupling, responsibilities)\n2. Dynamic Import resolver (hidden connections)\n\nCODE: {fileContent}`
};
```

**Pros**: Análisis completo
**Cons**: Más tokens, más lento, puede confundir al LLM

#### Opción C: Análisis Secuencial (Pipeline)
Analizar arquetipos en orden de severidad:
```javascript
const analysisPipeline = [
  { type: 'god-object', if: metadata => isGodObject(metadata) },
  { type: 'dynamic-importer', if: metadata => hasDynamicImports(metadata) },
  { type: 'event-hub', if: metadata => hasEvents(metadata) }
];

// Ejecutar en orden, cada uno puede enriquecer el resultado anterior
```

**Pros**: Ordenado, cada análisis refina el anterior
**Cons**: Múltiples llamadas LLM, más lento

#### Opción D: Arquetipos Compuestos (Pre-definidos)
Definir combinaciones comunes como arquetipos propios:
```javascript
const COMPOUND_ARCHETYPES = {
  'god-object-with-dynamic-imports': {
    matches: m => isGodObject(m) && hasDynamicImports(m),
    prompt: 'god-object-dynamic-template',
    description: 'High-coupling module with hidden dynamic connections'
  },
  'event-driven-god-object': {
    matches: m => isGodObject(m) && hasEvents(m),
    prompt: 'god-object-event-template',
    description: 'Central module emitting events to many dependents'
  }
};
```

**Pros**: Optimizado para casos comunes
**Cons**: Necesita definir todas las combinaciones

## Decisión Recomendada

**Opción A (Severidad) + Opción D (Compuestos para casos críticos)**

### Implementación

1. **Por defecto**: Seleccionar por severidad (Opción A)
2. **Casos especiales**: Definir arquetipos compuestos para combinaciones críticas
3. **Extensible**: Permitir múltiples análisis en el futuro (Opción C)

### Ejemplo de Selección

```javascript
class TypeBasedPromptSelector {
  selectAnalysisType(metadata) {
    // 1. Detectar TODOS los arquetipos presentes
    const archetypes = this.detectArchetypes(metadata);
    
    // 2. ¿Hay un arquetipo compuesto predefinido?
    const compound = this.findCompoundArchetype(archetypes);
    if (compound) {
      return compound.type;
    }
    
    // 3. Seleccionar por severidad
    return this.selectBySeverity(archetypes);
  }
  
  detectArchetypes(metadata) {
    const detected = [];
    
    if (this.isGodObject(metadata)) {
      detected.push({ type: 'god-object', severity: 10 });
    }
    if (this.hasDynamicImports(metadata)) {
      detected.push({ type: 'dynamic-importer', severity: 7 });
    }
    if (this.hasEvents(metadata)) {
      detected.push({ type: 'event-hub', severity: 6 });
    }
    // ... más arquetipos
    
    return detected;
  }
  
  selectBySeverity(archetypes) {
    return archetypes.sort((a, b) => b.severity - a.severity)[0]?.type || 'default';
  }
}
```

## Consequences

### Positive
- **Flexibilidad**: Nuevos arquetipos sin cambiar lógica de prioridades
- **Claridad**: Cada tipo tiene responsabilidad única
- **Extensibilidad**: Fácil agregar arquetipos compuestos
- **Precisión**: Análisis especializado para cada caso

### Negative
- **Complejidad**: Más lógica de selección
- **Decisiones difíciles**: ¿Qué pasa con 3+ arquetipos?
- **Mantenimiento**: Arquetipos compuestos pueden proliferar

## Future Work

1. **Análisis Multi-Arquetipo**: Permitir múltiples análisis LLM para un archivo
2. **Learning**: Aprender de resultados para ajustar severidades
3. **User Override**: Permitir al usuario especificar el tipo de análisis

## References

- `docs/creating-new-prompt-template.md` - How to add new archetypes
- `src/layer-b-semantic/prompt-engine/prompt-selector.js` - Implementation
