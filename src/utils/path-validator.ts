/**
 * Path validation and sanitization for secure file operations
 * Prevents path traversal attacks and ensures paths stay within vault boundaries
 */

import { resolve, normalize, relative, isAbsolute, sep } from 'node:path';
import { realpath, access } from 'node:fs/promises';
import { constants } from 'node:fs';

/**
 * Error thrown when path validation fails
 */
export class PathValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathValidationError';
  }
}

/**
 * Validate and canonicalize a path within a vault
 * 
 * Security checks:
 * - Path must be within vault boundaries (no escaping via ..)
 * - No absolute paths that bypass vault root
 * - Symlinks must resolve within vault
 * - Protection against Unicode normalization attacks
 * - Protection against null bytes and invalid characters
 * 
 * @param vaultPath - Absolute path to vault root (must exist)
 * @param targetPath - Relative or absolute path to validate
 * @returns Canonicalized absolute path within vault
 * @throws PathValidationError if path is invalid or outside vault
 * 
 * @example
 * ```typescript
 * const safe = validateVaultPath('/vault', 'notes/file.md');
 * // Returns: /vault/notes/file.md
 * 
 * validateVaultPath('/vault', '../etc/passwd');
 * // Throws: Path escapes vault boundaries
 * ```
 */
export async function validateVaultPath(
  vaultPath: string,
  targetPath: string
): Promise<string> {
  // Input validation
  if (!vaultPath || typeof vaultPath !== 'string') {
    throw new PathValidationError('Vault path must be a non-empty string');
  }
  
  if (!targetPath || typeof targetPath !== 'string') {
    throw new PathValidationError('Target path must be a non-empty string');
  }
  
  // Check for null bytes (security: null byte injection)
  if (vaultPath.includes('\0') || targetPath.includes('\0')) {
    throw new PathValidationError('Path contains null byte');
  }
  
  // Normalize Unicode (security: prevent bypass via different Unicode forms)
  const normalizedVault = vaultPath.normalize('NFC');
  const normalizedTarget = targetPath.normalize('NFC');
  
  // Vault path must be absolute
  if (!isAbsolute(normalizedVault)) {
    throw new PathValidationError('Vault path must be absolute');
  }
  
  // Canonicalize vault path (resolve symlinks, normalize separators)
  let canonicalVault: string;
  try {
    canonicalVault = await realpath(normalizedVault);
  } catch (error) {
    throw new PathValidationError(
      `Vault path does not exist or is not accessible: ${normalizedVault}`
    );
  }
  
  // Construct candidate path
  // If target is absolute, use it directly; otherwise join with vault
  const candidatePath = isAbsolute(normalizedTarget)
    ? resolve(normalizedTarget)
    : resolve(canonicalVault, normalizedTarget);
  
  // Normalize the candidate path
  const normalizedCandidate = normalize(candidatePath);
  
  // Security check: ensure normalized path stays within vault
  // Use relative() to compute the relationship
  const relativePath = relative(canonicalVault, normalizedCandidate);
  
  // Path escapes if:
  // - relative path starts with '..' (goes up from vault)
  // - relative path is absolute (completely different root)
  if (relativePath.startsWith('..' + sep) || isAbsolute(relativePath)) {
    throw new PathValidationError(
      `Path escapes vault boundaries: ${targetPath} -> ${normalizedCandidate}`
    );
  }
  
  // Additional check: if relative path is exactly '..', it's trying to escape
  if (relativePath === '..') {
    throw new PathValidationError(
      `Path escapes vault boundaries: ${targetPath}`
    );
  }
  
  // Check path length (DOS protection)
  // Windows MAX_PATH is 260, but modern Windows 10+ supports 32,767
  // Unix typically 4096. Use conservative limit.
  const MAX_PATH_LENGTH = 4096;
  if (normalizedCandidate.length > MAX_PATH_LENGTH) {
    throw new PathValidationError(
      `Path exceeds maximum length (${MAX_PATH_LENGTH}): ${normalizedCandidate.length} chars`
    );
  }
  
  // If the target path exists, resolve symlinks and verify again
  // This prevents symlink attacks where a symlink points outside vault
  try {
    await access(normalizedCandidate, constants.F_OK);
    
    // File exists, resolve symlinks
    const canonicalTarget = await realpath(normalizedCandidate);
    
    // Re-check that canonical target is within vault
    const relativeCanonical = relative(canonicalVault, canonicalTarget);
    
    if (relativeCanonical.startsWith('..' + sep) || isAbsolute(relativeCanonical)) {
      throw new PathValidationError(
        `Symlink escapes vault boundaries: ${targetPath} -> ${canonicalTarget}`
      );
    }
    
    if (relativeCanonical === '..') {
      throw new PathValidationError(
        `Symlink escapes vault boundaries: ${targetPath}`
      );
    }
    
    // Return the canonical (symlink-resolved) path
    return canonicalTarget;
  } catch (error) {
    // File doesn't exist - this is OK for write operations
    // But we still return the normalized candidate path
    if (error instanceof PathValidationError) {
      throw error;
    }
    
    // ENOENT or EACCES - file doesn't exist or not accessible
    // This is acceptable for create operations
    // Return the normalized (but not symlink-resolved) path
    return normalizedCandidate;
  }
}

/**
 * Synchronous version of validateVaultPath for non-async contexts
 * 
 * WARNING: Does not resolve symlinks. Use async version when possible.
 * Only performs basic boundary checks without filesystem access.
 * 
 * @param vaultPath - Absolute path to vault root
 * @param targetPath - Relative or absolute path to validate
 * @returns Normalized absolute path (not canonicalized)
 * @throws PathValidationError if path is clearly invalid
 */
export function validateVaultPathSync(
  vaultPath: string,
  targetPath: string
): string {
  // Input validation
  if (!vaultPath || typeof vaultPath !== 'string') {
    throw new PathValidationError('Vault path must be a non-empty string');
  }
  
  if (!targetPath || typeof targetPath !== 'string') {
    throw new PathValidationError('Target path must be a non-empty string');
  }
  
  // Check for null bytes
  if (vaultPath.includes('\0') || targetPath.includes('\0')) {
    throw new PathValidationError('Path contains null byte');
  }
  
  // Normalize Unicode
  const normalizedVault = vaultPath.normalize('NFC');
  const normalizedTarget = targetPath.normalize('NFC');
  
  // Vault path must be absolute
  if (!isAbsolute(normalizedVault)) {
    throw new PathValidationError('Vault path must be absolute');
  }
  
  // Construct and normalize path
  const candidatePath = isAbsolute(normalizedTarget)
    ? resolve(normalizedTarget)
    : resolve(normalizedVault, normalizedTarget);
  
  const normalizedCandidate = normalize(candidatePath);
  
  // Boundary check
  const relativePath = relative(normalizedVault, normalizedCandidate);
  
  if (relativePath.startsWith('..' + sep) || relativePath === '..' || isAbsolute(relativePath)) {
    throw new PathValidationError(
      `Path escapes vault boundaries: ${targetPath}`
    );
  }
  
  // Length check
  const MAX_PATH_LENGTH = 4096;
  if (normalizedCandidate.length > MAX_PATH_LENGTH) {
    throw new PathValidationError(
      `Path exceeds maximum length (${MAX_PATH_LENGTH})`
    );
  }
  
  return normalizedCandidate;
}
