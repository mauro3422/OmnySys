# Scenario 7: Forgotten Test File

**Propósito**: Validar que el sistema detecta la relación entre un archivo de código y su archivo de pruebas (unit test), advirtiendo al desarrollador que debe actualizar los tests si modifica la lógica de negocio.

## Estructura del Escenario

- **Calculator.js**: Contiene lógica matemática.
- **Calculator.test.js**: Importa `Calculator.js` para ejecutar pruebas.

## Conexiones Esperadas

- `Calculator.test.js` → `Calculator.js` (dependencia de importación).

## Prueba de Impacto

Al intentar modificar `Calculator.js`, el sistema debe marcar `Calculator.test.js` como un archivo afectado de alta prioridad.
