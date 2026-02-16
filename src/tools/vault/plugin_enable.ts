/**
 * plugin_enable tool - Enable a plugin in community-plugins.json
 */

import { enablePlugin } from '../../utils/vault-ops.js';
import { PluginEnableSchema } from '../../schemas/vault.js';

/**
 * Enable a plugin in the vault's community-plugins.json
 * 
 * Adds the plugin ID to the enabled plugins list.
 * Plugin must already be installed in .obsidian/plugins/{pluginId}/
 * 
 * @param params - Enable parameters (vault path, plugin ID)
 * @returns Success message
 * @throws Error if validation fails or enabling fails
 * 
 * @example
 * ```typescript
 * await pluginEnable({
 *   vault: '/path/to/vault',
 *   pluginId: 'obsidian-kanban'
 * });
 * ```
 */
export async function pluginEnable(params: unknown): Promise<{ success: boolean; pluginId: string }> {
  // Validate parameters
  const validated = PluginEnableSchema.parse(params);
  
  // Enable plugin
  await enablePlugin(validated.vault, validated.pluginId);
  
  return { success: true, pluginId: validated.pluginId };
}

/**
 * Tool metadata for MCP registration
 */
export const pluginEnableTool = {
  name: 'plugin_enable',
  description: 'Enable an Obsidian plugin in the vault\'s community-plugins.json',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the vault directory'
      },
      pluginId: {
        type: 'string',
        description: 'Plugin ID to enable (e.g., "obsidian-kanban")'
      }
    },
    required: ['vault', 'pluginId']
  }
} as const;
