/**
 * SmartInput.js
 * 
 * Un componente de entrada de texto rico.
 */

export class SmartInput {
    constructor(element) {
        this.el = element;
        this.setupListeners();
    }

    setupListeners() {
        this.el.addEventListener('keydown', (e) => {
            // Lógica para procesar el input...
            console.log(`Key pressed in input: ${e.key}`);

            // TRAP: Alguien decide añadir esto para "limpiar" comportamientos del navegador
            // Pero esto matará los shortcuts de GlobalShortcuts.js
            if (!this.allowPropagation(e.key)) {
                e.stopPropagation();
            }
        });
    }

    allowPropagation(key) {
        // Solo permite propagar algunas teclas (esto es frágil)
        return ['Tab', 'Enter'].includes(key);
    }
}
