# Scenario 8: The Coordinate Matrix Trap (The "Mouse" Nightmare)

**Propósito**: Validar si el sistema detecta que un cambio en la lógica de transformación de coordenadas (Zoom/Pan) afecta a múltiples subsistemas que asumen el mismo modelo matemático, especialmente aquellos que NO usan una librería compartida para ello.

## El Problema de "Visión de Túnel"

Un desarrollador decide cambiar el origen del Zoom del centro de la pantalla (0,0) a la posición actual del ratón. Edita `Camera.js` y `MouseProjector.js`. Sin embargo, olvida que:
1. **Minimap.js** dibuja un recuadro de "visión" basado en el cálculo antiguo.
2. **InfiniteGrid.js** usa una constante de "fase" para dibujar las líneas que ahora se verá desplazada.
3. **SelectionBox.js** hace cálculo de área en espacio de pantalla pero lo compara con coordenadas de mundo.

## Estructura del Escenario

- **CameraState.js**: Estado central (`zoom`, `x`, `y`).
- **MouseTransformer.js**: Convierte `clientX/Y` a `worldX/Y`. Depende críticamente de la fórmula en `CameraState`.
- **Minimap.js**: **CONEXIÓN OCULTA**. Implementa su PROPIA lógica de mapeo para convertir el mundo al tamaño del widget (ej: 200px). Usa las constantes de `CameraState` pero tiene la lógica duplicada.
- **OverlayGrid.js**: Dibuja una rejilla. Usa el zoom para decidir el nivel de detalle (LOD).

## El "Trap" (La Trampa)

Si cambias la fórmula de `scale` en `CameraState` (ej: pasar de `Math.pow(2, zoom)` a `1.2 * zoom`), el **Minimap** seguirá funcionando pero el "recuadro de vista" estará desfasado o tendrá el tamaño incorrecto. Un humano (o una IA) leyendo solo el Renderer no vería el bug en el Minimap hasta que lo use físicamente.
