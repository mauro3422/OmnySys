# Scenario 5: Disconnected File (Shader Bridge)

**Propósito**: Validar que el sistema detecta la conexión entre el código JS que configura parámetros gráficos (uniforms) y el código de shader que los consume, incluso si están en archivos separados.

## Estructura del Escenario

- **WebGLRenderer.js**: Configura los uniforms de WebGL.
- **FragmentShader.js**: Contiene el código fuente del shader en un template string.

## Conexiones Esperadas

- `WebGLRenderer.js` ↔ `FragmentShader.js` vía el uniform `u_time` y `u_resolution`.

## Importancia

Es muy común que una IA cambie el nombre de un parámetro en el Renderer pero olvide actualizar el string del Shader, rompiendo el renderizado sin errores de sintaxis en JS.
