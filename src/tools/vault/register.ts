/**
 * vault_register tool - Register a vault in Obsidian's global configuration
 */

import { registerVault } from '../../utils/vault-ops.js';
import { VaultRegisterSchema } from '../../schemas/vault.js';

/**
 * Register a vault in Obsidian's global configuration
 * 
 * @param params - Register parameters (vault path, optional ID)
 * @returns Vault ID that was registered
 * @throws Error if validation fails or registration fails
 * 
 * @example
 * ```typescript
 * const vaultId = await vaultRegister({
 *   path: '/path/to/vault',
 *   id: 'my-vault'  // optional, defaults to folder name
 * });
 * ```
 */
export async function vaultRegister(params: unknown): Promise<{ vaultId: string }> {
  // Validate parameters
  const validated = VaultRegisterSchema.parse(params);
  
  // Register vault
  const vaultId = await registerVault(validated.path, validated.id);
  
  return { vaultId };
}

/**
 * Tool metadata for MCP registration
 */
export const vaultRegisterTool = {
  name: 'vault_register',
  description: 'Register an Obsidian vault in the global configuration file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute path to the vault directory'
      },
      id: {
        type: 'string',
        description: 'Optional vault ID (defaults to folder name)'
      }
    },
    required: ['path']
  }
} as const;
