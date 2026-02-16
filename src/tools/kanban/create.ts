/**
 * kanban_create tool - Create a new kanban board
 */

import { dirname } from 'node:path';
import { mkdir, access } from 'node:fs/promises';
import { writeKanbanFile } from '../../utils/file-ops.js';
import { validateVaultPath } from '../../utils/path-validator.js';
import { KanbanCreateSchema } from '../../schemas/board.js';
import type { Board, Column } from '../../types/board.js';

/**
 * Result of kanban_create operation
 */
export interface KanbanCreateResult {
  /** Absolute path to created board */
  path: string;
  /** Created board structure */
  board: Board;
}

/**
 * Create a new kanban board file
 * 
 * @param params - Create parameters (vault, path, columns, settings)
 * @returns Created board information
 * @throws Error if validation fails, file exists, or write fails
 * 
 * @example
 * ```typescript
 * const result = await kanbanCreate({
 *   vault: '/path/to/vault',
 *   path: 'projects/new-project.md',
 *   columns: ['Backlog', 'In Progress', 'Done'],
 *   settings: { 'kanban-plugin': 'basic' }
 * });
 * ```
 */
export async function kanbanCreate(params: unknown): Promise<KanbanCreateResult> {
  // Validate parameters
  const validated = KanbanCreateSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.path);
  
  // Check if file already exists
  try {
    await access(boardPath);
    throw new Error(`Board already exists at ${validated.path}`);
  } catch (error) {
    // File doesn't exist - this is what we want
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
  }
  
  // Create directory if needed
  const dir = dirname(boardPath);
  await mkdir(dir, { recursive: true });
  
  // Create empty columns
  const columns: Column[] = validated.columns.map(name => ({
    name,
    items: []
  }));
  
  // Create board structure
  const board: Board = {
    path: boardPath,
    settings: validated.settings || { 'kanban-plugin': 'basic' },
    columns
  };
  
  // Write board to disk (atomic)
  await writeKanbanFile(boardPath, board);
  
  return {
    path: boardPath,
    board
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanCreateTool = {
  name: 'kanban_create',
  description: 'Create a new kanban board file with specified columns',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the Obsidian vault'
      },
      path: {
        type: 'string',
        description: 'Relative path for the new board file (e.g., "projects/new.md")'
      },
      columns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of column names (e.g., ["Backlog", "In Progress", "Done"])',
        minItems: 1
      },
      settings: {
        type: 'object',
        properties: {
          'kanban-plugin': {
            type: 'string',
            enum: ['basic', 'advanced'],
            default: 'basic'
          }
        },
        description: 'Optional board settings (defaults to { "kanban-plugin": "basic" })'
      }
    },
    required: ['vault', 'path', 'columns']
  }
} as const;
