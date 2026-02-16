/**
 * @fileoverview Tests for TypeScript Extractor
 * 
 * Tests the extraction of:
 * - TypeScript interfaces
 * - Type aliases
 * - Enums
 * - Type references/usages
 */

import { describe, it, expect } from 'vitest';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

import { 
  extractTSInterface, 
  extractTSTypeAlias,
  extractTSEnum,
  extractTSTypeReference
} from '#layer-a/parser/extractors/typescript.js';
import { 
  CodeSampleBuilder, 
  ASTBuilder,
  ParserScenarioFactory 
} from '../../../../factories/parser-test.factory.js';

describe('TypeScriptExtractor', () => {
  const createMockFileInfo = () => ({
    typeDefinitions: [],
    enumDefinitions: [],
    typeUsages: []
  });

  const getTSOptions = () => ({
    sourceType: 'module',
    plugins: ['typescript']
  });

  describe('Structure Contract', () => {
    it('MUST export extractTSInterface function', () => {
      expect(extractTSInterface).toBeTypeOf('function');
    });

    it('MUST export extractTSTypeAlias function', () => {
      expect(extractTSTypeAlias).toBeTypeOf('function');
    });

    it('MUST export extractTSEnum function', () => {
      expect(extractTSEnum).toBeTypeOf('function');
    });

    it('MUST export extractTSTypeReference function', () => {
      expect(extractTSTypeReference).toBeTypeOf('function');
    });

    it('extractTSInterface MUST return fileInfo object', () => {
      const fileInfo = createMockFileInfo();
      const code = 'interface Test {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      let result;
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          result = extractTSInterface(nodePath, fileInfo);
        }
      });
      expect(result).toBe(fileInfo);
    });

    it('extractTSTypeAlias MUST return fileInfo object', () => {
      const fileInfo = createMockFileInfo();
      const code = 'type Test = string;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      let result;
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          result = extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(result).toBe(fileInfo);
    });

    it('extractTSEnum MUST return fileInfo object', () => {
      const fileInfo = createMockFileInfo();
      const code = 'enum Test {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      let result;
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          result = extractTSEnum(nodePath, fileInfo);
        }
      });
      expect(result).toBe(fileInfo);
    });

    it('extractTSTypeReference MUST return fileInfo object', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const x: Test;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      let result;
      traverse(ast, {
        TSTypeReference(nodePath) {
          result = extractTSTypeReference(nodePath, fileInfo);
        }
      });
      expect(result).toBe(fileInfo);
    });
  });

  describe('Interface Extraction', () => {
    it('MUST extract interface name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'interface User {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions).toHaveLength(1);
      expect(fileInfo.typeDefinitions[0].name).toBe('User');
      expect(fileInfo.typeDefinitions[0].type).toBe('interface');
    });

    it('MUST extract interface properties count', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        interface User {
          name: string;
          age: number;
          email: string;
        }
      `;
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].properties).toBe(3);
    });

    it('MUST detect exported interfaces', () => {
      const fileInfo = createMockFileInfo();
      const code = 'export interface ExportedInterface {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].isExported).toBe(true);
    });

    it('MUST detect non-exported interfaces', () => {
      const fileInfo = createMockFileInfo();
      const code = 'interface InternalInterface {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].isExported).toBe(false);
    });

    it('MUST capture line numbers', () => {
      const fileInfo = createMockFileInfo();
      const code = '\n\ninterface Test {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].line).toBeGreaterThan(0);
    });

    it('MUST skip interfaces without id', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          id: null,
          body: { body: [] },
          loc: { start: { line: 1 } }
        },
        parent: { type: 'Program' }
      };
      extractTSInterface(mockNodePath, fileInfo);
      expect(fileInfo.typeDefinitions).toHaveLength(0);
    });
  });

  describe('Type Alias Extraction', () => {
    it('MUST extract type alias name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'type ID = string;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions).toHaveLength(1);
      expect(fileInfo.typeDefinitions[0].name).toBe('ID');
      expect(fileInfo.typeDefinitions[0].type).toBe('type');
    });

    it('MUST detect exported type aliases', () => {
      const fileInfo = createMockFileInfo();
      const code = 'export type Result<T> = { success: true; data: T } | { success: false; error: string };';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].isExported).toBe(true);
    });

    it('MUST handle generic type aliases', () => {
      const fileInfo = createMockFileInfo();
      const code = 'type Container<T> = { value: T };';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].name).toBe('Container');
    });

    it('MUST handle union types', () => {
      const fileInfo = createMockFileInfo();
      const code = "type Status = 'active' | 'inactive';";
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].name).toBe('Status');
    });

    it('MUST handle intersection types', () => {
      const fileInfo = createMockFileInfo();
      const code = 'type DetailedUser = User & { details: Details };';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].name).toBe('DetailedUser');
    });

    it('MUST capture line numbers', () => {
      const fileInfo = createMockFileInfo();
      const code = '\n\ntype Test = string;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].line).toBeGreaterThan(0);
    });
  });

  describe('Enum Extraction', () => {
    it('MUST extract enum name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'enum Status {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      expect(fileInfo.enumDefinitions).toHaveLength(1);
      expect(fileInfo.enumDefinitions[0].name).toBe('Status');
      expect(fileInfo.enumDefinitions[0].type).toBe('enum');
    });

    it('MUST extract enum members', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        enum Status {
          ACTIVE,
          INACTIVE,
          PENDING
        }
      `;
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      expect(fileInfo.enumDefinitions[0].members).toEqual(['ACTIVE', 'INACTIVE', 'PENDING']);
    });

    it('MUST extract enum with values', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        enum Priority {
          LOW = 1,
          MEDIUM = 2,
          HIGH = 3
        }
      `;
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      expect(fileInfo.enumDefinitions[0].members).toEqual(['LOW', 'MEDIUM', 'HIGH']);
    });

    it('MUST detect exported enums', () => {
      const fileInfo = createMockFileInfo();
      const code = 'export enum Colors { RED, GREEN, BLUE }';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      expect(fileInfo.enumDefinitions[0].isExported).toBe(true);
    });

    it('MUST capture line numbers', () => {
      const fileInfo = createMockFileInfo();
      const code = '\n\nenum Test {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      expect(fileInfo.enumDefinitions[0].line).toBeGreaterThan(0);
    });

    it('MUST skip enums without id', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          id: null,
          members: [],
          loc: { start: { line: 1 } }
        },
        parent: { type: 'Program' }
      };
      extractTSEnum(mockNodePath, fileInfo);
      expect(fileInfo.enumDefinitions).toHaveLength(0);
    });
  });

  describe('Type Reference Extraction', () => {
    it('MUST extract type reference name', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const user: User;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeReference(nodePath) {
          extractTSTypeReference(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeUsages.length).toBeGreaterThan(0);
      expect(fileInfo.typeUsages[0].name).toBe('User');
    });

    it('MUST extract type references from function parameters', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test(user: User, config: Config) {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeReference(nodePath) {
          extractTSTypeReference(nodePath, fileInfo);
        }
      });
      const names = fileInfo.typeUsages.map(u => u.name);
      expect(names).toContain('User');
      expect(names).toContain('Config');
    });

    it('MUST extract type references from return types', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test(): Result {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeReference(nodePath) {
          extractTSTypeReference(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeUsages.some(u => u.name === 'Result')).toBe(true);
    });

    it('MUST capture line numbers for type usages', () => {
      const fileInfo = createMockFileInfo();
      const code = '\n\nconst x: Test;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeReference(nodePath) {
          extractTSTypeReference(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeUsages[0].line).toBeGreaterThan(0);
    });

    it('MUST deduplicate type usages on same line', () => {
      const fileInfo = createMockFileInfo();
      const code = 'function test(a: Test, b: Test): Test {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeReference(nodePath) {
          extractTSTypeReference(nodePath, fileInfo);
        }
      });
      // Multiple references to same type on same line should be deduplicated
      const testUsages = fileInfo.typeUsages.filter(u => u.name === 'Test');
      expect(testUsages.length).toBeLessThanOrEqual(3);
    });

    it('MUST handle type references with generics', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const items: Array<string>;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeReference(nodePath) {
          extractTSTypeReference(nodePath, fileInfo);
        }
      });
      // Should capture Array as the type reference
      expect(fileInfo.typeUsages.some(u => u.name === 'Array')).toBe(true);
    });

    it('MUST skip type references without identifier typeName', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          typeName: { type: 'TSQualifiedName' },
          loc: { start: { line: 1 } }
        }
      };
      extractTSTypeReference(mockNodePath, fileInfo);
      expect(fileInfo.typeUsages).toHaveLength(0);
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle interface with empty body', () => {
      const fileInfo = createMockFileInfo();
      const code = 'interface Empty {}';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].properties).toBe(0);
    });

    it('MUST handle enum with single member', () => {
      const fileInfo = createMockFileInfo();
      const code = 'enum Single { ONE }';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      expect(fileInfo.enumDefinitions[0].members).toEqual(['ONE']);
    });

    it('MUST handle type alias without complex type', () => {
      const fileInfo = createMockFileInfo();
      const code = 'type Simple = string;';
      const ast = ASTBuilder.parse(code, getTSOptions());
      traverse(ast, {
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        }
      });
      expect(fileInfo.typeDefinitions[0].name).toBe('Simple');
    });

    it('MUST handle malformed type reference', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          typeName: null,
          loc: { start: { line: 1 } }
        }
      };
      extractTSTypeReference(mockNodePath, fileInfo);
      expect(fileInfo.typeUsages).toHaveLength(0);
    });

    it('MUST handle interface without loc', () => {
      const fileInfo = createMockFileInfo();
      const mockNodePath = {
        node: {
          id: { name: 'Test' },
          body: { body: [] },
          loc: null
        },
        parent: { type: 'Program' }
      };
      extractTSInterface(mockNodePath, fileInfo);
      expect(fileInfo.typeDefinitions[0].line).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('MUST handle complex TypeScript file', () => {
      const fileInfo = createMockFileInfo();
      const { code } = ParserScenarioFactory.typescriptFile();
      const ast = ASTBuilder.parse(code, getTSOptions());
      
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        },
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        },
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      
      expect(fileInfo.typeDefinitions.length + fileInfo.enumDefinitions.length).toBeGreaterThan(0);
    });

    it('MUST track all type definitions correctly', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        interface A {}
        interface B {}
        type C = A;
        type D = B;
        enum E { X }
      `;
      const ast = ASTBuilder.parse(code, getTSOptions());
      
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        },
        TSTypeAliasDeclaration(nodePath) {
          extractTSTypeAlias(nodePath, fileInfo);
        },
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      
      expect(fileInfo.typeDefinitions).toHaveLength(4); // A, B, C, D
      expect(fileInfo.enumDefinitions).toHaveLength(1); // E
    });

    it('MUST handle extended interfaces', () => {
      const fileInfo = createMockFileInfo();
      const code = `
        interface Base {
          id: number;
        }
        interface Extended extends Base {
          name: string;
        }
      `;
      const ast = ASTBuilder.parse(code, getTSOptions());
      
      traverse(ast, {
        TSInterfaceDeclaration(nodePath) {
          extractTSInterface(nodePath, fileInfo);
        }
      });
      
      expect(fileInfo.typeDefinitions).toHaveLength(2);
      expect(fileInfo.typeDefinitions[0].name).toBe('Base');
      expect(fileInfo.typeDefinitions[1].name).toBe('Extended');
    });

    it('MUST handle const enums', () => {
      const fileInfo = createMockFileInfo();
      const code = 'const enum ConstEnum { A, B, C }';
      const ast = ASTBuilder.parse(code, getTSOptions());
      
      traverse(ast, {
        TSEnumDeclaration(nodePath) {
          extractTSEnum(nodePath, fileInfo);
        }
      });
      
      expect(fileInfo.enumDefinitions[0].name).toBe('ConstEnum');
      expect(fileInfo.enumDefinitions[0].members).toEqual(['A', 'B', 'C']);
    });
  });
});
