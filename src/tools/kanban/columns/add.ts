/**
 * kanban_column_add tool - Add a new column to a kanban board
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanColumnAddSchema } from '../../../schemas/board.js';
import type { Column } from '../../../types/board.js';

/**
 * Result of kanban_column_add operation
 */
export interface KanbanColumnAddResult {
  /** Path to the modified board */
  board: string;
  /** The added column */
  column: Column;
  /** Position where column was added */
  position: number;
}

/**
 * Add a new column to a kanban board
 * 
 * @param params - Add parameters (vault, board, name, position)
 * @returns Information about the added column
 * @throws Error if validation fails, board not found, duplicate column name, or write fails
 * 
 * @example
 * ```typescript
 * // Add column at end
 * const result = await kanbanColumnAdd({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   name: 'Review'
 * });
 * 
 * // Add column at specific position
 * const result = await kanbanColumnAdd({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   name: 'Review',
 *   position: 2
 * });
 * ```
 */
export async function kanbanColumnAdd(params: unknown): Promise<KanbanColumnAddResult> {
  // Validate parameters
  const validated = KanbanColumnAddSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Check for duplicate column name
  const existingColumn = board.columns.find(col => col.name === validated.name);
  if (existingColumn) {
    throw new Error(`Column "${validated.name}" already exists in board. Existing columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Create new column
  const column: Column = {
    name: validated.name,
    items: []
  };
  
  // Determine position (default: end of list)
  const position = validated.position ?? board.columns.length;
  
  // Validate position
  if (position > board.columns.length) {
    throw new Error(`Position ${position} is out of bounds. Board has ${board.columns.length} columns.`);
  }
  
  // Insert column at position
  board.columns.splice(position, 0, column);
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    column,
    position
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanColumnAddTool = {
  name: 'kanban_column_add',
  description: 'Add a new column to a kanban board',
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
      name: {
        type: 'string',
        description: 'Name of the new column'
      },
      position: {
        type: 'number',
        description: 'Position to insert the column (0-based index, default: end)'
      }
    },
    required: ['vault', 'board', 'name']
  }
} as const;
