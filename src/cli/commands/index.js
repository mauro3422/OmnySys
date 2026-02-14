/**
 * @fileoverview Commands Index
 * 
 * @module cli/commands
 */

import * as up from './up.js';
import * as down from './down.js';
import * as status from './status.js';
import * as tools from './tools.js';
import * as call from './call.js';
import * as setup from './setup.js';
import * as help from './help.js';

export const commands = {
  up,
  down,
  status,
  tools,
  call,
  setup,
  help
};

/**
 * Find command by name or alias
 * @param {string} name - Command name
 * @returns {Object|null} Command module
 */
export function findCommand(name) {
  for (const cmd of Object.values(commands)) {
    if (cmd.aliases.includes(name)) {
      return cmd;
    }
  }
  return null;
}
