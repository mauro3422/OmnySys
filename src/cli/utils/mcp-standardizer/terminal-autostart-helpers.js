const AUTO_START_BLOCK_MARKER = 'OmnySys MCP Auto-Start';
const AUTO_START_TOKEN_MARKERS = ['omny_cli', 'omnyCli', 'mcp-autostart', 'omny.js'];

function isBlockTerminator(line) {
  const trimmed = line.trim();
  return trimmed === 'fi' || trimmed === '}';
}

function isAutoStartMarkerLine(line) {
  return AUTO_START_TOKEN_MARKERS.some((marker) => line.includes(marker));
}

export function stripTerminalAutoStartConfig(content) {
  const lines = content.split('\n');
  const filteredLines = [];
  let inOmnyBlock = false;

  for (const line of lines) {
    if (line.includes(AUTO_START_BLOCK_MARKER)) {
      inOmnyBlock = true;
      continue;
    }

    if (inOmnyBlock && isBlockTerminator(line)) {
      inOmnyBlock = false;
      continue;
    }

    if (!inOmnyBlock && !isAutoStartMarkerLine(line)) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}
