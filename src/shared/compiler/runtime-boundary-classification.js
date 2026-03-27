export function classifyBoundaryError(error) {
  if (!error) return { isBoundaryError: false };

  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  if (
    code === 'econnrefused' ||
    code === 'enotfound' ||
    code === 'etimedout' ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch failed')
  ) {
    return { isBoundaryError: true, type: 'network' };
  }

  if (code.startsWith('e') && ['enoent', 'eaccess', 'eperm', 'eisdir', 'enotdir'].includes(code)) {
    return { isBoundaryError: true, type: 'filesystem' };
  }

  if (code === 'sqlite_error' || message.includes('database') || message.includes('sql')) {
    return { isBoundaryError: true, type: 'database' };
  }

  return { isBoundaryError: false };
}
