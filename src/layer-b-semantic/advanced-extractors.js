/**
 * advanced-extractors.js
 * Detecta patrones avanzados de comunicación entre archivos
 * 
 * Incluye:
 * - Web Workers (postMessage, onmessage)
 * - BroadcastChannel
 * - MessageChannel / MessagePort
 * - WebSocket
 * - Server-Sent Events (EventSource)
 * - SharedWorker
 * - fetch/XHR con URLs compartidas
 * - postMessage entre ventanas (parent/opener)
 */

// ==================== WEB WORKERS ====================

/**
 * Extrae comunicación Web Worker (postMessage/onmessage)
 * @param {string} code - Código fuente
 * @returns {Object} - {incoming: [], outgoing: [], all: []}
 */
export function extractWebWorkerCommunication(code) {
  const incoming = []; // Mensajes que recibe este archivo
  const outgoing = []; // Mensajes que envía este archivo
  
  // Patrones para Worker.postMessage (outgoing)
  const workerPostMessagePatterns = [
    /(\w+)\.postMessage\s*\(/g,  // worker.postMessage(...)
    /worker\.postMessage\s*\(/g,
    /new\s+Worker\s*\([^)]+\)[\s\S]*?\.postMessage\s*\(/g
  ];
  
  // Patrones para self.postMessage en Worker (outgoing desde worker)
  const selfPostMessagePattern = /self\.postMessage\s*\(/g;
  
  // Patrones para onmessage (incoming)
  const onMessagePatterns = [
    /(?:self|window)\.onmessage\s*=\s*(?:function|\(|\w+)/g,
    /(?:self|window)\.addEventListener\s*\(\s*['"]message['"]/g,
    /\w+\.onmessage\s*=\s*(?:function|\(|\w+)/g  // worker.onmessage = ...
  ];
  
  // Detectar outgoing (postMessage)
  for (const pattern of workerPostMessagePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      outgoing.push({
        type: 'worker_postMessage',
        line: getLineNumber(code, match.index),
        direction: 'outgoing'
      });
    }
  }
  
  // Detectar self.postMessage (Worker enviando a Main)
  let match;
  while ((match = selfPostMessagePattern.exec(code)) !== null) {
    outgoing.push({
      type: 'worker_self_postMessage',
      line: getLineNumber(code, match.index),
      direction: 'outgoing'
    });
  }
  
  // Detectar incoming (onmessage)
  for (const pattern of onMessagePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      incoming.push({
        type: 'worker_onmessage',
        line: getLineNumber(code, match.index),
        direction: 'incoming'
      });
    }
  }
  
  // Detectar new Worker() - creación de workers
  const newWorkerPattern = /new\s+(?:Worker|SharedWorker)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = newWorkerPattern.exec(code)) !== null) {
    outgoing.push({
      type: 'worker_creation',
      workerPath: match[1],
      line: getLineNumber(code, match.index),
      direction: 'creates_worker'
    });
  }
  
  return { incoming, outgoing, all: [...incoming, ...outgoing] };
}

// ==================== BROADCAST CHANNEL ====================

/**
 * Extrae uso de BroadcastChannel (comunicación entre pestañas/contextos)
 * @param {string} code - Código fuente
 * @returns {Object} - {channels: [], all: []}
 */
export function extractBroadcastChannel(code) {
  const channels = [];
  
  // new BroadcastChannel('channel-name')
  const channelCreationPattern = /new\s+BroadcastChannel\s*\(\s*['"]([^'"]+)['"]/g;
  
  // broadcastChannel.postMessage(...) o .onmessage
  const channelUsagePattern = /(\w+)\.(postMessage|onmessage|addEventListener)\s*[\(=]/g;
  
  let match;
  while ((match = channelCreationPattern.exec(code)) !== null) {
    channels.push({
      channel: match[1],
      line: getLineNumber(code, match.index),
      type: 'broadcastChannel'
    });
  }
  
  return { channels, all: channels };
}

// ==================== WEBSOCKET ====================

/**
 * Extrae conexiones WebSocket
 * @param {string} code - Código fuente
 * @returns {Object} - {urls: [], events: [], all: []}
 */
export function extractWebSocket(code) {
  const urls = [];
  const events = [];
  
  // new WebSocket('ws://...' o 'wss://...')
  const wsPattern = /new\s+WebSocket\s*\(\s*['"]([^'"]+)['"]/g;
  
  // Eventos de WebSocket: onopen, onmessage, onclose, onerror
  const wsEventPattern = /\w+\.(onopen|onmessage|onclose|onerror)\s*=\s*(?:function|\(|\w+)/g;
  
  let match;
  while ((match = wsPattern.exec(code)) !== null) {
    urls.push({
      url: match[1],
      line: getLineNumber(code, match.index),
      type: 'websocket_url'
    });
  }
  
  while ((match = wsEventPattern.exec(code)) !== null) {
    events.push({
      event: match[1],
      line: getLineNumber(code, match.index),
      type: 'websocket_event'
    });
  }
  
  return { urls, events, all: [...urls, ...events] };
}

// ==================== SERVER-SENT EVENTS ====================

/**
 * Extrae conexiones Server-Sent Events (EventSource)
 * @param {string} code - Código fuente
 * @returns {Object} - {urls: [], events: [], all: []}
 */
export function extractServerSentEvents(code) {
  const urls = [];
  const events = [];
  
  // new EventSource('url')
  const esPattern = /new\s+EventSource\s*\(\s*['"]([^'"]+)['"]/g;
  
  // eventSource.addEventListener('event-name', ...)
  const esEventPattern = /\w+\.addEventListener\s*\(\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = esPattern.exec(code)) !== null) {
    urls.push({
      url: match[1],
      line: getLineNumber(code, match.index),
      type: 'eventsource_url'
    });
  }
  
  while ((match = esEventPattern.exec(code)) !== null) {
    events.push({
      event: match[1],
      line: getLineNumber(code, match.index),
      type: 'eventsource_event'
    });
  }
  
  return { urls, events, all: [...urls, ...events] };
}

// ==================== FETCH / XHR URLs ====================

/**
 * Extrae URLs usadas en fetch() o XMLHttpRequest
 * Esto detecta si dos archivos llaman al mismo endpoint
 * @param {string} code - Código fuente
 * @returns {Object} - {urls: [], all: []}
 */
export function extractNetworkCalls(code) {
  const urls = [];
  
  // fetch('url') o fetch("url")
  const fetchPattern = /fetch\s*\(\s*['"]([^'"]+)['"]/g;
  
  // xhr.open('GET', 'url') o xhr.open("POST", "url")
  const xhrPattern = /\.open\s*\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g;
  
  // axios.get('url') o axios.post('url', ...)
  const axiosPattern = /axios\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = fetchPattern.exec(code)) !== null) {
    urls.push({
      url: match[1],
      method: 'fetch',
      line: getLineNumber(code, match.index),
      type: 'network_fetch'
    });
  }
  
  while ((match = xhrPattern.exec(code)) !== null) {
    urls.push({
      url: match[1],
      method: 'xhr',
      line: getLineNumber(code, match.index),
      type: 'network_xhr'
    });
  }
  
  while ((match = axiosPattern.exec(code)) !== null) {
    urls.push({
      url: match[2],
      method: match[1],
      line: getLineNumber(code, match.index),
      type: 'network_axios'
    });
  }
  
  return { urls, all: urls };
}

// ==================== MESSAGE CHANNEL ====================

/**
 * Extrae uso de MessageChannel (comunicación entre iframes/workers)
 * @param {string} code - Código fuente
 * @returns {Object} - {ports: [], all: []}
 */
export function extractMessageChannel(code) {
  const ports = [];
  
  // new MessageChannel()
  const channelPattern = /new\s+MessageChannel\s*\(\)/g;
  
  // port1.postMessage o port2.postMessage
  const portPattern = /(\w+)\.(port1|port2)\.(postMessage|onmessage)/g;
  
  let match;
  while ((match = channelPattern.exec(code)) !== null) {
    ports.push({
      type: 'messageChannel_creation',
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = portPattern.exec(code)) !== null) {
    ports.push({
      channel: match[1],
      port: match[2],
      operation: match[3],
      line: getLineNumber(code, match.index),
      type: 'messageChannel_usage'
    });
  }
  
  return { ports, all: ports };
}

// ==================== POSTMESSAGE ENTRE VENTANAS ====================

/**
 * Extrae postMessage entre ventanas (parent, opener, iframe)
 * @param {string} code - Código fuente
 * @returns {Object} - {messages: [], all: []}
 */
export function extractWindowPostMessage(code) {
  const messages = [];
  
  // window.parent.postMessage, window.opener.postMessage
  const windowPostMessagePattern = /window\.(parent|opener|top)\.postMessage\s*\(/g;
  
  // iframe.contentWindow.postMessage
  const iframePostMessagePattern = /(\w+)\.contentWindow\.postMessage\s*\(/g;
  
  let match;
  while ((match = windowPostMessagePattern.exec(code)) !== null) {
    messages.push({
      target: match[1], // parent, opener, top
      line: getLineNumber(code, match.index),
      type: 'window_postMessage'
    });
  }
  
  while ((match = iframePostMessagePattern.exec(code)) !== null) {
    messages.push({
      target: 'iframe',
      iframeVar: match[1],
      line: getLineNumber(code, match.index),
      type: 'iframe_postMessage'
    });
  }
  
  return { messages, all: messages };
}

// ==================== DETECTAR TODAS LAS CONEXIONES AVANZADAS ====================

/**
 * Analiza un archivo y extrae TODOS los patrones avanzados
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Resultados completos
 */
export function extractAdvancedPatternsFromFile(filePath, code) {
  return {
    filePath,
    webWorkers: extractWebWorkerCommunication(code),
    broadcastChannel: extractBroadcastChannel(code),
    webSocket: extractWebSocket(code),
    serverSentEvents: extractServerSentEvents(code),
    networkCalls: extractNetworkCalls(code),
    messageChannel: extractMessageChannel(code),
    windowPostMessage: extractWindowPostMessage(code)
  };
}

/**
 * Detecta conexiones avanzadas entre archivos
 * @param {Object} fileSourceCode - Mapa de filePath -> código fuente
 * @returns {Object} - Conexiones detectadas
 */
export function detectAllAdvancedConnections(fileSourceCode) {
  const fileResults = {};
  for (const [filePath, code] of Object.entries(fileSourceCode)) {
    fileResults[filePath] = extractAdvancedPatternsFromFile(filePath, code);
  }
  
  const connections = [];
  
  // Detectar conexiones por BroadcastChannel
  const broadcastConnections = detectBroadcastChannelConnections(fileResults);
  connections.push(...broadcastConnections);
  
  // Detectar conexiones por WebSocket URL compartida
  const wsConnections = detectWebSocketConnections(fileResults);
  connections.push(...wsConnections);
  
  // Detectar conexiones por URL de red compartida
  const networkConnections = detectNetworkUrlConnections(fileResults);
  connections.push(...networkConnections);
  
  // Detectar conexiones Worker (main <-> worker)
  const workerConnections = detectWorkerConnections(fileResults);
  connections.push(...workerConnections);
  
  return {
    connections,
    fileResults,
    byType: {
      broadcastChannel: broadcastConnections,
      webSocket: wsConnections,
      network: networkConnections,
      worker: workerConnections
    }
  };
}

// ==================== DETECTORES ESPECÍFICOS ====================

function detectBroadcastChannelConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const channelsA = resultsA.broadcastChannel?.channels || [];
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const channelsB = resultsB.broadcastChannel?.channels || [];
      
      const channelNamesA = new Set(channelsA.map(c => c.channel));
      const channelNamesB = channelsB.map(c => c.channel);
      const commonChannels = channelNamesB.filter(c => channelNamesA.has(c));
      
      for (const channelName of commonChannels) {
        connections.push({
          id: `broadcast_${channelName}_${fileA}_to_${fileB}`,
          sourceFile: fileA,
          targetFile: fileB,
          type: 'broadcastChannel',
          via: 'broadcastChannel',
          channel: channelName,
          confidence: 1.0,
          detectedBy: 'advanced-extractor',
          reason: `Both files use BroadcastChannel '${channelName}'`
        });
      }
    }
  }
  
  return connections;
}

function detectWebSocketConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const urlsA = resultsA.webSocket?.urls || [];
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const urlsB = resultsB.webSocket?.urls || [];
      
      const wsUrlsA = new Set(urlsA.map(u => u.url));
      const wsUrlsB = urlsB.map(u => u.url);
      const commonUrls = wsUrlsB.filter(u => wsUrlsA.has(u));
      
      for (const url of commonUrls) {
        connections.push({
          id: `websocket_${url}_${fileA}_to_${fileB}`,
          sourceFile: fileA,
          targetFile: fileB,
          type: 'webSocket',
          via: 'webSocket',
          url: url,
          confidence: 1.0,
          detectedBy: 'advanced-extractor',
          reason: `Both files connect to WebSocket '${url}'`
        });
      }
    }
  }
  
  return connections;
}

function detectNetworkUrlConnections(fileResults) {
  const connections = [];
  const files = Object.entries(fileResults);
  
  for (let i = 0; i < files.length; i++) {
    const [fileA, resultsA] = files[i];
    const urlsA = resultsA.networkCalls?.urls || [];
    
    for (let j = i + 1; j < files.length; j++) {
      const [fileB, resultsB] = files[j];
      const urlsB = resultsB.networkCalls?.urls || [];
      
      const netUrlsA = new Set(urlsA.map(u => u.url));
      const netUrlsB = urlsB.map(u => u.url);
      const commonUrls = netUrlsB.filter(u => netUrlsA.has(u));
      
      for (const url of commonUrls) {
        connections.push({
          id: `network_${url}_${fileA}_to_${fileB}`,
          sourceFile: fileA,
          targetFile: fileB,
          type: 'network',
          via: 'network',
          url: url,
          confidence: 1.0,
          detectedBy: 'advanced-extractor',
          reason: `Both files call API endpoint '${url}'`
        });
      }
    }
  }
  
  return connections;
}

function detectWorkerConnections(fileResults) {
  const connections = [];
  
  // Buscar archivos que crean workers y los workers creados
  const workerCreators = [];
  const workers = [];
  
  for (const [filePath, results] of Object.entries(fileResults)) {
    const workerCreations = results.webWorkers?.outgoing?.filter(
      w => w.type === 'worker_creation'
    ) || [];
    
    for (const creation of workerCreations) {
      workerCreators.push({
        mainFile: filePath,
        workerPath: creation.workerPath
      });
    }
    
    // Detectar si este archivo ES un worker (tiene self.onmessage o self.postMessage)
    const isWorker = (results.webWorkers?.incoming?.length > 0) || 
                     (results.webWorkers?.outgoing?.some(w => w.type === 'worker_self_postMessage'));
    
    if (isWorker) {
      workers.push(filePath);
    }
  }
  
  // Crear conexiones main <-> worker
  for (const creator of workerCreators) {
    // Normalizar la ruta del worker (extraer solo nombre de archivo)
    const workerFileName = creator.workerPath.replace(/^.*[\\\/]/, '');
    
    // Buscar el archivo worker real (comparar solo nombres de archivo)
    const workerFile = Object.keys(fileResults).find(filePath => {
      const fileName = filePath.replace(/^.*[\\\/]/, '');
      return fileName === workerFileName || 
             filePath.includes(creator.workerPath.replace('./', '').replace('../', ''));
    });
    
    if (workerFile) {
      connections.push({
        id: `worker_${workerFileName}_${creator.mainFile}_to_${workerFile}`,
        sourceFile: creator.mainFile,
        targetFile: workerFile,
        type: 'webWorker',
        via: 'webWorker',
        workerPath: creator.workerPath,
        confidence: 1.0,
        detectedBy: 'advanced-extractor',
        reason: `'${creator.mainFile}' creates Worker '${workerFileName}'`
      });
    } else {
      // Worker no encontrado en el proyecto (puede ser externo)
      connections.push({
        id: `worker_external_${creator.mainFile}_${workerFileName}`,
        sourceFile: creator.mainFile,
        targetFile: creator.workerPath,
        type: 'webWorker',
        via: 'webWorker',
        workerPath: creator.workerPath,
        confidence: 0.8,
        detectedBy: 'advanced-extractor',
        reason: `'${creator.mainFile}' creates external Worker '${workerFileName}'`
      });
    }
  }
  
  return connections;
}

// ==================== UTILIDADES ====================

function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}
