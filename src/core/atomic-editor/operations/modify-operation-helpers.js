import path from 'path';
import { escapeRegex } from '../../../shared/utils/regex-utils.js';

export function resolveAbsolutePath(context, filePath) {
  return path.join(context.projectPath, filePath);
}

export function getIndexFromPosition(lines, line, col) {
  let index = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    index += lines[i].length + 1;
  }
  return index + col;
}

export function getPositionFromIndex(content, index) {
  const lines = content.slice(0, index).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1]?.length || 0
  };
}

export function extractRange(content, range) {
  const lines = content.split('\n');
  return lines.slice(range.startLine - 1, range.endLine).join('\n');
}

export async function loadSymbolRange(context, filePath, symbolName, logger) {
  try {
    const { loadAtoms } = await import('../../../layer-c-memory/storage/index.js');
    const atoms = await loadAtoms(context.projectPath, filePath);
    const atom = atoms.find((item) => item.name === symbolName);

    if (atom && atom.line !== undefined) {
      return {
        startLine: atom.line,
        endLine: atom.line + (atom.linesOfCode || 1) - 1
      };
    }
  } catch (error) {
    logger?.warn?.(`Could not get symbol range for ${symbolName}: ${error.message}`);
  }

  return null;
}

export function generateSuggestions(oldString, targetContent) {
  const suggestions = [];
  const oldTrimmed = oldString.trim();

  const lines = targetContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === oldTrimmed) {
      suggestions.push({
        type: 'WHITESPACE_MISMATCH',
        confidence: 'high',
        line: i + 1,
        suggestedString: line,
        reason: 'Same content but different indentation/whitespace'
      });
    }
  }

  const oldFirstLine = oldTrimmed.split('\n')[0];
  if (oldFirstLine) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(oldFirstLine)) {
        const contextLines = lines.slice(i, i + oldTrimmed.split('\n').length);
        const contextString = contextLines.join('\n');

        if (contextString.length > 0 && contextString !== oldString) {
          suggestions.push({
            type: 'CONTEXT_MATCH',
            confidence: 'medium',
            line: i + 1,
            suggestedString: contextString,
            reason: `Found "${oldFirstLine.substring(0, 30)}..." at line ${i + 1}`
          });
        }

        if (suggestions.length >= 5) break;
      }
    }
  }

  const oldStart = oldTrimmed.substring(0, 50);
  if (targetContent.includes(oldStart)) {
    const idx = targetContent.indexOf(oldStart);
    const linesBefore = targetContent.substring(0, idx).split('\n').length;
    suggestions.push({
      type: 'PARTIAL_MATCH',
      confidence: 'medium',
      line: linesBefore,
      suggestedString: targetContent.substring(idx, idx + Math.min(oldString.length, 200)),
      reason: 'Content starts similarly but differs later'
    });
  }

  return suggestions.slice(0, 5);
}

export function getFilePreview(fileContent, oldString) {
  const lines = fileContent.split('\n');
  const oldFirstLine = oldString.split('\n')[0].trim();

  let targetLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (oldFirstLine.length > 10 && lines[i].includes(oldFirstLine.substring(0, 20))) {
      targetLine = i;
      break;
    }
  }

  if (targetLine === -1) {
    return lines.slice(0, 30).map((line, index) => `${index + 1}: ${line}`).join('\n');
  }

  const start = Math.max(0, targetLine - 5);
  const end = Math.min(lines.length, targetLine + 25);

  return lines.slice(start, end).map((line, index) => `${start + index + 1}: ${line}`).join('\n');
}

export async function calculateModification(content, options, filePath, context, logger) {
  const { oldString, newString, all, symbolName } = options;

  let newContent = content;
  let position = { line: 0, column: 0 };
  let replacements = 0;

  if (symbolName) {
    const atomRange = await loadSymbolRange(context, filePath, symbolName, logger);
    if (atomRange) {
      const lines = content.split('\n');
      const startIdx = getIndexFromPosition(lines, atomRange.startLine, 0);
      const endIdx = getIndexFromPosition(lines, atomRange.endLine + 1, 0);

      const prefix = content.slice(0, startIdx);
      const target = content.slice(startIdx, endIdx);
      const suffix = content.slice(endIdx);

      if (oldString) {
        if (all) {
          const regex = new RegExp(escapeRegex(oldString), 'g');
          const matches = target.match(regex);
          replacements = matches ? matches.length : 0;
          newContent = prefix + target.replace(regex, newString) + suffix;
          position = { line: atomRange.startLine, column: 0 };
        } else {
          const matchIdx = target.indexOf(oldString);
          if (matchIdx !== -1) {
            replacements = 1;
            newContent = prefix + target.slice(0, matchIdx) + newString + target.slice(matchIdx + oldString.length) + suffix;
            position = getPositionFromIndex(content, startIdx + matchIdx);
          }
        }
      } else {
        replacements = 1;
        newContent = prefix + newString + suffix;
        position = { line: atomRange.startLine, column: 0 };
      }

      return { newContent, position, replacements };
    }
  }

  if (all) {
    const regex = new RegExp(escapeRegex(oldString), 'g');
    const matches = content.match(regex);
    replacements = matches ? matches.length : 0;
    const firstIndex = content.indexOf(oldString);
    if (firstIndex !== -1) position = getPositionFromIndex(content, firstIndex);
    newContent = content.replace(regex, newString);
  } else {
    const index = content.indexOf(oldString);
    if (index !== -1) {
      replacements = 1;
      newContent = content.slice(0, index) + newString + content.slice(index + oldString.length);
      position = getPositionFromIndex(content, index);
    }
  }

  return { newContent, position, replacements };
}
