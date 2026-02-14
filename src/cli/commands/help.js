/**
 * @fileoverview Help Command
 * 
 * Show help information
 * 
 * @module cli/commands/help
 */

import { showHelp } from '../utils/logger.js';

export const aliases = ['help', '--help', '-h'];

export async function execute() {
  showHelp();
}
