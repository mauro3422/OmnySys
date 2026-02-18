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

export function findCommand(name) {
  for (const cmd of Object.values(commands)) {
    if (cmd.aliases && cmd.aliases.includes(name)) {
      return cmd;
    }
  }
  return null;
}

export async function findCommandLogic(name) {
  const cmd = findCommand(name);
  if (!cmd) return null;
  
  const logicName = Object.keys(cmd).find(k => k.endsWith('Logic'));
  if (!logicName) return null;
  
  return cmd[logicName];
}
