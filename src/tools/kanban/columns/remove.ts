/**
 * kanban_column_remove tool - Remove a column from a kanban board
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanColumnRemoveSchema } from '../../../schemas/board.js';

/**
 * Result of kanban_column_remove operation
 */
export interface KanbanColumnRemoveResult {
  /** Path to the modified board */
  board: string;
  /** Name of the removed column */
  removedColumn: string;
  /** Number of items that were in the column */
  itemsRemoved: number;
  /** Target column where items were moved (if applicable) */
  targetColumn?: string;
  /** Number of items moved to target column */
  itemsMoved?: number;
}

/**
 * Remove a column from a kanban board
 * 
 * If the column contains items and no targetColumn is specified, the operation
 * will fail. Specify a targetColumn to move items before removal.
 * 
 * @param params - Remove parameters (vault, board, name, targetColumn)
 * @returns Information about the removed column
 * @throws Error if validation fails, column not found, column has items without target, or write fails
 * 
 * @example
 * ```typescript
 * // Remove empty column
 * const result = await kanbanColumnRemove({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   name: 'Archive'
 * });
 * 
 * // Remove column and move items
 * const result = await kanbanColumnRemove({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   name: 'Backlog',
 *   targetColumn: 'Todo'
 * });
 * ```
 */
export async function kanbanColumnRemove(params: unknown): Promise<KanbanColumnRemoveResult> {
  // Validate parameters
  const validated = KanbanColumnRemoveSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find column to remove
  const columnIndex = board.columns.findIndex(col => col.name === validated.name);
  if (columnIndex === -1) {
    throw new Error(`Column "${validated.name}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  const column = board.columns[columnIndex]!;
  const itemCount = column.items.length;
  
  // Handle items if present
  if (itemCount > 0) {
    if (!validated.targetColumn) {
      throw new Error(`Column "${validated.name}" contains ${itemCount} item(s). Specify targetColumn to move items before removal.`);
    }
    
    // Find target column
    const targetColumn = board.columns.find(col => col.name === validated.targetColumn);
    if (!targetColumn) {
      throw new Error(`Target column "${validated.targetColumn}" not found. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
    }
    
    // Prevent moving to self
    if (validated.targetColumn === validated.name) {
      throw new Error('Cannot move items to the same column being removed');
    }
    
    // Move all items to target column
    targetColumn.items.push(...column.items);
  }
  
  // Remove column
  board.columns.splice(columnIndex, 1);
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    removedColumn: validated.name,
    itemsRemoved: itemCount,
    ...(validated.targetColumn && itemCount > 0 ? {
      targetColumn: validated.targetColumn,
      itemsMoved: itemCount
    } : {})
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanColumnRemoveTool = {
  name: 'kanban_column_remove',
  description: 'Remove a column from a kanban board (optionally move items to another column)',
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
        description: 'Name of the column to remove'
      },
      targetColumn: {
        type: 'string',
        description: 'Target column to move items to before removal (required if column has items)'
      }
    },
    required: ['vault', 'board', 'name']
  }
} as const;
