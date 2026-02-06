/**
 * @fileoverview context-connections.js
 * 
 * Detecta conexiones por Context compartido (provider -> consumer)
 * 
 * @module extractors/state-management/connections/context-connections
 */

import { ConnectionType, DEFAULT_CONFIDENCE } from '../constants.js';

/**
 * Detecta conexiones por Context compartido
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Array} - Conexiones detectadas
 */
export function detectContextConnections(fileResults) {
  const connections = [];
  
  // Indexar providers y consumers por nombre de contexto
  const contextProviders = new Map();
  const contextConsumers = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const context = analysis.context || {};
    
    for (const provider of context.providers || []) {
      if (!contextProviders.has(provider.contextName)) {
        contextProviders.set(provider.contextName, []);
      }
      contextProviders.get(provider.contextName).push({ file: filePath, provider });
    }
    
    for (const consumer of context.consumers || []) {
      if (!contextConsumers.has(consumer.contextName)) {
        contextConsumers.set(consumer.contextName, []);
      }
      contextConsumers.get(consumer.contextName).push({ file: filePath, consumer });
    }
  }
  
  // Crear conexiones provider -> consumers
  for (const [contextName, providers] of contextProviders.entries()) {
    const consumers = contextConsumers.get(contextName) || [];
    
    for (const provider of providers) {
      for (const consumer of consumers) {
        if (provider.file !== consumer.file) {
          connections.push({
            id: `context_${contextName}_${provider.file}_to_${consumer.file}`,
            sourceFile: provider.file,
            targetFile: consumer.file,
            type: ConnectionType.CONTEXT_USAGE,
            via: 'react-context',
            contextName: contextName,
            confidence: DEFAULT_CONFIDENCE.context,
            detectedBy: 'context-extractor',
            reason: `Context '${contextName}' provided by ${provider.file}, consumed by ${consumer.file}`
          });
        }
      }
    }
  }
  
  return connections;
}

/**
 * Indexa providers por contexto
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Map} - contextName -> providers
 */
export function indexContextProviders(fileResults) {
  const index = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const context = analysis.context || {};
    
    for (const provider of context.providers || []) {
      if (!index.has(provider.contextName)) {
        index.set(provider.contextName, []);
      }
      index.get(provider.contextName).push(filePath);
    }
  }
  
  return index;
}

/**
 * Indexa consumers por contexto
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {Map} - contextName -> consumers
 */
export function indexContextConsumers(fileResults) {
  const index = new Map();
  
  for (const [filePath, analysis] of Object.entries(fileResults)) {
    const context = analysis.context || {};
    
    for (const consumer of context.consumers || []) {
      if (!index.has(consumer.contextName)) {
        index.set(consumer.contextName, []);
      }
      index.get(consumer.contextName).push(filePath);
    }
  }
  
  return index;
}

/**
 * Obtiene todos los contextos usados en el proyecto
 * @param {Object} fileResults - Mapa de filePath -> analysis
 * @returns {string[]} - Nombres de contextos
 */
export function getAllContextNames(fileResults) {
  const names = new Set();
  
  for (const analysis of Object.values(fileResults)) {
    const context = analysis.context || {};
    
    for (const provider of context.providers || []) {
      names.add(provider.contextName);
    }
    for (const consumer of context.consumers || []) {
      names.add(consumer.contextName);
    }
  }
  
  return Array.from(names);
}
