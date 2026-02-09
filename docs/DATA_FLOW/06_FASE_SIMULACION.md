# FASE 6: Motor de Simulación

**Estado**: Pre-implementación  
**Dependencias**: Fase 4 (necesita cadenas cross-function)  
**Tiempo estimado**: 2-3 días

---

## 🎯 Objetivo

Crear un motor que "camine" por el grafo de metadata, simulando el **viaje completo de un dato** desde su entrada hasta su salida.

**Metafora**: Como Google Maps, pero para datos. Le das un punto de inicio y te muestra todo el recorrido.

---

## 📊 Ejemplo de Simulación

### Comando

```
simulateDataJourney("handleRequest", "req.body")
```

### Resultado

```
JOURNEY:
  Step 1: routes/api.js:handleRequest (línea 15)
          req.body → userData (property_access)

  Step 2: auth/validator.js:validateUser (línea 42)
          userData → userData.email (property_access)
          userData.email → isValid (validation via checkEmail)

  Step 3: auth/validator.js:checkEmail (línea 8)
          email → emailRegex.test(email) (validation)
          → return boolean

  Step 4: auth/validator.js:validateUser (línea 50)
          isValid == false → throw Error (error_path)
          isValid == true → { ...userData, validated: true } (merge)

  Step 5: db/repository.js:saveUser (línea 23)
          validatedUser → db.insert(validatedUser) (persistence)
          → return savedUser

  Step 6: notifications/email.js:sendWelcome (línea 12)
          savedUser.email → emailService.send(email) (communication)
          → SIDE_EFFECT(email_sent)

SUMMARY:
  Touched: 4 archivos, 6 funciones
  Operations: property_access, validation, merge, persistence, communication
  Side Effects: database_write, email_send
  Depth: 5 niveles

  IF YOU MODIFY: validateUser
  YOU MUST CHECK: saveUser, sendWelcome (downstream)
  YOU MUST CHECK: handleRequest (upstream)
```

---

## 🔧 Implementación

### Paso 1: Motor de Simulación

```javascript
// src/core/simulation-engine.js

/**
 * Simula el viaje de un dato a través del sistema
 * 
 * @param {string} startFunction - Función de entrada (formato: "file::function")
 * @param {string} paramName - Nombre del parámetro a seguir
 * @returns {Object} - Viaje completo del dato
 */
export function simulateDataJourney(startFunction, paramName) {
  const visited = new Set();
  const journey = [];
  
  function walk(functionId, dataName, depth = 0) {
    // Evitar ciclos infinitos
    if (visited.has(`${functionId}:${dataName}`) || depth > 20) {
      return;
    }
    visited.add(`${functionId}:${dataName}`);
    
    // Obtener el átomo
    const atom = getAtom(functionId);
    if (!atom || !atom.dataFlow) {
      return;
    }
    
    // Buscar transformaciones de este dato
    const transforms = atom.dataFlow.transformations
      .filter(t => 
        t.from === dataName || 
        (Array.isArray(t.from) && t.from.includes(dataName))
      );
    
    for (const transform of transforms) {
      journey.push({
        step: journey.length + 1,
        location: `${atom.parentMolecule}:${atom.name}`,
        line: transform.line,
        dataState: `${dataName} → ${transform.to}`,
        operation: transform.operation,
        via: transform.via || 'direct',
        depth
      });
      
      // Si se pasa a otra función, seguir el viaje
      if (transform.via && isFunction(transform.via)) {
        const targetAtom = getAtomByName(transform.via);
        if (targetAtom) {
          const targetParam = getParamName(targetAtom, transform.to);
          walk(targetAtom.id, targetParam, depth + 1);
        }
      }
    }
    
    // Seguir outputs
    for (const output of atom.dataFlow.outputs) {
      if (output.type === 'return') {
        // Buscar quién llama a esta función y recibe el return
        const callers = atom.calledBy || [];
        for (const callerId of callers) {
          const caller = getAtom(callerId);
          const receiveVar = findReceiveVariable(caller, atom.name);
          if (receiveVar) {
            walk(callerId, receiveVar, depth + 1);
          }
        }
      } else if (output.type === 'side_effect') {
        journey.push({
          step: journey.length + 1,
          location: `${atom.parentMolecule}:${atom.name}`,
          dataState: `${dataName} → SIDE_EFFECT(${output.target})`,
          operation: output.operation,
          terminal: true,
          depth
        });
      }
    }
  }
  
  walk(startFunction, paramName);
  
  // Generar resumen
  return {
    startFunction,
    paramName,
    journey,
    touchedFiles: [...new Set(journey.map(j => j.location.split(':')[0]))],
    touchedFunctions: [...new Set(journey.map(j => j.location))],
    operations: [...new Set(journey.map(j => j.operation))],
    sideEffects: journey.filter(j => j.terminal),
    depth: Math.max(...journey.map(j => j.depth), 0),
    
    // Para Tunnel Vision
    impactMap: journey.map(j => j.location)
  };
}
```

