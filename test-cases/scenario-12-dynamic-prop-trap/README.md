# Scenario 12: The Dynamic Property Trap (Reflection Nightmare)

**Propósito**: Validar si el sistema detecta conexiones basadas en strings que referencian propiedades de objetos, lo cual rompe los "Renames" automáticos de los IDEs y de las IAs.

## El Escenario: Sistema de Comandos por Texto

1. **StateModel.js**: Un objeto que guarda variables de estado (ej: `speed`, `health`, `score`).
2. **CommandDispatcher.js**: Recibe strings de una terminal o una consola de debug (ej: `"set speed 100"`) y actualiza el valor usando la llave del string.

## El "Trap" (La Trampa)

Un desarrollador decide que `speed` debe llamarse `velocity` por consistencia física. Cambia el campo en `StateModel.js`. Cambia todas las referencias de código directas (`model.speed` -> `model.velocity`). 

**El resultado**: El `CommandDispatcher.js` sigue recibiendo el comando `"set speed"`. Al intentar hacer `state['speed'] = value`, el sistema crea una nueva propiedad `speed` en el objeto en lugar de actualizar `velocity`. 

**Invisibilidad**: No hay errores de ejecución inmediatos. El juego simplemente deja de responder al comando de "speed" y el desarrollador no entiende por qué si "ya renombró todo". **OmnySys debe detectar que "speed" es una llave semántica vinculada a la propiedad del objeto.**
