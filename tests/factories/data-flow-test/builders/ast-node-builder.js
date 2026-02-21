/**
 * @fileoverview AST Node Builder
 * Builder for creating AST node structures
 */

export class ASTNodeBuilder {
  static identifier(name, line = 1) {
    return {
      type: 'Identifier',
      name,
      loc: { start: { line }, end: { line } }
    };
  }

  static literal(value, line = 1) {
    return {
      type: 'Literal',
      value,
      raw: JSON.stringify(value),
      loc: { start: { line }, end: { line } }
    };
  }

  static returnStatement(argument, line = 1) {
    return {
      type: 'ReturnStatement',
      argument,
      loc: { start: { line }, end: { line } }
    };
  }

  static throwStatement(argument, line = 1) {
    return {
      type: 'ThrowStatement',
      argument,
      loc: { start: { line }, end: { line } }
    };
  }

  static expressionStatement(expression, line = 1) {
    return {
      type: 'ExpressionStatement',
      expression,
      loc: { start: { line }, end: { line } }
    };
  }

  static callExpression(callee, args = [], line = 1) {
    return {
      type: 'CallExpression',
      callee: typeof callee === 'string' ? this.identifier(callee) : callee,
      arguments: args,
      loc: { start: { line }, end: { line } }
    };
  }

  static memberExpression(object, property, computed = false, line = 1) {
    return {
      type: 'MemberExpression',
      object: typeof object === 'string' ? this.identifier(object) : object,
      property: typeof property === 'string' ? this.identifier(property) : property,
      computed,
      loc: { start: { line }, end: { line } }
    };
  }

  static binaryExpression(operator, left, right, line = 1) {
    return {
      type: 'BinaryExpression',
      operator,
      left: typeof left === 'string' ? this.identifier(left) : left,
      right: typeof right === 'string' ? this.identifier(right) : right,
      loc: { start: { line }, end: { line } }
    };
  }

  static assignmentExpression(left, right, operator = '=', line = 1) {
    return {
      type: 'AssignmentExpression',
      operator,
      left: typeof left === 'string' ? this.identifier(left) : left,
      right: typeof right === 'string' ? this.identifier(right) : right,
      loc: { start: { line }, end: { line } }
    };
  }

  static variableDeclaration(kind, declarations, line = 1) {
    return {
      type: 'VariableDeclaration',
      kind,
      declarations: declarations.map(d => ({
        type: 'VariableDeclarator',
        id: typeof d.id === 'string' ? this.identifier(d.id) : d.id,
        init: d.init ? (typeof d.init === 'string' ? this.identifier(d.init) : d.init) : null
      })),
      loc: { start: { line }, end: { line } }
    };
  }

  static functionDeclaration(name, params, body, line = 1) {
    return {
      type: 'FunctionDeclaration',
      id: name ? this.identifier(name) : null,
      params: params.map(p => typeof p === 'string' ? this.identifier(p) : p),
      body: body.type === 'BlockStatement' ? body : this.blockStatement(body),
      loc: { start: { line }, end: { line: line + 10 } }
    };
  }

  static arrowFunctionExpression(params, body, expression = false, line = 1) {
    return {
      type: 'ArrowFunctionExpression',
      params: params.map(p => typeof p === 'string' ? this.identifier(p) : p),
      body: expression ? body : (body.type === 'BlockStatement' ? body : this.blockStatement(body)),
      expression,
      loc: { start: { line }, end: { line: line + 5 } }
    };
  }

  static blockStatement(body = [], line = 1) {
    return {
      type: 'BlockStatement',
      body: Array.isArray(body) ? body : [body],
      loc: { start: { line }, end: { line: line + 10 } }
    };
  }

  static ifStatement(test, consequent, alternate = null, line = 1) {
    return {
      type: 'IfStatement',
      test: typeof test === 'string' ? this.identifier(test) : test,
      consequent: consequent.type === 'BlockStatement' ? consequent : this.blockStatement(consequent),
      alternate: alternate ? (alternate.type === 'BlockStatement' ? alternate : this.blockStatement(alternate)) : null,
      loc: { start: { line }, end: { line: line + 5 } }
    };
  }

  static tryStatement(block, handler = null, finalizer = null, line = 1) {
    return {
      type: 'TryStatement',
      block: block.type === 'BlockStatement' ? block : this.blockStatement(block),
      handler: handler ? {
        type: 'CatchClause',
        param: handler.param ? this.identifier(handler.param) : null,
        body: handler.body.type === 'BlockStatement' ? handler.body : this.blockStatement(handler.body)
      } : null,
      finalizer: finalizer ? (finalizer.type === 'BlockStatement' ? finalizer : this.blockStatement(finalizer)) : null,
      loc: { start: { line }, end: { line: line + 10 } }
    };
  }

  static objectExpression(properties = [], line = 1) {
    return {
      type: 'ObjectExpression',
      properties: properties.map(p => ({
        type: 'Property',
        key: typeof p.key === 'string' ? this.identifier(p.key) : p.key,
        value: typeof p.value === 'string' ? this.identifier(p.value) : p.value,
        kind: 'init'
      })),
      loc: { start: { line }, end: { line } }
    };
  }

  static arrayExpression(elements = [], line = 1) {
    return {
      type: 'ArrayExpression',
      elements: elements.map(e => typeof e === 'string' ? this.identifier(e) : e),
      loc: { start: { line }, end: { line } }
    };
  }
}
