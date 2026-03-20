import { TABLE_DEFINITIONS } from '../../../../../layer-c-memory/storage/database/schema-registry.js';

export class SchemaDriftRule {
    constructor() {
        this.type = 'sql-schema-drift';
        this.knownColumnsByTable = {};
        this._initSchema();
    }

    _initSchema() {
        for (const [tableName, definition] of Object.entries(TABLE_DEFINITIONS)) {
            this.knownColumnsByTable[tableName] = new Set(definition.columns.map(col => col.name));
        }
    }

    check(findings, filePath, sqlAtoms, { createFinding }) {
        for (const atom of sqlAtoms) {
            const referencedCols = atom._meta?.columns_referenced;
            const tables = atom._meta?.tables_referenced;

            if (!hasSchemaReferenceData(referencedCols, tables)) {
                continue;
            }

            for (const table of tables) {
                const knownCols = this.knownColumnsByTable[table];
                if (!knownCols) continue;

                const missingColumns = findMissingColumns(referencedCols, knownCols);
                for (const column of missingColumns) {
                    findings.push(createFinding(
                        this.type,
                        'high',
                        filePath,
                        atom,
                        `Column '${column}' referenced by SQL but not in schema for table '${table}' — runtime error risk`,
                        { column, table }
                    ));
                }
            }
        }
    }
}

function hasSchemaReferenceData(referencedCols, tables) {
    return Boolean(
        referencedCols &&
        referencedCols.length > 0 &&
        tables &&
        tables.length > 0
    );
}

function findMissingColumns(referencedCols, knownCols) {
    const missingColumns = [];

    for (const col of referencedCols) {
        if (col === '*' || col.length <= 1) continue;
        if (!knownCols.has(col)) {
            missingColumns.push(col);
        }
    }

    return missingColumns;
}
