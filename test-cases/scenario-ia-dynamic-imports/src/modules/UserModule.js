/**
 * UserModule.js
 * 
 * Módulo de usuario - probable target del dynamic import
 */

export default {
  name: 'UserModule',
  
  init() {
    console.log('User module initialized');
    this.loadUserData();
  },
  
  loadUserData() {
    // Carga datos del usuario
    return fetch('/api/user').then(r => r.json());
  }
};

export function getUserProfile() {
  return { name: 'John', role: 'user' };
}
