# @wordgarden-dev/mcp-server-obsidian

MCP server providing declarative CRUD API for Obsidian vaults with first-class kanban board support.

## Features

- **22 Production Tools**: Complete vault and kanban management
  - 4 board operations (create, read, list, delete)
  - 6 item operations (add, remove, move, update, complete, reorder)
  - 4 column operations (add, remove, rename, move)
  - 3 bulk operations (clone, merge, archive)
  - 5 vault management tools (register, init, open, plugin install/enable)
- **Type-safe**: Full TypeScript implementation with Zod validation
- **Cross-platform**: Works on Windows, macOS, and Linux
- **MCP Protocol**: Standard Model Context Protocol over STDIO
- **Production-ready**: Error handling, logging, graceful shutdown, 100+ tests

## Installation

```bash
npm install @wordgarden-dev/mcp-server-obsidian
```

## Quick Start

### With Claude Desktop

1. Build the server:
   ```bash
   npm run build
   ```

2. Add to Claude Desktop config (see [examples/README.md](examples/README.md)):
   ```json
   {
     "mcpServers": {
       "obsidian": {
         "command": "npx",
         "args": ["@wordgarden-dev/mcp-server-obsidian"]
       }
     }
   }
   ```

3. Restart Claude Desktop

### Standalone Usage

```bash
# Start the MCP server (STDIO mode)
npm start

# Or run directly
node dist/index.js
```

## Available Tools (22 Total)

### Board Operations (4 tools)

#### kanban_read
Read and parse a kanban board file.

**Parameters:**
- `vault` (string): Absolute path to the Obsidian vault
- `board` (string): Relative path to the board file

#### kanban_list
List all kanban boards in a directory.

**Parameters:**
- `vault` (string): Absolute path to the Obsidian vault
- `path` (string, optional): Subdirectory to search

#### kanban_create
Create a new kanban board with specified columns.

**Parameters:**
- `vault` (string): Absolute path to the Obsidian vault
- `path` (string): Relative path for the new board
- `columns` (string[]): Array of column names
- `settings` (object, optional): Board settings

#### kanban_delete
Delete a kanban board file.

**Parameters:**
- `vault` (string): Absolute path to the Obsidian vault
- `board` (string): Relative path to the board file

---

### Item Operations (6 tools)

#### kanban_item_add
Add a new item to a column.

**Parameters:**
- `vault`, `board`, `column` (strings)
- `text` (string): Item text
- `completed` (boolean, optional)

#### kanban_item_remove
Remove an item from a column by text match.

**Parameters:**
- `vault`, `board`, `column`, `text` (strings)

#### kanban_item_move
Move an item between columns.

**Parameters:**
- `vault`, `board`, `text`, `sourceColumn`, `targetColumn` (strings)

#### kanban_item_update
Update an item's text.

**Parameters:**
- `vault`, `board`, `column`, `oldText`, `newText` (strings)

#### kanban_item_complete
Toggle item completion status.

**Parameters:**
- `vault`, `board`, `column`, `text` (strings)
- `completed` (boolean, optional)

#### kanban_item_reorder
Reorder an item within a column.

**Parameters:**
- `vault`, `board`, `column`, `text` (strings)
- `position` (number): New index position

---

### Column Operations (4 tools)

#### kanban_column_add
Add a new column to the board.

**Parameters:**
- `vault`, `board`, `name` (strings)
- `position` (number, optional): Insert position

#### kanban_column_remove (22 tools)
├── tools/             # Tool implementations
│   ├── kanban/        # Kanban operations
│   │   ├── create.ts, read.ts, list.ts, delete.ts
│   │   ├── items/     # Item operations (6 tools)
│   │   ├── columns/   # Column operations (4 tools)
│   │   └── bulk/      # Bulk operations (3 tools)
│   └── vault/         # Vault management (5 tools)
├── schemas/           # Zod validation schemas
│   ├── board.ts       # Board/item/column schemas
│   ├── vault.ts       # Vault management schemas
│   └── bulk.ts        # Bulk operation schemas
├── types/             # TypeScript type definitions
├── parsers/           # Markdown parsing utilities
└── utils/             # File and vault operations

dist/                  # Compiled JavaScript (generated)
examples/              # Configuration examples
tests/                 # 100+ unit and integration test
- `vault`, `board`, `oldName`, `newName` (strings)

#### kanban_column_move
Reorder a column.

