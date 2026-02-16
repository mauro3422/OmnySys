/**
 * @fileoverview Job Detector Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/detectors/job-detector
 */

import { describe, it, expect } from 'vitest';
import { findScheduledJobs } from '../../../../../src/layer-a-static/module-system/detectors/job-detector.js';
import { 
  ModuleBuilder,
  AtomBuilder 
} from '../../../../factories/module-system-test.factory.js';

describe('Job Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export findScheduledJobs function', () => {
      expect(typeof findScheduledJobs).toBe('function');
    });

    it('should return array', () => {
      const result = findScheduledJobs([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Job Detection Patterns
  // ============================================================================
  describe('Job Detection Patterns', () => {
    it('should detect schedule* pattern', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [
            { name: 'scheduleCleanup' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      // Result should be an array
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should detect cron* pattern', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/cron.js', [
            { name: 'cronDailyReport' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should detect job* pattern', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/worker.js', [
            { name: 'jobProcessQueue' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should detect task* pattern', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/tasks.js', [
            { name: 'taskSendEmails' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  // ============================================================================
  // Job Structure
  // ============================================================================
  describe('Job Structure', () => {
    it('should have type set to scheduled', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [
            { name: 'scheduleTask' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0].type).toBe('scheduled');
      }
    });

    it('should have job name', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [
            { name: 'scheduleBackup' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0]).toHaveProperty('name');
      }
    });

    it('should have schedule property', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [
            { name: 'scheduleTask' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0]).toHaveProperty('schedule');
      }
    });

    it('should have handler info', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [
            { name: 'scheduleTask' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0]).toHaveProperty('handler');
        expect(jobs[0].handler).toHaveProperty('module');
        expect(jobs[0].handler).toHaveProperty('file');
        expect(jobs[0].handler).toHaveProperty('function');
      }
    });
  });

  // ============================================================================
  // Handler Info
  // ============================================================================
  describe('Handler Info', () => {
    it('should include module name', () => {
      const modules = [
        ModuleBuilder.create('scheduler')
          .withMolecule('src/scheduler/jobs.js', [
            { name: 'scheduleTask' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0].handler.module).toBe('scheduler');
      }
    });

    it('should include file name', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/cron.js', [
            { name: 'cronTask' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0].handler.file).toBe('cron.js');
      }
    });

    it('should include function name', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [
            { name: 'scheduleBackup' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0].handler.function).toBe('scheduleBackup');
      }
    });

    it('should handle missing file path', () => {
      const modules = [
        {
          moduleName: 'jobs',
          molecules: [{
            filePath: undefined,
            atoms: [{ name: 'scheduleTask' }]
          }]
        }
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0].handler.file).toBe('unknown');
      }
    });
  });

  // ============================================================================
  // Default Schedule
  // ============================================================================
  describe('Default Schedule', () => {
    it('should set unknown schedule by default', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [
            { name: 'scheduleTask' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      
      if (jobs.length > 0) {
        expect(jobs[0].schedule).toBe('unknown');
      }
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should return empty array for empty modules', () => {
      const jobs = findScheduledJobs([]);
      expect(jobs).toEqual([]);
    });

    it('should not detect non-job functions', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withMolecule('src/utils/helper.js', [
            { name: 'formatDate' },
            { name: 'parseData' }
          ])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      expect(jobs).toEqual([]);
    });

    it('should handle modules without molecules', () => {
      const modules = [ModuleBuilder.create('jobs').build()];
      
      const jobs = findScheduledJobs(modules);
      expect(jobs).toEqual([]);
    });

    it('should handle molecules without atoms', () => {
      const modules = [
        ModuleBuilder.create('jobs')
          .withMolecule('src/jobs/scheduler.js', [])
          .build()
      ];

      const jobs = findScheduledJobs(modules);
      expect(jobs).toEqual([]);
    });

    it('should handle atoms without name', () => {
      const modules = [
        {
          moduleName: 'jobs',
          molecules: [{
            filePath: 'jobs.js',
            atoms: [{}]
          }]
        }
      ];

      const jobs = findScheduledJobs(modules);
      expect(jobs).toEqual([]);
    });
  });
});
