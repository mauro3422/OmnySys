/**
 * @fileoverview build-time-deps.js
 * 
 * Extrae dependencias de build-time
 * 
 * @module extractors/metadata/build-time-deps
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae dependencias de build-time
 * @param {string} code - Código fuente
 * @returns {Object} - { envVars: [], devFlags: [], platformChecks: [] }
 */
export function extractBuildTimeDependencies(code) {
  const build = {
    envVars: [],            // process.env.X, import.meta.env.X
    devFlags: [],           // __DEV__, NODE_ENV === 'development'
    platformChecks: [],     // typeof window !== 'undefined'
    featureFlags: [],       // flags.enabled, etc.
    deadCodeCandidates: [], // Código que puede eliminarse en prod
    all: []
  };
  
  // process.env.VAR o import.meta.env.VAR
  const envPattern = /(?:process\.env|import\.meta\.env)\.(\w+)/g;
  
  // __DEV__, __PROD__, __TEST__
  const devFlagPattern = /__(DEV|PROD|TEST|DEBUG)__/g;
  
  // NODE_ENV checks
  const nodeEnvPattern = /process\.env\.NODE_ENV\s*===?\s*['"]([^'"]+)['"]/g;
  
  // typeof window !== 'undefined'
  const platformPattern = /typeof\s+(window|document|global|process)\s*!==?\s*['"]undefined['"]/g;
  
  // Feature flags: flags.x, featureFlags.y
  const featureFlagPattern = /(?:flags|featureFlags)\.(\w+)/g;
  
  // DEBUG || debug()
  const debugPattern = /(?:^|\s)(DEBUG|debug)\s*[\(&]/g;
  
  let match;
  
  while ((match = envPattern.exec(code)) !== null) {
    build.envVars.push({
      type: 'env_var',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = devFlagPattern.exec(code)) !== null) {
    build.devFlags.push({
      type: 'build_flag',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
    
    // Marcar como código potencialmente muerto en producción
    if (match[1] === 'DEV' || match[1] === 'DEBUG') {
      build.deadCodeCandidates.push({
        type: 'dev_only_code',
        flag: match[1],
        line: getLineNumber(code, match.index),
        reason: 'Code may be removed in production build'
      });
    }
  }
  
  while ((match = nodeEnvPattern.exec(code)) !== null) {
    build.devFlags.push({
      type: 'node_env',
      value: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = platformPattern.exec(code)) !== null) {
    build.platformChecks.push({
      type: 'platform_check',
      platform: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = featureFlagPattern.exec(code)) !== null) {
    build.featureFlags.push({
      type: 'feature_flag',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = debugPattern.exec(code)) !== null) {
    build.devFlags.push({
      type: 'debug_call',
      name: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  build.all = [
    ...build.envVars,
    ...build.devFlags,
    ...build.platformChecks,
    ...build.featureFlags
  ];
  
  return build;
}
