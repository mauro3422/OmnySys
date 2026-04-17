import { getRegisteredTables, getTableDefinition } from '../../../storage/database/schema-registry/index.js';

function buildSchemaRecommendations(report, missingTables, historicalStores = null) {
  const missingColumns = Array.isArray(report?.missingColumns) ? report.missingColumns : [];
  const extraColumns = Array.isArray(report?.extraColumns) ? report.extraColumns : [];
  const recommendations = [];

  if (missingTables > 0) {
    recommendations.push({
      severity: 'high',
      message: `Missing ${missingTables} table(s). Run restart_server({ clearCache: true }) to recreate.`,
      action: 'restart_server'
    });
  }

  if (missingColumns.length > 0) {
    recommendations.push({
      severity: 'medium',
      message: `${missingColumns.reduce((sum, item) => sum + (Array.isArray(item?.columns) ? item.columns.length : 0), 0)} column(s) missing.`,
      action: 'auto_migrate'
    });
  }

  if (extraColumns.length > 0) {
    recommendations.push({
      severity: 'low',
      message: `${extraColumns.reduce((sum, item) => sum + (Array.isArray(item?.columns) ? item.columns.length : 0), 0)} extra column(s) detected.`,
      action: 'update_registry'
    });
  }

  if (historicalStores?.missingStoreCount > 0) {
    recommendations.push({
      severity: historicalStores.readyStoreCount > 0 ? 'medium' : 'high',
      message: `${historicalStores.missingStoreCount} historical store(s) missing.`,
      action: 'preserve_history_stores'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'info',
      message: 'Schema is healthy and synchronized with registry.',
      action: 'none'
    });
  }

  return recommendations;
}

export function getDatabaseSchemaStatus(db) {
  let stage = 'start';
  try {
    if (!db) return { success: false, error: 'Database not initialized', timestamp: new Date().toISOString() };

    stage = 'loadTables';
    const registeredTableNames = new Set(getRegisteredTables());
    const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const trackedTables = existingTables.filter((table) => registeredTableNames.has(table.name));
    const untrackedTables = existingTables.filter((table) => !registeredTableNames.has(table.name));

    stage = 'loadColumns';
    const tablesInfo = trackedTables.map((table) => ({
      name: table.name,
      columns: db.prepare(`PRAGMA table_info(${table.name})`).all().map((column) => ({
        name: column.name,
        type: column.type,
        nullable: !column.notnull,
        hasDefault: column.dflt_value !== null,
        isPk: column.pk > 0
      }))
    }));

    stage = 'deriveReport';
    const tableByName = new Map(tablesInfo.map((table) => [table.name, Array.isArray(table.columns) ? table.columns : []]));
    const reportTables = getRegisteredTables().map((name) => {
      const def = getTableDefinition(name);
      const columns = tableByName.get(name) || [];
      const registeredColumns = Array.isArray(def?.columns) ? def.columns : [];
      const registeredNames = new Set(registeredColumns.map((column) => column.name));
      const actualNames = new Set(columns.map((column) => column.name));
      const missingColumns = registeredColumns.filter((column) => !actualNames.has(column.name));
      const extraColumns = columns.filter((column) => !registeredNames.has(column.name));
      const status = missingColumns.length > 0 || extraColumns.length > 0 ? 'mismatch' : 'aligned';

      return {
        name,
        status,
        registeredColumns,
        actualColumns: columns,
        missingColumns,
        extraColumns
      };
    });

    const missingColumns = reportTables
      .filter((table) => table.missingColumns.length > 0)
      .map((table) => ({
        table: table.name,
        columns: table.missingColumns
      }));

    const extraColumns = reportTables
      .filter((table) => table.extraColumns.length > 0)
      .map((table) => ({
        table: table.name,
        columns: table.extraColumns
      }));

    stage = 'buildSummary';
    const report = { tables: reportTables, missingColumns, extraColumns };
    const totalTables = getRegisteredTables().length;
    const missingTables = totalTables - trackedTables.length;
    const tablesWithDrift = reportTables.filter((table) => table?.status === 'mismatch' || table?.status === 'missing').length;

    let health = 'healthy';
    let healthScore = 100;
    if (missingTables > 0) {
      health = 'critical';
      healthScore -= 40;
    }
    if (missingColumns.length > 0) {
      health = health === 'critical' ? 'critical' : 'warning';
      healthScore -= Math.min(30, missingColumns.length * 5);
    }
    if (extraColumns.length > 0) {
      health = health === 'critical' ? 'critical' : 'warning';
      healthScore -= Math.min(20, extraColumns.length * 3);
    }
    healthScore = Math.max(0, healthScore);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      health: {
        status: health,
        score: healthScore,
        grade: healthScore >= 90 ? 'A' : healthScore >= 70 ? 'B' : healthScore >= 50 ? 'C' : 'D'
      },
      summary: {
        totalRegisteredTables: totalTables,
        existingTables: trackedTables.length,
        untrackedTables: untrackedTables.length,
        missingTables,
        tablesWithDrift,
        totalMissingColumns: missingColumns.reduce((sum, item) => sum + (Array.isArray(item?.columns) ? item.columns.length : 0), 0),
        totalExtraColumns: extraColumns.reduce((sum, item) => sum + (Array.isArray(item?.columns) ? item.columns.length : 0), 0)
      },
      tables: reportTables,
      untrackedTables: untrackedTables.map((table) => table.name),
      missingColumns,
      extraColumns,
      recommendations: buildSchemaRecommendations(report, missingTables)
    };
  } catch (error) {
    return { success: false, error: `${stage}: ${error.message}`, timestamp: new Date().toISOString() };
  }
}
