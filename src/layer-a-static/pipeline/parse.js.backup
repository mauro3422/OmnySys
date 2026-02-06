import { parseFileFromDisk } from '../parser.js';

export async function parseFiles(files, verbose = true) {
  if (verbose) console.log('ðŸ“ Parsing files...');
  const parsedFiles = {};

  for (let i = 0; i < files.length; i++) {
    if (verbose && i % Math.max(1, Math.floor(files.length / 5)) === 0) {
      console.log(`  ${i}/${files.length} files parsed...`);
    }
    const parsed = await parseFileFromDisk(files[i]);
    parsedFiles[files[i]] = parsed;
  }

  if (verbose) console.log('  âœ“ All files parsed\n');
  return parsedFiles;
}
