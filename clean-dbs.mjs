import Database from 'better-sqlite3';
import path from 'path';

const projectBase = 'C:/Dev/OmnySystem';
const omnysysDbPath = path.join(projectBase, '.omnysysdata', 'omnysys.db');
const healthArchiveDbPath = path.join(projectBase, '.omnysysdata', 'health-history.db');

try {
  console.log('[omnysys.db] Opening...');
  const omnysysDb = new Database(omnysysDbPath);
  console.log('[omnysys.db] Clearing payload_json in compiler_metrics_snapshots...');
  const res1 = omnysysDb.exec("UPDATE compiler_metrics_snapshots SET payload_json = NULL WHERE payload_json IS NOT NULL;");
  console.log('[omnysys.db] Vacuuming...');
  omnysysDb.exec("VACUUM;");
  omnysysDb.exec("PRAGMA optimize;");
  omnysysDb.close();
  console.log('[omnysys.db] Done.');
} catch (e) {
  console.error('[omnysys.db] Error:', e.message);
}

try {
  console.log('[health-history.db] Opening...');
  const healthDb = new Database(healthArchiveDbPath);
  
  console.log('[health-history.db] Clearing payload_json in compiler_health_daily_snapshots...');
  try {
    healthDb.exec("UPDATE compiler_health_daily_snapshots SET payload_json = NULL WHERE payload_json IS NOT NULL;");
  } catch(e) { console.warn('Ignore:', e.message) }

  console.log('[health-history.db] Clearing payload_json in compiler_metrics_daily_snapshots...');
  try {
    healthDb.exec("UPDATE compiler_metrics_daily_snapshots SET payload_json = NULL WHERE payload_json IS NOT NULL;");
  } catch(e) { console.warn('Ignore:', e.message) }

  console.log('[health-history.db] Clearing payload_json in compiler_metrics_snapshots...');
  try {
    healthDb.exec("UPDATE compiler_metrics_snapshots SET payload_json = NULL WHERE payload_json IS NOT NULL;");
  } catch(e) { console.warn('Ignore:', e.message) }

  console.log('[health-history.db] Vacuuming (This might take a while if it is 1.8GB)...');
  healthDb.exec("VACUUM;");
  healthDb.exec("PRAGMA optimize;");
  healthDb.close();
  console.log('[health-history.db] Done.');
} catch (e) {
  console.error('[health-history.db] Error:', e.message);
}

console.log('Cleanup finished.');
