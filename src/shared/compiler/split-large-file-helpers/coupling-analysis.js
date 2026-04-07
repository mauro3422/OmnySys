/**
 * @fileoverview Coupling analysis utilities for splitting large files.
 * @module shared/compiler/split-large-file-helpers/coupling-analysis
 */

/**
 * Analiza el acoplamiento del archivo basándose en dependencias
 *
 * Retorna métricas:
 * - couplingPercentage: % de átomos interconectados
 * - leafNodes: funciones que no llaman a nadie (hojas)
 * - centralNodes: funciones más conectadas (alta centralidad)
 * - canSplit: si el archivo puede dividirse de forma segura
 */
export function analyzeCoupling(atoms) {
    // Mapear nombre → átomo
    const atomByName = new Map();
    for (const atom of atoms) {
        atomByName.set(atom.name, atom);
    }

    // Contar conexiones por átomo
    const connectionCount = new Map();
    const leafNodes = [];
    const centralNodes = [];

    for (const atom of atoms) {
        const calls = atom.calls || [];
        const uniqueCalls = new Set();

        for (const call of calls) {
            const callName = typeof call === 'string' ? call : call.name;
            if (callName && atomByName.has(callName)) {
                uniqueCalls.add(callName);
            }
        }

        connectionCount.set(atom.name, uniqueCalls.size);

        // Hoja: no llama a nadie interno
        if (uniqueCalls.size === 0) {
            leafNodes.push(atom.name);
        }
    }

    // Calcular centralidad (cuántas veces es llamado cada átomo)
    const calledByCount = new Map();
    for (const atom of atoms) {
        const calls = atom.calls || [];
        for (const call of calls) {
            const callName = typeof call === 'string' ? call : call.name;
            if (callName && atomByName.has(callName)) {
                calledByCount.set(callName, (calledByCount.get(callName) || 0) + 1);
            }
        }
    }

    // Identificar nodos centrales (más llamados)
    for (const [name, count] of calledByCount) {
        if (count >= 3) { // Llamado por 3+ funciones
            centralNodes.push({ name, calledBy: count });
        }
    }

    // Calcular % de acoplamiento
    const totalAtoms = atoms.length;
    const connectedAtoms = atoms.filter(a => {
        const calls = a.calls || [];
        return calls.some(call => {
            const callName = typeof call === 'string' ? call : call.name;
            return callName && atomByName.has(callName);
        });
    }).length;

    const couplingPercentage = totalAtoms > 0
        ? Math.round((connectedAtoms / totalAtoms) * 100)
        : 0;

    // Determinar si puede dividirse
    const canSplit = couplingPercentage < 80;

    return {
        totalAtoms,
        connectedAtoms,
        couplingPercentage,
        leafNodes: leafNodes.slice(0, 10), // Top 10
        centralNodes: centralNodes.sort((a, b) => b.calledBy - a.calledBy).slice(0, 5), // Top 5
        canSplit,
        message: canSplit
            ? `Acoplamiento moderado (${couplingPercentage}%). División posible.`
            : `Acoplamiento alto (${couplingPercentage}%). Archivo indivisible en estado actual.`
    };
}

/**
 * Genera sugerencias de refactorización basadas en análisis de acoplamiento
 *
 * Estrategia 1 (Bottom-Up): Identificar hojas para extraer primero
 * Estrategia 2 (Clustering): Identificar sub-grafos desconectados
 * Estrategia 3 (Fail Fast): Reportar por qué no se puede dividir
 */
export function generateSuggestions(couplingAnalysis, atoms) {
    const suggestions = [];

    // Estrategia 1: Bottom-Up - Extraer hojas primero
    if (couplingAnalysis.leafNodes.length > 0) {
        suggestions.push({
            strategy: 'bottom-up',
            priority: 'high',
            title: 'Extraer funciones hoja primero',
            description: `Las siguientes ${couplingAnalysis.leafNodes.length} funciones no llaman a nadie más. Pueden extraerse a un archivo utils.js sin riesgo:`,
            items: couplingAnalysis.leafNodes.map(name => `  - ${name}`),
            action: 'Mover estas funciones a utils.js, luego re-analizar el archivo original.'
        });
    }

    // Estrategia 2: Clustering - Identificar nodos centrales
    if (couplingAnalysis.centralNodes.length > 0) {
        suggestions.push({
            strategy: 'clustering',
            priority: 'medium',
            title: 'Funciones altamente conectadas',
            description: 'Estas funciones son llamadas por muchas otras. Considerar refactorizarlas:',
            items: couplingAnalysis.centralNodes.map(n => `  - ${n.name} (llamado por ${n.calledBy} funciones)`),
            action: 'Extraer estas funciones a un módulo independiente puede reducir el acoplamiento.'
        });
    }

    // Estrategia 3: Fail Fast - Reporte de acoplamiento
    if (!couplingAnalysis.canSplit) {
        suggestions.push({
            strategy: 'fail-fast',
            priority: 'critical',
            title: 'Archivo indivisible',
            description: `El nivel de acoplamiento es ${couplingAnalysis.couplingPercentage}%. No se puede dividir de forma segura.`,
            items: [
                `  - ${couplingAnalysis.connectedAtoms} de ${couplingAnalysis.totalAtoms} átomos están interconectados`,
                `  - ${couplingAnalysis.leafNodes.length} funciones hoja disponibles para extracción`,
                `  - ${couplingAnalysis.centralNodes.length} funciones centrales necesitan refactorización`
            ],
            action: 'Primero extraer hojas, luego re-evaluar. Repetir hasta que acoplamiento < 80%.'
        });
    }

    return suggestions;
}
