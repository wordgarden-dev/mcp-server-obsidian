/**
 * kanban_read tool - Read and return a kanban board
 */

import { readKanbanFile } from '../../utils/file-ops.js';
import { validateVaultPath } from '../../utils/path-validator.js';
import { KanbanReadSchema } from '../../schemas/board.js';
import type { Board } from '../../types/board.js';

/**
 * Read a kanban board file from the vault
 * 
 * @param params - Read parameters (vault, board)
 * @returns Parsed Board object
 * @throws Error if validation fails or file cannot be read
 * 
 * @example
 * ```typescript
 * const board = await kanbanRead({
 *   vault: '/path/to/vault',
 *   board: 'project-kanban.md'
 * });
 * ```
 */
export async function kanbanRead(params: unknown): Promise<Board> {
  // Validate parameters
  const validated = KanbanReadSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Read and return board
  return await readKanbanFile(boardPath);
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanReadTool = {
  name: 'kanban_read',
  description: 'Read a kanban board file from the Obsidian vault',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the Obsidian vault'
      },
      board: {
        type: 'string',
        description: 'Relative path to the kanban board file (e.g., "project.md")'
      }
    },
    required: ['vault', 'board']
  }
} as const;
