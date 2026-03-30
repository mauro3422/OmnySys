import { detectCircularDependencies as detectCircularDependenciesImpl } from './detection.js';
import { detectCircularImportsForFile as detectCircularImportsForFileImpl } from './imports.js';

export const detectCircularDependencies = detectCircularDependenciesImpl;
export const detectCircularImportsForFile = detectCircularImportsForFileImpl;

export default {
  detectCircularDependencies,
  detectCircularImportsForFile
};
