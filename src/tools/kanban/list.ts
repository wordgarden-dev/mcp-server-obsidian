/**
 * kanban_list tool - List all kanban boards in a directory
 */

import { relative } from 'node:path';
import { listKanbanFiles } from '../../utils/file-ops.js';
import { validateVaultPath } from '../../utils/path-validator.js';
import { KanbanListSchema } from '../../schemas/board.js';

/**
 * Result of kanban_list operation
 */
export interface KanbanListResult {
  /** Absolute path to the search directory */
  directory: string;
  /** Array of board paths relative to vault */
  boards: string[];
}

/**
 * List all kanban board files in a vault directory
 * 
 * @param params - List parameters (vault, optional path)
 * @returns List of board paths relative to vault
 * @throws Error if validation fails or directory cannot be read
 * 
 * @example
 * ```typescript
 * const result = await kanbanList({
 *   vault: '/path/to/vault',
 *   path: 'projects'  // Optional subdirectory
 * });
 * // Returns: { directory: '/path/to/vault/projects', boards: ['project1.md', 'project2.md'] }
 * ```
 */
export async function kanbanList(params: unknown): Promise<KanbanListResult> {
  // Validate parameters
  const validated = KanbanListSchema.parse(params);
  
  // Validate and construct secure search path
  const searchPath = await validateVaultPath(validated.vault, validated.path || '.');
  
  // List kanban files
  const absolutePaths = await listKanbanFiles(searchPath);
  
  // Convert to relative paths
  const relativePaths = absolutePaths.map(absPath => 
    relative(validated.vault, absPath)
  );
  
  return {
    directory: searchPath,
    boards: relativePaths
  };
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanListTool = {
  name: 'kanban_list',
  description: 'List all kanban board files in a vault directory',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the Obsidian vault'
      },
      path: {
        type: 'string',
        description: 'Optional subdirectory path (relative to vault, defaults to ".")',
        default: '.'
      }
    },
    required: ['vault']
  }
} as const;
