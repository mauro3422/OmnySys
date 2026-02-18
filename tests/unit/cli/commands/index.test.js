import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('#cli/commands/up.js', () => ({
  aliases: ['start', 'up'],
  upLogic: vi.fn()
}));

vi.mock('#cli/commands/down.js', () => ({
  aliases: ['stop', 'down'],
  downLogic: vi.fn()
}));

vi.mock('#cli/commands/status.js', () => ({
  aliases: ['status'],
  statusLogic: vi.fn()
}));

vi.mock('#cli/commands/tools.js', () => ({
  aliases: ['tools'],
  toolsLogic: vi.fn()
}));

vi.mock('#cli/commands/call.js', () => ({
  aliases: ['call'],
  callLogic: vi.fn()
}));

vi.mock('#cli/commands/setup.js', () => ({
  aliases: ['setup'],
  setupLogic: vi.fn()
}));

vi.mock('#cli/commands/help.js', () => ({
  aliases: ['help', '--help', '-h'],
  helpLogic: vi.fn()
}));

const { findCommand, findCommandLogic, commands } = await import('#cli/commands/index.js');

describe('findCommand', () => {
  it('finds command by primary name', () => {
    const cmd = findCommand('up');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('up');
  });

  it('finds command by alias', () => {
    const cmd = findCommand('start');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('up');
    expect(cmd.aliases).toContain('start');
  });

  it('finds down command', () => {
    const cmd = findCommand('down');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('down');
  });

  it('finds down command by alias', () => {
    const cmd = findCommand('stop');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('stop');
  });

  it('finds status command', () => {
    const cmd = findCommand('status');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('status');
  });

  it('finds tools command', () => {
    const cmd = findCommand('tools');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('tools');
  });

  it('finds call command', () => {
    const cmd = findCommand('call');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('call');
  });

  it('finds setup command', () => {
    const cmd = findCommand('setup');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('setup');
  });

  it('finds help command', () => {
    const cmd = findCommand('help');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('help');
  });

  it('finds help command by --help alias', () => {
    const cmd = findCommand('--help');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('--help');
  });

  it('finds help command by -h alias', () => {
    const cmd = findCommand('-h');
    expect(cmd).toBeDefined();
    expect(cmd.aliases).toContain('-h');
  });

  it('returns null for unknown command', () => {
    const cmd = findCommand('unknown');
    expect(cmd).toBeNull();
  });

  it('returns null for empty string', () => {
    const cmd = findCommand('');
    expect(cmd).toBeNull();
  });

  it('returns null for null', () => {
    const cmd = findCommand(null);
    expect(cmd).toBeNull();
  });

  it('is case sensitive', () => {
    const cmd = findCommand('UP');
    expect(cmd).toBeNull();
  });
});

describe('findCommandLogic', () => {
  it('finds logic function for up command', async () => {
    const logic = await findCommandLogic('up');
    expect(logic).toBeDefined();
    expect(typeof logic).toBe('function');
  });

  it('finds logic function for help command', async () => {
    const logic = await findCommandLogic('help');
    expect(logic).toBeDefined();
    expect(typeof logic).toBe('function');
  });

  it('returns null for unknown command', async () => {
    const logic = await findCommandLogic('unknown');
    expect(logic).toBeNull();
  });

  it('finds logic function for status command', async () => {
    const logic = await findCommandLogic('status');
    expect(logic).toBeDefined();
    expect(typeof logic).toBe('function');
  });

  it('finds logic function for tools command', async () => {
    const logic = await findCommandLogic('tools');
    expect(logic).toBeDefined();
    expect(typeof logic).toBe('function');
  });

  it('finds logic function for call command', async () => {
    const logic = await findCommandLogic('call');
    expect(logic).toBeDefined();
    expect(typeof logic).toBe('function');
  });

  it('finds logic function for setup command', async () => {
    const logic = await findCommandLogic('setup');
    expect(logic).toBeDefined();
    expect(typeof logic).toBe('function');
  });

  it('finds logic function for down command', async () => {
    const logic = await findCommandLogic('down');
    expect(logic).toBeDefined();
    expect(typeof logic).toBe('function');
  });
});

describe('commands', () => {
  it('exports all commands', () => {
    expect(commands.up).toBeDefined();
    expect(commands.down).toBeDefined();
    expect(commands.status).toBeDefined();
    expect(commands.tools).toBeDefined();
    expect(commands.call).toBeDefined();
    expect(commands.setup).toBeDefined();
    expect(commands.help).toBeDefined();
  });

  it('has correct number of commands', () => {
    expect(Object.keys(commands)).toHaveLength(7);
  });
});
