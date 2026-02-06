export function showHelp() {
  console.log(`
OmniSystem - Intelligent Codebase Analysis

USAGE:
  omnysystem <command> [project]
  omnysystem ai <subcommand> [mode]

COMMANDS:
  analyze [project]    Run static analysis (generates .omnysysdata/)
  check <file>         Show impact analysis for a specific file
  consolidate [project] Iterative AI consolidation to 100% coverage
  serve [project]      Start local MCP server for Claude Code
  clean [project]      Remove analysis data (.omnysysdata/)
  status [project]     Show analysis status and statistics
  export [project]     Export complete system map (debug)
  ai <subcommand>      Manage AI servers (see below)
  help                 Show this message

AI SUBCOMMANDS:
  ai start [mode]      Start AI server(s) - modes: gpu (default), cpu, both
  ai stop              Stop all AI servers
  ai status            Check AI server status

ARGUMENTS:
  [project]            Path to project (default: current directory)

EXAMPLES:
  omnysystem analyze /my-project
  omnysystem serve .
  omnysystem status ../another-project
  omnysystem clean
  omnysystem ai start gpu
  omnysystem ai status

All data stays local - no internet connection required
  `);
}
