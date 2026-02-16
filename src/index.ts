#!/usr/bin/env node
/**
 * MCP Server for Obsidian Kanban Operations
 * 
 * Provides declarative CRUD API for Obsidian vaults with first-class kanban support.
 * Implements the Model Context Protocol (MCP) specification.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations
// Kanban board operations
import { kanbanRead, kanbanReadTool } from './tools/kanban/read.js';
import { kanbanList, kanbanListTool } from './tools/kanban/list.js';
import { kanbanCreate, kanbanCreateTool } from './tools/kanban/create.js';
import { kanbanDelete, kanbanDeleteTool } from './tools/kanban/delete.js';

// Kanban item operations
import { kanbanItemAdd, kanbanItemAddTool } from './tools/kanban/items/add.js';
import { kanbanItemRemove, kanbanItemRemoveTool } from './tools/kanban/items/remove.js';
import { kanbanItemMove, kanbanItemMoveTool } from './tools/kanban/items/move.js';
import { kanbanItemUpdate, kanbanItemUpdateTool } from './tools/kanban/items/update.js';
import { kanbanItemComplete, kanbanItemCompleteTool } from './tools/kanban/items/complete.js';
import { kanbanItemReorder, kanbanItemReorderTool } from './tools/kanban/items/reorder.js';

// Kanban column operations
import { kanbanColumnAdd, kanbanColumnAddTool } from './tools/kanban/columns/add.js';
import { kanbanColumnRemove, kanbanColumnRemoveTool } from './tools/kanban/columns/remove.js';
import { kanbanColumnRename, kanbanColumnRenameTool } from './tools/kanban/columns/rename.js';
import { kanbanColumnMove, kanbanColumnMoveTool } from './tools/kanban/columns/move.js';

// Kanban bulk operations
import { kanbanClone, kanbanCloneTool } from './tools/kanban/bulk/clone.js';
import { kanbanMerge, kanbanMergeTool } from './tools/kanban/bulk/merge.js';
import { kanbanArchiveDone, kanbanArchiveDoneTool } from './tools/kanban/bulk/archive.js';

// Vault management operations
import { vaultRegister, vaultRegisterTool } from './tools/vault/register.js';
import { vaultInit, vaultInitTool } from './tools/vault/init.js';
import { vaultOpen, vaultOpenTool } from './tools/vault/open.js';
import { pluginInstall, pluginInstallTool } from './tools/vault/plugin_install.js';
import { pluginEnable, pluginEnableTool } from './tools/vault/plugin_enable.js';

/**
 * Tool registry mapping tool names to handlers
 */
const toolHandlers = {
  // Kanban board operations
  kanban_read: kanbanRead,
  kanban_list: kanbanList,
  kanban_create: kanbanCreate,
  kanban_delete: kanbanDelete,
  
  // Kanban item operations
  kanban_item_add: kanbanItemAdd,
  kanban_item_remove: kanbanItemRemove,
  kanban_item_move: kanbanItemMove,
  kanban_item_update: kanbanItemUpdate,
  kanban_item_complete: kanbanItemComplete,
  kanban_item_reorder: kanbanItemReorder,
  
  // Kanban column operations
  kanban_column_add: kanbanColumnAdd,
  kanban_column_remove: kanbanColumnRemove,
  kanban_column_rename: kanbanColumnRename,
  kanban_column_move: kanbanColumnMove,
  
  // Kanban bulk operations
  kanban_clone: kanbanClone,
  kanban_merge: kanbanMerge,
  kanban_archive_done: kanbanArchiveDone,
  
  // Vault management operations
  vault_register: vaultRegister,
  vault_init: vaultInit,
  vault_open: vaultOpen,
  plugin_install: pluginInstall,
  plugin_enable: pluginEnable
} as const;

/**
 * Tool definitions for MCP (22 total tools)
 */
const tools: Tool[] = [
  // Kanban board operations (4)
  kanbanReadTool,
  kanbanListTool,
  kanbanCreateTool,
  kanbanDeleteTool,
  
  // Kanban item operations (6)
  kanbanItemAddTool,
  kanbanItemRemoveTool,
  kanbanItemMoveTool,
  kanbanItemUpdateTool,
  kanbanItemCompleteTool,
  kanbanItemReorderTool,
  
  // Kanban column operations (4)
  kanbanColumnAddTool,
  kanbanColumnRemoveTool,
  kanbanColumnRenameTool,
  kanbanColumnMoveTool,
  
  // Kanban bulk operations (3)
  kanbanCloneTool,
  kanbanMergeTool,
  kanbanArchiveDoneTool,
  
  // Vault management operations (5)
  vaultRegisterTool,
  vaultInitTool,
  vaultOpenTool,
  pluginInstallTool,
  pluginEnableTool
];

/**
 * Initialize and run the MCP server
 */
async function main() {
  // Create server instance
  const server = new Server(
    {
      name: 'mcp-server-obsidian',
      version: '0.1.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  /**
   * Handler: List available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
  });

  /**
   * Handler: Execute tool
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      // Route to appropriate tool handler
      if (!(name in toolHandlers)) {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ],
          isError: true
        };
      }

      // Execute tool
      const handler = toolHandlers[name as keyof typeof toolHandlers];
      const result = await handler(args || {});

      // Return successful result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      // Log error to stderr for debugging
      console.error(`[ERROR] Tool ${name} failed:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  });

  /**
   * Initialize STDIO transport
   */
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);

  // Log startup (to stderr to avoid interfering with stdio protocol)
  console.error('Obsidian MCP Server running on stdio');
  console.error(`Available tools: ${tools.map(t => t.name).join(', ')}`);
}

/**
 * Handle process errors
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
