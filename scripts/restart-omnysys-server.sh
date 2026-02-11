#!/bin/bash
# restart-omnysys-server.sh
# Reinicia completamente el servidor OmnySys MCP

echo "🛑 Deteniendo servidor OmnySys MCP..."

# Buscar y matar procesos del servidor MCP
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq *mcp-server*" 2>/dev/null
    taskkill /F /IM "node.exe" /FI "COMMANDLINE eq *mcp-server*" 2>/dev/null
else
    # Linux/Mac
    pkill -f "mcp-server.js" 2>/dev/null
fi

sleep 2

echo "🚀 Reiniciando servidor OmnySys MCP..."

# Iniciar el servidor en background
node src/layer-c-memory/mcp-server.js . > logs/mcp-server-restart.log 2>&1 &

echo "✅ Servidor reiniciado"
echo "📝 Logs: logs/mcp-server-restart.log"
echo "⏳ Esperando 5 segundos para inicialización..."

sleep 5

echo "🎯 Servidor listo!"
