# Claude Desktop Configuration Examples

## Quick Start

To use this MCP server with Claude Desktop:

1. **Build the server:**
   ```bash
   npm run build
   ```

2. **Locate your Claude Desktop config file:**
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

3. **Add the server configuration:**
   
   Merge the contents of `claude-desktop-config.json` into your config file:
   
   ```json
   {
     "mcpServers": {
       "obsidian": {
         "command": "npx",
         "args": [
           "@wordgarden-dev/mcp-server-obsidian"
         ],
         "env": {}
       }
     }
   }
   ```

4. **Restart Claude Desktop**

## Local Development Configuration

For local development (before publishing to npm):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server-obsidian/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

Replace `/absolute/path/to/mcp-server-obsidian` with your actual project path.

## Available Tools

Once configured, Claude Desktop will have access to these tools:

- **kanban_read** - Read a kanban board file
- **kanban_list** - List all kanban boards in a directory
- **kanban_create** - Create a new kanban board
- **kanban_delete** - Delete a kanban board

## Example Usage

In Claude Desktop chat:

```
"Read the kanban board at /Users/me/vault/projects/current-sprint.md"

"List all kanban boards in my /Users/me/vault/projects directory"

"Create a new kanban board at /Users/me/vault/new-project.md with columns: Backlog, In Progress, Done"
```

## Troubleshooting

If the server doesn't appear in Claude Desktop:

1. **Check the build:** Ensure `npm run build` completed successfully
2. **Verify config syntax:** JSON must be valid (no trailing commas)
3. **Check logs:** Claude Desktop logs errors to console (View > Developer > Toggle Developer Tools)
4. **Test manually:** Run `node dist/index.js` to see if it starts without errors

## Security Notes

- This server has **full filesystem access** to paths you provide
- Only use with trusted Obsidian vaults
- Be cautious with `kanban_delete` operations (they are permanent)
- Consider running in a restricted directory for testing
