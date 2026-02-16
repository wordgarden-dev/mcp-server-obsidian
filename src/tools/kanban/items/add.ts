/**
 * kanban_item_add tool - Add an item to a kanban column
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanItemAddSchema } from '../../../schemas/board.js';
import type { Item } from '../../../types/board.js';

/**
 * Result of kanban_item_add operation
 */
export interface KanbanItemAddResult {
  /** Path to the modified board */
  board: string;
  /** Column where item was added */
  column: string;
  /** The added item */
  item: Item;
}

/**
 * Add an item to a kanban column
 * 
 * @param params - Add parameters (vault, board, column, text, completed)
 * @returns Information about the added item
 * @throws Error if validation fails, board/column not found, or write fails
 * 
 * @example
 * ```typescript
 * const result = await kanbanItemAdd({
 *   vault: '/path/to/vault',
 *   board: 'kanban.md',
 *   column: 'Backlog',
 *   text: 'Implement feature X',
 *   completed: false
 * });
 * ```
 */
export async function kanbanItemAdd(params: unknown): Promise<KanbanItemAddResult> {
  // Validate parameters
  const validated = KanbanItemAddSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read existing board
  const board = await readKanbanFile(boardPath);
  
  // Find target column
  const column = board.columns.find(col => col.name === validated.column);
  if (!column) {
    throw new Error(`Column "${validated.column}" not found in board. Available columns: ${board.columns.map(c => c.name).join(', ')}`);
  }
  
  // Create new item
  const item: Item = {
    text: validated.text,
    completed: validated.completed
  };
  
  // Add item to column
  column.items.push(item);
  
  // Write board atomically
  await writeKanbanFile(boardPath, board);
  
  return {
    board: validated.board,
    column: validated.column,
    item
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanItemAddTool = {
  name: 'kanban_item_add',
  description: 'Add a new item to a kanban column',
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
        description: 'Name of the column to add the item to'
      },
      text: {
        type: 'string',
        description: 'Text content of the item'
      },
      completed: {
        type: 'boolean',
        description: 'Whether the item is completed (default: false)',
        default: false
      }
    },
    required: ['vault', 'board', 'column', 'text']
  }
} as const;
