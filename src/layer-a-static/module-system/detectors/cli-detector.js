/**
 * @fileoverview CLI Command Detector
 * 
 * Detecta comandos de línea de comandos
 * 
 * @module module-system/detectors/cli-detector
 * @phase 3
 */

/**
 * Busca comandos CLI en los módulos
 * @param {Array} modules - Módulos del proyecto
 * @returns {Array} - Comandos encontrados
 */
export function findCLICommands(modules) {
  const commands = [];
  
  // Buscar archivos de CLI
  const cliModules = modules.filter(m =>
    m.moduleName === 'cli' ||
    m.files.some(f => f.path.includes('cli') || f.path.includes('commands'))
  );
  
  for (const module of cliModules) {
    for (const exp of module.exports || []) {
      if (exp.type === 'handler' || exp.name.toLowerCase().includes('command')) {
        commands.push({
          type: 'cli',
          command: camelToKebab(exp.name),
          handler: {
            module: module.moduleName,
            file: exp.file,
            function: exp.name
          }
        });
      }
    }
  }
  
  return commands;
}

import { camelToKebab } from '../utils.js';
