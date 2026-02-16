/**
 * plugin_install tool - Install a plugin from GitHub releases
 */

import { installPlugin, PLUGIN_REGISTRY } from '../../utils/vault-ops.js';
import { PluginInstallSchema } from '../../schemas/vault.js';

/**
 * Install a plugin from GitHub releases
 * 
 * Downloads plugin files (main.js, manifest.json, styles.css) from the
 * latest GitHub release and places them in .obsidian/plugins/{pluginId}/
 * 
 * @param params - Install parameters (vault path, plugin ID)
 * @returns Path to the installed plugin directory
 * @throws Error if validation fails or installation fails
 * 
 * @example
 * ```typescript
 * const pluginDir = await pluginInstall({
 *   vault: '/path/to/vault',
 *   pluginId: 'obsidian-kanban'
 * });
 * ```
 */
export async function pluginInstall(params: unknown): Promise<{ pluginDir: string; pluginId: string }> {
  // Validate parameters
  const validated = PluginInstallSchema.parse(params);
  
  // Verify plugin exists in registry
  if (!PLUGIN_REGISTRY[validated.pluginId]) {
    const available = Object.keys(PLUGIN_REGISTRY).join(', ');
    throw new Error(`Unknown plugin: ${validated.pluginId}. Available: ${available}`);
  }
  
  // Install plugin
  const pluginDir = await installPlugin(validated.vault, validated.pluginId);
  
  return { pluginDir, pluginId: validated.pluginId };
}

/**
 * Tool metadata for MCP registration
 */
export const pluginInstallTool = {
  name: 'plugin_install',
  description: 'Install an Obsidian plugin from GitHub releases',
  inputSchema: {
    type: 'object',
    properties: {
      vault: {
        type: 'string',
        description: 'Absolute path to the vault directory'
      },
      pluginId: {
        type: 'string',
        description: 'Plugin ID (e.g., "obsidian-kanban")',
        enum: Object.keys(PLUGIN_REGISTRY)
      }
    },
    required: ['vault', 'pluginId']
  }
} as const;
