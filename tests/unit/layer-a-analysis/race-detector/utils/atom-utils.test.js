import { describe, it, expect } from 'vitest';
import {
  findAtomById,
  extractQueueName,
  isSharedStateVariable,
  isJavaScriptKeyword
} from '#layer-a/race-detector/utils/atom-utils.js';

describe('race-detector/utils/atom-utils.js', () => {
  const project = {
    modules: [
      {
        files: [
          {
            filePath: 'src/app/service.js',
            atoms: [{ id: 'src/app/service.js::load', name: 'load', code: '' }]
          }
        ]
      }
    ]
  };

  it('finds atom by exact id and by file::function format', () => {
    expect(findAtomById('src/app/service.js::load', project)?.name).toBe('load');
    expect(findAtomById('service.js::load', project)?.name).toBe('load');
  });

  it('extracts queue names from supported patterns', () => {
    expect(extractQueueName('queue = jobsQueue')).toBe('jobsQueue');
    expect(extractQueueName('new TaskQueue("criticalJobs")')).toBe('criticalJobs');
    expect(extractQueueName('queue("serialPipe")')).toBe('serialPipe');
  });

  it('detects shared-state names and JavaScript keywords', () => {
    expect(isSharedStateVariable('window.user')).toBe(true);
    expect(isSharedStateVariable('sharedBuffer')).toBe(true);
    expect(isSharedStateVariable('localVar')).toBe(false);
    expect(isJavaScriptKeyword('function')).toBe(true);
    expect(isJavaScriptKeyword('domainObject')).toBe(false);
  });
});

