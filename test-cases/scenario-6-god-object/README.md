# Scenario 6: God Object (Risk Analysis)

**Propósito**: Validar que el sistema identifica correctamente archivos "nudo" o "God Objects" que, al ser importados por gran parte del sistema, representan un alto riesgo de regresión.

## Estructura del Escenario

- **Core.js**: Exporta funciones de utilidad críticas.
- **Module01.js** a **Module10.js**: Todos importan y usan funciones de `Core.js`.

## Riesgo Esperado

- **Core.js**: Muy Alto (9.0/10 o superior). Es el centro de la estrella de dependencias.
- **Modules**: Bajo (2.0 - 3.0/10). Solo consumen, no son consumidos.

## Conexiones Esperadas

- 10 dependencias estáticas hacia `Core.js`.
