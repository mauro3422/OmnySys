import path from 'path';

export function getAlertFileSnapshot(projectPath, alert) {
  const id = alert?.id;
  if (!Number.isInteger(id)) return null;

  const detectedAtMs = Date.parse(alert?.detectedAt || '');
  if (!Number.isFinite(detectedAtMs)) return null;

  const relativePath = String(alert?.filePath || '');
  if (!relativePath) return null;

  return {
    id,
    detectedAtMs,
    relativePath,
    absolutePath: path.resolve(projectPath, relativePath)
  };
}
