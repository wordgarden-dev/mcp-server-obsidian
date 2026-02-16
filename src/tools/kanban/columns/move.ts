/**
 * kanban_column_move tool - Reorder a column on a kanban board
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanColumnMoveSchema } from '../../../schemas/board.js';
import type { Column } from '../../../types/board.js';

/**
 * Result of kanban_column_move operation
 */
export interface KanbanColumnMoveResult {
  /** Path to the modified board */
  board: string;
  /** Name of the moved column */
  columnName: string;
  /** Previous position */
  oldPosition: number;
  /** New position */
  newPosition: number;
  /** The moved column */
  column: Column;
}

/**
 * Reorder a column on a kanban board
 * 
 * Moves a column to a new position, shifting other columns as needed.
 * 
 * @param params - Move parameters (vault, board, name, position)
 * @returns Information about the moved column
 * @throws Error if validation fails, column not found, invalid position, or write fails
 * 
 * @example
 * ```typescript
 * // Move "In Progress" to first position
 * const result = await kanbanColumnMove({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   name: 'In Progress',
 *   position: 0
 * });
 * ```
 */
export async function kanbanColumnMove(params: unknown): Promise<KanbanColumnMoveResult> {
  // Validate parameters
  const validated = KanbanColumnMoveSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find column to move
  const columnIndex = board.columns.findIndex(col => col.name === validated.name);
  if (columnIndex === -1) {
    throw new Error(`Column "${validated.name}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Validate new position
  if (validated.position >= board.columns.length) {
    throw new Error(`Position ${validated.position} is out of bounds. Board has ${board.columns.length} columns (max position: ${board.columns.length - 1}).`);
  }
  
  // If already at target position, no-op
  if (columnIndex === validated.position) {
    return {
      board: validated.board,
      columnName: validated.name,
      oldPosition: columnIndex,
      newPosition: validated.position,
      column: board.columns[columnIndex]!
    };
  }
  
  // Remove column from old position
  const [column] = board.columns.splice(columnIndex, 1);
  
  // Insert at new position
  board.columns.splice(validated.position, 0, column!);
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    columnName: validated.name,
    oldPosition: columnIndex,
    newPosition: validated.position,
    column: column!
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanColumnMoveTool = {
  name: 'kanban_column_move',
  description: 'Reorder a column on a kanban board by moving it to a new position',
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
        description: 'Name of the column to move'
      },
      position: {
        type: 'number',
        description: 'New position for the column (0-based index)'
      }
    },
    required: ['vault', 'board', 'name', 'position']
  }
} as const;
