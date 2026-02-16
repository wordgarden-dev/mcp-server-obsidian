/**
 * kanban_archive_done tool - Move completed items to Archive column
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanArchiveSchema } from '../../../schemas/bulk.js';
import type { Board, Item } from '../../../types/board.js';

/**
 * Archive completed items by moving them to an Archive column
 * 
 * Strategy:
 * - Find or create "Archive" column (or custom name)
 * - Move all completed items from all columns to Archive
 * - Preserve item order within Archive
 * - Remove items from source columns
 * 
 * @param params - Archive parameters (vault, board, optional archive column name)
 * @returns Updated board with archived items
 * @throws Error if validation fails or operation fails
 * 
 * @example
 * ```typescript
 * const board = await kanbanArchiveDone({
 *   vault: '/path/to/vault',
 *   board: 'project.md',
 *   archiveColumn: 'Archive'  // optional, defaults to 'Archive'
 * });
 * ```
 */
export async function kanbanArchiveDone(params: unknown): Promise<Board> {
  // Validate parameters
  const validated = KanbanArchiveSchema.parse(params);
  
  // Validate and read board
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  const board = await readKanbanFile(boardPath);
  
  // Determine archive column name
  const archiveColumnName = validated.archiveColumn || 'Archive';
  
  // Find or create archive column
  let archiveColumn = board.columns.find(c => c.name === archiveColumnName);
  
  if (!archiveColumn) {
    archiveColumn = {
      name: archiveColumnName,
      items: []
    };
    board.columns.push(archiveColumn);
  }
  
  // Collect and remove completed items from all columns
  const archivedItems: Item[] = [];
  
  for (const column of board.columns) {
    // Skip the archive column itself
    if (column.name === archiveColumnName) {
      continue;
    }
    
    // Find completed items
    const completedItems = column.items.filter(item => item.completed === true);
    archivedItems.push(...completedItems);
    
    // Remove completed items from column
    column.items = column.items.filter(item => item.completed !== true);
  }
  
  // Append archived items to archive column
  archiveColumn.items.push(...archivedItems);
  
  // Write updated board
  await writeKanbanFile(boardPath, board);
  
  return board;
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanArchiveDoneTool = {
  name: 'kanban_archive_done',
  description: 'Archive completed items by moving them to an Archive column',
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
      archiveColumn: {
        type: 'string',
        description: 'Name of the archive column (defaults to "Archive")'
      }
    },
    required: ['vault', 'board']
  }
} as const;
