import { camelToKebab } from '../utils.js';

/**
 * @fileoverview CLI Command Detector
 *
 * Detects command-line entry points.
 *
 * @module module-system/detectors/cli-detector
 * @phase 3
 */

const CLI_FILE_PATTERN = /(?:^|[\\/])(?:cli|commands)(?:[\\/]|$)/i;

/**
 * Search CLI commands in project modules.
 * @param {Array} modules - Project modules
 * @returns {Array} - Found commands
 */
export function findCLICommands(modules) {
  const commands = [];
  const cliModules = [];

  for (const module of modules) {
    if (module.moduleName === 'cli') {
      cliModules.push(module);
      continue;
    }

    for (const file of module.files || []) {
      if (CLI_FILE_PATTERN.test(file.path)) {
        cliModules.push(module);
        break;
      }
    }
  }

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
