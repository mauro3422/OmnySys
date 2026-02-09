/**
 * @fileoverview Control Flow Visitor - Detecta estructuras de control
 * 
 * Detecta:
 * - IfStatement / ConditionalExpression (ternarios)
 * - SwitchStatement
 * - TryStatement / CatchClause
 * - Loops: For, While, DoWhile, ForOf, ForIn
 * 
 * @module data-flow-v2/visitors/control-flow-visitor
 */

export class ControlFlowVisitor {
  constructor(context) {
    this.context = context;
    this.builder = context.builder;
    this.scope = context.scope;
  }

  visit(ast) {
    this.traverse(ast, {
      IfStatement: (path) => this.visitIfStatement(path),
      ConditionalExpression: (path) => this.visitConditional(path),
      SwitchStatement: (path) => this.visitSwitch(path),
      TryStatement: (path) => this.visitTryCatch(path),
      ForStatement: (path) => this.visitForLoop(path),
      WhileStatement: (path) => this.visitWhileLoop(path),
      ForOfStatement: (path) => this.visitForOf(path)
    });
  }

  traverse(node, visitors, path = []) {
    if (!node || typeof node !== 'object') return;

    const nodeType = node.type;
    if (visitors[nodeType]) {
      visitors[nodeType]({ node, path });
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc') continue;
      
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c, i) => this.traverse(c, visitors, [...path, key, i]));
      } else if (child && typeof child === 'object') {
        this.traverse(child, visitors, [...path, key]);
      }
    }
  }

  visitIfStatement({ node }) {
    // if (condition) { consequent } else { alternate }
    
    const condition = this.extractCondition(node.test);
    
    const nodeId = this.builder.addNode({
      type: 'CONDITIONAL_BRANCH',
      category: 'control',
      standardToken: 'CTRL_IF',
      inputs: [condition],
      output: null, // El output depende de qué rama se ejecute
      properties: {
        isPure: true,
        hasElse: !!node.alternate,
        conditionType: condition.type
      },
      location: node.loc
    });

    this.context.transforms.push({
      type: 'CONDITIONAL_BRANCH',
      condition: condition.code,
      hasElse: !!node.alternate,
      nodeId,
      line: node.loc?.start?.line
    });

    // Marcar el scope como having branches
    this.scope.setHasBranches(true);
  }

  visitConditional({ node }) {
    // condition ? consequent : alternate
    
    const condition = this.extractCondition(node.test);
    const consequent = this.extractOperand(node.consequent);
    const alternate = this.extractOperand(node.alternate);

    const nodeId = this.builder.addNode({
      type: 'TERNARY',
      category: 'control',
      standardToken: 'CTRL_TERNARY',
      inputs: [condition, consequent, alternate],
      output: {
        name: this.getAssignmentTarget(node),
        type: 'union' // Tipo de consequent | alternate
      },
      properties: {
        isPure: true,
        shortCircuit: true
      },
      location: node.loc
    });

    this.context.transforms.push({
      type: 'TERNARY',
      condition: condition.code,
      trueValue: this.simplifyOperand(consequent),
      falseValue: this.simplifyOperand(alternate),
      nodeId,
      line: node.loc?.start?.line
    });
  }

  visitSwitch({ node }) {
    // switch (discriminant) { cases... }
    
    const discriminant = this.extractOperand(node.discriminant);
    const cases = node.cases.map((c, i) => ({
      test: c.test ? this.extractOperand(c.test) : 'default',
      index: i
    }));

    this.builder.addNode({
      type: 'SWITCH',
      category: 'control',
      standardToken: 'CTRL_SWITCH',
      inputs: [discriminant, ...cases.map(c => c.test)],
      output: null,
      properties: {
        isPure: true,
        caseCount: cases.length
      },
      location: node.loc
    });
  }

  visitTryCatch({ node }) {
    // try { block } catch (param) { handler } finally { finalizer }
    
    this.builder.addNode({
      type: 'TRY_CATCH',
      category: 'control',
      standardToken: 'CTRL_TRY',
      inputs: [],
      output: null,
      properties: {
        isPure: false, // Puede tener side effects en catch
        hasCatch: !!node.handler,
        hasFinally: !!node.finalizer,
        catchParam: node.handler?.param?.name
      },
      location: node.loc
    });

    this.context.transforms.push({
      type: 'TRY_CATCH',
      hasCatch: !!node.handler,
      hasFinally: !!node.finalizer,
      line: node.loc?.start?.line
    });
  }

  visitForLoop({ node }) {
    // for (init; test; update) { body }
    
    this.builder.addNode({
      type: 'FOR_LOOP',
      category: 'control',
      standardToken: 'CTRL_FOR',
      inputs: [],
      output: null,
      properties: {
        isPure: false, // Puede mutar variables
        hasInit: !!node.init,
        hasTest: !!node.test,
        hasUpdate: !!node.update
      },
      location: node.loc
    });
  }

  visitWhileLoop({ node }) {
    // while (test) { body }
    
    const condition = this.extractCondition(node.test);
    
    this.builder.addNode({
      type: 'WHILE_LOOP',
      category: 'control',
      standardToken: 'CTRL_WHILE',
      inputs: [condition],
      output: null,
      properties: {
        isPure: false,
        condition: condition.code
      },
      location: node.loc
    });
  }

  visitForOf({ node }) {
    // for (left of right) { body }
    
    const iterable = this.extractOperand(node.right);
    const iterator = node.left?.name || 'iterator';

    this.builder.addNode({
      type: 'FOR_OF',
      category: 'control',
      standardToken: 'CTRL_FOR_OF',
      inputs: [iterable],
      output: {
        name: iterator,
        type: 'element' // Elemento del iterable
      },
      properties: {
        isPure: false,
        iterator
      },
      location: node.loc
    });

    // Registrar la variable del iterador en el scope
    this.scope.registerVariable(iterator, {
      type: 'iterator',
      source: iterable.name || 'unknown'
    });
  }

  // Helpers

  extractCondition(node) {
    if (!node) return { type: 'unknown', code: 'true' };

    return {
      type: node.type,
      code: this.nodeToCode(node),
      variables: this.extractVariablesFromNode(node)
    };
  }

  extractOperand(node) {
    if (!node) return { type: 'unknown' };

    if (node.type === 'Identifier') {
      return {
        type: 'variable',
        name: node.name,
        isParam: this.scope.isParam(node.name)
      };
    }

    if (node.type === 'Literal') {
      return {
        type: 'literal',
        value: node.value,
        raw: node.raw
      };
    }

    return {
      type: node.type,
      code: this.nodeToCode(node)
    };
  }

  extractVariablesFromNode(node, vars = []) {
    if (!node) return vars;

    if (node.type === 'Identifier') {
      vars.push(node.name);
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'loc') continue;
      
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(c => this.extractVariablesFromNode(c, vars));
      } else if (child && typeof child === 'object') {
        this.extractVariablesFromNode(child, vars);
      }
    }

    return vars;
  }

  nodeToCode(node) {
    // Simplificación - en producción usaría babel-generator
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'Literal') return node.raw;
    if (node.type === 'BinaryExpression') {
      return `${this.nodeToCode(node.left)} ${node.operator} ${this.nodeToCode(node.right)}`;
    }
    return `[${node.type}]`;
  }

  simplifyOperand(op) {
    if (op.name) return op.name;
    if (op.value !== undefined) return String(op.value);
    return op.code || '[expression]';
  }

  getAssignmentTarget(node) {
    // Buscar si esta expresión es asignada a una variable
    // Esto requeriría acceso al contexto padre
    return null;
  }
}

export default ControlFlowVisitor;
