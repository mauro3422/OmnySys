/**
 * @fileoverview fragile-network.js
 * Detecta llamadas a red sin manejo de errores adecuado
 */

/**
 * Encuentra llamadas a red potencialmente frágiles
 * @param {Array} atoms - Lista de átomos
 * @returns {Object} Llamadas frágiles y bien manejadas
 */
export function findFragileNetworkCalls(atoms) {
  const fragile = [];
  const wellHandled = [];
  
  for (const atom of atoms) {
    // Check if atom makes network calls
    const hasNetworkCalls = atom.hasNetworkCalls || 
      atom.calls?.some(c => 
        ['fetch', 'axios', 'request', 'http', 'https'].includes(c.name || c)
      );
    
    if (!hasNetworkCalls) continue;
    
    // Check for error handling
    const hasErrorHandling = atom.hasErrorHandling ||
      atom.calls?.some(c => 
        ['catch', 'try', 'error', 'reject'].includes(c.name || c)
      );
    
    // Check for timeout handling
    const hasTimeout = atom.calls?.some(c =>
      (c.arguments?.some(arg => 
        arg?.includes?.('timeout') || arg?.includes?.('AbortController')
      ))
    );
    
    // Check for retry logic
    const hasRetry = atom.calls?.some(c =>
      c.name?.includes?.('retry') || c.name?.includes?.('attempt')
    );
    
    const networkInfo = {
      id: atom.id,
      name: atom.name,
      file: atom.filePath,
      line: atom.line,
      hasNetworkCalls: true,
      hasErrorHandling,
      hasTimeout,
      hasRetry,
      risk: (!hasErrorHandling ? 'high' : (!hasTimeout ? 'medium' : 'low')),
      issue: !hasErrorHandling ? 'No error handling for network calls' : 
             (!hasTimeout ? 'No timeout handling' : 'Well handled')
    };
    
    if (!hasErrorHandling || !hasTimeout) {
      fragile.push(networkInfo);
    } else {
      wellHandled.push(networkInfo);
    }
  }
  
  return {
    fragile: fragile.sort((a, b) => {
      const riskOrder = { high: 3, medium: 2, low: 1 };
      return riskOrder[b.risk] - riskOrder[a.risk];
    }),
    wellHandled,
    summary: {
      total: fragile.length + wellHandled.length,
      fragile: fragile.length,
      highRisk: fragile.filter(f => f.risk === 'high').length
    }
  };
}
