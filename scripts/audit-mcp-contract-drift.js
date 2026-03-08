import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { getTableColumns } from '../src/layer-c-memory/storage/database/schema-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, '.omnysysdata', 'omnysys.db');
const QUERY_FILE = path.join(ROOT, 'src', 'layer-c-memory', 'mcp', 'tools', 'semantic', 'semantic-queries.js');
const CHANGELOG_FILE = path.join(ROOT, 'CHANGELOG.md');
const PACKAGE_FILE = path.join(ROOT, 'package.json');

function getScalar(db, sql, ...params) {
  const row = db.prepare(sql).get(...params);
  if (!row) return 0;
  const firstKey = Object.keys(row)[0];
  return row[firstKey];
}

function extractLatestReleaseVersion(changelogText) {
  const match = changelogText.match(/## Latest Release: v(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function extractFunctionBlock(sourceText, functionName) {
  const start = sourceText.indexOf(`export function ${functionName}`);
  if (start === -1) return '';
  const remainder = sourceText.slice(start);
  const nextExport = remainder.indexOf('\nexport function ', 1);
  return nextExport === -1 ? remainder : remainder.slice(0, nextExport);
}

function buildIssue(id, severity, message, details = {}) {
  return { id, severity, message, details };
}

function main() {
  const issues = [];
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
  const changelog = fs.readFileSync(CHANGELOG_FILE, 'utf8');
  const querySource = fs.readFileSync(QUERY_FILE, 'utf8');
  let db;

  try {
    db = new Database(DB_PATH, { readonly: true });
  } catch (error) {
    console.error(JSON.stringify({
      summary: {
        generatedAt: new Date().toISOString(),
        databasePath: DB_PATH,
        issueCount: 1,
        bySeverity: { critical: 1 }
      },
      issues: [
        buildIssue(
          'database.open_failed',
          'critical',
          'Unable to open OmnySys SQLite database for contract audit.',
          { databasePath: DB_PATH, error: error.message }
        )
      ]
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  try {
    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      ORDER BY name
    `).all().map((row) => row.name);

    const societiesColumns = getTableColumns('societies').map((column) => column.name);
    const querySocietiesBlock = extractFunctionBlock(querySource, 'querySocieties');
    const latestRelease = extractLatestReleaseVersion(changelog);
    const semanticConnections = getScalar(db, 'SELECT COUNT(*) AS total FROM semantic_connections');
    const semanticAtomRelations = getScalar(
      db,
      "SELECT COUNT(*) AS total FROM atom_relations WHERE relation_type IN ('shares_state', 'emits', 'listens')"
    );
    const riskAssessments = getScalar(db, 'SELECT COUNT(*) AS total FROM risk_assessments');
    const atomEvents = getScalar(db, 'SELECT COUNT(*) AS total FROM atom_events');
    const atomVersions = getScalar(db, 'SELECT COUNT(*) AS total FROM atom_versions');
    const societiesTotal = getScalar(db, 'SELECT COUNT(*) AS total FROM societies');

    if (!tables.includes('societies')) {
      issues.push(buildIssue('schema.societies_missing', 'critical', 'Table societies is missing from SQLite.'));
    }

    if (!societiesColumns.includes('is_removed') && querySocietiesBlock.includes('is_removed')) {
      issues.push(buildIssue(
        'query.societies_soft_delete_drift',
        'critical',
        'querySocieties still references is_removed but societies does not implement soft-delete columns.',
        { societiesColumns }
      ));
    }

    if (semanticConnections === 0 && semanticAtomRelations > 0) {
      issues.push(buildIssue(
        'semantic.summary_detail_drift',
        'high',
        'semantic_connections is empty while atom_relations still carries semantic data.',
        { semanticConnections, semanticAtomRelations }
      ));
    }

    if (latestRelease !== packageJson.version) {
      issues.push(buildIssue(
        'release.index_drift',
        'high',
        'CHANGELOG latest release does not match package.json version.',
        { changelogLatest: latestRelease, packageVersion: packageJson.version }
      ));
    }

    if (riskAssessments === 0) {
      issues.push(buildIssue(
        'telemetry.empty_risk_assessments',
        'medium',
        'risk_assessments table is empty, so runtime risk claims are advisory only.',
        { riskAssessments }
      ));
    }

    if (atomEvents === 0) {
      issues.push(buildIssue(
        'telemetry.empty_atom_events',
        'medium',
        'atom_events table is empty, so event-sourcing claims are not operational.',
        { atomEvents }
      ));
    }

    if (atomVersions <= 1) {
      issues.push(buildIssue(
        'telemetry.thin_atom_versions',
        'medium',
        'atom_versions has negligible history coverage.',
        { atomVersions }
      ));
    }

    if (societiesTotal === 0) {
      issues.push(buildIssue(
        'telemetry.empty_societies',
        'high',
        'societies table is empty even though society APIs are enabled.'
      ));
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      databasePath: DB_PATH,
      packageVersion: packageJson.version,
      changelogLatest: latestRelease,
      tables: {
        total: tables.length,
        societiesColumns
      },
      metrics: {
        societiesTotal,
        semanticConnections,
        semanticAtomRelations,
        riskAssessments,
        atomEvents,
        atomVersions
      },
      issueCount: issues.length,
      bySeverity: issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {})
    };

    console.log(JSON.stringify({ summary, issues }, null, 2));

    if (issues.some((issue) => issue.severity === 'critical')) {
      process.exitCode = 2;
      return;
    }

    if (issues.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

main();
