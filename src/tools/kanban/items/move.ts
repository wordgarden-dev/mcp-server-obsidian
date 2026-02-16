/**
 * kanban_item_move tool - Move an item between kanban columns
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanItemMoveSchema } from '../../../schemas/board.js';
import type { Item } from '../../../types/board.js';

/**
 * Result of kanban_item_move operation
 */
export interface KanbanItemMoveResult {
  /** Path to the modified board */
  board: string;
  /** Source column name */
  sourceColumn: string;
  /** Target column name */
  targetColumn: string;
  /** The moved item */
  item: Item;
}

/**
 * Move an item from one column to another
 * 
 * Finds the first item in the source column with matching text,
 * removes it from source, and appends it to the target column.
 * 
 * @param params - Move parameters (vault, board, text, sourceColumn, targetColumn)
 * @returns Information about the moved item
 * @throws Error if validation fails, board/columns/item not found, or write fails
 * 
 * @example
 * ```typescript
 * const result = await kanbanItemMove({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   text: 'Implement feature X',
 *   sourceColumn: 'Backlog',
 *   targetColumn: 'In Progress'
 * });
 * ```
 */
export async function kanbanItemMove(params: unknown): Promise<KanbanItemMoveResult> {
  // Validate parameters
  const validated = KanbanItemMoveSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find source column
  const sourceColumn = board.columns.find(col => col.name === validated.sourceColumn);
  if (!sourceColumn) {
    throw new Error(`Source column "${validated.sourceColumn}" not found. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Find target column
  const targetColumn = board.columns.find(col => col.name === validated.targetColumn);
  if (!targetColumn) {
    throw new Error(`Target column "${validated.targetColumn}" not found. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Find item in source column
  const itemIndex = sourceColumn.items.findIndex(item => item.text === validated.text);
  if (itemIndex === -1) {
    throw new Error(`Item "${validated.text}" not found in source column "${validated.sourceColumn}"`);
  }
  
  // Remove from source
  const [item] = sourceColumn.items.splice(itemIndex, 1);
  
  // Add to target
  targetColumn.items.push(item!);
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    sourceColumn: validated.sourceColumn,
    targetColumn: validated.targetColumn,
    item: item!
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanItemMoveTool = {
  name: 'kanban_item_move',
  description: 'Move an item from one column to another',
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
      text: {
        type: 'string',
        description: 'Text of the item to move (must match exactly)'
      },
      sourceColumn: {
        type: 'string',
        description: 'Name of the source column'
      },
      targetColumn: {
        type: 'string',
        description: 'Name of the target column'
      }
    },
    required: ['vault', 'board', 'text', 'sourceColumn', 'targetColumn']
  }
} as const;
