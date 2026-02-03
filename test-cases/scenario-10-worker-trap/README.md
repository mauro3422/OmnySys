# Scenario 10: The Serialization Phantom (Main-Worker Bridge)

**Propósito**: Validar si el sistema detecta que cambiar una estructura de datos en un objeto compartido rompe la comunicación con un Web Worker que no se re-analiza o que asume un esquema rígido.

## El Escenario: Procesamiento Pesado en Worker

1. **DataManager.js**: El hilo principal. Manda objetos `Node` al worker para procesar colisiones o layout.
2. **Worker.js**: Recibe el objeto, hace cálculos y devuelve la nueva posición.
3. **SharedTypes.js**: (OPCIONAL/INEXISTENTE) Muchas veces no hay un archivo de tipos compartido, sino que ambos archivos "saben" cómo es el objeto.

## El "Trap" (La Trampa)

Imagina que el objeto era: `{ id: 1, x: 10, y: 20 }`.
Una IA decide que para mejorar la legibilidad, las coordenadas deben estar en un sub-objeto: `{ id: 1, pos: { x: 10, y: 20 } }`.

Edita `DataManager.js`. Cree que ha terminado porque ha actualizado los usos en el hilo principal. Pero el `Worker.js` sigue intentando leer `node.x` y `node.y`.

**El resultado**: El worker devuelve `NaN` o falla silenciosamente, y el sistema se cuelga o los objetos desaparecen. Como el worker está en otro archivo y no hay un `import` de código (solo un `new Worker('file.js')`), el análisis estático tradicional falla. **CogniSystem debe encontrar esta conexión semántica vía el mensaje `postMessage`.**
