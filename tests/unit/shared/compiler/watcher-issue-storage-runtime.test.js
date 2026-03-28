import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { findOutdatedWatcherAlertIds } from '../../../../src/shared/compiler/watcher-issue-storage-runtime.js';

describe('watcher-issue-storage-runtime', () => {
  let tempRoot = null;

  afterEach(async () => {
    if (!tempRoot) {
      return;
    }

    await fs.rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  });

  async function writeFileWithLineCount(filePath, lineCount) {
    const lines = Array.from({ length: lineCount }, (_, index) => `export const value${index} = ${index};`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
  }

  it('marks file-size alerts outdated when the current file drops below the stored threshold', async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'omnysys-watcher-'));
    const relativeFile = 'src/cli/utils/mcp-standardizer/clients.js';
    const absoluteFile = path.join(tempRoot, relativeFile);

    await writeFileWithLineCount(absoluteFile, 2);

    const alerts = [{
      id: 218,
      filePath: relativeFile,
      issueType: 'code_file_size_medium',
      severity: 'medium',
      detectedAt: new Date(Date.now() + 5000).toISOString(),
      context: {
        issues: [{
          threshold: 300,
          metricValue: 318
        }]
      }
    }];

    const outdatedIds = await findOutdatedWatcherAlertIds(tempRoot, alerts, { db: null });

    expect(outdatedIds).toEqual([218]);
  });

  it('keeps file-size alerts active while the current file still exceeds the threshold', async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'omnysys-watcher-'));
    const relativeFile = 'src/cli/utils/mcp-standardizer/clients.js';
    const absoluteFile = path.join(tempRoot, relativeFile);

    await writeFileWithLineCount(absoluteFile, 320);

    const alerts = [{
      id: 219,
      filePath: relativeFile,
      issueType: 'code_file_size_medium',
      severity: 'medium',
      detectedAt: new Date(Date.now() + 5000).toISOString(),
      context: {
        issues: [{
          threshold: 300,
          metricValue: 320
        }]
      }
    }];

    const outdatedIds = await findOutdatedWatcherAlertIds(tempRoot, alerts, { db: null });

    expect(outdatedIds).toEqual([]);
  });
});
