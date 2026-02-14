/**
 * @fileoverview name-utils.js
 * 
 * Utility functions for name checking.
 * 
 * @module analyses/tier3/utils/name-utils
 */

const commonNames = [
  'main', 'init', 'setup', 'start', 'run', 'execute',
  'handleClick', 'handleChange', 'handleSubmit',
  'onClick', 'onChange', 'onSubmit', 'onLoad',
  'render', 'update', 'refresh', 'reload',
  'get', 'set', 'create', 'delete', 'remove', 'add',
  'toString', 'valueOf', 'constructor',
  'map', 'filter', 'reduce', 'forEach', 'find'
];

export function isCommonFunctionName(name) {
  return commonNames.includes(name) ||
         name.startsWith('_') ||
         name.startsWith('handle') ||
         name.startsWith('on');
}

export function normalizeName(name) {
  return name.toLowerCase().replace(/[_-]/g, '');
}
