import path from 'path';

export async function getRecentCommits(dataPath) {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');

  const execFileAsync = promisify(execFile);
  const cwd = dataPath ? path.dirname(dataPath) : process.cwd();

  try {
    const { stdout } = await execFileAsync('git', ['log', '--oneline', '-n', '10'], {
      cwd,
      timeout: 3000,
      windowsHide: true
    });

    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const spaceIdx = line.indexOf(' ');
        return {
          hash: line.slice(0, spaceIdx),
          message: line.slice(spaceIdx + 1)
        };
      });
  } catch {
    return [];
  }
}
