/**
 * Kanban board parser for Obsidian markdown files
 * Handles YAML frontmatter, column headers, items, and settings blocks
 */

import matter from 'gray-matter';
import type { Board, Column, Item, BoardSettings } from '../types/board.js';

/**
 * Parse a kanban markdown file into a Board structure
 * 
 * @param content - Raw markdown content
 * @returns Parsed Board object
 */
export function parseKanban(content: string): Board {
  // Parse YAML frontmatter
  const { data: frontmatter, content: bodyContent } = matter(content);
  
  // Extract board settings from frontmatter
  const settings: BoardSettings = {
    'kanban-plugin': frontmatter['kanban-plugin'] || 'basic',
    ...frontmatter
  };
  
  // Split content into lines for processing
  const lines = bodyContent.split('\n');
  const columns: Column[] = [];
  let currentColumn: Column | null = null;
  
  for (const line of lines) {
    // Check for column header (## Heading)
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      // Save previous column if exists
      if (currentColumn) {
        columns.push(currentColumn);
      }
      // Start new column
      currentColumn = {
        name: headerMatch[1]!.trim(),
        items: []
      };
      continue;
    }
    
    // Check for item (- [ ] or - [x])
    const itemMatch = line.match(/^-\s+\[([ x])\]\s+(.*)$/);
    if (itemMatch && currentColumn) {
      const item: Item = {
        text: itemMatch[2]!.trim(),
        completed: itemMatch[1] === 'x'
      };
      currentColumn.items.push(item);
      continue;
    }
    
    // Skip settings block and other content
    if (line.trim().startsWith('%%')) {
      break; // Stop processing at settings block
    }
  }
  
  // Add last column if exists
  if (currentColumn) {
    columns.push(currentColumn);
  }
  
  return {
    path: '', // Will be set by caller
    settings,
    columns
  };
}

/**
 * Serialize a Board structure back to markdown format
 * 
 * @param board - Board object to serialize
 * @returns Markdown string matching Obsidian kanban format
 */
export function serializeKanban(board: Board): string {
  const parts: string[] = [];
  
  // Generate YAML frontmatter
  parts.push('---');
  parts.push('');
  parts.push(`kanban-plugin: ${board.settings['kanban-plugin']}`);
  parts.push('');
  parts.push('---');
  parts.push('');
  
  // Generate columns and items
  for (const column of board.columns) {
    parts.push(`## ${column.name}`);
    parts.push('');
    
    for (const item of column.items) {
      const checkbox = item.completed ? '[x]' : '[ ]';
      parts.push(`- ${checkbox} ${item.text}`);
    }
    
    parts.push('');
  }
  
  // Generate settings block
  const settingsJson = JSON.stringify(board.settings);
  parts.push('%% kanban:settings');
  parts.push('```');
  parts.push(settingsJson);
  parts.push('```');
  parts.push('%%');
  parts.push('');
  
  return parts.join('\n');
}
