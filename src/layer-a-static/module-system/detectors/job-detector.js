/**
 * @fileoverview Scheduled Job Detector
 * 
 * Detecta jobs y tareas programadas
 * 
 * @module module-system/detectors/job-detector
 * @phase 3
 */

import path from 'path';
import { findMolecule, getAllAtoms } from '../utils.js';

/**
 * Busca scheduled jobs
 * @param {Array} modules - Módulos del proyecto
 * @returns {Array} - Jobs encontrados
 */
export function findScheduledJobs(modules) {
  const jobs = [];
  
  // Buscar patrones de scheduled jobs
  for (const module of modules) {
    for (const atom of getAllAtoms(module)) {
      if (/^schedule|^cron|^job|^task/i.test(atom.name)) {
        jobs.push({
          type: 'scheduled',
          name: atom.name,
          schedule: 'unknown', // Requeriría análisis más profundo
          handler: {
            module: module.moduleName,
            file: atom.filePath ? path.basename(atom.filePath) : 'unknown',
            function: atom.name
          }
        });
      }
    }
  }
  
  return jobs;
}


