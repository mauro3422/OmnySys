import Database from 'better-sqlite3';

try {
    const db = new Database('./.omnysysdata/omnysys.db');
    console.log('Opened DB');

    const result = db.prepare(`DELETE FROM risk_assessments WHERE id LIKE '%_category_score%' OR file_path LIKE '%_category_%'`).run();
    console.log(`Deleted ${result.changes} ghost risk assessments.`);

} catch (error) {
    console.error(error.message);
}
