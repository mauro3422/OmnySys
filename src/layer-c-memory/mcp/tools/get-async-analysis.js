/**
 * MCP Tool: get_async_analysis
 * Análisis profundo de patrones async con recommendations accionables
 */

import { getAllAtoms } from '#layer-c/storage/index.js';

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
    const atoms = await getAllAtoms(projectPath);
    
    if (!atoms || atoms.length === 0) {
      return { error: 'No atoms found. Run analysis first.' };
    }

    let filteredAtoms = atoms;
    if (filePath) {
      filteredAtoms = atoms.filter(a => a.filePath?.includes(filePath));
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
      
      if (!asyncInfo.isAsync) continue;
      
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

function extractAsyncInfo(atom) {
  const temporal = atom.temporal?.patterns || atom.temporal || {};
  
  return {
    isAsync: atom.isAsync || temporal.asyncPatterns?.isAsync || false,
    hasAwait: temporal.asyncPatterns?.hasAwait || false,
    hasPromiseAll: temporal.asyncPatterns?.hasPromiseAll || false,
    hasPromiseRace: temporal.asyncPatterns?.hasPromiseRace || false,
    hasPromiseAllSettled: temporal.asyncPatterns?.hasPromiseAllSettled || false,
    hasNewPromise: temporal.asyncPatterns?.hasNewPromise || false,
    hasPromiseChain: temporal.asyncPatterns?.hasPromiseChain || false,
    sequentialCount: temporal.asyncPatterns?.sequentialOperations?.[0]?.count || 0,
    parallelOperations: temporal.asyncPatterns?.parallelOperations || [],
    sequentialOperations: temporal.asyncPatterns?.sequentialOperations || [],
    flowAnalysis: temporal.asyncFlowAnalysis || null,
    timers: temporal.timers || [],
    events: temporal.events || []
  };
}

function analyzeAsyncIssues(atom, asyncInfo, minSequentialAwaits) {
  const issues = [];
  
  if (asyncInfo.sequentialCount >= minSequentialAwaits) {
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'waterfall_awaits',
      risk: asyncInfo.sequentialCount >= 10 ? 'high' : 'medium',
      description: `${asyncInfo.sequentialCount} sequential awaits detected`,
      impact: 'Sequential operations add latency (total time = sum of all operations)',
      suggestion: 'Check if operations are truly dependent; consider Promise.all for independent ops'
    });
  }

  if (asyncInfo.hasPromiseChain && !asyncInfo.hasAwait) {
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'legacy_promise_chain',
      risk: 'low',
      description: 'Uses .then() chains instead of async/await',
      impact: 'Harder to read and debug',
      suggestion: 'Consider refactoring to async/await for better readability'
    });
  }

  // Solo agregar missing_parallelization si NO hay ya un waterfall_awaits para este atom
  // (evita duplicar el mismo problema con dos nombres distintos)
  const alreadyWaterfall = issues.some(i => i.type === 'waterfall_awaits');
  if (!alreadyWaterfall && !asyncInfo.hasPromiseAll && asyncInfo.sequentialCount >= 5) {
    const estimatedSaving = `Potential ~${Math.round((1 - 1/asyncInfo.sequentialCount) * 100)}% time reduction IF operations are truly independent`;
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'missing_parallelization',
      risk: 'low',
      description: `${asyncInfo.sequentialCount} sequential operations — verify if any are independent`,
      impact: estimatedSaving,
      suggestion: 'Review data dependencies between awaits before applying Promise.all'
    });
  }

  if (asyncInfo.hasNewPromise && !asyncInfo.hasAwait) {
    issues.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'explicit_promise',
      risk: 'low',
      description: 'Uses explicit new Promise() constructor',
      impact: 'May indicate callback-based code that could be modernized',
      suggestion: 'Consider using util.promisify or async/await'
    });
  }

  // flowAnalysis puede duplicar patrones ya detectados arriba (ej: sequential-awaits vs waterfall_awaits).
  // Solo agregamos issues de flowAnalysis que aporten información nueva no cubierta.
  const COVERED_BY_LOCAL = new Set(['sequential-awaits', 'waterfall', 'missing_parallelization']);
  if (asyncInfo.flowAnalysis?.analyses) {
    for (const analysis of asyncInfo.flowAnalysis.analyses) {
      const alreadyCovered = COVERED_BY_LOCAL.has(analysis.pattern) && issues.length > 0;
      if (analysis.riskLevel === 'high' && !alreadyCovered && !issues.find(i => i.type === analysis.pattern)) {
        issues.push({
          atom: atom.id,
          atomName: atom.name,
          file: atom.filePath,
          line: atom.line,
          type: analysis.pattern,
          risk: analysis.riskLevel,
          description: analysis.concerns?.join('; ') || analysis.pattern,
          impact: analysis.metrics ? JSON.stringify(analysis.metrics) : 'Unknown impact',
          suggestion: analysis.recommendations?.[0] || 'Review async pattern'
        });
      }
    }
  }

  return issues;
}

function categorizePattern(atom, asyncInfo, patterns) {
  const entry = {
    id: atom.id,
    name: atom.name,
    file: atom.filePath,
    line: atom.line,
    complexity: atom.complexity
  };

  if (asyncInfo.sequentialCount > 0) {
    entry.count = asyncInfo.sequentialCount;
    patterns.sequentialAwaits.push(entry);
  }

  if (asyncInfo.hasPromiseAll) {
    entry.parallelCount = asyncInfo.parallelOperations?.length || 1;
    patterns.promiseAll.push(entry);
  }

  if (asyncInfo.hasPromiseChain) {
    patterns.promiseChains.push(entry);
  }

  if (asyncInfo.hasAwait && asyncInfo.hasPromiseChain) {
    patterns.mixedPatterns.push(entry);
  }
}

function findOptimizations(atom, asyncInfo) {
  const optimizations = [];
  
  if (asyncInfo.sequentialCount >= 5 && !asyncInfo.hasPromiseAll) {
    optimizations.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'parallelization_opportunity',
      potentialGain: `~${Math.round((1 - 1/asyncInfo.sequentialCount) * 100)}% time reduction`,
      action: `Wrap ${asyncInfo.sequentialCount} sequential awaits in Promise.all() if they're independent`
    });
  }

  if (asyncInfo.hasPromiseChain && asyncInfo.hasAwait) {
    optimizations.push({
      atom: atom.id,
      atomName: atom.name,
      file: atom.filePath,
      line: atom.line,
      type: 'modernization',
      potentialGain: 'Better readability and error handling',
      action: 'Replace .then() chains with pure async/await'
    });
  }

  return optimizations;
}

function riskOrder(risk) {
  switch (risk) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}
