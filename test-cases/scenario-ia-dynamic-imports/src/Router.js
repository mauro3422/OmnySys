/**
 * Router.js
 * 
 * TRAP: Dynamic imports con variables. La IA debe inferir qué módulos se cargan.
 */

// Mapa de rutas a nombres de módulos (detectable estáticamente)
const routeMap = {
  '/user': 'UserModule',
  '/admin': 'AdminModule',
  '/dashboard': 'DashboardModule'
};

export async function navigateTo(route) {
  const moduleName = routeMap[route]; // 'UserModule', 'AdminModule', etc.
  
  if (!moduleName) {
    console.warn(`Route ${route} not found`);
    return;
  }
  
  // TRAP: Dynamic import con variable
  // Esto NO se puede resolver estáticamente
  const module = await import(`./modules/${moduleName}.js`);
  
  // Inicializar el módulo
  if (module.default && module.default.init) {
    module.default.init();
  }
  
  return module;
}

// Otra función con dynamic import diferente
export async function loadPlugin(pluginName) {
  // pluginName viene de config, no es estático
  const config = window.appConfig;
  const plugin = config.activePlugin; // 'AnalyticsPlugin', 'ChatPlugin', etc.
  
  // Otro dynamic import - la IA debe detectar patrón similar
  const pluginModule = await import(`./plugins/${plugin}.js`);
  return pluginModule;
}
