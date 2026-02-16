/**
 * Zod validation schemas for vault management operations
 * Used by vault management tools to validate input parameters
 */

import { z } from 'zod';

/**
 * Schema for vault_register tool parameters
 */
export const VaultRegisterSchema = z.object({
  path: z.string().min(1, 'Vault path cannot be empty'),
  id: z.string().optional()
});

export type VaultRegisterParams = z.infer<typeof VaultRegisterSchema>;

/**
 * Schema for vault_init tool parameters
 */
export const VaultInitSchema = z.object({
  path: z.string().min(1, 'Vault path cannot be empty')
});

export type VaultInitParams = z.infer<typeof VaultInitSchema>;

/**
 * Schema for vault_open tool parameters
 */
export const VaultOpenSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID cannot be empty'),
  file: z.string().optional()
});

export type VaultOpenParams = z.infer<typeof VaultOpenSchema>;

/**
 * Schema for plugin_install tool parameters
 */
export const PluginInstallSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  pluginId: z.string().min(1, 'Plugin ID cannot be empty')
});

export type PluginInstallParams = z.infer<typeof PluginInstallSchema>;

/**
 * Schema for plugin_enable tool parameters
 */
export const PluginEnableSchema = z.object({
  vault: z.string().min(1, 'Vault path cannot be empty'),
  pluginId: z.string().min(1, 'Plugin ID cannot be empty')
});

export type PluginEnableParams = z.infer<typeof PluginEnableSchema>;
