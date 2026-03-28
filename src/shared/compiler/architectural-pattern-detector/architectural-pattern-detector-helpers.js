function getFileBaseName(filePath) {
  const fileName = filePath ? filePath.split('/').pop() : 'module';
  return {
    fileName,
    baseName: fileName.replace('.js', '')
  };
}

export function buildGodObjectStructure(metadata) {
  const { fileName, baseName } = getFileBaseName(metadata.filePath || '');

  return {
    type: 'directory_structure',
    suggestion: `Split ${fileName} into:`,
    structure: {
      [`${baseName}/`]: {
        'index.js': 'Barrel exports (coordinator)',
        'core.js': 'Core business logic',
        'utils.js': 'Helper functions',
        'validators.js': 'Validation logic',
        'handlers.js': 'Event/request handlers'
      }
    },
    principle: 'Single Responsibility Principle + Directory-based modularity'
  };
}

export function classifyOperationalRole(fileName) {
  const name = fileName.toLowerCase();

  if (name.includes('orchestrator') || name.includes('coordinator')) {
    return 'orchestrator';
  }
  if (name.includes('builder')) {
    return 'builder';
  }
  if (name.includes('analyzer')) {
    return 'analyzer';
  }
  if (name.includes('resolver')) {
    return 'resolver';
  }
  if (name.includes('bridge')) {
    return 'bridge';
  }
  if (name.includes('policy')) {
    return 'policy';
  }

  return 'standard';
}
