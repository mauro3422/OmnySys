# Scenario 13: The Singleton Identity Crisis (The "Two Managers" Trap)

**Propósito**: Validar si el sistema detecta que un cambio en la forma de exportar/importar un Singleton puede crear múltiples instancias del mismo servicio, rompiendo el flujo de datos.

## El Escenario: El Bus de Datos Duplicado

1. **ServiceManager.js**: Exporta una instancia única de un servicio `new Service()`.
2. **ComponentA.js**: Importa la instancia y registra un callback.
3. **ComponentB.js**: Por error (o refactorización de rutas), importa la CLASE en lugar de la INSTANCIA y crea su propia versión local, o importa desde un path que el bundler resuelve como un archivo distinto.

## El "Trap" (La Trampa)

Un desarrollador decide mover `ServiceManager.js` de `/utils` a `/core`. Actualiza los imports. Pero en un archivo oscuro, `LegacyPlugin.js`, el import se quedó apuntando a una ruta que, debido a un alias de Webpack o un symlink, sigue funcionando pero carga una SEGUNDA copia del archivo en memoria.

**El resultado**: El plugin emite eventos al "Bus de Datos B", pero todo el resto de la aplicación escucha el "Bus de Datos A". 

**Invisibilidad**: No hay errores. La aplicación simplemente "deja de funcionar" para ese plugin. **OmnySys debe alertar si un mismo símbolo exportado como Singleton parece estar siendo instanciado de múltiples formas o si hay rutas de importación ambiguas para el mismo recurso.**
