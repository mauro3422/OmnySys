export class CodeSampleBuilder {
    constructor() {
        this.code = '';
    }

    addAsyncFunction(name, body, isExported = false) {
        const exportStr = isExported ? 'export ' : '';
        this.code += `${exportStr}async function ${name}() {
${body}
}
`;
        return this;
    }

    addFunction(name, body, isAsync = false, isExported = false) {
        const asyncStr = isAsync ? 'async ' : '';
        const exportStr = isExported ? 'export ' : '';
        this.code += `${exportStr}${asyncStr}function ${name}() {
${body}
}
`;
        return this;
    }

    addArrowFunction(name, body, isAsync = false) {
        const asyncStr = isAsync ? 'async ' : '';
        this.code += `const ${name} = ${asyncStr}() => {
${body}
};
`;
        return this;
    }

    addTryCatch(tryBody, catchBody = 'console.error(e);') {
        this.code += `try {
${tryBody}
} catch (e) {
${catchBody}
}
`;
        return this;
    }

    addPromiseChain(target) {
        this.code += `${target}.then(result => result).catch(err => err);
`;
        return this;
    }

    addPromiseAll(calls) {
        this.code += `await Promise.all([${calls.join(', ')}]);
`;
        return this;
    }

    addSetTimeout(delay, callback = '() => {}') {
        this.code += `setTimeout(${callback}, ${delay});
`;
        return this;
    }

    addFetch(url) {
        this.code += `const response = await fetch('${url}');
`;
        return this;
    }

    addThrow(errorType, message) {
        this.code += `throw new ${errorType}('${message}');
`;
        return this;
    }

    build() {
        return this.code;
    }

    static simpleAsync() {
        return new CodeSampleBuilder()
            .addAsyncFunction('fetchData', '  return await fetch("/api/data");');
    }

    static withErrorHandling() {
        return new CodeSampleBuilder()
            .addAsyncFunction('safeFetch', `  try {
    return await fetch("/api/data");
  } catch (e) {
    console.error(e);
    throw e;
  }`);
    }

    static withParallelCalls() {
        return new CodeSampleBuilder()
            .addAsyncFunction('fetchAll', `  const [a, b, c] = await Promise.all([
    fetch("/api/a"),
    fetch("/api/b"),
    fetch("/api/c")
  ]);
  return { a, b, c };`);
    }
}
