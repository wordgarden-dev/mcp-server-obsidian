/**
 * File operations for kanban board files
 * Implements atomic writes and safe file handling
 */

import { readFile, writeFile, readdir, rename, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { parseKanban, serializeKanban } from '../parsers/kanban.js';
import type { Board } from '../types/board.js';

/**
 * Read and parse a kanban board file
 * 
 * @param path - Absolute path to the kanban .md file
 * @returns Parsed Board object with path set
 * @throws Error if file cannot be read or parsed
 */
export async function readKanbanFile(path: string): Promise<Board> {
  try {
    const content = await readFile(path, 'utf-8');
    const board = parseKanban(content);
    board.path = path;
    return board;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read kanban file at ${path}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Write a kanban board to disk using atomic write pattern
 * 
 * Pattern:
 * 1. Write to temporary file (.tmp)
 * 2. Rename temp file to target (atomic on POSIX, near-atomic on Windows)
 * 3. Clean up temp file on error
 * 
 * @param path - Target file path
 * @param board - Board object to serialize and write
 * @throws Error if write operation fails
 */
export async function writeKanbanFile(path: string, board: Board): Promise<void> {
  const tempPath = `${path}.tmp`;
  
  try {
    // Serialize board to markdown
    const content = serializeKanban(board);
    
    // Write to temp file with UTF-8 encoding
    await writeFile(tempPath, content, 'utf-8');
    
    // Atomic rename (overwrites target if exists)
    await rename(tempPath, path);
  } catch (error) {
    // Clean up temp file on error
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to write kanban file at ${path}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * List all kanban board files in a directory
 * 
 * A file is considered a kanban board if:
 * 1. It has .md extension
 * 2. It contains kanban-plugin frontmatter
 * 
 * @param dirPath - Directory to search (non-recursive)
 * @returns Array of absolute paths to kanban files
 * @throws Error if directory cannot be read
 */
export async function listKanbanFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const kanbanFiles: string[] = [];
    
    for (const entry of entries) {
      // Skip non-files and non-.md files
      if (!entry.isFile() || extname(entry.name) !== '.md') {
        continue;
      }
      
      const filePath = join(dirPath, entry.name);
      
      try {
        // Check if file has kanban frontmatter
        const content = await readFile(filePath, 'utf-8');
        if (content.includes('kanban-plugin:')) {
          kanbanFiles.push(filePath);
        }
      } catch {
        // Skip files that can't be read
        continue;
      }
    }
    
    return kanbanFiles;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to list kanban files in ${dirPath}: ${error.message}`);
    }
    throw error;
  }
}
