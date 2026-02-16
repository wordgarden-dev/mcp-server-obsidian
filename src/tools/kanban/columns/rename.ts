/**
 * kanban_column_rename tool - Rename a column on a kanban board
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanColumnRenameSchema } from '../../../schemas/board.js';
import type { Column } from '../../../types/board.js';

/**
 * Result of kanban_column_rename operation
 */
export interface KanbanColumnRenameResult {
  /** Path to the modified board */
  board: string;
  /** Old column name */
  oldName: string;
  /** New column name */
  newName: string;
  /** The renamed column */
  column: Column;
}

/**
 * Rename a column on a kanban board
 * 
 * Updates the column heading while preserving all items.
 * 
 * @param params - Rename parameters (vault, board, oldName, newName)
 * @returns Information about the renamed column
 * @throws Error if validation fails, column not found, duplicate name, or write fails
 * 
 * @example
 * ```typescript
 * const result = await kanbanColumnRename({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   oldName: 'Todo',
 *   newName: 'Backlog'
 * });
 * ```
 */
export async function kanbanColumnRename(params: unknown): Promise<KanbanColumnRenameResult> {
  // Validate parameters
  const validated = KanbanColumnRenameSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find column to rename
  const column = board.columns.find(col => col.name === validated.oldName);
  if (!column) {
    throw new Error(`Column "${validated.oldName}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Check for duplicate name
  const existingColumn = board.columns.find(col => col.name === validated.newName);
  if (existingColumn) {
    throw new Error(`Column "${validated.newName}" already exists in board`);
  }
  
  // Rename column
  column.name = validated.newName;
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    oldName: validated.oldName,
    newName: validated.newName,
    column
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanColumnRenameTool = {
  name: 'kanban_column_rename',
  description: 'Rename a column on a kanban board (preserves all items)',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the Obsidian vault'
      },
      board: {
        type: 'string',
        description: 'Relative path to the kanban board file'
      },
      oldName: {
        type: 'string',
        description: 'Current name of the column'
      },
      newName: {
        type: 'string',
        description: 'New name for the column'
      }
    },
    required: ['vault', 'board', 'oldName', 'newName']
  }
} as const;
