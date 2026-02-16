/**
 * vault_init tool - Initialize a vault's .obsidian folder structure
 */

import { initializeVault } from '../../utils/vault-ops.js';
import { VaultInitSchema } from '../../schemas/vault.js';

/**
 * Initialize a vault's .obsidian folder with required config files
 * 
 * Creates:
 * - .obsidian/app.json
 * - .obsidian/appearance.json
 * - .obsidian/community-plugins.json
 * - .obsidian/workspace.json
 * - .obsidian/plugins/ directory
 * 
 * @param params - Init parameters (vault path)
 * @returns Path to the .obsidian directory
 * @throws Error if validation fails or initialization fails
 * 
 * @example
 * ```typescript
 * const obsidianDir = await vaultInit({
 *   path: '/path/to/vault'
 * });
 * ```
 */
export async function vaultInit(params: unknown): Promise<{ obsidianDir: string }> {
  // Validate parameters
  const validated = VaultInitSchema.parse(params);
  
  // Initialize vault
  const obsidianDir = await initializeVault(validated.path);
  
  return { obsidianDir };
}

/**
 * Tool metadata for MCP registration
 */
export const vaultInitTool = {
  name: 'vault_init',
  description: 'Initialize a vault\'s .obsidian folder with required configuration files',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to the vault directory'
      }
    },
    required: ['path']
  }
} as const;
