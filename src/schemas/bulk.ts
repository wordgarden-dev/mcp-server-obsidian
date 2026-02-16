/**
 * Zod validation schemas for bulk kanban operations
 * Used by bulk operation tools to validate input parameters
 */

import { z } from 'zod';

/**
 * Schema for kanban_clone tool parameters
 */
export const KanbanCloneSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  sourceBoard: z.string().min(1, 'Source board path cannot be empty'),
  targetBoard: z.string().min(1, 'Target board path cannot be empty')
});

export type KanbanCloneParams = z.infer<typeof KanbanCloneSchema>;

/**
 * Schema for kanban_merge tool parameters
 */
export const KanbanMergeSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  sourceBoards: z.array(z.string().min(1, 'Board path cannot be empty'))
    .min(1, 'At least one source board is required'),
  targetBoard: z.string().min(1, 'Target board path cannot be empty')
});

export type KanbanMergeParams = z.infer<typeof KanbanMergeSchema>;

/**
 * Schema for kanban_archive_done tool parameters
 */
export const KanbanArchiveSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  archiveColumn: z.string().optional().default('Archive')
});

export type KanbanArchiveParams = z.infer<typeof KanbanArchiveSchema>;
