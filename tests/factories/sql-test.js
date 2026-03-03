// tests/factories/sql-test.js
// Archivo de prueba para verificar la extracción SQL embebida

function getUserData(db, userId) {
    // Esto debería extraerse como SQL_QUERY (SELECT_from_users)
    const query = db.prepare('SELECT id, name, premium_status FROM users WHERE id = ?');
    return query.get(userId);
}

function updateSubscription(db, userId, newStatus) {
    // Esto debería extraerse como SQL_QUERY (UPDATE_from_subscriptions)
    const sql = `
        UPDATE subscriptions 
        SET status = ?, last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?
    `;
    const stmt = db.prepare(sql);
    stmt.run(newStatus, userId);
}

function removeLegacyData(db) {
    // Esto debería extraerse como SQL_QUERY (DELETE_from_audit_logs)
    db.run("DELETE FROM audit_logs WHERE created_at < '2020-01-01'");
}
