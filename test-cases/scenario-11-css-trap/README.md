# Scenario 11: The CSS Variable Poisoning (Visual Drift Trap)

**Propósito**: Validar si el sistema detecta que un cambio en una variable CSS (Custom Property) gestionada por JS afecta a cálculos de diseño en archivos totalmente desconectados.

## El Escenario: Layout Dinámico y Canvas

1. **ThemeManager.js**: Cambia el valor de `--sidebar-width` en el `:root` dependiendo de si el menú está expandido o colapsado.
2. **DiagramCanvas.js**: Un componente que dibuja un lienzo. Calcula su "centro lógico" restando el ancho de la barra lateral.
3. **style.css**: Define el valor por defecto de la variable.

## El "Trap" (La Trampa)

Un desarrollador decide cambiar el nombre de la variable CSS de `--sidebar-width` a `--nav-panel-size` en `ThemeManager.js` y en el CSS para ser más "semántico". 

**El resultado**: El menú sigue funcionando (JS y CSS están sincronizados). Pero el **DiagramCanvas.js** sigue usando `getPropertyValue('--sidebar-width')`. Al recibir un string vacío o `NaN`, el canvas deja de centrar los objetos correctamente o los "teletransporta" fuera de la pantalla. 

Como la conexión es a través del DOM/CSS, no hay `import` que valga. **CogniSystem debe detectar que ambos archivos dependen de la misma identidad semántica: la variable CSS.**
