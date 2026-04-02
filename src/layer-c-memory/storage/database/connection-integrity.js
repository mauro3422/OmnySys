export function probeDatabaseIntegrity(db, logger) {
  const checkedAt = new Date().toISOString();

  if (!db || db.open === false) {
    return {
      healthy: false,
      trustworthy: false,
      status: 'unavailable',
      mode: 'quick_check',
      checkedAt,
      summary: 'SQLite connection is unavailable.',
      findings: ['database_connection_closed']
    };
  }

  try {
    const rows = db.prepare('PRAGMA quick_check').all();
    const findings = Array.isArray(rows)
      ? rows
        .map((row) => Object.values(row || {})[0])
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
      : [];
    const healthy = findings.length === 1 && findings[0].trim().toLowerCase() === 'ok';

    const result = {
      healthy,
      trustworthy: healthy,
      status: healthy ? 'healthy' : 'degraded',
      mode: 'quick_check',
      checkedAt,
      summary: healthy
        ? 'SQLite quick_check returned ok.'
        : `SQLite quick_check reported ${findings.length} issue(s).`,
      findings: healthy ? [] : findings
    };

    if (!healthy && logger) {
      logger.warn(`[Connection] SQLite integrity probe failed: ${result.summary}`);
    }

    return result;
  } catch (error) {
    const result = {
      healthy: false,
      trustworthy: false,
      status: 'failed',
      mode: 'quick_check',
      checkedAt,
      summary: `SQLite integrity probe failed: ${error.message}`,
      findings: [error.message]
    };

    if (logger) {
      logger.warn(`[Connection] ${result.summary}`);
    }

    return result;
  }
}

export default probeDatabaseIntegrity;