### Paso 2: MCP Tool

```javascript
// src/layer-c-memory/mcp/tools/simulate-data-flow.js

export const simulateDataFlowTool = {
  name: "simulate_data_flow",
  description: "Simula el viaje de un dato desde su entrada hasta su salida",
  parameters: {
    type: "object",
    properties: {
      startFunction: {
        type: "string",
        description: "Función de entrada (ej: 'routes/api.js::handleRequest')"
      },
      paramName: {
        type: "string",
        description: "Nombre del parámetro a seguir (ej: 'req.body')"
      }
    },
    required: ["startFunction", "paramName"]
  },
  
  handler: async ({ startFunction, paramName }) => {
    const result = simulateDataJourney(startFunction, paramName);
    
    return {
      content: [{
        type: "text",
        text: formatJourney(result)
      }]
    };
  }
};

function formatJourney(result) {
  let output = `# Viaje del dato: ${result.paramName}\n\n`;
  
  output += `## Recorrido (${result.journey.length} pasos):\n\n`;
  for (const step of result.journey) {
    output += `**Paso ${step.step}**: ${step.location}\n`;
    output += `  - Línea: ${step.line}\n`;
    output += `  - Operación: ${step.operation}\n`;
    output += `  - Estado: ${step.dataState}\n\n`;
  }
  
  output += `## Resumen:\n`;
  output += `- Archivos tocados: ${result.touchedFiles.length}\n`;
  output += `- Funciones tocadas: ${result.touchedFunctions.length}\n`;
  output += `- Profundidad máxima: ${result.depth}\n`;
  output += `- Side effects: ${result.sideEffects.map(s => s.operation).join(', ')}\n`;
  
  return output;
}
```

---

## 📊 Usos del Simulador

| Uso | Input | Output |
|-----|-------|--------|
| **Impact Analysis** | "Modifiqué validateUser" | Lista de funciones afectadas downstream |
| **Test Generation** | "¿Qué paths tiene handleRequest?" | Test cases: happy path, error path, edge cases |
| **Security Audit** | "¿Dónde va req.body?" | Traza completa desde entrada hasta storage |
| **Performance Analysis** | "¿Qué pasa con fetchData?" | Detecta si pasa por funciones bloqueantes |
| **Refactoring Safety** | "¿Puedo cambiar el return de getUser?" | Todo lo que depende de ese return shape |
| **Tunnel Vision Enhanced** | "Modifiqué archivo X" | El viaje del dato, no solo archivos dependientes |

---

## 🎁 Beneficios

1. **Impact Analysis preciso**: Saber exactamente qué se rompe si cambias una función
2. **Documentación viva**: El código se documenta a sí mismo
3. **Onboarding**: Nuevo dev pregunta "¿de dónde viene userData?" → simulación
4. **Debugging**: "¿Por qué este email no se envía?" → seguir la cadena
5. **Seguridad**: Auditar dónde terminan los datos sensibles

---

## ✅ Checklist de Implementación

- [ ] Implementar `simulateDataJourney()` con recorrido del grafo
- [ ] Manejar ciclos y recursión
- [ ] Resolver variables que reciben returns
- [ ] Identificar side effects terminales
- [ ] Crear MCP tool `simulate_data_flow`
- [ ] Formatear output legible para humanos
- [ ] Tests con flujos conocidos
- [ ] Optimizar para no recalcular paths ya visitados

---

## 📚 Referencias

- [Documento Original - Sección 7](../architecture/DATA_FLOW_FRACTAL_DESIGN.md#7-motor-de-simulacion)

---

**Siguiente**: [→ Fase 7: Nivel Módulo y Sistema](./07_FASE_SISTEMA.md)
