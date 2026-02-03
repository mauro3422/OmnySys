# Scenario 4: Hidden Side Effect (localStorage Bridge)

**Propósito**: Validar que el análisis semántico detecta conexiones entre archivos que comparten datos a través de `localStorage` o `sessionStorage`, sin tener dependencias de importación directas.

## Estructura del Escenario

Este escenario consta de dos archivos desconectados que se comunican indirectamente.

- **AuthService.js**: Escribe un token en `localStorage` tras un "login".
- **ApiClient.js**: Lee ese mismo token de `localStorage` para incluirlo en las cabeceras de las peticiones.

## Conexiones Esperadas

- `AuthService.js` ↔ `ApiClient.js` vía llave `auth_token` en `localStorage`.

## Riesgo Esperado

- **AuthService.js**: Medio (afecta la autenticación global).
- **ApiClient.js**: Medio (depende de un estado externo persistente).
