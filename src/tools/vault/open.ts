/**
 * vault_open tool - Open a vault in Obsidian using obsidian:// URI
 */

import { openVault } from '../../utils/vault-ops.js';
import { VaultOpenSchema } from '../../schemas/vault.js';

/**
 * Open a vault (and optionally a specific file) in Obsidian
 * 
 * Uses obsidian:// URI protocol to launch Obsidian.
 * Works cross-platform (Windows, macOS, Linux).
 * 
 * @param params - Open parameters (vault ID, optional file path)
 * @returns Success message
 * @throws Error if validation fails or opening fails
 * 
 * @example
 * ```typescript
 * await vaultOpen({
 *   vaultId: 'my-vault',
 *   file: 'notes/project.md'  // optional
 * });
 * ```
 */
export async function vaultOpen(params: unknown): Promise<{ success: boolean; message: string }> {
  // Validate parameters
  const validated = VaultOpenSchema.parse(params);
  
  // Open vault
  await openVault(validated.vaultId, validated.file);
  
  const message = validated.file 
    ? `Opened vault '${validated.vaultId}' with file '${validated.file}'`
    : `Opened vault '${validated.vaultId}'`;
  
  return { success: true, message };
}

/**
 * Tool metadata for MCP registration
 */
export const vaultOpenTool = {
  name: 'vault_open',
  description: 'Open an Obsidian vault (and optionally a specific file) using obsidian:// URI',
  inputSchema: {
    type: 'object',
    properties: {
      vaultId: {
        type: 'string',
        description: 'Vault ID (as registered in obsidian.json)'
      },
      file: {
        type: 'string',
        description: 'Optional relative path to a file within the vault'
      }
    },
    required: ['vaultId']
  }
} as const;
