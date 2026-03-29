export async function validateCompilerImports(args, context) {
  const { validate_imports } = await import('../../layer-c-memory/mcp/tools/validate-imports.js');
  return await validate_imports(args, context);
}

export async function reindexCompilerFile(filePath, projectPath) {
  const { reindexFile } = await import('../../layer-c-memory/mcp/tools/atomic-edit/reindex.js');
  return await reindexFile(filePath, projectPath);
}
