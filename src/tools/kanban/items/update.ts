/**
 * kanban_item_update tool - Update an item's text in a kanban column
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanItemUpdateSchema } from '../../../schemas/board.js';
import type { Item } from '../../../types/board.js';

/**
 * Result of kanban_item_update operation
 */
export interface KanbanItemUpdateResult {
  /** Path to the modified board */
  board: string;
  /** Column containing the item */
  column: string;
  /** Old item state */
  oldItem: Item;
  /** New item state */
  newItem: Item;
}

/**
 * Update an item's text while preserving other properties
 * 
 * Finds the first item in the specified column with matching oldText
 * and updates it to newText, preserving completed status and metadata.
 * 
 * @param params - Update parameters (vault, board, column, oldText, newText)
 * @returns Information about the updated item
 * @throws Error if validation fails, board/column/item not found, or write fails
 * 
 * @example
 * ```typescript
 * const result = await kanbanItemUpdate({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   column: 'In Progress',
 *   oldText: 'Implement feature X',
 *   newText: 'Implement feature X (80% complete)'
 * });
 * ```
 */
export async function kanbanItemUpdate(params: unknown): Promise<KanbanItemUpdateResult> {
  // Validate parameters
  const validated = KanbanItemUpdateSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find target column
  const column = board.columns.find(col => col.name === validated.column);
  if (!column) {
    throw new Error(`Column "${validated.column}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Find item to update
  const item = column.items.find(item => item.text === validated.oldText);
  if (!item) {
    throw new Error(`Item "${validated.oldText}" not found in column "${validated.column}"`);
  }
  
  // Preserve old state for return value
  const oldItem = { ...item };
  
  // Update text while preserving other properties
  item.text = validated.newText;
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    column: validated.column,
    oldItem,
    newItem: { ...item }
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanItemUpdateTool = {
  name: 'kanban_item_update',
  description: 'Update an item\'s text while preserving other properties',
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
      oldText: {
        type: 'string',
        description: 'Current text of the item (must match exactly)'
      },
      newText: {
        type: 'string',
        description: 'New text for the item'
      }
    },
    required: ['vault', 'board', 'column', 'oldText', 'newText']
  }
} as const;
