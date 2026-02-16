/**
 * Zod validation schemas for kanban board operations
 * Used by MCP tools to validate input parameters
 */

import { z } from 'zod';
import { validateItemText, validateColumnName } from '../utils/input-validator.js';

/**
 * Schema for kanban_read tool parameters
 */
export const KanbanReadSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty')
});

export type KanbanReadParams = z.infer<typeof KanbanReadSchema>;

/**
 * Schema for kanban_list tool parameters
 */
export const KanbanListSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  path: z.string().optional().default('.')
});

export type KanbanListParams = z.infer<typeof KanbanListSchema>;

/**
 * Schema for kanban_create tool parameters
 */
export const KanbanCreateSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  path: z.string().min(1, 'Board path cannot be empty'),
  columns: z.array(z.string().min(1, 'Column name cannot be empty').transform(validateColumnName))
    .min(1, 'At least one column is required'),
  settings: z.object({
    'kanban-plugin': z.enum(['basic', 'advanced']).optional().default('basic')
  }).passthrough().optional()
});

export type KanbanCreateParams = z.infer<typeof KanbanCreateSchema>;

/**
 * Schema for kanban_delete tool parameters
 */
export const KanbanDeleteSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty')
});

export type KanbanDeleteParams = z.infer<typeof KanbanDeleteSchema>;

/**
 * Schema for kanban_item_add tool parameters
 */
export const KanbanItemAddSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  column: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  text: z.string().min(1, 'Item text cannot be empty').transform(validateItemText),
  completed: z.boolean().optional().default(false)
});

export type KanbanItemAddParams = z.infer<typeof KanbanItemAddSchema>;

/**
 * Schema for kanban_item_remove tool parameters
 */
export const KanbanItemRemoveSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  column: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  text: z.string().min(1, 'Item text to match cannot be empty').transform(validateItemText)
});

export type KanbanItemRemoveParams = z.infer<typeof KanbanItemRemoveSchema>;

/**
 * Schema for kanban_item_move tool parameters
 */
export const KanbanItemMoveSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  text: z.string().min(1, 'Item text to match cannot be empty').transform(validateItemText),
  sourceColumn: z.string().min(1, 'Source column name cannot be empty').transform(validateColumnName),
  targetColumn: z.string().min(1, 'Target column name cannot be empty').transform(validateColumnName)
});

export type KanbanItemMoveParams = z.infer<typeof KanbanItemMoveSchema>;

/**
 * Schema for kanban_item_update tool parameters
 */
export const KanbanItemUpdateSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  column: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  oldText: z.string().min(1, 'Old item text cannot be empty').transform(validateItemText),
  newText: z.string().min(1, 'New item text cannot be empty').transform(validateItemText)
});

export type KanbanItemUpdateParams = z.infer<typeof KanbanItemUpdateSchema>;

/**
 * Schema for kanban_item_complete tool parameters
 */
export const KanbanItemCompleteSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  column: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  text: z.string().min(1, 'Item text to match cannot be empty').transform(validateItemText),
  completed: z.boolean().optional()
});

export type KanbanItemCompleteParams = z.infer<typeof KanbanItemCompleteSchema>;

/**
 * Schema for kanban_item_reorder tool parameters
 */
export const KanbanItemReorderSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  column: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  text: z.string().min(1, 'Item text to match cannot be empty').transform(validateItemText),
  position: z.number().int().min(0, 'Position must be non-negative')
});

export type KanbanItemReorderParams = z.infer<typeof KanbanItemReorderSchema>;

/**
 * Schema for kanban_column_add tool parameters
 */
export const KanbanColumnAddSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  name: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  position: z.number().int().min(0, 'Position must be non-negative').optional()
});

export type KanbanColumnAddParams = z.infer<typeof KanbanColumnAddSchema>;

/**
 * Schema for kanban_column_remove tool parameters
 */
export const KanbanColumnRemoveSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  name: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  targetColumn: z.string().optional().transform((val) => val ? validateColumnName(val) : val)
});

export type KanbanColumnRemoveParams = z.infer<typeof KanbanColumnRemoveSchema>;

/**
 * Schema for kanban_column_rename tool parameters
 */
export const KanbanColumnRenameSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  oldName: z.string().min(1, 'Old column name cannot be empty').transform(validateColumnName),
  newName: z.string().min(1, 'New column name cannot be empty').transform(validateColumnName)
});

export type KanbanColumnRenameParams = z.infer<typeof KanbanColumnRenameSchema>;

/**
 * Schema for kanban_column_move tool parameters
 */
export const KanbanColumnMoveSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  board: z.string().min(1, 'Board path cannot be empty'),
  name: z.string().min(1, 'Column name cannot be empty').transform(validateColumnName),
  position: z.number().int().min(0, 'Position must be non-negative')
});

export type KanbanColumnMoveParams = z.infer<typeof KanbanColumnMoveSchema>;
