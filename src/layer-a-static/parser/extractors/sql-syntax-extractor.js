import { walk } from './utils.js';

export class SqlSyntaxExtractor {
    extract(sqlTree, rawSql) {
        let operation = 'UNKNOWN';
        const tables = new Set();
        const columns = new Set();

        walk(sqlTree.rootNode, [
            'select', 'insert', 'update', 'delete', 'identifier', 'column_name', 'field'
        ], (node) => {
            // Determinar operación principal
            if (operation === 'UNKNOWN') {
                if (node.type === 'select') operation = 'SELECT';
                else if (node.type === 'insert') operation = 'INSERT';
                else if (node.type === 'update') operation = 'UPDATE';
                else if (node.type === 'delete') operation = 'DELETE';
            }

            // Extraer columnas
            if (node.type === 'column_name' || node.type === 'field') {
                const colTxt = rawSql.slice(node.startIndex, node.endIndex).toLowerCase().trim();
                if (this._isValidColumn(colTxt)) {
                    columns.add(colTxt);
                }
            }

            // Extraer tablas/identificadores
            if (node.type === 'identifier') {
                const txt = rawSql.slice(node.startIndex, node.endIndex).toLowerCase();
                if (this._isValidTable(txt, node)) {
                    tables.add(txt);
                }
            }
        });

        return { operation, tables, columns };
    }

    _isValidColumn(colTxt) {
        return colTxt && colTxt.length > 1 && !colTxt.includes('.') && colTxt !== '_tbl_';
    }

    _isValidTable(txt, node) {
        if (txt === '_tbl_') return false;
        const reserved = ['select', 'from', 'where', 'limit', 'join', 'insert', 'into', 'values', 'update', 'set', 'delete'];
        if (txt.length <= 2 || reserved.includes(txt)) return false;

        const pType = node.parent?.type;
        return pType && (pType === 'object_reference' || pType.includes('relation') || pType === 'from' || pType === 'update' || pType === 'insert');
    }
}
