/**
 * pattern-matchers.js
 * 
 * Detectores heurísticos para encontrar conexiones semánticas.
 * Usa regex para identificar eventos, storage y variables CSS.
 */

export function detectPatterns(code) {
    return {
        events: detectEvents(code),
        storage: detectStorage(code),
        cssVariables: detectCSSVariables(code)
    };
}

/**
 * Detecta uso de eventos (emit, on, dispatchEvent, addEventListener)
 */
function detectEvents(code) {
    const events = {
        emits: new Set(),
        listens: new Set()
    };

    // Patrones para emitir: .emit('name'), dispatchEvent(new CustomEvent('name'))
    const emitRegexes = [
        /\.emit\s*\(\s*['"]([^'"]+)['"]/g,
        /dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['"]([^'"]+)['"]/g
    ];

    // Patrones para escuchar: .on('name'), .addEventListener('name')
    const listenRegexes = [
        /\.on\s*\(\s*['"]([^'"]+)['"]/g,
        /\.addEventListener\s*\(\s*['"]([^'"]+)['"]/g
    ];

    for (const regex of emitRegexes) {
        let match;
        while ((match = regex.exec(code)) !== null) {
            events.emits.add(match[1]);
        }
    }

    for (const regex of listenRegexes) {
        let match;
        while ((match = regex.exec(code)) !== null) {
            events.listens.add(match[1]);
        }
    }

    return {
        emits: Array.from(events.emits),
        listens: Array.from(events.listens)
    };
}

/**
 * Detecta uso de localStorage y sessionStorage
 */
function detectStorage(code) {
    const storage = {
        reads: new Set(),
        writes: new Set()
    };

    // Patrones para escribir: .setItem('key', value)
    const writeRegex = /localStorage\.setItem\s*\(\s*['"]([^'"]+)['"]/g;

    // Patrones para leer: .getItem('key')
    const readRegex = /localStorage\.getItem\s*\(\s*['"]([^'"]+)['"]/g;

    let match;
    while ((match = writeRegex.exec(code)) !== null) {
        storage.writes.add(match[1]);
    }

    while ((match = readRegex.exec(code)) !== null) {
        storage.reads.add(match[1]);
    }

    return {
        reads: Array.from(storage.reads),
        writes: Array.from(storage.writes)
    };
}

/**
 * Detecta uso de variables CSS (setProperty, getPropertyValue)
 */
function detectCSSVariables(code) {
    const cssVars = {
        defines: new Set(),
        uses: new Set()
    };

    // Patrones para definir: .setProperty('--name', value)
    const setRegex = /\.setProperty\s*\(\s*['"](--[^'"]+)['"]/g;

    // Patrones para usar: .getPropertyValue('--name') o var(--name)
    const getRegex = [
        /\.getPropertyValue\s*\(\s*['"](--[^'"]+)['"]/g,
        /var\s*\(\s*['"]?(--[^'")]+)['"]?\s*\)/g
    ];

    let match;
    while ((match = setRegex.exec(code)) !== null) {
        cssVars.defines.add(match[1]);
    }

    for (const regex of getRegex) {
        while ((match = regex.exec(code)) !== null) {
            cssVars.uses.add(match[1]);
        }
    }

    return {
        defines: Array.from(cssVars.defines),
        uses: Array.from(cssVars.uses)
    };
}
