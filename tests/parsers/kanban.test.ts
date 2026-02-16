/**
 * Tests for kanban markdown parser
 * Uses the real kanban.md as a fixture for integration testing
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseKanban, serializeKanban } from '../../src/parsers/kanban.js';
import type { Board } from '../../src/types/board.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the real kanban.md file (one level up from mcp-server-obsidian/)
// From dist/tests/parsers/ we need ../../../../kanban.md
const KANBAN_FIXTURE_PATH = join(__dirname, '../../../../kanban.md');

describe('kanban parser', () => {
  describe('parseKanban', () => {
    test('should parse YAML frontmatter settings', () => {
      const content = `---
kanban-plugin: basic
---

## Column 1
`;
      const board = parseKanban(content);
      
      assert.strictEqual(board.settings['kanban-plugin'], 'basic');
    });
    
    test('should parse column headers', () => {
      const content = `---
kanban-plugin: basic
---

## Backlog

## In Progress

## Done
`;
      const board = parseKanban(content);
      
      assert.strictEqual(board.columns.length, 3);
      assert.strictEqual(board.columns[0]!.name, 'Backlog');
      assert.strictEqual(board.columns[1]!.name, 'In Progress');
      assert.strictEqual(board.columns[2]!.name, 'Done');
    });
    
    test('should parse incomplete items', () => {
      const content = `---
kanban-plugin: basic
---

## Backlog

- [ ] First task
- [ ] Second task
`;
      const board = parseKanban(content);
      
      assert.strictEqual(board.columns[0]!.items.length, 2);
      assert.strictEqual(board.columns[0]!.items[0]!.text, 'First task');
      assert.strictEqual(board.columns[0]!.items[0]!.completed, false);
      assert.strictEqual(board.columns[0]!.items[1]!.text, 'Second task');
      assert.strictEqual(board.columns[0]!.items[1]!.completed, false);
    });
    
    test('should parse completed items', () => {
      const content = `---
kanban-plugin: basic
---

## Done

- [x] Completed task
- [x] Another done task
`;
      const board = parseKanban(content);
      
      assert.strictEqual(board.columns[0]!.items.length, 2);
      assert.strictEqual(board.columns[0]!.items[0]!.completed, true);
      assert.strictEqual(board.columns[0]!.items[1]!.completed, true);
    });
    
    test('should handle empty columns', () => {
      const content = `---
kanban-plugin: basic
---

## Empty Column

## Another Empty
`;
      const board = parseKanban(content);
      
      assert.strictEqual(board.columns[0]!.items.length, 0);
      assert.strictEqual(board.columns[1]!.items.length, 0);
    });
    
    test('should stop parsing at settings block', () => {
      const content = `---
kanban-plugin: basic
---

## Column

- [ ] Task 1

%% kanban:settings
\`\`\`
{"kanban-plugin":"basic"}
\`\`\`
%%
`;
      const board = parseKanban(content);
      
      assert.strictEqual(board.columns[0]!.items.length, 1);
    });
    
    test('should parse the real kanban.md fixture', () => {
      const content = readFileSync(KANBAN_FIXTURE_PATH, 'utf-8');
      const board = parseKanban(content);
      
      // Verify settings
      assert.strictEqual(board.settings['kanban-plugin'], 'basic');
      
      // Verify columns exist
      assert.ok(board.columns.length > 0);
      
      // Find specific columns
      const backlog = board.columns.find(c => c.name === 'Backlog');
      const inProgress = board.columns.find(c => c.name === 'In Progress');
      const done = board.columns.find(c => c.name === 'Done');
      
      assert.ok(backlog, 'Backlog column should exist');
      assert.ok(inProgress, 'In Progress column should exist');
      assert.ok(done, 'Done column should exist');
      
      // Verify items are parsed
      assert.ok(backlog!.items.length > 0, 'Backlog should have items');
      
      // Verify completed items in Done column
      if (done!.items.length > 0) {
        const hasCompletedItems = done!.items.some(item => item.completed);
        assert.ok(hasCompletedItems, 'Done column should have completed items');
      }
    });
  });
  
  describe('serializeKanban', () => {
    test('should generate valid YAML frontmatter', () => {
      const board: Board = {
        path: 'test.md',
        settings: { 'kanban-plugin': 'basic' },
        columns: []
      };
      
      const markdown = serializeKanban(board);
      
      assert.ok(markdown.includes('---'), 'Should have frontmatter delimiters');
      assert.ok(markdown.includes('kanban-plugin: basic'));
    });
    
    test('should generate column headers', () => {
      const board: Board = {
        path: 'test.md',
        settings: { 'kanban-plugin': 'basic' },
        columns: [
          { name: 'Backlog', items: [] },
          { name: 'In Progress', items: [] }
        ]
      };
      
      const markdown = serializeKanban(board);
      
      assert.ok(markdown.includes('## Backlog'));
      assert.ok(markdown.includes('## In Progress'));
    });
    
    test('should generate incomplete items', () => {
      const board: Board = {
        path: 'test.md',
        settings: { 'kanban-plugin': 'basic' },
        columns: [
          {
            name: 'Backlog',
            items: [
              { text: 'Task 1', completed: false },
              { text: 'Task 2', completed: false }
            ]
          }
        ]
      };
      
      const markdown = serializeKanban(board);
      
      assert.ok(markdown.includes('- [ ] Task 1'));
      assert.ok(markdown.includes('- [ ] Task 2'));
    });
    
    test('should generate completed items', () => {
      const board: Board = {
        path: 'test.md',
        settings: { 'kanban-plugin': 'basic' },
        columns: [
          {
            name: 'Done',
            items: [
              { text: 'Completed task', completed: true }
            ]
          }
        ]
      };
      
      const markdown = serializeKanban(board);
      
      assert.ok(markdown.includes('- [x] Completed task'));
    });
    
    test('should generate settings block', () => {
      const board: Board = {
        path: 'test.md',
        settings: { 'kanban-plugin': 'basic' },
        columns: []
      };
      
      const markdown = serializeKanban(board);
      
      assert.ok(markdown.includes('%% kanban:settings'));
      assert.ok(markdown.includes('{"kanban-plugin":"basic"}'));
      assert.ok(markdown.includes('%%'));
    });
  });
  
  describe('round-trip parsing', () => {
    test('should preserve content when parsing and serializing', () => {
      const original: Board = {
        path: 'test.md',
        settings: { 'kanban-plugin': 'basic' },
        columns: [
          {
            name: 'Backlog',
            items: [
              { text: 'Task 1', completed: false },
              { text: 'Task 2', completed: false }
            ]
          },
          {
            name: 'In Progress',
            items: [
              { text: 'Working on this', completed: false }
            ]
          },
          {
            name: 'Done',
            items: [
              { text: 'Completed task', completed: true }
            ]
          }
        ]
      };
      
      // Serialize to markdown
      const markdown = serializeKanban(original);
      
      // Parse back to Board
      const parsed = parseKanban(markdown);
      parsed.path = original.path; // Path is not serialized, so set it manually
      
      // Verify structure matches
      assert.deepStrictEqual(parsed.settings, original.settings);
      assert.strictEqual(parsed.columns.length, original.columns.length);
      
      for (let i = 0; i < parsed.columns.length; i++) {
        assert.strictEqual(parsed.columns[i]!.name, original.columns[i]!.name);
        assert.strictEqual(parsed.columns[i]!.items.length, original.columns[i]!.items.length);
        
        for (let j = 0; j < parsed.columns[i]!.items.length; j++) {
          assert.strictEqual(parsed.columns[i]!.items[j]!.text, original.columns[i]!.items[j]!.text);
          assert.strictEqual(parsed.columns[i]!.items[j]!.completed, original.columns[i]!.items[j]!.completed);
        }
      }
    });
    
    test('should handle empty columns in round-trip', () => {
      const original: Board = {
        path: 'test.md',
        settings: { 'kanban-plugin': 'basic' },
        columns: [
          { name: 'Empty', items: [] },
          { name: 'Also Empty', items: [] }
        ]
      };
      
      const markdown = serializeKanban(original);
      const parsed = parseKanban(markdown);
      parsed.path = original.path;
      
      assert.deepStrictEqual(parsed.columns, original.columns);
    });
    
    test('should round-trip the real kanban.md fixture', () => {
      const content = readFileSync(KANBAN_FIXTURE_PATH, 'utf-8');
      
      // Parse original
      const board1 = parseKanban(content);
      
      // Serialize to markdown
      const markdown = serializeKanban(board1);
      
      // Parse again
      const board2 = parseKanban(markdown);
      
      // Compare structures (excluding path which isn't serialized)
      assert.deepStrictEqual(board2.settings, board1.settings);
      assert.strictEqual(board2.columns.length, board1.columns.length);
      
      for (let i = 0; i < board2.columns.length; i++) {
        assert.strictEqual(board2.columns[i]!.name, board1.columns[i]!.name);
        assert.deepStrictEqual(board2.columns[i]!.items, board1.columns[i]!.items);
      }
    });
  });
});
