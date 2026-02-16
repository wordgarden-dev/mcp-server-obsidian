/**
 * kanban_item_remove tool - Remove an item from a kanban column
 */


import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanItemRemoveSchema } from '../../../schemas/board.js';
import type { Item } from '../../../types/board.js';

/**
 * Result of kanban_item_remove operation
 */
export interface KanbanItemRemoveResult {
  /** Path to the modified board */
  board: string;
  /** Column where item was removed from */
  column: string;
  /** The removed item */
  removed: Item;
}

/**
 * Remove an item from a kanban column
 * 
 * Finds the first item in the specified column with matching text and removes it.
 * 
 * @param params - Remove parameters (vault, board, column, text)
 * @returns Information about the removed item
 * @throws Error if validation fails, board/column/item not found, or write fails
 * 
 * @example
 * ```typescript
 * const result = await kanbanItemRemove({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   column: 'Backlog',
 *   text: 'Implement feature X'
 * });
 * ```
 */
export async function kanbanItemRemove(params: unknown): Promise<KanbanItemRemoveResult> {
  // Validate parameters
  const validated = KanbanItemRemoveSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find target column
  const column = board.columns.find(col => col.name === validated.column);
  if (!column) {
    throw new Error(`Column "${validated.column}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Find item to remove
  const itemIndex = column.items.findIndex(item => item.text === validated.text);
  if (itemIndex === -1) {
    throw new Error(`Item "${validated.text}" not found in column "${validated.column}"`);
  }
  
  // Remove item
  const [removed] = column.items.splice(itemIndex, 1);
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    column: validated.column,
    removed: removed!
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanItemRemoveTool = {
  name: 'kanban_item_remove',
  description: 'Remove an item from a kanban column by matching text',
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
      column: {
        type: 'string',
        description: 'Name of the column containing the item'
      },
      text: {
        type: 'string',
        description: 'Text of the item to remove (must match exactly)'
      }
    },
    required: ['vault', 'board', 'column', 'text']
  }
} as const;
