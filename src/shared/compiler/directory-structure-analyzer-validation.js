import path from 'path';
import { suggestDirectoryForFile } from './directory-structure-analyzer-conventions.js';

export function validateFileLocation(filePath, fileType, conventions) {
  const expectedDirectory = suggestDirectoryForFile(path.basename(filePath), fileType, conventions);
  const actualDirectory = path.dirname(filePath).replace(/\\/g, '/');

  const isCorrect = actualDirectory.includes(expectedDirectory.replace(/^\//, ''));

  return {
    isCorrect,
    filePath,
    expectedDirectory,
    actualDirectory,
    suggestion: isCorrect ? null : `Move to ${expectedDirectory}`
  };
}

export function detectArchitecturalDrift(files, conventions) {
  const drift = [];

  for (const file of files) {
    const validation = validateFileLocation(file.path, file.type, conventions);

    if (!validation.isCorrect) {
      drift.push({
        ...validation,
        severity: 'medium',
        type: 'architectural_drift',
        message: `File ${file.path} is in wrong directory. Should be in ${validation.expectedDirectory}`
      });
    }
  }

  return drift;
}

export function calculateArchitectureOrganizationScore(files, conventions) {
  if (files.length === 0) {
    return { score: 100, total: 0, correct: 0, incorrect: 0 };
  }

  let correct = 0;
  const drift = [];

  for (const file of files) {
    const validation = validateFileLocation(file.path, file.type, conventions);
    if (validation.isCorrect) {
      correct++;
    } else {
      drift.push(validation);
    }
  }

  const score = Math.round((correct / files.length) * 100);

  return {
    score,
    total: files.length,
    correct,
    incorrect: drift.length,
    drift,
    level: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor'
  };
}
