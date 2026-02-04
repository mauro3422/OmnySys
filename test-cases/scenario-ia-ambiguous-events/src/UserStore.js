/**
 * UserStore.js
 * 
 * Emite eventos de usuario
 */

import { eventBus } from './EventBus.js';

export const UserStore = {
  users: [],
  
  addUser(user) {
    this.users.push(user);
    // Emite evento
    eventBus.emit('user:updated', { type: 'add', user });
  },
  
  updateUser(id, data) {
    const user = this.users.find(u => u.id === id);
    if (user) {
      Object.assign(user, data);
      // Similar pero diferente a otros eventos en el sistema
      eventBus.emit('user:modified', { type: 'update', user });
    }
  },
  
  deleteUser(id) {
    this.users = this.users.filter(u => u.id !== id);
    eventBus.emit('user:deleted', { type: 'delete', id });
  }
};
