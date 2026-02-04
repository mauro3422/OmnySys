/**
 * UserProfile.js
 * 
 * Escucha eventos de usuario - pero con nombres LIGERAMENTE diferentes
 */

import { eventBus } from './EventBus.js';

export class UserProfile {
  constructor() {
    this.setupListeners();
  }
  
  setupListeners() {
    // TRAP: Escucha 'user:change' pero Store emite 'user:updated'
    // Son similares pero no idénticos - baja confianza
    eventBus.on('user:change', (data) => {
      console.log('User changed:', data);
      this.refresh();
    });
    
    // Otro ejemplo: escucha 'user:modified' (este SÍ coincide con Store)
    eventBus.on('user:modified', (data) => {
      console.log('User modified:', data);
      this.updatePartial(data);
    });
    
    // Escucha 'account:updated' - relacionado pero diferente namespace
    eventBus.on('account:updated', (data) => {
      console.log('Account updated:', data);
    });
  }
  
  refresh() {
    // Recarga perfil completo
  }
  
  updatePartial(data) {
    // Actualiza campos específicos
  }
}
