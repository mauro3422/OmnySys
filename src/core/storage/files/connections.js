import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = '.omnysysdata';

/**
 * Guarda todas las conexiones semánticas
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {array} sharedStateConnections - Conexiones de estado compartido
 * @param {array} eventListenerConnections - Conexiones de eventos
 * @returns {object} - Rutas de los archivos guardados
 */
export async function saveConnections(rootPath, sharedStateConnections, eventListenerConnections) {
  const dataPath = path.join(rootPath, DATA_DIR);
  const connectionsDir = path.join(dataPath, 'connections');

  // Guardar shared state connections
  const sharedStatePath = path.join(connectionsDir, 'shared-state.json');
  await fs.writeFile(sharedStatePath, JSON.stringify({
    connections: sharedStateConnections,
    total: sharedStateConnections.length,
    generatedAt: new Date().toISOString()
  }, null, 2));

  // Guardar event listener connections
  const eventListenersPath = path.join(connectionsDir, 'event-listeners.json');
  await fs.writeFile(eventListenersPath, JSON.stringify({
    connections: eventListenerConnections,
    total: eventListenerConnections.length,
    generatedAt: new Date().toISOString()
  }, null, 2));

  return { sharedStatePath, eventListenersPath };
}
