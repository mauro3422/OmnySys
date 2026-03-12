import { query_graph } from '../query-graph.js';

export function isLowSignalExportName(name = '') {
  return name.length < 3 || /^[a-z]$/.test(name);
}

export async function findCrossFileDuplicateExports(newExports, filePath, context, logger) {
  const duplicates = [];

  for (const exportItem of newExports) {
    if (isLowSignalExportName(exportItem.name)) {
      continue;
    }

    try {
      const existing = await query_graph(
        { queryType: 'instances', symbolName: exportItem.name },
        context
      );

      if (!existing?.success || existing?.data?.totalInstances <= 0) {
        continue;
      }

      const otherFiles = existing.data.instances.filter(
        (instance) => !instance.file_path.endsWith(filePath)
      );

      if (otherFiles.length === 0) {
        continue;
      }

      duplicates.push({
        symbol: exportItem.name,
        type: exportItem.type,
        existingInstances: otherFiles.length,
        existingFiles: otherFiles.map((item) => item.file_path),
        existingLocations: otherFiles.map((item) => ({
          file: item.file_path,
          line: item.line_start
        }))
      });
    } catch (error) {
      logger.debug(`[CrossFileGuard] Skip ${exportItem.name}: ${error.message}`);
    }
  }

  return duplicates;
}
