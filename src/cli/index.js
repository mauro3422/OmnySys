import { fileURLToPath } from 'url';
import { showHelp } from './help.js';

export async function main(argv = process.argv) {
  const command = argv[2] || 'help';
  const projectPath = argv[3];

  switch (command) {
    case 'analyze':
      await (await import('./commands/analyze.js')).analyze(projectPath);
      break;

    case 'analyze-file':
      await (await import('./commands/analyze-file.js')).analyzeFile(projectPath);
      break;

    case 'check':
      await (await import('./commands/check.js')).check(projectPath);
      break;

    case 'consolidate':
      await (await import('./commands/consolidate.js')).consolidate(projectPath);
      break;

    case 'serve':
      await (await import('./commands/serve.js')).serve(projectPath);
      break;

    case 'clean':
      await (await import('./commands/clean.js')).clean(projectPath);
      break;

    case 'status':
      await (await import('./commands/status.js')).status(projectPath);
      break;

    case 'export':
      await (await import('./commands/export.js')).exportMap(projectPath);
      break;

    case 'ai': {
      const subcommand = argv[3];
      const mode = argv[4];
      await (await import('./commands/ai.js')).ai(subcommand, mode);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      break;

    default:
      console.error(`\nUnknown command: ${command}\n`);
      showHelp();
      process.exit(1);
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  });
}

export async function analyze(...args) {
  return (await import('./commands/analyze.js')).analyze(...args);
}

export async function analyzeFile(...args) {
  return (await import('./commands/analyze-file.js')).analyzeFile(...args);
}

export async function check(...args) {
  return (await import('./commands/check.js')).check(...args);
}

export async function consolidate(...args) {
  return (await import('./commands/consolidate.js')).consolidate(...args);
}

export async function serve(...args) {
  return (await import('./commands/serve.js')).serve(...args);
}

export async function clean(...args) {
  return (await import('./commands/clean.js')).clean(...args);
}

export async function status(...args) {
  return (await import('./commands/status.js')).status(...args);
}

export async function exportMap(...args) {
  return (await import('./commands/export.js')).exportMap(...args);
}

export async function ai(...args) {
  return (await import('./commands/ai.js')).ai(...args);
}
