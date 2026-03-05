/**
 * @fileoverview Env Builder - Builder for creating environment variable test code
 */

/**
 * @typedef {Object} EnvVar
 * @property {string} name - Environment variable name
 * @property {number} line - Line number in generated code
 * @property {string} type - Type of access (process.env, import.meta.env)
 */

/**
 * @typedef {Object} EnvBuilderResult
 * @property {string} code - Generated code
 * @property {EnvVar[]} envVars - List of environment variables
 */

export class EnvBuilder {
  constructor() {
    this.code = '';
    /** @type {EnvVar[]} */
    this.envVars = [];
  }

  /**
   * Calculate line number for a newly added line
   * @private
   * @returns {number} Line number
   */
  #getCurrentLine() {
    return this.code.split('\n').length;
  }

  /**
   * Add a line of code and track environment variable
   * @private
   * @param {string} line - Code line to add
   * @param {string} varName - Environment variable name
   * @param {string} type - Type of access
   */
  #addLineWithTracking(line, varName, type) {
    this.code += `\n${line}`;
    this.envVars.push({ name: varName, line: this.#getCurrentLine(), type });
  }

  /**
   * Add process.env access
   * @param {string} varName - Environment variable name
   * @param {string} variableName - Local variable name
   * @returns {EnvBuilder} this
   */
  withProcessEnv(varName = 'API_URL', variableName = 'apiUrl') {
    this.#addLineWithTracking(
      `const ${variableName} = process.env.${varName};`,
      varName,
      'process.env'
    );
    return this;
  }

  /**
   * Add import.meta.env access (Vite)
   * @param {string} varName - Environment variable name
   * @param {string} variableName - Local variable name
   * @returns {EnvBuilder} this
   */
  withImportMetaEnv(varName = 'VITE_API_URL', variableName = 'apiUrl') {
    this.#addLineWithTracking(
      `const ${variableName} = import.meta.env.${varName};`,
      varName,
      'import.meta.env'
    );
    return this;
  }

  /**
   * Add default value pattern
   * @param {string} varName - Environment variable name
   * @param {string} defaultValue - Default value
   * @returns {EnvBuilder} this
   */
  withDefaultValue(varName = 'PORT', defaultValue = '3000') {
    this.#addLineWithTracking(
      `const port = process.env.${varName} || '${defaultValue}';`,
      varName,
      'process.env'
    );
    return this;
  }

  /**
   * Add boolean environment variable
   * @param {string} varName - Environment variable name
   * @returns {EnvBuilder} this
   */
  withBooleanEnv(varName = 'DEBUG') {
    this.#addLineWithTracking(
      `const isDebug = process.env.${varName} === 'true';`,
      varName,
      'process.env'
    );
    return this;
  }

  /**
   * Add multiple environment variables
   * @param {string[]} varNames - Environment variable names
   * @returns {EnvBuilder} this
   */
  withMultipleEnv(varNames = ['API_URL', 'API_KEY', 'NODE_ENV']) {
    varNames.forEach(name => {
      this.withProcessEnv(name, name.toLowerCase());
    });
    return this;
  }

  /**
   * Create config object from env vars
   * @returns {EnvBuilder} this
   */
  withConfigObject() {
    const startLine = this.#getCurrentLine();
    this.code += `
const config = {
  apiUrl: process.env.API_URL,
  apiKey: process.env.API_KEY,
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development'
};`;

    const configVars = [
      { name: 'API_URL', offset: 1 },
      { name: 'API_KEY', offset: 2 },
      { name: 'PORT', offset: 3 },
      { name: 'NODE_ENV', offset: 4 }
    ];

    configVars.forEach(({ name, offset }) => {
      this.envVars.push({
        name,
        line: startLine + offset,
        type: 'process.env'
      });
    });

    return this;
  }

  /**
   * Build the result object
   * @returns {EnvBuilderResult} Result with code and envVars
   */
  build() {
    return {
      code: this.code,
      envVars: this.envVars
    };
  }
}
