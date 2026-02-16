/**
 * kanban_delete tool - Delete a kanban board
 */

import { unlink, access } from 'node:fs/promises';
import { validateVaultPath } from '../../utils/path-validator.js';
import { KanbanDeleteSchema } from '../../schemas/board.js';

/**
 * Result of kanban_delete operation
 */
export interface KanbanDeleteResult {
  /** Path to deleted board */
  path: string;
  /** Success status */
  deleted: boolean;
}

/**
 * Delete a kanban board file
 * 
 * @param params - Delete parameters (vault, board)
 * @returns Deletion result
 * @throws Error if validation fails, file doesn't exist, or delete fails
 * 
 * @example
 * ```typescript
 * const result = await kanbanDelete({
 *   vault: '/path/to/vault',
 *   board: 'old-project.md'
 * });
 * // Returns: { path: '/path/to/vault/old-project.md', deleted: true }
 * ```
 */
export async function kanbanDelete(params: unknown): Promise<KanbanDeleteResult> {
  // Validate parameters
  const validated = KanbanDeleteSchema.parse(params);
  
  // Validate and construct secure path
  const boardPath = await validateVaultPath(validated.vault, validated.board);
  
  // Check if file exists
  try {
    await access(boardPath);
  } catch {
    throw new Error(`Board does not exist at ${validated.board}`);
  }
  
  // Delete file
  try {
    await unlink(boardPath);
    return {
      path: boardPath,
      deleted: true
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete board at ${validated.board}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanDeleteTool = {
  name: 'kanban_delete',
  description: 'Delete a kanban board file from the vault',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the Obsidian vault'
      },
      board: {
        type: 'string',
        description: 'Relative path to the board file to delete (e.g., "old-project.md")'
      }
    },
    required: ['vault', 'board']
  }
} as const;
