/**
 * kanban_merge tool - Merge items from multiple boards into one
 */

import { readKanbanFile, writeKanbanFile } from '../../../utils/file-ops.js';
import { validateVaultPath } from '../../../utils/path-validator.js';
import { KanbanMergeSchema } from '../../../schemas/bulk.js';
import type { Board } from '../../../types/board.js';

/**
 * Merge items from multiple source boards into a target board
 * 
 * Strategy:
 * - For each source board, find matching columns by name
 * - Append items from source column to target column
 * - If target column doesn't exist, create it
 * - Preserve item completion status and attributes
 * 
 * @param params - Merge parameters (vault, source boards, target board)
 * @returns The merged board
 * @throws Error if validation fails or operation fails
 * 
 * @example
 * ```typescript
 * const merged = await kanbanMerge({
 *   vault: '/path/to/vault',
 *   sourceBoards: ['project-a.md', 'project-b.md'],
 *   targetBoard: 'combined.md'
 * });
 * ```
 */
export async function kanbanMerge(params: unknown): Promise<Board> {
  // Validate parameters
  const validated = KanbanMergeSchema.parse(params);
  
  // Validate and read or create target board
  const targetPath = await validateVaultPath(validated.vault, validated.targetBoard);
  let targetBoard: Board;
  
  try {
    targetBoard = await readKanbanFile(targetPath);
  } catch {
    // Create new board if target doesn't exist
    targetBoard = {
      settings: { 'kanban-plugin': 'basic' },
      columns: [],
      path: targetPath
    };
  }
  
  // Merge each source board
  for (const sourceBoardPath of validated.sourceBoards) {
    const sourcePath = await validateVaultPath(validated.vault, sourceBoardPath);
    const sourceBoard = await readKanbanFile(sourcePath);
    
    // Merge columns
    for (const sourceColumn of sourceBoard.columns) {
      // Find or create matching column in target
      let targetColumn = targetBoard.columns.find(c => c.name === sourceColumn.name);
      
      if (!targetColumn) {
        // Create new column
        targetColumn = {
          name: sourceColumn.name,
          items: []
        };
        targetBoard.columns.push(targetColumn);
      }
      
      // Append items (avoid duplicates by text)
      for (const item of sourceColumn.items) {
        const isDuplicate = targetColumn.items.some(i => i.text === item.text);
        if (!isDuplicate) {
          targetColumn.items.push({ ...item });
        }
      }
    }
  }
  
  // Write merged board
  await writeKanbanFile(targetPath, targetBoard);
  
  return targetBoard;
}

/**
 * Tool metadata for MCP registration
 */
export const kanbanMergeTool = {
  name: 'kanban_merge',
  description: 'Merge items from multiple kanban boards into a single board',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the Obsidian vault'
      },
      sourceBoards: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of relative paths to source board files'
      },
      targetBoard: {
        type: 'string',
        description: 'Relative path to the target board file (created if doesn\'t exist)'
      }
    },
    required: ['vault', 'sourceBoards', 'targetBoard']
  }
} as const;