**Parameters:**
- `vault`, `board`, `name` (strings)
- `position` (number): New index position

---

### Bulk Operations (3 tools)

#### kanban_clone
Clone a board to a new file.

**Parameters:**
- `vault`, `sourceBoard`, `targetBoard` (strings)

#### kanban_merge
Merge items from multiple boards into one.

**Parameters:**
- `vault` (string)
- `sourceBoards` (string[]): Array of board paths
- `targetBoard` (string)

#### kanban_archive_done
Move completed items to an Archive column.

**Parameters:**
- `vault`, `board` (strings)
- `archiveColumn` (string, optional): Defaults to "Archive"

---

### Vault Management (5 tools)

#### vault_register
Register a vault in Obsidian's global configuration.

**Parameters:**
- `path` (string): Absolute vault path
- `id` (string, optional): Vault ID (defaults to folder name)

#### vault_init
Initialize a vault's .obsidian folder structure.

**Parameters:**
- `path` (string): Absolute vault path

#### vault_open
Open a vault (and optionally a file) in Obsidian using obsidian:// URI.

**Parameters:**
- `vaultId` (string): Registered vault ID
- `file` (string, optional): Relative file path

#### plugin_install
Install a plugin from GitHub releases.

**Parameters:**
- `vault` (string): Absolute vault path
- `pluginId` (string): Plugin ID (e.g., "obsidian-kanban")

#### plugin_enable
Enable a plugin in community-plugins.json.

**Parameters:**
- `vault` (string): Absolute vault path
- `pluginId` (string): Plugin ID to enable

---

**See tool definitions in code for complete examples and JSON schemas.**

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Clean build directory
npm run clean
```

## Architecture

```
src/
├── index.ts           # MCP server entry point
├── tools/             # Tool implementations
│   └── kanban/        # Kanban CRUD operations
├── schemas/           # Zod validation schemas
├── types/             # TypeScript type definitions
├── parsers/           # Markdown parsing utilities
└── utils/             # File operations

dist/                  # Compiled JavaScript (generated)
examples/              # Configuration examples
tests/                 # Test utilities
```

## Documentation

- [examples/README.md](examples/README.md) - Claude Desktop setup guide
- [DESIGN_MCP_OBSIDIAN.md](../DESIGN_MCP_OBSIDIAN.md) - Detailed design document
- [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) - Phase 2 completion report

## Requirements

- Node.js >= 18.0.0
- TypeScript 5.3+
- Obsidian vault with kanban boards (markdown format)

## Security

This MCP server implements multiple security protections to safely operate on your Obsidian vaults:

### Security Features

✅ **Path Traversal Prevention**: All vault paths are validated and normalized to prevent `../` attacks and unauthorized filesystem access outside vault boundaries.

✅ **Input Sanitization**: Item text and column names are validated for length limits (10,000 and 100 chars respectively), with control characters and null bytes stripped.

✅ **DOS Protection**: Input size limits, timeout handling, and memory constraints prevent resource exhaustion attacks.

✅ **No Command Execution**: Server uses only Node.js `fs` module for file operations—no shell spawning, eval, or dynamic code execution.

✅ **Read-Only by Default**: All write operations require explicit vault path specification. No default vault, no auto-discovery.

### Known Limitations

⚠️ **Important**: This server has filesystem access to paths you provide. Please be aware:

- **Trusts filesystem permissions**: Server inherits permissions of the user running it
- **No encryption**: Vault contents are read/written in plaintext
- **Assumes trusted vaults**: Does not validate vault authenticity or integrity
- **Permanent deletions**: `kanban_delete` operations cannot be undone (recommend git version control)

### Best Practices

**For maximum security**:
1. Run server with least-privilege user account (not root/Administrator)
2. Use dedicated vault for automation (not your personal vault with sensitive notes)
3. Keep dependencies updated (`npm outdated && npm update`)
4. Monitor logs for suspicious activity
5. Use OS-level encryption (FileVault, BitLocker, LUKS) for vault directory
6. Track vault changes with git for easy rollback

### Reporting Vulnerabilities

**Please report security vulnerabilities responsibly**:
- **Preferred**: [GitHub Security Advisories](https://github.com/wordgarden-dev/mcp-server-obsidian/security/advisories/new)
- **Alternative**: Email security@wordgarden.dev

**See [SECURITY.md](SECURITY.md) for complete security policy, threat model, and detailed best practices.**

## License

MIT

## Author

wordgarden-dev
