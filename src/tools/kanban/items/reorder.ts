/**
 * kanban_item_reorder tool - Change item position within a column
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanItemReorderSchema } from '../../../schemas/board.js';
import type { Item } from '../../../types/board.js';

/**
 * Result of kanban_item_reorder operation
 */
export interface KanbanItemReorderResult {
  /** Path to the modified board */
  board: string;
  /** Column containing the item */
  column: string;
  /** The moved item */
  item: Item;
  /** Previous position */
  oldPosition: number;
  /** New position */
  newPosition: number;
}

/**
 * Change an item's position within its column
 * 
 * Moves the item to the specified 0-based index position.
 * Position is clamped to valid range [0, items.length - 1].
 * 
 * @param params - Reorder parameters (vault, board, column, text, position)
 * @returns Information about the position change
 * @throws Error if validation fails, board/column/item not found, or write fails
 * 
 * @example
 * ```typescript
 * // Move item to top of column
 * const result = await kanbanItemReorder({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   column: 'Backlog',
 *   text: 'Important task',
 *   position: 0
 * });
 * 
 * // Move item to bottom
 * const result = await kanbanItemReorder({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   column: 'Backlog',
 *   text: 'Low priority task',
 *   position: 999 // Will be clamped to last position
 * });
 * ```
 */
export async function kanbanItemReorder(params: unknown): Promise<KanbanItemReorderResult> {
  // Validate parameters
  const validated = KanbanItemReorderSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find target column
  const column = board.columns.find(col => col.name === validated.column);
  if (!column) {
    throw new Error(`Column "${validated.column}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Find item current position
  const oldPosition = column.items.findIndex(item => item.text === validated.text);
  if (oldPosition === -1) {
    throw new Error(`Item "${validated.text}" not found in column "${validated.column}"`);
  }
  
  // Remove item from current position
  const [item] = column.items.splice(oldPosition, 1);
  
  // Clamp new position to valid range
  const newPosition = Math.max(0, Math.min(validated.position, column.items.length));
  
  // Insert at new position
  column.items.splice(newPosition, 0, item!);
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    column: validated.column,
    item: item!,
    oldPosition,
    newPosition
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanItemReorderTool = {
  name: 'kanban_item_reorder',
  description: 'Change an item\'s position within its column',
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
        description: 'Text of the item to reorder (must match exactly)'
      },
      position: {
        type: 'number',
        description: '0-based index for new position (clamped to valid range)'
      }
    },
    required: ['vault', 'board', 'column', 'text', 'position']
  }
} as const;
