/**
 * kanban_item_complete tool - Toggle or set item completion status
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanItemCompleteSchema } from '../../../schemas/board.js';
import type { Item } from '../../../types/board.js';

/**
 * Result of kanban_item_complete operation
 */
export interface KanbanItemCompleteResult {
  /** Path to the modified board */
  board: string;
  /** Column containing the item */
  column: string;
  /** The item */
  item: Item;
  /** Previous completion state */
  wasCompleted: boolean;
  /** New completion state */
  isCompleted: boolean;
}

/**
 * Toggle or set an item's completion status
 * 
 * If completed parameter is provided, sets to that value.
 * If completed is omitted, toggles the current state.
 * 
 * @param params - Complete parameters (vault, board, column, text, completed?)
 * @returns Information about the completion change
 * @throws Error if validation fails, board/column/item not found, or write fails
 * 
 * @example
 * ```typescript
 * // Toggle completion
 * const result = await kanbanItemComplete({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   column: 'In Progress',
 *   text: 'Implement feature X'
 * });
 * 
 * // Set to completed
 * const result = await kanbanItemComplete({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   column: 'Done',
 *   text: 'Implement feature X',
 *   completed: true
 * });
 * ```
 */
export async function kanbanItemComplete(params: unknown): Promise<KanbanItemCompleteResult> {
  // Validate parameters
  const validated = KanbanItemCompleteSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find target column
  const column = board.columns.find(col => col.name === validated.column);
  if (!column) {
    throw new Error(`Column "${validated.column}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Find item
  const item = column.items.find(item => item.text === validated.text);
  if (!item) {
    throw new Error(`Item "${validated.text}" not found in column "${validated.column}"`);
  }
  
  // Store previous state
  const wasCompleted = item.completed;
  
  // Set or toggle completion
  if (validated.completed !== undefined) {
    item.completed = validated.completed;
  } else {
    item.completed = !item.completed;
  }
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    column: validated.column,
    item: { ...item },
    wasCompleted,
    isCompleted: item.completed
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanItemCompleteTool = {
  name: 'kanban_item_complete',
  description: 'Toggle or set an item\'s completion status',
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
        description: 'Text of the item (must match exactly)'
      },
      completed: {
        type: 'boolean',
        description: 'Set to specific value (true/false), or omit to toggle'
      }
    },
    required: ['vault', 'board', 'column', 'text']
  }
} as const;
