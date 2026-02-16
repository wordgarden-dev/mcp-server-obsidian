/**
 * Type definitions for Obsidian kanban boards
 * Matches obsidian-kanban plugin format
 */

/**
 * Metadata attached to a kanban item
 * Supports future extensions: tags, due dates, assignees, etc.
 */
export interface ItemMetadata {
  [key: string]: unknown;
}

/**
 * A single item within a kanban column
 * Corresponds to a markdown checkbox line: - [ ] text or - [x] text
 */
export interface Item {
  /** The item's text content */
  text: string;
  
  /** Whether the item is marked complete (- [x]) */
  completed: boolean;
  
  /** Optional metadata (tags, dates, custom fields) */
  metadata?: ItemMetadata;
}

/**
 * A kanban board column
 * Corresponds to a ## Heading section in the markdown
 */
export interface Column {
  /** Column name (from the heading text) */
  name: string;
  
  /** Items within this column */
  items: Item[];
}

/**
 * Board-level settings
 * Stored in YAML frontmatter and %% kanban:settings %% block
 */
export interface BoardSettings {
  /** Plugin mode identifier */
  'kanban-plugin': 'basic' | 'advanced';
  
  /** Allow additional settings for future plugin modes */
  [key: string]: unknown;
}

/**
 * Complete kanban board structure
 * Represents the parsed state of a kanban.md file
 */
export interface Board {
  /** File path relative to vault root */
  path: string;
  
  /** Board settings from frontmatter */
  settings: BoardSettings;
  
  /** Ordered list of columns */
  columns: Column[];
}

/**
 * Parameters for board creation
 */
export interface CreateBoardParams {
  vault: string;
  path: string;
  columns: string[];
  settings?: Partial<BoardSettings>;
}

/**
 * Parameters for item operations
 */
export interface ItemOperationParams {
  vault: string;
  board: string;
  item: string;
  column?: string;
}

/**
 * Parameters for column operations
 */
export interface ColumnOperationParams {
  vault: string;
  board: string;
  column: string;
  targetColumn?: string;
}
