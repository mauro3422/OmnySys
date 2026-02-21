import path from 'path';
import { validateInputs } from './check/validators.js';
import { loadFileData } from './check/data-loader.js';
import {
  formatFileMetrics,
  formatDependencies,
  formatSemanticConnections,
  formatMetadataSection,
  formatBrokenConnections,
  formatSideEffects,
  generateRecommendations
} from './check/formatters.js';

const SEPARATOR = '------------------------------------------------------------';

export async function checkLogic(filePath, options = {}) {
  const { silent = false } = options;

  const validation = validateInputs(filePath, silent);
  if (!validation.valid) {
    return { success: false, error: validation.error, exitCode: validation.exitCode };
  }

  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const projectPath = process.cwd();

  try {
    const loadResult = await loadFileData(projectPath, filePath);
    if (!loadResult.success) {
      if (!silent) {
        console.error(`\n${loadResult.error}`);
        if (loadResult.availableFiles) {
          console.error('\nAvailable files:');
          for (const f of loadResult.availableFiles) {
            console.error(`   - ${f}`);
          }
          console.error('   ...\n');
        }
        if (loadResult.hint) {
          console.error(`\n${loadResult.hint}`);
        }
      }
      return { success: false, error: loadResult.error, exitCode: loadResult.exitCode };
    }

    const { fileData, matchedPath } = loadResult;
    const output = [];

    if (matchedPath && matchedPath !== filePath) {
      output.push(`Resolved file path: ${matchedPath}\n`);
    }

    output.push(`${SEPARATOR}\n`);
    output.push(...formatFileMetrics(fileData));
    output.push(...formatDependencies(fileData));
    output.push(...formatSemanticConnections(fileData));
    output.push(...formatMetadataSection(fileData));
    output.push(...formatBrokenConnections(fileData));
    output.push(...formatSideEffects(fileData));
    output.push(SEPARATOR);
    output.push('RECOMMENDATIONS\n');
    output.push(...generateRecommendations(fileData));
    output.push(SEPARATOR + '\n');

    if (!silent) {
      output.forEach(line => console.log(line));
    }

    return {
      success: true,
      exitCode: 0,
      fileData,
      matchedPath,
      output: output.join('\n')
    };
  } catch (error) {
    if (!silent) {
      console.error('\nCheck failed:');
      console.error(`   ${error.message}\n`);
    }
    return { success: false, error: error.message, exitCode: 1 };
  }
}

export async function check(filePath) {
  const result = await checkLogic(filePath);
  process.exit(result.exitCode);
}
