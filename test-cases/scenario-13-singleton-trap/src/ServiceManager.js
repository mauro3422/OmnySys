/**
 * ServiceManager.js
 * 
 * Un servicio centralizado de estado.
 */

class DataBus {
    constructor() {
        this.listeners = [];
        this.id = Math.random(); // Identificador para detectar duplicados
        console.log(`DataBus instanciado con ID: ${this.id}`);
    }

    on(event, cb) {
        this.listeners.push({ event, cb });
    }

    emit(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.cb(data));
    }
}

// EXPORTAR INSTANCIA (Singleton)
export const mainBus = new DataBus();
export { DataBus }; // También exportamos la clase (peligroso)
