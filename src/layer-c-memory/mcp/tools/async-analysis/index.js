/**
 * @fileoverview MCP Tool: get_async_analysis
 * Análisis profundo de patrones async con recommendations accionables
 * 
 * @module mcp/tools/async-analysis
 */

import { getAllAtoms, getAsyncAtoms, queryAtoms } from '#layer-c/storage/index.js';
import { extractAsyncInfo } from './extractors/index.js';
import { analyzeAsyncIssues, categorizePattern, findOptimizations } from './analyzers/index.js';
import { riskOrder } from './utils/index.js';

export async function get_async_analysis(args, context) {
  const {
    filePath,
    riskLevel = 'all',
    includeRecommendations = true,
    minSequentialAwaits = 3,
    limit = 20,
    offset = 0
  } = args;
  const { projectPath } = context;
  
  try {
    // 🚀 OPTIMIZADO: Usar queries selectivas según el filtro
    // Si hay filePath, filtrar en la query. Si no, solo async atoms.
    let filteredAtoms;
    if (filePath) {
      filteredAtoms = await queryAtoms(projectPath, { isAsync: true, filePath }, 500);
    } else {
      filteredAtoms = await getAsyncAtoms(projectPath);
    }
    
    if (!filteredAtoms || filteredAtoms.length === 0) {
      return { error: 'No atoms found. Run analysis first.' };
    }

    const analysis = {
      summary: {
        totalAtoms: filteredAtoms.length,
        asyncAtoms: 0,
        withIssues: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0
      },
      patterns: {
        sequentialAwaits: [],
        promiseAll: [],
        promiseChains: [],
        mixedPatterns: []
      },
      issues: [],
      recommendations: [],
      optimizations: []
    };

    for (const atom of filteredAtoms) {
      const asyncInfo = extractAsyncInfo(atom);
      // Todos los átomos en filteredAtoms son async (filtrado en query)
      
      analysis.summary.asyncAtoms++;
      
      const issues = analyzeAsyncIssues(atom, asyncInfo, minSequentialAwaits);
      
      if (issues.length > 0) {
        analysis.summary.withIssues++;
        analysis.issues.push(...issues);
      }

      categorizePattern(atom, asyncInfo, analysis.patterns);
      
      if (asyncInfo.flowAnalysis) {
        const risk = asyncInfo.flowAnalysis.overallRisk;
        if (risk === 'high') analysis.summary.highRisk++;
        else if (risk === 'medium') analysis.summary.mediumRisk++;
        else analysis.summary.lowRisk++;

        if (includeRecommendations && asyncInfo.flowAnalysis.allRecommendations) {
          const existingRecs = new Set(
            analysis.recommendations
              .filter(r => r.atom === atom.id)
              .map(r => r.recommendation)
          );
          for (const rec of asyncInfo.flowAnalysis.allRecommendations) {
            if (!existingRecs.has(rec)) {
              existingRecs.add(rec);
              analysis.recommendations.push({
                atom: atom.id,
                atomName: atom.name,
                file: atom.filePath,
                line: atom.line,
                recommendation: rec,
                risk: risk
              });
            }
          }
        }
      }

      const optimizations = findOptimizations(atom, asyncInfo);
      // Deduplicate optimizations by atom id and type
      for (const opt of optimizations) {
        const optKey = `${opt.atom}:${opt.type}`;
        const existingOpt = analysis.optimizations.find(o => `${o.atom}:${o.type}` === optKey);
        if (!existingOpt) {
          analysis.optimizations.push(opt);
        }
      }
    }

    if (riskLevel !== 'all') {
      analysis.issues = analysis.issues.filter(i => i.risk === riskLevel);
      analysis.recommendations = analysis.recommendations.filter(r => r.risk === riskLevel);
    }

    analysis.issues.sort((a, b) => riskOrder(b.risk) - riskOrder(a.risk));
    analysis.recommendations.sort((a, b) => riskOrder(b.risk) - riskOrder(a.risk));

    const totalIssues = analysis.issues.length;
    const totalRecs = analysis.recommendations.length;
    const totalOpts = analysis.optimizations.length;

    analysis.issues = analysis.issues.slice(offset, offset + limit);
    analysis.recommendations = analysis.recommendations.slice(offset, offset + limit);
    analysis.optimizations = analysis.optimizations.slice(0, limit);

    // Trim nested pattern arrays
    for (const key of Object.keys(analysis.patterns)) {
      analysis.patterns[key] = analysis.patterns[key].slice(0, limit);
    }

    analysis._pagination = {
      offset,
      limit,
      issues: { total: totalIssues, returned: analysis.issues.length, hasMore: offset + limit < totalIssues },
      recommendations: { total: totalRecs, returned: analysis.recommendations.length, hasMore: offset + limit < totalRecs },
      optimizations: { total: totalOpts, returned: analysis.optimizations.length }
    };

    return analysis;
  } catch (error) {
    return { error: error.message };
  }
}

export default { get_async_analysis };