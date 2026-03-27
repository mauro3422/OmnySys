import { createLogger } from '#utils/logger.js';
import path from 'path';

const logger = createLogger('OmnySys:DirectoryStructureAnalyzer');

export const DIRECTORY_PATTERNS = {
  helpers: ['/utils/', '/helpers/', '/common/', '/lib/'],
  policies: ['/compiler/', '/guards/', '/policies/', '/rules/', '/validators/'],
  services: ['/services/', '/core/', '/domain/', '/application/'],
  controllers: ['/controllers/', '/handlers/', '/routes/'],
  models: ['/models/', '/entities/', '/schemas/'],
  tests: ['/tests/', '/__tests__/', '/specs/']
};

export const FILE_TYPE_TO_DIRECTORY = {
  helper: 'helpers',
  utility: 'helpers',
  policy: 'policies',
  guard: 'policies',
  validator: 'policies',
  service: 'services',
  controller: 'controllers',
  handler: 'controllers',
  model: 'models',
  entity: 'models',
  test: 'tests'
};

function getDefaultConventions() {
  return {
    helperDirectories: ['/utils/', '/shared/', '/helpers/'],
    policyDirectories: ['/compiler/', '/guards/', '/policies/'],
    serviceDirectories: ['/services/', '/core/'],
    testDirectories: ['/tests/', '/__tests__/'],
    fileCount: 0
  };
}

export function analyzeDirectoryStructure(projectPath, repo) {
  if (!repo?.db) {
    logger.warn('[analyzeDirectoryStructure] DB not available');
    return getDefaultConventions();
  }

  try {
    const files = repo.db.prepare(`
      SELECT DISTINCT file_path
      FROM atoms
      WHERE file_path IS NOT NULL
    `).all();

    const conventions = {
      helperDirectories: new Set(),
      policyDirectories: new Set(),
      serviceDirectories: new Set(),
      testDirectories: new Set(),
      fileCount: files.length
    };

    for (const file of files) {
      const filePath = file.file_path.replace(/\\/g, '/');
      const dirPath = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const fileType = detectFileType(fileName);

      if (fileType === 'helper') {
        conventions.helperDirectories.add(dirPath);
      } else if (fileType === 'policy') {
        conventions.policyDirectories.add(dirPath);
      } else if (fileType === 'service') {
        conventions.serviceDirectories.add(dirPath);
      } else if (fileType === 'test') {
        conventions.testDirectories.add(dirPath);
      }
    }

    logger.info(`[analyzeDirectoryStructure] Analyzed ${files.length} files`);

    return {
      helperDirectories: Array.from(conventions.helperDirectories),
      policyDirectories: Array.from(conventions.policyDirectories),
      serviceDirectories: Array.from(conventions.serviceDirectories),
      testDirectories: Array.from(conventions.testDirectories),
      fileCount: conventions.fileCount
    };
  } catch (error) {
    logger.error(`[analyzeDirectoryStructure] Error: ${error.message}`);
    return getDefaultConventions();
  }
}

export function detectFileType(fileName) {
  const name = fileName.toLowerCase();

  if (name.includes('util') || name.includes('helper') || name.includes('common')) {
    return 'helper';
  }
  if (name.includes('policy') || name.includes('guard') || name.includes('rule') || name.includes('validator')) {
    return 'policy';
  }
  if (name.includes('service') || name.includes('manager') || name.includes('orchestrator')) {
    return 'service';
  }
  if (name.includes('controller') || name.includes('handler') || name.includes('route')) {
    return 'controller';
  }
  if (name.includes('model') || name.includes('entity') || name.includes('schema')) {
    return 'model';
  }
  if (name.includes('test') || name.includes('spec')) {
    return 'test';
  }

  return 'other';
}

export function suggestDirectoryForFile(fileName, fileType, conventions) {
  const directoryKey = FILE_TYPE_TO_DIRECTORY[fileType];

  if (!directoryKey) {
    return 'src/';
  }

  const directories = conventions[`${directoryKey}Directories`] || [];

  if (directories.length === 0) {
    const patterns = DIRECTORY_PATTERNS[directoryKey] || [];
    return patterns[0] || 'src/';
  }

  const sorted = [...directories].sort((a, b) => b.split('/').length - a.split('/').length);
  return sorted[0];
}

export function getDirectoryStructureDefaults() {
  return getDefaultConventions();
}
