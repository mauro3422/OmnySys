import { GraphData } from '../types';

/**
 * Genera el HTML para el webview del grafo
 */
export function generateGraphHtml(graphData: GraphData, initialFile: string | null): string {
  const nodesJson = JSON.stringify(graphData.nodes);
  const edgesJson = JSON.stringify(graphData.edges);

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CogniSystem Graph</title>
    <script src="https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: var(--vscode-font-family, sans-serif);
            background: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #d4d4d4);
            overflow: hidden;
        }
        
        #graph { width: 100vw; height: 100vh; }
        
        .controls {
            position: absolute;
            top: 10px; left: 10px;
            background: var(--vscode-editor-background, #1e1e1e);
            border: 1px solid var(--vscode-panel-border, #333);
            border-radius: 6px;
            padding: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 100;
        }
        
        .controls h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: var(--vscode-foreground, #ccc);
        }
        
        .controls button {
            display: block;
            width: 100%;
            margin: 4px 0;
            padding: 6px 12px;
            background: var(--vscode-button-background, #0e639c);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .controls button:hover {
            background: var(--vscode-button-hoverBackground, #1177bb);
        }
        
        .legend {
            position: absolute;
            bottom: 10px; left: 10px;
            background: var(--vscode-editor-background, #1e1e1e);
            border: 1px solid var(--vscode-panel-border, #333);
            border-radius: 6px;
            padding: 10px;
            font-size: 11px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin: 4px 0;
        }
        
        .legend-color {
            width: 12px; height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .info-panel {
            position: absolute;
            top: 10px; right: 10px;
            width: 250px;
            background: var(--vscode-editor-background, #1e1e1e);
            border: 1px solid var(--vscode-panel-border, #333);
            border-radius: 6px;
            padding: 12px;
            font-size: 12px;
            max-height: 50vh;
            overflow-y: auto;
        }
        
        .info-panel h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            padding-bottom: 4px;
        }
        
        .info-panel .metric {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
        }
        
        .info-panel .metric-value { font-weight: bold; }
        
        .risk-critical { color: #ff4444; }
        .risk-high { color: #ff8844; }
        .risk-medium { color: #ffaa44; }
        .risk-low { color: #44ff44; }
        
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <div class="controls">
        <h3>🧠 CogniSystem</h3>
        <button onclick="resetView()">🔄 Resetear Vista</button>
        <button onclick="toggleLayout()">📐 Cambiar Layout</button>
        <button onclick="filterByRisk('all')">👁️ Ver Todo</button>
        <button onclick="filterByRisk('high')">🔥 Solo Alto Riesgo</button>
    </div>
    
    <div class="legend">
        <div class="legend-item">
            <div class="legend-color" style="background: #ff4444;"></div>
            <span>Crítico (8-10)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #ff8844;"></div>
            <span>Alto (6-7)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #ffcc44;"></div>
            <span>Medio (4-5)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #44ff44;"></div>
            <span>Bajo (0-3)</span>
        </div>
        <div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;">
            <div class="legend-item">
                <div class="legend-color" style="background: #888; border-radius: 0;"></div>
                <span>Import</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #8844ff; border-radius: 0;"></div>
                <span>Conexión Semántica</span>
            </div>
        </div>
    </div>
    
    <div id="infoPanel" class="info-panel hidden">
        <h4 id="infoTitle">Selecciona un archivo</h4>
        <div id="infoContent"></div>
    </div>
    
    <div id="graph"></div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const nodesData = ${nodesJson};
        const edgesData = ${edgesJson};
        const initialFile = ${initialFile ? `"${initialFile}"` : 'null'};
        
        let cy;
        let currentLayout = 'cose';
        
        function getNodeColor(risk, severity) {
            if (severity === 'critical' || risk >= 8) return '#ff4444';
            if (severity === 'high' || risk >= 6) return '#ff8844';
            if (severity === 'medium' || risk >= 4) return '#ffcc44';
            return '#44ff44';
        }
        
        function getNodeSize(connections) {
            const base = 25;
            return base + Math.min(connections * 2, 30);
        }
        
        function initGraph() {
            cy = cytoscape({
                container: document.getElementById('graph'),
                elements: [
                    ...nodesData.map(n => ({
                        data: {
                            id: n.id,
                            label: n.label,
                            risk: n.risk,
                            severity: n.severity,
                            connections: n.connections,
                            color: getNodeColor(n.risk, n.severity),
                            size: getNodeSize(n.connections)
                        }
                    })),
                    ...edgesData.map(e => ({
                        data: {
                            source: e.source,
                            target: e.target,
                            type: e.type
                        }
                    }))
                ],
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': 'data(color)',
                            'width': 'data(size)',
                            'height': 'data(size)',
                            'label': 'data(label)',
                            'font-size': '11px',
                            'text-valign': 'bottom',
                            'text-halign': 'center',
                            'text-margin-y': 4,
                            'color': '#d4d4d4',
                            'text-background-color': '#1e1e1e',
                            'text-background-opacity': 0.8,
                            'text-background-padding': '2px',
                            'border-width': 2,
                            'border-color': '#333'
                        }
                    },
                    {
                        selector: 'edge[type="import"]',
                        style: {
                            'width': 1,
                            'line-color': '#666',
                            'target-arrow-color': '#666',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'opacity': 0.6
                        }
                    },
                    {
                        selector: 'edge[type="semantic"]',
                        style: {
                            'width': 2,
                            'line-color': '#8844ff',
                            'line-style': 'dashed',
                            'target-arrow-color': '#8844ff',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'opacity': 0.8
                        }
                    },
                    {
                        selector: '.highlighted',
                        style: {
                            'border-width': 4,
                            'border-color': '#fff'
                        }
                    },
                    {
                        selector: '.dimmed',
                        style: { 'opacity': 0.2 }
                    }
                ],
                layout: {
                    name: 'cose',
                    padding: 20,
                    nodeRepulsion: 400000,
                    edgeElasticity: 100,
                    gravity: 80,
                    numIter: 1000
                }
            });
            
            cy.on('tap', 'node', evt => {
                showNodeInfo(evt.target);
                highlightConnected(evt.target);
            });
            
            cy.on('tap', evt => {
                if (evt.target === cy) {
                    resetHighlight();
                    hideInfoPanel();
                }
            });
            
            if (initialFile) {
                setTimeout(() => {
                    const node = cy.getElementById(initialFile);
                    if (node.length > 0) {
                        node.select();
                        showNodeInfo(node);
                        cy.animate({
                            center: { eles: node },
                            zoom: 1.5,
                            duration: 500
                        });
                    }
                }, 500);
            }
        }
        
        function showNodeInfo(node) {
            const data = node.data();
            const panel = document.getElementById('infoPanel');
            const title = document.getElementById('infoTitle');
            const content = document.getElementById('infoContent');
            
            title.textContent = data.label;
            
            const riskClass = data.risk >= 8 ? 'risk-critical' : 
                             data.risk >= 6 ? 'risk-high' :
                             data.risk >= 4 ? 'risk-medium' : 'risk-low';
            
            content.innerHTML = \`
                <div class="metric"><span>Ruta:</span><span style="font-size:10px">\${data.id}</span></div>
                <div class="metric"><span>Riesgo:</span><span class="\${riskClass}">\${data.risk}/10</span></div>
                <div class="metric"><span>Conexiones:</span><span>\${data.connections}</span></div>
                <div style="margin-top:12px">
                    <button onclick="openFile('\${data.id}')" style="width:100%">📄 Abrir</button>
                </div>
            \`;
            
            panel.classList.remove('hidden');
        }
        
        function hideInfoPanel() {
            document.getElementById('infoPanel').classList.add('hidden');
        }
        
        function highlightConnected(node) {
            const connected = node.neighborhood().add(node);
            cy.elements().addClass('dimmed');
            connected.removeClass('dimmed');
            node.addClass('highlighted');
        }
        
        function resetHighlight() {
            cy.elements().removeClass('dimmed').removeClass('highlighted');
        }
        
        function resetView() {
            cy.animate({ fit: { padding: 20 }, duration: 300 });
            resetHighlight();
        }
        
        function toggleLayout() {
            const layouts = ['cose', 'circle', 'grid', 'concentric'];
            currentLayout = layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
            cy.layout({ name: currentLayout, padding: 20, animate: true, animationDuration: 500 }).run();
        }
        
        function filterByRisk(type) {
            if (type === 'all') {
                cy.elements().show();
            } else if (type === 'high') {
                const highRisk = cy.nodes().filter(n => n.data('risk') >= 6);
                const connected = highRisk.neighborhood().add(highRisk);
                cy.elements().hide();
                connected.show();
            }
        }
        
        function openFile(filePath) {
            vscode.postMessage({ command: 'openFile', file: filePath });
        }
        
        initGraph();
        
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'highlightFile') {
                const node = cy.getElementById(msg.file);
                if (node.length > 0) {
                    showNodeInfo(node);
                    cy.animate({ center: { eles: node }, zoom: 1.5, duration: 500 });
                }
            }
        });
    </script>
</body>
</html>`;
}
