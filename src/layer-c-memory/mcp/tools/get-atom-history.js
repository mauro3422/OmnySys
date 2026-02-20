/**
 * MCP Tool: get_atom_history
 * Historial de cambios de un átomo/función usando Git
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { getAtomDetails } from '#layer-c/query/queries/file-query/index.js';

const execAsync = promisify(exec);

export async function get_atom_history(args, context) {
  const { filePath, functionName, maxCommits = 10, includeDiff = false } = args;
  const { projectPath } = context;
  
  try {
    const atom = await getAtomDetails(projectPath, filePath, functionName);
    
    if (!atom) {
      return {
        error: `Function '${functionName}' not found in ${filePath}`,
        suggestion: 'The function may not be analyzed yet'
      };
    }

    const fullPath = join(projectPath, filePath);
    
    const isGitRepo = await checkGitRepo(projectPath);
    if (!isGitRepo) {
      return {
        atom: {
          id: atom.id,
          name: atom.name,
          file: atom.filePath,
          line: atom.line
        },
        error: 'Not a git repository',
        suggestion: 'Initialize git to track history'
      };
    }

    const logResult = await execAsync(
      `git log --follow --format="%H|%an|%ae|%ad|%s" --date=short -n ${maxCommits} -- "${filePath}"`,
      { cwd: projectPath, maxBuffer: 1024 * 1024 }
    );

    const commits = parseGitLog(logResult.stdout);

    const history = {
      atom: {
        id: atom.id,
        name: atom.name,
        file: atom.filePath,
        line: atom.line,
        endLine: atom.endLine,
        linesOfCode: atom.linesOfCode,
        complexity: atom.complexity
      },
      current: {
        extractedAt: atom.extractedAt || atom._meta?.extractionTime,
        archetype: atom.archetype,
        purpose: atom.purpose,
        callerPattern: atom.callerPattern?.id,
        dnaHash: atom.dna?.structuralHash
      },
      commits: [],
      evolution: {
        firstCommit: null,
        lastCommit: null,
        totalCommits: commits.length,
        authors: [],
        complexityTrend: 'unknown'
      },
      recentChanges: []
    };

    const authors = new Set();
    
    for (const commit of commits) {
      const commitInfo = {
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        author: commit.author,
        email: commit.email,
        date: commit.date,
        message: commit.message
      };

      if (includeDiff) {
        try {
          const diffResult = await execAsync(
            `git show --stat --format="" ${commit.hash} -- "${filePath}"`,
            { cwd: projectPath, maxBuffer: 1024 * 1024 }
          );
          commitInfo.stats = parseDiffStats(diffResult.stdout);
        } catch {
          commitInfo.stats = null;
        }
      }

      history.commits.push(commitInfo);
      authors.add(commit.author);
    }

    if (commits.length > 0) {
      history.evolution.firstCommit = commits[commits.length - 1];
      history.evolution.lastCommit = commits[0];
      history.evolution.authors = Array.from(authors);
    }

    history.recentChanges = await getRecentChanges(projectPath, filePath, atom.line, atom.endLine);

    history.blame = await getBlameInfo(projectPath, filePath, atom.line, atom.endLine);

    return history;
  } catch (error) {
    return { error: error.message };
  }
}

async function checkGitRepo(projectPath) {
  try {
    await execAsync('git rev-parse --git-dir', { cwd: projectPath });
    return true;
  } catch {
    return false;
  }
}

function parseGitLog(output) {
  if (!output.trim()) return [];
  
  const lines = output.trim().split('\n');
  const commits = [];
  
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length >= 5) {
      commits.push({
        hash: parts[0],
        author: parts[1],
        email: parts[2],
        date: parts[3],
        message: parts.slice(4).join('|')
      });
    }
  }
  
  return commits;
}

function parseDiffStats(output) {
  if (!output.trim()) return null;
  
  const lines = output.trim().split('\n');
  const lastLine = lines[lines.length - 1];
  
  const match = lastLine.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(\-\))?/);
  
  if (match) {
    return {
      filesChanged: parseInt(match[1]) || 0,
      insertions: parseInt(match[2]) || 0,
      deletions: parseInt(match[3]) || 0
    };
  }
  
  return null;
}

async function getRecentChanges(projectPath, filePath, startLine, endLine) {
  try {
    const result = await execAsync(
      `git log --oneline -n 5 --format="%h|%ad|%s" --date=short -L ${startLine},${endLine}:"${filePath}"`,
      { cwd: projectPath, maxBuffer: 1024 * 1024 }
    );
    
    if (!result.stdout.trim()) return [];
    
    return result.stdout.trim().split('\n')
      .filter(line => /^[0-9a-f]{4,}\|/.test(line))  // only lines matching "hash|date|message"
      .map(line => {
        const parts = line.split('|');
        return {
          shortHash: parts[0],
          date: parts[1],
          message: parts.slice(2).join('|')
        };
      });
  } catch {
    return [];
  }
}

async function getBlameInfo(projectPath, filePath, startLine, endLine) {
  try {
    const result = await execAsync(
      `git blame -L ${startLine},${endLine} --line-porcelain "${filePath}"`,
      { cwd: projectPath, maxBuffer: 1024 * 1024 }
    );
    
    const blameLines = result.stdout.split('\n');
    const blameInfo = {
      lines: [],
      summary: {
        totalLines: 0,
        authors: new Set(),
        oldestLine: null,
        newestLine: null
      }
    };
    
    let currentBlock = {};
    
    for (const line of blameLines) {
      if (line.startsWith('author ')) {
        currentBlock.author = line.substring(7);
      } else if (line.startsWith('author-time ')) {
        const timestamp = parseInt(line.substring(12));
        currentBlock.timestamp = timestamp;
        currentBlock.date = new Date(timestamp * 1000).toISOString().split('T')[0];
      } else if (line.startsWith('summary ')) {
        currentBlock.summary = line.substring(8);
      } else if (line.match(/^\t/)) {
        if (currentBlock.author) {
          blameInfo.lines.push({
            author: currentBlock.author,
            date: currentBlock.date,
            summary: currentBlock.summary
          });
          blameInfo.summary.authors.add(currentBlock.author);
          
          if (!blameInfo.summary.oldestLine || currentBlock.timestamp < blameInfo.summary.oldestLine.timestamp) {
            blameInfo.summary.oldestLine = currentBlock;
          }
          if (!blameInfo.summary.newestLine || currentBlock.timestamp > blameInfo.summary.newestLine.timestamp) {
            blameInfo.summary.newestLine = currentBlock;
          }
        }
        currentBlock = {};
      }
    }
    
    blameInfo.summary.totalLines = blameInfo.lines.length;
    blameInfo.summary.authors = Array.from(blameInfo.summary.authors);
    
    return blameInfo;
  } catch {
    return null;
  }
}
