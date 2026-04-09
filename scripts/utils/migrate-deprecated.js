import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), '.omnysysdata', 'omnysys.db');
console.log(`[Migrator] Ejecutando alteración de schema para: ${dbPath}`);

try {
    const db = new Database(dbPath);

    // Agregar is_deprecated
    try {
        db.prepare(`ALTER TABLE atoms ADD COLUMN is_deprecated BOOLEAN DEFAULT 0`).run();
        console.log('✅ Columna is_deprecated agregada a la tabla atoms');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('⚡ Columna is_deprecated ya existe. Saltando.');
        } else {
            throw e;
        }
    }

    // Agregar deprecated_reason
    try {
        db.prepare(`ALTER TABLE atoms ADD COLUMN deprecated_reason TEXT`).run();
        console.log('✅ Columna deprecated_reason agregada a la tabla atoms');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('⚡ Columna deprecated_reason ya existe. Saltando.');
        } else {
            throw e;
        }
    }

    db.close();
    console.log('Migración completada con éxito.');
} catch (error) {
    console.error('❌ Error migrando db:', error.message);
}
