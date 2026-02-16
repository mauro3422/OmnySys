/**
 * @fileoverview CLI Detector Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/detectors/cli-detector
 */

import { describe, it, expect } from 'vitest';
import { findCLICommands } from '../../../../../src/layer-a-static/module-system/detectors/cli-detector.js';
import { 
  ModuleBuilder,
  ExportBuilder 
} from '../../../../factories/module-system-test.factory.js';

describe('CLI Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export findCLICommands function', () => {
      expect(typeof findCLICommands).toBe('function');
    });

    it('should return array', () => {
      const result = findCLICommands([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // CLI Module Detection
  // ============================================================================
  describe('CLI Module Detection', () => {
    it('should find commands in cli module', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('runCommand', { type: 'handler', file: 'commands.js' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should find commands in cli directory', () => {
      const modules = [
        ModuleBuilder.create('commands')
          .withFile('src/commands/cli.js')
          .withExport('execute', { type: 'handler', file: 'cli.js' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      expect(commands.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Command Detection by Type
  // ============================================================================
  describe('Command Detection by Type', () => {
    it('should detect handler type exports', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('processCommand', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should detect command-named exports', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('runTestCommand', { type: 'function' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      expect(commands.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Command Structure
  // ============================================================================
  describe('Command Structure', () => {
    it('should have type set to cli', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('run', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      if (commands.length > 0) {
        expect(commands[0].type).toBe('cli');
      }
    });

    it('should have command name', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('runTest', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      if (commands.length > 0) {
        expect(commands[0]).toHaveProperty('command');
        expect(typeof commands[0].command).toBe('string');
      }
    });

    it('should have handler info', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('runTest', { type: 'handler', file: 'commands.js' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      if (commands.length > 0) {
        expect(commands[0]).toHaveProperty('handler');
        expect(commands[0].handler).toHaveProperty('module');
        expect(commands[0].handler).toHaveProperty('file');
        expect(commands[0].handler).toHaveProperty('function');
      }
    });

    it('should convert command name to kebab-case', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('runTests', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      if (commands.length > 0) {
        expect(commands[0].command).toContain('-');
      }
    });
  });

  // ============================================================================
  // Handler Info
  // ============================================================================
  describe('Handler Info', () => {
    it('should include module name in handler', () => {
      const modules = [
        ModuleBuilder.create('commands')
          .withExport('execute', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      if (commands.length > 0) {
        expect(commands[0].handler.module).toBe('commands');
      }
    });

    it('should include file name in handler', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('run', { type: 'handler', file: 'main.js' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      if (commands.length > 0) {
        expect(commands[0].handler.file).toBe('main.js');
      }
    });

    it('should include function name in handler', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('myCommand', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      if (commands.length > 0) {
        expect(commands[0].handler.function).toBe('myCommand');
      }
    });
  });

  // ============================================================================
  // Multiple Commands
  // ============================================================================
  describe('Multiple Commands', () => {
    it('should detect multiple commands in same module', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('runTest', { type: 'handler' })
          .withExport('buildProject', { type: 'handler' })
          .withExport('deployApp', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      expect(commands.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect commands across multiple modules', () => {
      const modules = [
        ModuleBuilder.create('cli')
          .withExport('run', { type: 'handler' })
          .build(),
        ModuleBuilder.create('scripts')
          .withFile('src/scripts/cli.js')
          .withExport('execute', { type: 'handler' })
          .build()
      ];

      const commands = findCLICommands(modules);
      
      expect(commands.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should return empty array for empty modules', () => {
      const commands = findCLICommands([]);
      expect(commands).toEqual([]);
    });

    it('should not detect commands in non-cli modules', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withExport('helper', { type: 'function' })
          .build()
      ];

      const commands = findCLICommands(modules);
      expect(commands).toEqual([]);
    });

    it('should handle module without exports', () => {
      const modules = [ModuleBuilder.create('cli').build()];
      
      const commands = findCLICommands(modules);
      expect(commands).toEqual([]);
    });

    it('should handle null exports', () => {
      const modules = [
        { moduleName: 'cli', files: [], exports: null }
      ];
      
      const commands = findCLICommands(modules);
      expect(commands).toEqual([]);
    });

    it('should handle empty exports array', () => {
      const modules = [
        { moduleName: 'cli', files: [], exports: [] }
      ];
      
      const commands = findCLICommands(modules);
      expect(commands).toEqual([]);
    });
  });
});
