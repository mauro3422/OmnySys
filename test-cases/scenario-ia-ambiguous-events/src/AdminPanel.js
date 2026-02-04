/**
 * AdminPanel.js
 * 
 * Emite eventos de admin con nombres que PODRÍAN estar relacionados
 */

import { eventBus } from './EventBus.js';

export class AdminPanel {
  constructor() {
    this.adminUsers = [];
  }
  
  updateAdminUser(userId, data) {
    // TRAP: Emite 'admin:user:updated' - relacionado con 'user:updated'?
    eventBus.emit('admin:user:updated', { 
      adminId: userId, 
      changes: data,
      timestamp: Date.now()
    });
  }
  
  deleteAdminUser(userId) {
    // Similar a 'user:deleted' pero con prefijo 'admin:'
    eventBus.emit('admin:user:removed', { adminId: userId });
  }
  
  // Función que emite evento con nombre construido dinámicamente
  notifyUser(userId, notificationType) {
    // Evento dinámico: 'notify:email', 'notify:sms', etc.
    eventBus.emit(`notify:${notificationType}`, { userId });
  }
}
