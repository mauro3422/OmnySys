import type { SqliteEngine } from './SqliteEngine';
import type { FileInfo, FileDependency, AtomInfo, AtomRelation, DbStats } from '../SqliteReader';

export class Queries {
  
  static getStats(engine: SqliteEngine): DbStats {
    const safe = (table: string, query: string, fallback: number = 0): number => {
      if (!engine.hasTable(table)) return fallback;
      try {
        const row = engine.getOne(query);
        return Object.values(row)[0] as number || fallback;
      } catch { return fallback; }
    };

    return {
      totalAtoms: safe('atoms', `SELECT COUNT(*) as n FROM atoms WHERE is_removed = 0`),
      totalFiles: safe('system_files', `SELECT COUNT(*) as n FROM system_files WHERE is_removed = 0`),
      totalRelations: safe('atom_relations', `SELECT COUNT(*) as n FROM atom_relations WHERE is_removed = 0`),
      totalEvents: safe('watcher_issues', `SELECT COUNT(*) as n FROM watcher_issues`) 
                || safe('events', `SELECT COUNT(*) as n FROM events`),
      avgComplexity: safe('atoms', `SELECT ROUND(AVG(complexity), 2) as n FROM atoms WHERE is_removed = 0`),
      maxComplexity: safe('atoms', `SELECT MAX(complexity) as n FROM atoms WHERE is_removed = 0`)
    };
  }

  static getFilesWithRisk(engine: SqliteEngine, limit: number = 5000): FileInfo[] {
    if (!engine.hasTable('system_files')) return [];
    
    try {
      const hasRisk = engine.hasTable('risk_assessments');
      const hasAtoms = engine.hasTable('atoms');
      
      const selects = [
        'sf.path', 
        'sf.display_path as displayPath',
        hasRisk ? `COALESCE(ra.risk_score, sf.risk_score, 0) as riskScore` : `COALESCE(sf.risk_score, 0) as riskScore`,
        hasRisk ? `COALESCE(ra.risk_level, 'low') as riskLevel` : `'low' as riskLevel`,
        `COALESCE(sf.culture, 'unknown') as culture`
      ];

      if (hasAtoms) {
        selects.push(`(SELECT COUNT(*) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as atomCount`);
        selects.push(`(SELECT COALESCE(SUM(a.complexity), 0) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as totalComplexity`);
        selects.push(`(SELECT ROUND(AVG(a.fragility_score), 2) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as avgFragility`);
        selects.push(`(SELECT ROUND(MAX(a.propagation_score), 2) FROM atoms a WHERE a.file_path = sf.path AND a.is_removed = 0) as maxPropagation`);
      } else {
        selects.push(`0 as atomCount, 0 as totalComplexity, 0 as avgFragility, 0 as maxPropagation`);
      }

      const joins = hasRisk ? `LEFT JOIN risk_assessments ra ON ra.file_path = sf.path AND ra.is_removed = 0` : '';

      const sql = `
        SELECT ${selects.join(', ')}
        FROM system_files sf ${joins}
        WHERE sf.is_removed = 0 
        ORDER BY riskScore DESC LIMIT ?
      `;

      return engine.getAll(sql, [limit]).map(r => ({
        path: r.path, 
        displayPath: r.displayPath || r.path,
        riskScore: r.riskScore || 0, 
        riskLevel: r.riskLevel || 'low',
        culture: r.culture || 'unknown', 
        atomCount: r.atomCount || 0, 
        totalComplexity: r.totalComplexity || 0,
        avgFragility: r.avgFragility || 0,
        maxPropagation: r.maxPropagation || 0
      }));
    } catch (err: any) {
      console.error('[Queries] getFilesWithRisk error:', err.message);
      return [];
    }
  }

  static getFileDependencies(engine: SqliteEngine): FileDependency[] {
    try {
      if (engine.hasTable('file_dependencies')) {
        const deps = engine.getAll(`
          SELECT source_path as source, target_path as target,
            dependency_type as type, is_dynamic as isDynamic
          FROM file_dependencies WHERE is_removed = 0 AND dependency_type = 'local'
        `);
        if (deps.length > 0) {
          return deps.map(r => ({
            source: r.source, target: r.target,
            type: r.type || 'local', isDynamic: Boolean(r.isDynamic)
          }));
        }
      }

      if (engine.hasTable('atom_relations') && engine.hasTable('atoms')) {
        return engine.getAll(`
          SELECT DISTINCT a1.file_path as source, a2.file_path as target, 'local' as type, 0 as isDynamic
          FROM atom_relations ar
          JOIN atoms a1 ON ar.source_id = a1.id
          JOIN atoms a2 ON ar.target_id = a2.id
          WHERE ar.is_removed = 0 AND a1.is_removed = 0 AND a2.is_removed = 0 
            AND a1.file_path != a2.file_path
        `).map(r => ({
          source: r.source, target: r.target,
          type: r.type, isDynamic: Boolean(r.isDynamic)
        }));
      }

      return [];
    } catch (err: any) {
      console.error('[Queries] getFileDependencies error:', err.message);
      return [];
    }
  }

  static getAtomsForFile(engine: SqliteEngine, filePath: string): AtomInfo[] {
    if (!engine.hasTable('atoms')) return [];
    try {
      return engine.getAll(`
        SELECT 
          id, name, atom_type as type, file_path as filePath,
          line_start as lineStart, line_end as lineEnd,
          lines_of_code as linesOfCode, complexity,
          is_exported as isExported, is_async as isAsync,
          archetype_type as archetype,
          fragility_score as fragilityScore,
          coupling_score as couplingScore,
          propagation_score as propagationScore,
          centrality_classification as centralityClass,
          risk_level as riskLevel,
          in_degree as inDegree, out_degree as outDegree,
          callers_count as callersCount, callees_count as calleesCount
        FROM atoms 
        WHERE file_path = ? AND is_removed = 0
        ORDER BY line_start
      `, [filePath]).map(r => ({
        ...r,
        isExported: Boolean(r.isExported),
        isAsync: Boolean(r.isAsync),
        fragilityScore: r.fragilityScore || 0,
        couplingScore: r.couplingScore || 0,
        propagationScore: r.propagationScore || 0
      }));
    } catch (err: any) {
      console.error('[Queries] getAtomsForFile error:', err.message);
      return [];
    }
  }

  static getRelationsForFile(engine: SqliteEngine, filePath: string): AtomRelation[] {
    if (!engine.hasTable('atom_relations') || !engine.hasTable('atoms')) return [];
    try {
      return engine.getAll(`
        SELECT 
          ar.source_id as sourceId, ar.target_id as targetId,
          ar.relation_type as relationType, ar.weight, ar.line_number as lineNumber
        FROM atom_relations ar
        JOIN atoms a1 ON ar.source_id = a1.id AND a1.is_removed = 0
        WHERE a1.file_path = ? AND ar.is_removed = 0
      `, [filePath]).map(r => ({
        sourceId: r.sourceId,
        targetId: r.targetId,
        relationType: r.relationType,
        weight: r.weight || 1,
        lineNumber: r.lineNumber || 0
      }));
    } catch (err: any) {
      console.error('[Queries] getRelationsForFile error:', err.message);
      return [];
    }
  }
}
