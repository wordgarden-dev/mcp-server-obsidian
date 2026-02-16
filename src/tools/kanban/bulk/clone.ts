/**
 * kanban_clone tool - Clone a kanban board to a new file
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanCloneSchema } from '../../../schemas/bulk.js';
import type { Board } from '../../../types/board.js';

/**
 * Clone a kanban board to a new file
 * 
 * Creates an exact copy of the board including:
 * - All columns and their order
 * - All items with completion status
 * - Settings and metadata
 * 
 * @param params - Clone parameters (vault, source board, target board)
 * @returns The cloned board and its path
 * @throws Error if validation fails or operation fails
 * 
 * @example
 * ```typescript
 * const board = await kanbanClone({
 *   vault: '/path/to/vault',
 *   sourceBoard: 'project.md',
 *   targetBoard: 'project-backup.md'
 * });
 * ```
 */
export async function kanbanClone(params: unknown): Promise<Board> {
  // Validate parameters
  const validated = KanbanCloneSchema.parse(params);
  
  // Validate and read source board
  const sourcePath = await validateVaultPath(validated.vault, validated.sourceBoard);
  const board = await readKanbanFile(sourcePath);
  
  // Validate and write to target path
  const targetPath = await validateVaultPath(validated.vault, validated.targetBoard);
  board.path = targetPath;
  
  await writeKanbanFile(targetPath, board);
  
  return board;
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanCloneTool = {
  name: 'kanban_clone',
  description: 'Clone a kanban board to a new file (creates exact copy)',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the Obsidian vault'
      },
      sourceBoard: {
        type: 'string',
        description: 'Relative path to the source board file'
      },
      targetBoard: {
        type: 'string',
        description: 'Relative path to the target board file (will be created)'
      }
    },
    required: ['vault', 'sourceBoard', 'targetBoard']
  }
} as const;
