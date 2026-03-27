import { detectCircularDependencies as detectCircularDependenciesImpl } from './circular-guard-detection.js';
import { detectCircularImportsForFile as detectCircularImportsForFileImpl } from './circular-guard-imports.js';

export const detectCircularDependencies = detectCircularDependenciesImpl;
export const detectCircularImportsForFile = detectCircularImportsForFileImpl;

export default {
  detectCircularDependencies,
  detectCircularImportsForFile
};
