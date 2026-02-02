// EventBus.js - Sistema de eventos global
// ⚠️ Este archivo crea window.eventBus

/**
 * Simple event bus implementation
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Registra un listener para un evento
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Emite un evento
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Remueve un listener
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
}

// Crear instancia global
// SIDE EFFECT: Crea window.eventBus
window.eventBus = new EventBus();

export { EventBus };
